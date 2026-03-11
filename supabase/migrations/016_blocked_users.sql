-- 016: Blocked Users & User Reports
-- Allows users to block each other (bidirectional filtering) and report abusive users.

-- ── Blocked Users ─────────────────────────────────────────────
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX blocked_users_blocker_id_idx ON public.blocked_users (blocker_id);
CREATE INDEX blocked_users_blocked_id_idx ON public.blocked_users (blocked_id);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can see their own blocks
CREATE POLICY "Users can read own blocks"
  ON public.blocked_users FOR SELECT
  USING (blocker_id = auth.uid());

-- Users can block others
CREATE POLICY "Users can insert own blocks"
  ON public.blocked_users FOR INSERT
  WITH CHECK (blocker_id = auth.uid());

-- Users can unblock
CREATE POLICY "Users can delete own blocks"
  ON public.blocked_users FOR DELETE
  USING (blocker_id = auth.uid());

GRANT SELECT, INSERT, DELETE ON public.blocked_users TO authenticated;
GRANT ALL ON public.blocked_users TO service_role;

-- ── RPC: Bidirectional block check ───────────────────────────
-- Returns all user IDs that should be excluded for the calling user
-- (users they blocked + users who blocked them). SECURITY DEFINER
-- bypasses RLS so we can read blocks in both directions.
CREATE OR REPLACE FUNCTION public.get_blocked_user_ids(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT blocked_id FROM blocked_users WHERE blocker_id = p_user_id
  UNION
  SELECT blocker_id FROM blocked_users WHERE blocked_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_blocked_user_ids(uuid) TO authenticated;

-- ── User Reports ──────────────────────────────────────────────
CREATE TABLE public.user_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  reason text NOT NULL CHECK (reason IN ('inappropriate', 'fraud', 'harassment', 'other')),
  details text CHECK (details IS NULL OR char_length(details) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  admin_notes text,
  CHECK (reporter_id <> reported_id)
);

CREATE INDEX user_reports_status_idx ON public.user_reports (status);
CREATE INDEX user_reports_created_at_idx ON public.user_reports (created_at DESC);
CREATE INDEX user_reports_reporter_id_idx ON public.user_reports (reporter_id);
CREATE INDEX user_reports_reported_id_idx ON public.user_reports (reported_id);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can see their own reports
CREATE POLICY "Users can read own reports"
  ON public.user_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Users can file reports
CREATE POLICY "Users can insert own reports"
  ON public.user_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Admins can see all reports
CREATE POLICY "Admins can read all reports"
  ON public.user_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can update reports (status, notes)
CREATE POLICY "Admins can update reports"
  ON public.user_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

GRANT SELECT, INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
