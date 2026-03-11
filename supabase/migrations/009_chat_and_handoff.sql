-- =============================================================
-- Migration 009: Chat messages, handoff confirmations, ready_at
-- Enables in-app chat and mutual hand-off confirmation flow
-- =============================================================

-- ── chat_messages table ───────────────────────────────────────
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_messages_order_created_idx ON public.chat_messages (order_id, created_at);

-- Enable Realtime for chat_messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- RLS: only buyer/seller on the order can SELECT/INSERT
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can read chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = chat_messages.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can send chat messages when order is active"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = chat_messages.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        AND orders.status IN ('accepted', 'in-progress', 'ready')
    )
  );

-- ── handoff_confirmations table ───────────────────────────────
CREATE TABLE public.handoff_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  confirmed_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('buyer', 'seller')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, role)
);

ALTER TABLE public.handoff_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order participants can read handoff confirmations"
  ON public.handoff_confirmations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = handoff_confirmations.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

CREATE POLICY "Order participants can insert own handoff confirmation when ready"
  ON public.handoff_confirmations FOR INSERT
  WITH CHECK (
    confirmed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = handoff_confirmations.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        AND orders.status = 'ready'
    )
  );

-- ── Add ready_at column to orders ─────────────────────────────
ALTER TABLE public.orders ADD COLUMN ready_at timestamptz;

-- ── Amend transition_order RPC: set ready_at when transitioning to ready ──
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
  -- Lock the row to prevent concurrent transitions
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order % does not exist', p_order_id;
  END IF;

  v_old_status := v_order.status;

  -- Idempotent: if already in target status, return as-is
  IF v_old_status = p_new_status THEN
    RETURN v_order;
  END IF;

  -- ── Validate transition is legal ──
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

  -- ── Validate actor permissions ──
  IF p_actor_id = '00000000-0000-0000-0000-000000000000' THEN
    IF p_new_status <> 'cancelled' THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: System actor can only cancel orders';
    END IF;
  ELSIF p_actor_id = v_order.seller_id THEN
    NULL; -- all valid transitions are allowed for seller
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

  -- ── Apply the transition ──
  UPDATE public.orders
  SET status = p_new_status,
      updated_at = now(),
      ready_at = CASE WHEN p_new_status = 'ready' THEN now() ELSE ready_at END
  WHERE id = p_order_id;

  -- ── Write audit event ──
  INSERT INTO public.order_events (order_id, from_status, to_status, actor_id, metadata)
  VALUES (p_order_id, v_old_status, p_new_status, p_actor_id, p_metadata);

  -- Re-fetch updated row to return
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id;

  RETURN v_order;
END;
$$;

-- Grant permissions (re-grant after CREATE OR REPLACE)
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, public.order_status, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, public.order_status, uuid, jsonb) TO service_role;

-- Grant chat and handoff table permissions
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT ON public.handoff_confirmations TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
GRANT ALL ON public.handoff_confirmations TO service_role;
