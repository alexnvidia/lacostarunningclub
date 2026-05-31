import { emailQueue } from './emailQueue';
import { sendEmail } from '../services/emailService';

// Worker that processes jobs from the email queue
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
    throw error; // Bull will retry automatically
  }
});

console.log('👷 Email worker started and listening for jobs');
