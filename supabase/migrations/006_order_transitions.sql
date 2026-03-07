-- =============================================================
-- Migration 006: Order state machine RPC + audit log
-- Provides atomic, race-condition-safe order status transitions
-- =============================================================

-- ── Audit log table ─────────────────────────────────────────
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

-- RLS: actors can read events for orders they are part of
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

-- ── transition_order RPC ────────────────────────────────────
-- Atomically validates and applies an order status transition.
-- Uses SELECT FOR UPDATE to prevent race conditions.
-- Returns the updated order row.
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
  -- Seller can: accept, start, ready, complete, cancel
  -- Buyer can: complete (confirm pickup), cancel pending
  -- System actor (uuid nil) can cancel anything
  IF p_actor_id = '00000000-0000-0000-0000-000000000000' THEN
    -- System actor: allowed for cancellations only
    IF p_new_status <> 'cancelled' THEN
      RAISE EXCEPTION 'PERMISSION_DENIED: System actor can only cancel orders';
    END IF;
  ELSIF p_actor_id = v_order.seller_id THEN
    -- Seller can do: pending->accepted, pending->cancelled,
    -- accepted->in-progress, in-progress->ready, ready->completed, *->cancelled
    NULL; -- all valid transitions are allowed for seller
  ELSIF p_actor_id = v_order.buyer_id THEN
    -- Buyer can: pending->cancelled, ready->completed
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
      updated_at = now()
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

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, public.order_status, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_order(uuid, public.order_status, uuid, jsonb) TO service_role;

-- Allow inserts into order_events via the RPC (SECURITY DEFINER handles this,
-- but we also need service_role for edge functions)
GRANT INSERT ON public.order_events TO service_role;
GRANT SELECT ON public.order_events TO authenticated;
