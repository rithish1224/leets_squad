import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { query } from '../db';
import { config } from '../config';
import { AppError } from '../utils/errors';
import { normalizeLeetCodeUsername, isValidLeetCodeUsername } from '../utils/leetcode';
import { sendOtpEmail } from '../utils/email';
import { JwtPayload, User, UserPublic } from '../types';

const SALT_ROUNDS = 12;

function toPublicUser(user: User): UserPublic {
  const { password_hash: _, ...publicUser } = user;
  return publicUser;
}

export async function registerUser(data: {
  username: string;
  email: string;
  password: string;
  leetcode_username?: string;
  timezone?: string;
}): Promise<{ user: UserPublic; token: string }> {
  const existing = await query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [data.username, data.email]
  );

  if (existing.rows.length > 0) {
    throw new AppError(409, 'Username or email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  const { rows } = await query<User>(
    `INSERT INTO users (username, email, password_hash, leetcode_username, timezone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.username,
      data.email,
      passwordHash,
      data.leetcode_username
        ? normalizeLeetCodeUsername(data.leetcode_username)
        : null,
      data.timezone ?? 'UTC',
    ]
  );

  const user = rows[0];

  await query(
    'INSERT INTO streaks (user_id, current_streak, longest_streak) VALUES ($1, 0, 0)',
    [user.id]
  );

  const token = generateToken({ userId: user.id, username: user.username });

  return { user: toPublicUser(user), token };
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: UserPublic; token: string }> {
  const { rows } = await query<User>('SELECT * FROM users WHERE email = $1', [email]);

  if (rows.length === 0) {
    throw new AppError(401, 'Invalid email or password');
  }

  const user = rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const token = generateToken({ userId: user.id, username: user.username });

  return { user: toPublicUser(user), token };
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '7d',
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export async function getUserById(id: string): Promise<UserPublic | null> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return rows.length > 0 ? toPublicUser(rows[0]) : null;
}

export async function updateUserSettings(
  userId: string,
  updates: {
    leetcode_username?: string;
    timezone?: string;
    daily_goal?: number;
    weekly_goal?: number;
  }
): Promise<UserPublic> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.leetcode_username !== undefined) {
    const normalized = normalizeLeetCodeUsername(updates.leetcode_username);
    if (normalized && !isValidLeetCodeUsername(normalized)) {
      throw new AppError(400, 'Invalid LeetCode username format');
    }
    fields.push(`leetcode_username = $${idx++}`);
    values.push(normalized || null);
  }
  if (updates.timezone !== undefined) {
    fields.push(`timezone = $${idx++}`);
    values.push(updates.timezone);
  }
  if (updates.daily_goal !== undefined) {
    fields.push(`daily_goal = $${idx++}`);
    values.push(updates.daily_goal);
  }
  if (updates.weekly_goal !== undefined) {
    fields.push(`weekly_goal = $${idx++}`);
    values.push(updates.weekly_goal);
  }

  if (fields.length === 0) {
    const user = await getUserById(userId);
    if (!user) throw new AppError(404, 'User not found');
    return user;
  }

  values.push(userId);
  const { rows } = await query<User>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );

  if (rows.length === 0) throw new AppError(404, 'User not found');
  return toPublicUser(rows[0]);
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const { rowCount } = await query('DELETE FROM users WHERE id = $1', [userId]);

  if (rowCount === 0) {
    throw new AppError(404, 'User not found');
  }
}

export async function getAllUsersWithLeetCode(): Promise<User[]> {
  const { rows } = await query<User>(
    'SELECT * FROM users WHERE leetcode_username IS NOT NULL AND leetcode_username != \'\''
  );
  return rows;
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateResetToken(): string {
  // Generate a secure 64-character hex token
  return randomBytes(32).toString('hex');
}

export async function sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (userRows.length === 0) {
    // Don't reveal if email exists (security best practice)
    return { success: true, message: 'If email exists, OTP will be sent' };
  }

  const user = userRows[0];
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  const resetToken = generateResetToken();
  const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await query(
    'UPDATE users SET reset_otp = $1, reset_otp_expires = $2, reset_otp_attempts = 0, reset_token = $3, reset_token_expires = $4 WHERE id = $5',
    [otpHash, otpExpiresAt, resetToken, tokenExpiresAt, user.id]
  );

  const emailSent = await sendOtpEmail(email, otp, user.username);

  if (!emailSent) {
    throw new AppError(500, 'Failed to send OTP email. Please try again later.');
  }

  return { success: true, message: 'OTP sent to your email', resetToken };
}

export async function verifyResetToken(resetToken: string): Promise<{ email: string; userId: string }> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE reset_token = $1',
    [resetToken]
  );

  if (userRows.length === 0) {
    throw new AppError(401, 'Invalid or expired reset token');
  }

  const user = userRows[0];

  if (!user.reset_token_expires || new Date() > user.reset_token_expires) {
    // Clear expired token
    await query(
      'UPDATE users SET reset_token = NULL, reset_token_expires = NULL WHERE id = $1',
      [user.id]
    );
    throw new AppError(401, 'Reset token has expired');
  }

  return { email: user.email, userId: user.id };
}

export async function verifyOtpAndResetPassword(
  email: string,
  otp: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const { rows: userRows } = await query<User>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (userRows.length === 0) {
    throw new AppError(401, 'User not found');
  }

  const user = userRows[0];

  // Check if OTP exists and is valid
  if (!user.reset_otp) {
    throw new AppError(400, 'No reset request found. Please request a new OTP.');
  }

  // Check if OTP has expired
  if (!user.reset_otp_expires || new Date() > user.reset_otp_expires) {
    // Clear expired OTP
    await query(
      'UPDATE users SET reset_otp = NULL, reset_otp_expires = NULL, reset_otp_attempts = 0 WHERE id = $1',
      [user.id]
    );
    throw new AppError(400, 'OTP has expired. Please request a new one.');
  }

  // Check OTP attempts
  if (user.reset_otp_attempts >= 3) {
    // Clear OTP after too many attempts
    await query(
      'UPDATE users SET reset_otp = NULL, reset_otp_expires = NULL, reset_otp_attempts = 0 WHERE id = $1',
      [user.id]
    );
    throw new AppError(400, 'Too many failed attempts. Please request a new OTP.');
  }

  // Verify OTP
  const validOtp = await bcrypt.compare(otp, user.reset_otp);
  if (!validOtp) {
    // Increment attempts
    await query(
      'UPDATE users SET reset_otp_attempts = reset_otp_attempts + 1 WHERE id = $1',
      [user.id]
    );
    throw new AppError(401, 'Invalid OTP');
  }

  // Password validation
  if (newPassword.length < 6) {
    throw new AppError(400, 'Password must be at least 6 characters');
  }

  // Hash new password and clear OTP
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await query(
    `UPDATE users
     SET password_hash = $1,
         reset_otp = NULL,
         reset_otp_expires = NULL,
         reset_otp_attempts = 0,
         reset_token = NULL,
         reset_token_expires = NULL
     WHERE id = $2`,
    [passwordHash, user.id]
  );

  return { success: true, message: 'Password reset successfully' };
}
