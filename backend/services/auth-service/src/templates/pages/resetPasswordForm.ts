// auth-service/src/templates/pages/resetPasswordForm.ts

export const getResetPasswordFormHtml = (token: string, nonce: string): string => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer Contraseña</title>
  <!-- Añadimos nonce al estilo -->
  <style nonce="${nonce}">
    body { font-family: system-ui, -apple-system, sans-serif; background: #f3f4f6; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
    .card { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
    h2 { text-align: center; color: #111827; margin-top: 0; }
    label { display: block; margin-bottom: 0.5rem; color: #374151; font-size: 0.9rem; }
    input { width: 100%; padding: 0.75rem; margin-bottom: 1rem; border: 1px solid #d1d5db; border-radius: 6px; box-sizing: border-box; }
    button { width: 100%; background: #2563eb; color: white; padding: 0.75rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; }
    button:hover { background: #1d4ed8; }
    .message { margin-top: 1rem; text-align: center; padding: 0.5rem; border-radius: 4px; display: none; }
    .error { background: #fee2e2; color: #991b1b; display: block; }
    .success { background: #d1fae5; color: #065f46; display: block; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Nueva Contraseña</h2>
    <form id="resetForm">
      <input type="hidden" id="token" value="${token}">
      <label>Contraseña nueva</label>
      <input type="password" id="password" required minlength="8">
      <label>Confirmar contraseña</label>
      <input type="password" id="confirmPassword" required>
      <button type="submit" id="submitBtn">Cambiar Contraseña</button>
      <div id="message" class="message"></div>
    </form>
  </div>

  <!-- Añadimos nonce al script -->
  <script nonce="${nonce}">
    document.getElementById('resetForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('message');
      const btn = document.getElementById('submitBtn');
      const p1 = document.getElementById('password').value;
      const p2 = document.getElementById('confirmPassword').value;
      const token = document.getElementById('token').value;

      msg.style.display = 'none';
      
      if (p1 !== p2) {
        msg.textContent = 'Las contraseñas no coinciden';
        msg.className = 'message error';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Enviando...';

      try {
        const res = await fetch(\`/api/auth/reset-password?token=\${token}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_password: p1 })
        });
        
        const data = await res.json();
        
        if (res.ok) {
          msg.textContent = '¡Contraseña actualizada!';
          msg.className = 'message success';
          console.log('Password reset successful');
          document.getElementById('resetForm').reset();
        } else {
          throw new Error(data.error || 'Error desconocido');
        }
      } catch (err) {
        msg.textContent = err.message;
        msg.className = 'message error';
      } finally {
        btn.disabled = false;
        btn.textContent = 'Cambiar Contraseña';
      }
    });
  </script>
</body>
</html>
`;
