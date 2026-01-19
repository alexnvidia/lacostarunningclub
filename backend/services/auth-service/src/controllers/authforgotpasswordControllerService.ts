import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { emailQueue } from '../queue/emailQueue';
import { EmailTemplate, getEmailContent } from '../utils/emailTemplates';

const prisma = new PrismaClient();
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: 'Email is required',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // for security reasons, always respond with success
    // this avoid that an attacker can verify if an email exists in the system
    if (!user) {
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      res.status(200).json({
        message: 'If the email exists, a password reset link has been sent',
      });
      return;
    }

    // generate token and expiry date for password reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // save token and expiry to user record on database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry,
      },
    });

    // generate email content
    const emailContent = getEmailContent({
      template: EmailTemplate.PASSWORD_RESET,
      data: {
        firstName: user.firstName,
        resetToken,
        appUrl: APP_URL,
      },
    });

    // queue email to be sent
    try {
      await emailQueue.add(
        {
          to: user.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        }
      );

      console.log(`📧 Password reset email queued for: ${user.email}`);
    } catch (emailError) {
      console.error('Failed to queue password reset email:', emailError);
      // not fail request, just log the error even the email queuing failed
    }

    // always respond with success, to avoid email enumeration
    res.status(200).json({
      message: 'If the email exists, a password reset link has been sent',
    });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    next(error);
  }
}
