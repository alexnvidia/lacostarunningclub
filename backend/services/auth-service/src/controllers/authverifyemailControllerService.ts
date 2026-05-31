import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import { getEmailVerifiedPage } from '../templates/pages/emailVerifiedPage';
import { getTokenExpiredPage } from '../templates/pages/tokenExpiredPage';

const APP_URL = process.env.APP_URL || 'http://localhost:3000'; // point to frontend URL, at the moment is apigateway

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token } = req.query;

    // validate token presence
    if (!token || typeof token !== 'string') {
      res.status(400).json({
        error: 'Verification token is required',
        code: 'MISSING_TOKEN',
      });
      return;
    }

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        verificationToken: token,
        emailVerified: false, // Only unverified users emails
      },
    });
    console.log('APP_URL:', APP_URL);
    //verify expired verification token
    if (user && user.verificationTokenExpires) {
      const now = new Date();
      if (user.verificationTokenExpires < now) {
        const htmlExpiredPage = getTokenExpiredPage({
          email: user.email,
          appUrl: APP_URL,
          currentYear: new Date().getFullYear(),
        });

        // html response to better display in browser
        res.status(200).send(htmlExpiredPage);
        return;
      }
    } else if (user && !user.verificationTokenExpires) {
      // If no expiration date is set, consider the token as expired for security reasons
      res.status(400).json({
        error: 'Verification token has expired',
        code: 'TOKEN_EXPIRED',
      });
      return;
    }

    // If no user found with the token or token is invalid

    if (!user) {
      res.status(404).json({
        error: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN',
      });
      return;
    }

    // Update user: mark email as verified and remove the token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null, // clean the token explicitly
        verificationTokenExpires: null, // clean the expiration explicitly
      },
    });

    console.log(`✅ Email verified for user: ${user.email}`);

    // Use the template
    const htmlPage = getEmailVerifiedPage({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      appUrl: APP_URL,
      currentYear: new Date().getFullYear(),
    });

    // html response to better display in browser
    res.status(200).send(htmlPage);
  } catch (error) {
    console.error('Error verifying email:', error);
    next(error);
  }
}
