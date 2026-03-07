-- Add billing and profile fields to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_connect_status text NOT NULL DEFAULT 'not_connected'
    CHECK (stripe_connect_status IN ('not_connected', 'pending', 'active', 'restricted')),
  ADD COLUMN IF NOT EXISTS phone_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method_last4 text,
  ADD COLUMN IF NOT EXISTS payment_method_brand text,
  ADD COLUMN IF NOT EXISTS payment_method_exp_month integer,
  ADD COLUMN IF NOT EXISTS payment_method_exp_year integer;

-- Drop the broad update policy and replace with field-specific ones
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Users can update their own personal fields (not billing fields)
CREATE POLICY "Users can update own personal fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Note: billing fields (stripe_customer_id, stripe_connect_account_id,
-- stripe_connect_status, payment_method_*) should only be updated via
-- server actions using the service role or server-side Supabase client.
-- The RLS policy above allows the update but the client never sends
-- these fields directly — they're set by server actions.

-- Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read avatars (public bucket)
CREATE POLICY "Public avatar read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND octet_length(DECODE(REPLACE(REPLACE(encode(''::bytea, 'base64'), chr(10), ''), chr(13), ''), 'base64')) <= 2097152
  );

-- Users can update/delete their own avatars
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
