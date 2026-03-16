-- ============================================================
-- 033: Waitlist entries with referral tracking
-- ============================================================

CREATE TABLE waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  referral_code text NOT NULL,
  referred_by text,  -- referral_code of the person who referred them
  referral_count int NOT NULL DEFAULT 0,
  credit_earned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Each email can only appear once
CREATE UNIQUE INDEX idx_waitlist_email ON waitlist_entries (email);

-- Referral codes must be unique and are looked up frequently
CREATE UNIQUE INDEX idx_waitlist_referral_code ON waitlist_entries (referral_code);

-- Look up referrals by who referred them
CREATE INDEX idx_waitlist_referred_by ON waitlist_entries (referred_by) WHERE referred_by IS NOT NULL;

-- Enable RLS
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Public insert (anon can subscribe) — handled via API route with rate limiting
-- No direct public access; all operations go through the admin client
-- Service role bypasses RLS

-- Function to increment referral count when someone signs up with a referral code
-- Also marks credit_earned when referral_count hits 3 (first 10 only)
CREATE OR REPLACE FUNCTION increment_referral()
RETURNS trigger AS $$
DECLARE
  credit_count int;
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    -- Check how many people already earned credits
    SELECT COUNT(*) INTO credit_count
    FROM waitlist_entries
    WHERE credit_earned = true;

    UPDATE waitlist_entries
    SET
      referral_count = referral_count + 1,
      credit_earned = CASE
        WHEN referral_count + 1 >= 3 AND credit_earned = false AND credit_count < 10
        THEN true
        ELSE credit_earned
      END
    WHERE referral_code = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_increment_referral
  AFTER INSERT ON waitlist_entries
  FOR EACH ROW
  EXECUTE FUNCTION increment_referral();
