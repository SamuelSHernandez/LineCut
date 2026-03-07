-- Push subscriptions table for Web Push API
CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique per user+endpoint so upserts are idempotent
CREATE UNIQUE INDEX push_subscriptions_user_endpoint_idx
  ON public.push_subscriptions (user_id, endpoint);

-- Fast lookup when sending notifications
CREATE INDEX push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

-- RLS: users can only manage their own subscriptions
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
