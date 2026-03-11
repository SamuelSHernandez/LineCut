-- Migration 017: Tips table for post-handoff tipping
-- One tip per order, from buyer to seller

CREATE TABLE tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount > 0), -- cents
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'succeeded', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),

  -- One tip per order
  CONSTRAINT tips_order_unique UNIQUE (order_id)
);

-- Index for seller earnings lookups
CREATE INDEX tips_seller_id_status_idx ON tips (seller_id, status);
CREATE INDEX tips_order_id_idx ON tips (order_id);

-- RLS
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Buyers can insert their own tips
CREATE POLICY tips_buyer_insert ON tips
  FOR INSERT TO authenticated
  WITH CHECK (buyer_id = auth.uid());

-- Buyers can read their own tips
CREATE POLICY tips_buyer_select ON tips
  FOR SELECT TO authenticated
  USING (buyer_id = auth.uid());

-- Sellers can read tips sent to them
CREATE POLICY tips_seller_select ON tips
  FOR SELECT TO authenticated
  USING (seller_id = auth.uid());

-- Buyers can update their own pending tips (for status transitions from webhook)
-- Note: actual status updates happen via service role, but allow buyer read of updated state
-- Service role key bypasses RLS anyway
