export interface WelcomeEmailData {
  firstName: string;
  verificationToken: string;
  appUrl: string;
}

export function getWelcomeEmailTemplate( data: WelcomeEmailData): { html: string; text: string } {
  const { firstName, verificationToken, appUrl } = data;
  const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;
  const currentYear = new Date().getFullYear();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
      <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header con logo (opcional) -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🏃 La Costa Running Club</h1>
        </div>

        <!-- Saludo -->
        <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">
          ¡Hola ${firstName}!
        </h2>

        <!-- Cuerpo del mensaje -->
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Gracias por registrarte en <strong>La Costa Running Club</strong>. Estamos emocionados de tenerte en nuestra comunidad de corredores.
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Para completar tu registro y verificar tu cuenta, por favor haz clic en el botón de abajo:
        </p>

        <!-- Botón CTA -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            Verificar mi correo electrónico
          </a>
        </div>

        <!-- Enlace alternativo -->
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        <p style="color: #2563eb; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
          ${verificationUrl}
        </p>

        <!-- Advertencia -->
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
            <strong>⚠️ Importante:</strong> Si no creaste esta cuenta, puedes ignorar este mensaje. Este enlace expirará en 24 horas.
          </p>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; margin-top: 30px; padding: 20px;">
        <p style="color: #9ca3af; font-size: 12px; line-height: 1.5;">
          © ${currentYear} La Costa Running Club. Todos los derechos reservados.
        </p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 10px;">
          Este es un correo automático, por favor no respondas a este mensaje.
        </p>
      </div>
    </div>
  `;

  const text = `
Hola ${firstName},

Gracias por registrarte en La Costa Running Club. Estamos emocionados de tenerte en nuestra comunidad de corredores.

Para completar tu registro y verificar tu cuenta, por favor accede al siguiente enlace:

${verificationUrl}

IMPORTANTE: Si no creaste esta cuenta, puedes ignorar este mensaje. Este enlace expirará en 24 horas.

---
© ${currentYear} La Costa Running Club. Todos los derechos reservados.
Este es un correo automático, por favor no respondas a este mensaje.
  `.trim();

  return { html, text };
}
