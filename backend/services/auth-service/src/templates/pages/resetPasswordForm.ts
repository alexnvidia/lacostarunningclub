// auth-service/src/templates/pages/resetPasswordForm.ts

export const getResetPasswordFormHtml = (token: string, nonce: string, frontendUrl: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña</title>
  <style nonce="${nonce}">
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
    }
    .card {
      background: #ffffff;
      padding: 2.5rem 2rem;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      width: 100%;
      max-width: 420px;
    }
    .card-title {
      text-align: center;
      color: #111827;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1.75rem;
    }
    label {
      display: block;
      margin-bottom: 0.4rem;
      color: #374151;
      font-size: 0.875rem;
      font-weight: 500;
    }
    input[type="password"] {
      width: 100%;
      padding: 0.7rem 0.9rem;
      margin-bottom: 1.1rem;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s;
    }
    input[type="password"]:focus { border-color: #2563eb; }
    .btn-submit {
      width: 100%;
      background: #2563eb;
      color: white;
      padding: 0.8rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 1rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-submit:hover:not(:disabled) { background: #1d4ed8; transform: translateY(-1px); }
    .btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }

    /* Feedback messages */
    .feedback { display: none; margin-top: 1rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; }
    .feedback.error   { display: block; background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
    .feedback.success { display: block; background: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }

    /* Success card */
    .success-card { display: none; text-align: center; }
    .success-icon { font-size: 3.5rem; margin-bottom: 1rem; }
    .success-card h3 { color: #065f46; font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; }
    .success-card p  { color: #374151; font-size: 0.9rem; line-height: 1.6; margin-bottom: 1.25rem; }
    .btn-login {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 0.7rem 1.75rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-login:hover { background: #1d4ed8; transform: translateY(-1px); }
    .close-hint { margin-top: 1rem; font-size: 0.8rem; color: #6b7280; }
  </style>
</head>
<body>
  <div class="card">
    <h2 class="card-title">Nueva Contraseña</h2>

    <!-- Form (hidden after success) -->
    <div id="formWrapper">
      <form id="resetForm">
        <input type="hidden" id="token" value="${token}">
        <label for="password">Contraseña nueva</label>
        <input type="password" id="password" required minlength="8" autocomplete="new-password">
        <label for="confirmPassword">Confirmar contraseña</label>
        <input type="password" id="confirmPassword" required autocomplete="new-password">
        <button type="submit" id="submitBtn" class="btn-submit">Cambiar Contraseña</button>
        <div id="errorMsg" class="feedback error"></div>
      </form>
    </div>

    <!-- Success card (shown after successful reset) -->
    <div id="successCard" class="success-card">
      <div class="success-icon">✅</div>
      <h3>¡Contraseña actualizada!</h3>
      <p>Tu contraseña ha sido restablecida correctamente. Ya puedes iniciar sesión con tu nueva contraseña.</p>
      <a href="${frontendUrl}/login" class="btn-login">Ir al inicio de sesión</a>
      <p class="close-hint">También puedes cerrar esta ventana.</p>
    </div>
  </div>

  <script nonce="${nonce}">
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorMsg = document.getElementById('errorMsg');
      const btn      = document.getElementById('submitBtn');
      const p1       = document.getElementById('password').value;
      const p2       = document.getElementById('confirmPassword').value;
      const token    = document.getElementById('token').value;

      // Hide previous error
      errorMsg.className = 'feedback';

      if (p1 !== p2) {
        errorMsg.textContent = 'Las contraseñas no coinciden. Por favor, compruébalas e inténtalo de nuevo.';
        errorMsg.className = 'feedback error';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando…';

      try {
        const res = await fetch(\`/api/auth/reset-password?token=\${token}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: p1 }),
        });

        const data = await res.json();

        if (res.ok) {
          // Show success card, hide form
          document.getElementById('formWrapper').style.display = 'none';
          const successCard = document.getElementById('successCard');
          successCard.style.display = 'block';
        } else {
          throw new Error(data.error || 'Error al restablecer la contraseña. El enlace puede haber expirado.');
        }
      } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.className = 'feedback error';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Cambiar Contraseña';
      }
    });
  </script>
</body>
</html>
`;

