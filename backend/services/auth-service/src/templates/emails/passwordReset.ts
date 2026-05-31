export interface PasswordResetEmailData {
  firstName: string;
  resetToken: string;
  appUrl: string;
}

export function getPasswordResetEmailTemplate(data: PasswordResetEmailData): { html: string; text: string } {
  const { firstName, resetToken, appUrl } = data;
  const resetUrl = `${appUrl}/api/auth/reset-password-form?token=${resetToken}`;
  const currentYear = new Date().getFullYear();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
      <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0; font-size: 28px;">🏃 La Costa Running Club</h1>
        </div>

        <!-- Saludo -->
        <h2 style="color: #1f2937; font-size: 24px; margin-bottom: 20px;">
          Hola ${firstName},
        </h2>

        <!-- Cuerpo -->
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.
        </p>

        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Si fuiste tú quien solicitó este cambio, haz clic en el botón de abajo para crear una nueva contraseña:
        </p>

        <!-- Botón CTA -->
        <div style="text-align: center; margin: 40px 0;">
          <a href="${resetUrl}" 
             style="background-color: #dc2626; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
            Restablecer Contraseña
          </a>
        </div>

        <!-- Enlace alternativo -->
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          Si el botón no funciona, copia y pega este enlace en tu navegador:
        </p>
        <p style="color: #2563eb; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
          ${resetUrl}
        </p>


        <!-- Advertencia de seguridad -->
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 30px; border-radius: 4px;">
          <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
            <strong>⚠️ Importante:</strong>
          </p>
          <ul style="color: #92400e; font-size: 14px; margin: 10px 0 0 20px; line-height: 1.5;">
            <li>Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.</li>
            <li>Este enlace expirará en 1 hora.</li>
            <li>Por seguridad, nunca compartas este enlace con nadie.</li>
          </ul>
        </div>

        <!-- Info adicional -->
        <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-top: 30px;">
          Si tienes problemas, contacta con nuestro equipo de soporte.
        </p>
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

Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en La Costa Running Club.

Si fuiste tú quien solicitó este cambio, accede al siguiente enlace para crear una nueva contraseña:

${resetUrl}

IMPORTANTE:
- Si no solicitaste este cambio, ignora este correo. Tu contraseña no cambiará.
- Este enlace expirará en 1 hora.
- Por seguridad, nunca compartas este enlace con nadie.

Si tienes problemas, contacta con nuestro equipo de soporte.

---
© ${currentYear} La Costa Running Club. Todos los derechos reservados.
Este es un correo automático, por favor no respondas a este mensaje.
  `.trim();

  return { html, text };
}
