-- Order status enum
CREATE TYPE public.order_status AS ENUM (
  'pending',
  'accepted',
  'in-progress',
  'ready',
  'completed',
  'cancelled'
);

-- Orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  special_instructions text NOT NULL DEFAULT '',
  status public.order_status NOT NULL DEFAULT 'pending',
  items_subtotal integer NOT NULL,       -- cents
  seller_fee integer NOT NULL,           -- cents
  platform_fee integer NOT NULL,         -- cents
  total integer NOT NULL,                -- cents
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX orders_buyer_id_idx ON public.orders (buyer_id);
CREATE INDEX orders_seller_id_idx ON public.orders (seller_id);
CREATE INDEX orders_status_idx ON public.orders (status);
CREATE UNIQUE INDEX orders_stripe_pi_idx ON public.orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can read orders placed with them"
  ON public.orders FOR SELECT
  USING (auth.uid() = seller_id);

CREATE POLICY "Buyers can insert own orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update status on their orders"
  ON public.orders FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Payout accounts table
CREATE TABLE public.payout_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  charges_enabled boolean NOT NULL DEFAULT false,
  payouts_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX payout_accounts_user_id_idx ON public.payout_accounts (user_id);
CREATE UNIQUE INDEX payout_accounts_stripe_account_id_idx ON public.payout_accounts (stripe_account_id);

-- RLS
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payout account"
  ON public.payout_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own payout account"
  ON public.payout_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add stripe_customer_id to profiles if not already present
-- (Already added in migration 003, but ensure it exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_customer_id text UNIQUE;
  END IF;
END $$;

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER payout_accounts_updated_at
  BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
