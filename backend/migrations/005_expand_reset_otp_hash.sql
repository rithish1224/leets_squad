-- Store hashed OTPs instead of plaintext 6-digit values.
ALTER TABLE users
  ALTER COLUMN reset_otp TYPE VARCHAR(255);
