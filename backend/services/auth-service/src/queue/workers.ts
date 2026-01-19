import { emailQueue } from './emailQueue';
import { sendEmail } from '../services/emailService';

// Worker que procesa los trabajos de la cola de emails
emailQueue.process(async (job) => {
  const { to, subject, html, text } = job.data;

  try {
    console.log(`📧 Sending email to: ${to}`);
    
    await sendEmail({
      to,
      subject,
      html,
      text,
    });

    return { success: true, recipient: to };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    throw error; // Bull reintentará automáticamente
  }
});

console.log('👷 Email worker started and listening for jobs');
