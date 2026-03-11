-- Add wait estimate and seller fee to seller_sessions
ALTER TABLE public.seller_sessions
  ADD COLUMN estimated_wait_minutes integer,
  ADD COLUMN seller_fee_cents integer;

COMMENT ON COLUMN public.seller_sessions.estimated_wait_minutes IS 'Seller-reported wait estimate at go-live time (one of 10, 20, 40)';
COMMENT ON COLUMN public.seller_sessions.seller_fee_cents IS 'Seller fee in cents, capped by wait tier';
