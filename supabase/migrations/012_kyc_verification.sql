-- =============================================================
-- Migration 012: KYC identity verification via Didit
-- Sellers must verify identity before going live
-- =============================================================

-- KYC status on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'none'
  CHECK (kyc_status IN ('none', 'pending', 'approved', 'declined'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_session_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_kyc_status_idx ON public.profiles (kyc_status);
