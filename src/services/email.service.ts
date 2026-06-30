import { env } from '../config/environment';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export class EmailService {
  private async sendEmail(payload: EmailPayload): Promise<void> {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      throw new Error('Email service is not configured');
    }

    const from = env.RESEND_FROM_NAME
      ? `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`
      : env.RESEND_FROM_EMAIL;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(async () => ({ message: await response.text() }));
      const message = typeof errorPayload?.message === 'string'
        ? errorPayload.message
        : 'Unable to send email';
      throw new Error(message);
    }
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
    const safeUrl = escapeHtml(resetUrl);

    await this.sendEmail({
      to,
      subject: 'Reset your Farm Mall password',
      text: [
        'Reset your Farm Mall password',
        '',
        'We received a request to reset your password. Use the link below within 15 minutes:',
        resetUrl,
        '',
        'If you did not request this, you can safely ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h1 style="font-size: 20px;">Reset your Farm Mall password</h1>
          <p>We received a request to reset your password. Use this link within 15 minutes:</p>
          <p><a href="${safeUrl}" style="color: #166534;">Reset password</a></p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  async sendPasswordChangedEmail(to: string): Promise<void> {
    await this.sendEmail({
      to,
      subject: 'Your Farm Mall password was changed',
      text: [
        'Your Farm Mall password was changed',
        '',
        'This is a security notice confirming that your password was changed.',
        'If you did not make this change, reset your password immediately and contact support.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h1 style="font-size: 20px;">Your password was changed</h1>
          <p>This is a security notice confirming that your Farm Mall password was changed.</p>
          <p>If you did not make this change, reset your password immediately and contact support.</p>
        </div>
      `,
    });
  }

  async sendVerificationOtpEmail(to: string, otp: string): Promise<void> {
    const safeOtp = escapeHtml(otp);

    await this.sendEmail({
      to,
      subject: 'Verify your Farm Mall email',
      text: [
        'Verify your Farm Mall email',
        '',
        `Your verification code is ${otp}.`,
        'This code expires in 10 minutes.',
        '',
        'If you did not create a Farm Mall account, you can ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
          <h1 style="font-size: 20px;">Verify your Farm Mall email</h1>
          <p>Your verification code is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${safeOtp}</p>
          <p>This code expires in 10 minutes.</p>
          <p>If you did not create a Farm Mall account, you can ignore this email.</p>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
