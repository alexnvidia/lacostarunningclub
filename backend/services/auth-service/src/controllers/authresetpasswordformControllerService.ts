import { Request, Response } from 'express';
import crypto from 'crypto';
import { getResetPasswordFormHtml } from '../templates/pages/resetPasswordForm'; 

export function getResetPasswordForm(req: Request, res: Response): void {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    res.status(400).send('<h1>Error: Token de restablecimiento no proporcionado</h1>');
    return;
  }

  // 1. Generate a nonce for CSP
  const nonce = crypto.randomBytes(16).toString('base64');

  // 2. configure the header Content-Security-Policy
  // allow scripts and styles only with the generated nonce
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'`
  );

  // 3. Generate the HTML form with the token and nonce
  const html = getResetPasswordFormHtml(token, nonce);

  res.send(html);
}
