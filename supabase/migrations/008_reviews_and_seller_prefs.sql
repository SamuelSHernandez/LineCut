-- 008_reviews_and_seller_prefs.sql
-- Adds reviews table, seller preferences (max_order_cap), and rating aggregates on profiles.

-- ── New columns on profiles ─────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS max_order_cap integer NOT NULL DEFAULT 5000
    CHECK (max_order_cap >= 1000 AND max_order_cap <= 20000),
  ADD COLUMN IF NOT EXISTS avg_rating numeric(2,1),
  ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

-- ── Reviews table ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('buyer', 'seller')),
  stars smallint NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One review per party per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_order_reviewer
  ON reviews (order_id, reviewer_id);

-- Fast aggregate lookups by reviewee
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee
  ON reviews (reviewee_id);

-- ── Trigger: auto-update avg_rating / rating_count ──────────────────────────
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(stars)::numeric, 1)
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id
    ),
    rating_count = (
      SELECT COUNT(*)::integer
      FROM reviews
      WHERE reviewee_id = NEW.reviewee_id
    )
  WHERE id = NEW.reviewee_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_profile_rating ON reviews;
CREATE TRIGGER trg_update_profile_rating
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_rating();

-- ── RLS on reviews ──────────────────────────────────────────────────────────
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read reviews (public social proof)
CREATE POLICY "Authenticated users can read reviews"
  ON reviews FOR SELECT
  USING (auth.role() = 'authenticated');

-- Buyer can review on completed orders where they are the buyer
CREATE POLICY "Buyer can insert review on their completed order"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND role = 'buyer'
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.buyer_id = auth.uid()
        AND orders.status = 'completed'
    )
  );

-- Seller can review on completed orders where they are the seller
CREATE POLICY "Seller can insert review on their completed order"
  ON reviews FOR INSERT
  WITH CHECK (
    auth.uid() = reviewer_id
    AND role = 'seller'
    AND EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_id
        AND orders.seller_id = auth.uid()
        AND orders.status = 'completed'
    )
  );

-- ── Profile SELECT policy: allow authenticated users to read any profile ────
-- Buyers need to see seller ratings, caps, names. Profile data is not sensitive.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles'
      AND policyname = 'Authenticated users can read profiles'
  ) THEN
    CREATE POLICY "Authenticated users can read profiles"
      ON profiles FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END;
$$;
