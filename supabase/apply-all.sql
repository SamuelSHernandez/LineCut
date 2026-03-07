-- ============================================================
-- LineCut: Migrations 002–007 (profiles already exists)
-- Paste into Supabase SQL Editor and run once
-- ============================================================

-- ═══════════════════════════════════════════════════════════
-- 002: Restaurants & Seller Sessions
-- ═══════════════════════════════════════════════════════════

create table public.restaurants (
  id text primary key,
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  cuisine text[] not null default '{}',
  default_wait_estimate text not null default '~15 min',
  created_at timestamptz not null default now()
);

insert into public.restaurants (id, name, address, lat, lng, cuisine, default_wait_estimate) values
  ('katzs', 'Katz''s Delicatessen', '205 E Houston St', 40.7223, -73.9874, '{Deli,Sandwich}', '~25 min'),
  ('joes-pizza', 'Joe''s Pizza', '7 Carmine St', 40.7308, -74.0021, '{Pizza}', '~12 min'),
  ('russ-daughters', 'Russ & Daughters', '179 E Houston St', 40.7222, -73.9882, '{Deli,Bagels}', '~15 min');

alter table public.restaurants enable row level security;

create policy "Anyone can read restaurants"
  on public.restaurants for select
  using (true);

create table public.seller_sessions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id text not null references public.restaurants(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  wait_duration_minutes integer,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index seller_sessions_restaurant_id_idx on public.seller_sessions (restaurant_id);
create index seller_sessions_started_at_idx on public.seller_sessions (started_at);
create unique index seller_sessions_active_per_seller_idx
  on public.seller_sessions (seller_id) where (status = 'active');

alter table public.seller_sessions enable row level security;

create policy "Anyone can read seller sessions"
  on public.seller_sessions for select
  using (true);

create policy "Sellers can insert own sessions"
  on public.seller_sessions for insert
  with check (auth.uid() = seller_id);

create policy "Sellers can update own sessions"
  on public.seller_sessions for update
  using (auth.uid() = seller_id)
  with check (auth.uid() = seller_id);

create or replace function get_wait_time_stats(p_hour integer, p_is_weekend boolean)
returns table (
  restaurant_id text,
  avg_wait_minutes integer,
  report_count bigint,
  active_sellers bigint
)
language sql stable
as $$
  select
    r.id as restaurant_id,
    coalesce(
      (select round(avg(s.wait_duration_minutes))::integer
       from public.seller_sessions s
       where s.restaurant_id = r.id
         and s.status = 'completed'
         and s.wait_duration_minutes is not null
         and s.ended_at >= now() - interval '30 days'
         and abs(extract(hour from s.started_at) - p_hour) <= 1
         and (
           (p_is_weekend and extract(dow from s.started_at) in (0, 6))
           or (not p_is_weekend and extract(dow from s.started_at) not in (0, 6))
         )
      ), 0
    ) as avg_wait_minutes,
    (select count(*)
     from public.seller_sessions s
     where s.restaurant_id = r.id
       and s.status = 'completed'
       and s.wait_duration_minutes is not null
       and s.ended_at >= now() - interval '30 days'
       and abs(extract(hour from s.started_at) - p_hour) <= 1
       and (
         (p_is_weekend and extract(dow from s.started_at) in (0, 6))
         or (not p_is_weekend and extract(dow from s.started_at) not in (0, 6))
       )
    ) as report_count,
    (select count(*)
     from public.seller_sessions s
     where s.restaurant_id = r.id
       and s.status = 'active'
    ) as active_sellers
  from public.restaurants r;
$$;

-- ═══════════════════════════════════════════════════════════
-- 003: Profile billing fields + avatars storage
-- ═══════════════════════════════════════════════════════════

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

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own personal fields" ON public.profiles;

CREATE POLICY "Users can update own personal fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (use DO block to skip if they already exist)
DO $$ BEGIN
  CREATE POLICY "Public avatar read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can upload own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own avatar"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'avatars'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own avatar"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'avatars'
      AND auth.role() = 'authenticated'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 004: Orders & Payout accounts
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM (
    'pending', 'accepted', 'in-progress', 'ready', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  restaurant_id text NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  special_instructions text NOT NULL DEFAULT '',
  status public.order_status NOT NULL DEFAULT 'pending',
  items_subtotal integer NOT NULL,
  seller_fee integer NOT NULL,
  platform_fee integer NOT NULL,
  total integer NOT NULL,
  stripe_payment_intent_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX orders_buyer_id_idx ON public.orders (buyer_id);
CREATE INDEX orders_seller_id_idx ON public.orders (seller_id);
CREATE INDEX orders_status_idx ON public.orders (status);
CREATE UNIQUE INDEX orders_stripe_pi_idx ON public.orders (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

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

CREATE UNIQUE INDEX payout_accounts_user_id_idx ON public.payout_accounts (user_id);
CREATE UNIQUE INDEX payout_accounts_stripe_account_id_idx ON public.payout_accounts (stripe_account_id);

ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payout account"
  ON public.payout_accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own payout account"
  ON public.payout_accounts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

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

-- ═══════════════════════════════════════════════════════════
-- 005: Realtime replica identity
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.seller_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_sessions;

-- ═══════════════════════════════════════════════════════════
-- 006: Order state machine RPC + audit log
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status NOT NULL,
  to_status public.order_status NOT NULL,
  actor_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_events_order_id_idx ON public.order_events (order_id);
CREATE INDEX order_events_created_at_idx ON public.order_events (created_at);

ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can read own order events"
  ON public.order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_events.order_id
        AND orders.buyer_id = auth.uid()
    )
  );

CREATE POLICY "Sellers can read own order events"
  ON public.order_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_events.order_id
        AND orders.seller_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.transition_order(
  p_order_id uuid,
  p_new_status public.order_status,
  p_actor_id uuid,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order public.orders;
  v_old_status public.order_status;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
  END IF;

  v_old_status := v_order.status;

  IF v_old_status = p_new_status THEN
    RETURN v_order;
  END IF;

  IF NOT (
    (v_old_status = 'pending'      AND p_new_status = 'accepted')    OR
    (v_old_status = 'pending'      AND p_new_status = 'cancelled')   OR
    (v_old_status = 'accepted'     AND p_new_status = 'in-progress') OR
    (v_old_status = 'accepted'     AND p_new_status = 'cancelled')   OR
    (v_old_status = 'in-progress'  AND p_new_status = 'ready')       OR
    (v_old_status = 'in-progress'  AND p_new_status = 'cancelled')   OR
    (v_old_status = 'ready'        AND p_new_status = 'completed')   OR
    (v_old_status = 'ready'        AND p_new_status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot transition from % to %', v_old_status, p_new_status;
  END IF;

  IF p_actor_id = '00000000-0000-0000-0000-000000000000' THEN
    IF p_new_status <> 'cancelled' THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: System actor can only cancel orders';
    END IF;
  ELSIF p_actor_id = v_order.seller_id THEN
    NULL;
  ELSIF p_actor_id = v_order.buyer_id THEN
    IF NOT (
      (v_old_status = 'pending' AND p_new_status = 'cancelled') OR
      (v_old_status = 'ready'   AND p_new_status = 'completed')
    ) THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: Buyer cannot perform this transition (% -> %)', v_old_status, p_new_status;
    END IF;
  ELSE
    RAISE EXCEPTION 'PERMISSION_DENIED: Actor % is neither buyer nor seller on this order', p_actor_id;
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.order_events (order_id, from_status, to_status, actor_id, metadata)
  VALUES (p_order_id, v_old_status, p_new_status, p_actor_id, p_metadata);

  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.transition_order(uuid, public.order_status, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, public.order_status, uuid, jsonb) TO service_role;
GRANT INSERT ON public.order_events TO service_role;
GRANT SELECT ON public.order_events TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 007: Push subscriptions
-- ═══════════════════════════════════════════════════════════

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX push_subscriptions_user_endpoint_idx
  ON public.push_subscriptions (user_id, endpoint);

CREATE INDEX push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);
