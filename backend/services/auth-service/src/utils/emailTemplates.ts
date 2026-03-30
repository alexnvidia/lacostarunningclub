import { getWelcomeEmailTemplate } from '../templates/emails/welcome';
import type { WelcomeEmailData } from '../templates/emails/welcome';
import { getPasswordResetEmailTemplate } from '../templates/emails/passwordReset';
import type { PasswordResetEmailData } from '../templates/emails/passwordReset';

export enum EmailTemplate {
  WELCOME = 'welcome',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFICATION = 'email_verification',
}

// Specific types for each template
type PasswordResetData = {
  firstName: string;
  resetToken: string;
  appUrl: string;
};

type EmailVerificationData = {
  firstName: string;
  verificationToken: string;
  appUrl: string;
};

// Union type for all possible data
type EmailTemplateData = WelcomeEmailData | PasswordResetData | EmailVerificationData;

export interface EmailData {
  template: EmailTemplate;
  data: EmailTemplateData;
}

export function getEmailContent(emailData: EmailData): { subject: string; html: string; text: string } {
  switch (emailData.template) {
    case EmailTemplate.WELCOME:
      return {
        subject: '¡Bienvenido a La Costa Running Club! 🏃',
        ...getWelcomeEmailTemplate(emailData.data as WelcomeEmailData),
      };

    case EmailTemplate.PASSWORD_RESET:
      const resetData = emailData.data as PasswordResetEmailData;
      return {
        subject: '🔐 Restablece tu contraseña - La Costa Running Club',
        ...getPasswordResetEmailTemplate(resetData),
      };

    case EmailTemplate.EMAIL_VERIFICATION:
      const verifyData = emailData.data as EmailVerificationData;
      const verificationUrl = `${verifyData.appUrl}/auth/verify-email?token=${verifyData.verificationToken}`;
      return {
        subject: 'Verifica tu correo electrónico - La Costa Running Club 🏃',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>¡Bienvenido a La Costa Running Club, ${verifyData.firstName}! 🏃</h2>
            <p>Gracias por registrarte. Para completar tu registro, necesitamos que verifiques tu correo electrónico.</p>
            <p style="margin: 20px 0;">
              <a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Verificar Correo Electrónico
              </a>
            </p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 3px;">
              ${verificationUrl}
            </p>
            <p style="color: #666; font-size: 12px;">
              Este enlace expirará en 24 horas.<br>
              Si no creaste esta cuenta, ignora este correo.
            </p>
          </div>
        `,
        text: `¡Bienvenido a La Costa Running Club, ${verifyData.firstName}!\n\nVerifica tu correo aquí:\n${verificationUrl}\n\nEste enlace expirará en 24 horas.`,
      };

    default:
      throw new Error(`Unknown email template: ${emailData.template}`);
  }
}
