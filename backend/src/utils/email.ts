import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    if (!config.email.user || !config.email.password) {
      console.warn('Email credentials not configured. Email sending will fail.');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: config.email.service,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }
  return transporter;
}

export async function sendOtpEmail(email: string, otp: string, username: string): Promise<boolean> {
  try {
    const transport = getTransporter();
    if (!transport) {
      console.error('Email transporter not configured');
      return false;
    }

    await transport.sendMail({
      from: config.email.from,
      to: email,
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
    });
    return true;
  } catch (error) {
    console.error('Failed to send OTP email:', error);
    return false;
  }
}
