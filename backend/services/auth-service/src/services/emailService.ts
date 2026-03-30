import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

console.log('📧 SMTP Configuration:', {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE,
  user: process.env.SMTP_USER ? '✓' : '✗',
  pass: process.env.SMTP_PASS ? '✓' : '✗',
});
// Configure nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.SMTP_PORT || '2525', 10),
  //secure: process.env.SMTP_SECURE === 'false', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },

  requireTLS: true,
  tls: {
    // Do not verify certificate (only for development)
    ciphers: 'SSLv3',
    rejectUnauthorized: false,
  },

});

// Verify configuration on startup
transporter.verify((error, _success) => {
  if (error) {
    console.error('❌ SMTP configuration error:', error);
  } else {
    console.log('✅ SMTP server ready to send emails');
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"lcrc-dev" <no-reply@lcrc-dev.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Email sent successfully to ${options.to}`);
}
