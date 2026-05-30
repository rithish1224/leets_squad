-- Add OTP password reset fields to users table
ALTER TABLE users 
ADD COLUMN reset_otp VARCHAR(6),
ADD COLUMN reset_otp_expires TIMESTAMP,
ADD COLUMN reset_otp_attempts INT DEFAULT 0;

-- Create index for faster OTP lookups
CREATE INDEX idx_users_reset_otp ON users(reset_otp) WHERE reset_otp IS NOT NULL;
