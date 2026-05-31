export interface TokenExpiredPageData {
  email: string;
  appUrl: string;
  currentYear: number;
}

export function getTokenExpiredPage(data: TokenExpiredPageData): string {
  const { email, appUrl, currentYear } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Token Expirado - La Costa Running Club</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 48px;
            max-width: 480px;
            text-align: center;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 24px;
          }
          h1 {
            color: #1a202c;
            font-size: 32px;
            margin-bottom: 16px;
          }
          p {
            color: #4a5568;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .info-box {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 32px;
            text-align: left;
          }
          .info-box p {
            color: #92400e;
            font-size: 14px;
            margin: 0;
            line-height: 1.6;
          }
          .buttons {
            display: flex;
            gap: 12px;
            margin-bottom: 24px;
            flex-direction: column;
          }
          .button {
            display: inline-block;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
            border: none;
            cursor: pointer;
            font-size: 16px;
          }
          .button-primary {
            background: #667eea;
            color: white;
          }
          .button-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
          }
          .button-secondary {
            background: #e5e7eb;
            color: #374151;
          }
          .button-secondary:hover {
            background: #d1d5db;
            transform: translateY(-2px);
          }
          .footer {
            margin-top: 32px;
            font-size: 12px;
            color: #a0aec0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">⏰</div>
          <h1>Token Expirado</h1>
          <p>El enlace de verificación ha expirado por razones de seguridad.</p>
          
          <div class="info-box">
            <p><strong>Email:</strong> ${email}</p>
            <p style="margin-top: 8px;">Los enlaces de verificación son válidos por 24 horas.</p>
          </div>

          <div class="buttons">
            <form action="${appUrl}/api/auth/resend-verification-email" method="POST" style="margin: 0;">
              <input type="hidden" name="email" value="${email}">
              <button type="submit" class="button button-primary">
                📧 Reenviar Email de Verificación
              </button>
            </form>
            <a href="${appUrl}/login" class="button button-secondary">
              Volver al Login
            </a>
          </div>

          <div class="footer">
            © ${currentYear} La Costa Running Club
          </div>
        </div>
      </body>
    </html>
  `;
}