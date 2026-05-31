import { Request, Response, NextFunction } from 'express';
import { prisma } from '@lcrc/shared';
import crypto from 'crypto';
import { emailQueue } from '../queue/emailQueue';
import { getEmailContent, EmailTemplate } from '../utils/emailTemplates';

const APP_URL = process.env.APP_URL || 'http://localhost:3000'; // point to frontend URL, at the moment is apigateway

export async function resendVerificationEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;

    // Validar email
    if (!email || typeof email !== 'string') {
      res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL',
      });
      return;
    }

    // Buscar usuario
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND',
      });
      return;
    }

    // Si el email ya está verificado
    if (user.emailVerified) {
      res.status(400).json({
        error: 'Email is already verified',
        code: 'EMAIL_ALREADY_VERIFIED',
      });
      return;
    }

    // Generar nuevo token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    // Actualizar usuario con nuevo token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken,
        verificationTokenExpires,
      },
    });

    // Preparar datos para el email
    const emailData = {
      template: EmailTemplate.WELCOME,
      data: {
        firstName: user.firstName,
        verificationToken,
        appUrl: APP_URL,
      },
    };

    // Obtener contenido del email
    const emailContent = getEmailContent(emailData);

    // Enviar a la cola de emails
    await emailQueue.add(
      {
        to: email,
        ...emailContent,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    );

    console.log(`📧 Verification email resent to: ${email}`);

    res.status(200).json({
      message: 'Verification email sent successfully',
      email: user.email,
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    next(error);
  }
}