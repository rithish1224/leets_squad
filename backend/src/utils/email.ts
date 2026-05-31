import { config } from '../config';

export async function sendOtpEmail(email: string, otp: string, username: string): Promise<boolean> {
  const apiKey = config.email.resendApiKey;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured. Email sending will fail.');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LeetSquad <onboarding@resend.dev>',
        to: [email],
        subject: 'LeetSquad - Password Reset OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>Hi ${username},</p>
            <p>We received a request to reset your password. Use the OTP below to proceed:</p>
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h1 style="letter-spacing: 5px; color: #ffffff; margin: 0; font-size: 32px;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP expires in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px;">LeetSquad Team</p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Failed to send OTP email via Resend:', error);
    return false;
  }
}
