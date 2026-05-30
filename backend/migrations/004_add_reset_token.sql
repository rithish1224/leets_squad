-- Add secure reset token for password reset (non-OTP version)
-- This token is used instead of email in URL for privacy

ALTER TABLE users ADD COLUMN reset_token VARCHAR(64);
ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP;

CREATE INDEX idx_users_reset_token ON users(reset_token);
