import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// ── Allowed MIME types & size limit ──────────────────────────────────────────
const ALLOWED_MIME_TYPES = ['image/webp', 'image/png'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
// ── GET /users/profile ────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscription: true,
        rewards: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Calculate subscription duration
    let monthsActive = 0;
    if (user.subscription && user.subscription.startDate) {
      const now = new Date();
      const start = new Date(user.subscription.startDate);
      monthsActive = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
      if (now.getDate() < start.getDate()) {
        monthsActive--;
      }
      if (monthsActive < 0) monthsActive = 0;
    }

    // Prepare rewards status
    const milestones = [3, 6, 9, 12];
    const rewardsStatus = milestones.map(milestone => {
      const userReward = user.rewards.find(r => r.milestoneMonths === milestone);
      const isUnlocked = monthsActive >= milestone;
      return {
        milestone_months: milestone,
        unlocked: isUnlocked,
        claimed: userReward?.isClaimed || false,
        unlocked_at: isUnlocked ? (userReward?.unlockedAt || null) : null
      };
    });

    res.json({
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phone,
      role: user.role.toLowerCase(),
      avatar_url: user.avatarUrl || null,
      created_at: user.createdAt,
      last_login: user.lastLogin,
      email_verified: user.emailVerified,
      subscription: user.subscription ? {
        status: user.subscription.status,
        active_since: user.subscription.startDate,
        months_active: monthsActive
      } : null,
      rewards: rewardsStatus
    });

  } catch (error) {
    next(error);
  }
};

// ── PUT /users/profile ────────────────────────────────────────────────────────

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { first_name, last_name, phone } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Validation
    const errors: string[] = [];

    if (first_name !== undefined) {
      if (typeof first_name !== 'string') {
        errors.push('first_name must be a string');
      } else if (first_name.length < 2 || first_name.length > 100) {
        errors.push('first_name must be between 2 and 100 characters');
      }
    }

    if (last_name !== undefined) {
      if (typeof last_name !== 'string') {
        errors.push('last_name must be a string');
      } else if (last_name.length > 100) {
        errors.push('last_name must be at most 100 characters');
      }
    }

    if (phone !== undefined) {
      if (typeof phone !== 'string') {
        errors.push('phone must be a string');
      } else {
        const phoneRegex = /^\+?[1-9]\d{6,14}$/;
        if (!phoneRegex.test(phone)) {
          errors.push('phone must be a valid E.164 phone number. min 7 digits');
        }
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        error: 'Validation failed',
        code: 'BAD_REQUEST',
        details: errors
      });
      return;
    }

    if (first_name === undefined && last_name === undefined && phone === undefined) {
      res.status(400).json({
        error: 'At least one field (first_name, last_name, or phone) must be provided',
        code: 'BAD_REQUEST'
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: first_name,
        lastName: last_name,
        phone: phone
      }
    });

    res.json({
      id: updatedUser.id,
      email: updatedUser.email,
      first_name: updatedUser.firstName,
      last_name: updatedUser.lastName,
      phone: updatedUser.phone,
      role: updatedUser.role.toLowerCase(),
      avatar_url: updatedUser.avatarUrl || null,
      created_at: updatedUser.createdAt,
      last_login: updatedUser.lastLogin
    });

  } catch (error) {
    next(error);
  }
};

// ── POST /users/profile/avatar ────────────────────────────────────────────────

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.headers['x-user-id'] as string;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!req.file || !req.file.buffer) {
      res.status(400).json({
        error: 'No file uploaded',
        code: 'BAD_REQUEST',
        details: ['A file must be provided in the "avatar" field']
      });
      return;
    }

    // Validate MIME type (multer fileFilter already does this, but double-check)
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      res.status(400).json({
        error: 'Invalid file type',
        code: 'BAD_REQUEST',
        details: ['Only WebP and PNG images are allowed']
      });
      return;
    }

    // Validate file size
    if (req.file.size > MAX_FILE_SIZE_BYTES) {
      res.status(413).json({
        error: 'File too large',
        code: 'PAYLOAD_TOO_LARGE',
        details: ['Profile picture must be 5 MB or smaller']
      });
      return;
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Stream upload to Cloudinary
    const uploadStream = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'lcrc/avatars',
            public_id: userId,
            overwrite: true,
            format: 'webp', // auto-convert to webp for better optimization
          },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        streamifier.createReadStream(req.file!.buffer).pipe(stream);
      });
    };

    const cloudinaryResult: any = await uploadStream();
    const avatarUrl = cloudinaryResult.secure_url;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl }
    });

    res.json({
      avatar_url: updatedUser.avatarUrl,
      message: 'Avatar uploaded successfully'
    });

  } catch (error) {
    next(error);
  }
};