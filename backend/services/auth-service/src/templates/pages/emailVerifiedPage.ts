export interface EmailVerifiedPageData {
  email: string;
  firstName: string;
  lastName: string | null;
  appUrl: string;
  currentYear: number;
}

export function getEmailVerifiedPage(data: EmailVerifiedPageData): string {
  const { email, firstName, lastName, appUrl, currentYear } = data;

  return `
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verificado - La Costa Running Club</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
            animation: bounce 1s ease;
          }
          @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          h1 {
            color: #1a202c;
            font-size: 32px;
            margin-bottom: 16px;
          }
          p {
            color: #4a5568;
            font-size: 18px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .info {
            background: #f7fafc;
            border-left: 4px solid #48bb78;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 24px;
            text-align: left;
          }
          .info p {
            margin: 0;
            font-size: 14px;
            color: #2d3748;
            line-height: 1.8;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 14px 32px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
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
          <div class="icon">✅</div>
          <h1>¡Email Verificado!</h1>
          <p>Tu cuenta ha sido verificada exitosamente. Ya puedes disfrutar de todos los beneficios de La Costa Running Club.</p>
          
          <div class="info">
            <p><strong>Usuario verificado:</strong> ${email}</p>
            <p><strong>Nombre:</strong> ${firstName} ${lastName || ''}</p>
          </div>

          <a href="${appUrl}/login" class="button">
            Iniciar Sesión
          </a>

          <div class="footer">
            © ${currentYear} La Costa Running Club
          </div>
        </div>
      </body>
    </html>
  `;
}