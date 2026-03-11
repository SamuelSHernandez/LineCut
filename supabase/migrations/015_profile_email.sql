-- Add optional email column to profiles for transactional email notifications.
-- Email is nullable since LineCut uses phone OTP auth — users opt in to email later.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- RLS: users can read their own email
-- (profiles already has RLS enabled and a SELECT policy; email is included automatically
-- since the existing policy allows users to select their own row.)

-- If there is no existing UPDATE policy that covers email, add one.
-- The existing update policy should already allow users to update their own profile row.
-- This is a safe no-op if the column is already covered by existing policies.

COMMENT ON COLUMN profiles.email IS 'Optional email for transactional notifications (order confirmations, receipts, payout summaries)';
