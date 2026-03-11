-- =============================================================
-- Migration 014: Rate limits & chat message cleanup
-- - Chat message cap: 30 per sender per order
-- - Buyer order spam prevention: max 3 pending/accepted orders
-- - Session order limit: max 10 active orders per seller session
-- - Chat message cleanup function for cron
-- =============================================================

-- ── 1. Chat message cap (30 per sender per order) ───────────

CREATE OR REPLACE FUNCTION public.check_chat_message_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.chat_messages
  WHERE order_id = NEW.order_id
    AND sender_id = NEW.sender_id;

  IF v_count >= 30 THEN
    RAISE EXCEPTION 'CHAT_LIMIT_REACHED: You have reached the maximum of 30 messages for this order';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER chat_messages_limit_check
  BEFORE INSERT ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.check_chat_message_limit();


-- ── 2. Buyer order spam prevention (max 3 pending/accepted) ─

CREATE OR REPLACE FUNCTION public.check_order_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM public.orders
  WHERE buyer_id = NEW.buyer_id
    AND status IN ('pending', 'accepted');

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'ORDER_LIMIT_REACHED: You cannot have more than 3 pending or accepted orders at the same time';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_buyer_rate_limit_check
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_order_rate_limit();


-- ── 3. Session order limit (max 10 active orders per seller session) ─

CREATE OR REPLACE FUNCTION public.check_session_order_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Count non-terminal orders for this seller
  SELECT count(*) INTO v_count
  FROM public.orders
  WHERE seller_id = NEW.seller_id
    AND status IN ('pending', 'accepted', 'in-progress', 'ready');

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'SESSION_ORDER_LIMIT_REACHED: This seller already has 10 active orders';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_session_limit_check
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.check_session_order_limit();


-- ── 4. Chat message cleanup (for cron) ──────────────────────
-- Deletes chat messages where the associated order completed > 30 min ago.
-- Orders use updated_at as the completion timestamp (no completed_at column),
-- but we use the order_events table for precision: the event where
-- to_status = 'completed' gives us the exact completion time.
-- Fallback: if an order is completed and updated_at is > 30 min ago, clean up.

CREATE OR REPLACE FUNCTION public.cleanup_old_chat_messages()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.chat_messages cm
  WHERE EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = cm.order_id
      AND o.status IN ('completed', 'cancelled')
      AND o.updated_at < now() - interval '30 minutes'
  );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Only service_role should call this (from cron)
GRANT EXECUTE ON FUNCTION public.cleanup_old_chat_messages() TO service_role;
