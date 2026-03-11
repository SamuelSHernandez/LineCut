-- Add email_verified column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false;
