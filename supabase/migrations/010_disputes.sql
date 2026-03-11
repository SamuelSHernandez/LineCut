-- 010: Disputes / Support Flow
-- Allows buyers and sellers to file disputes on completed or cancelled orders.

CREATE TABLE public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reporter_role text NOT NULL CHECK (reporter_role IN ('buyer', 'seller')),
  reason text NOT NULL CHECK (reason IN ('wrong_items', 'missing_items', 'food_quality', 'no_show', 'rude_behavior', 'payment_issue', 'other')),
  description text NOT NULL CHECK (char_length(description) <= 500),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_no_action', 'resolved_warning')),
  resolution_notes text,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, reporter_id)
);

CREATE INDEX disputes_order_id_idx ON public.disputes (order_id);
CREATE INDEX disputes_status_idx ON public.disputes (status);
CREATE INDEX disputes_created_at_idx ON public.disputes (created_at DESC);

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

-- Reporter can read their own disputes
CREATE POLICY "Users can read own disputes"
  ON public.disputes FOR SELECT
  USING (reporter_id = auth.uid());

-- Other party on the order can also read
CREATE POLICY "Order participants can read disputes"
  ON public.disputes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = disputes.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- Only order participants can insert
CREATE POLICY "Order participants can file disputes"
  ON public.disputes FOR INSERT
  WITH CHECK (
    reporter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = disputes.order_id
        AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
        AND orders.status IN ('completed', 'cancelled')
    )
  );

-- Admin policy for resolving (service_role bypasses RLS)
GRANT ALL ON public.disputes TO service_role;
GRANT SELECT, INSERT ON public.disputes TO authenticated;
