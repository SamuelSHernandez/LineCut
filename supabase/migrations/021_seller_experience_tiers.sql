-- Add completed_deliveries counter to profiles for experience-based fee scaling
ALTER TABLE public.profiles
  ADD COLUMN completed_deliveries integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.completed_deliveries IS 'Number of completed deliveries. Used to determine seller experience tier for fee cap scaling.';

-- Index for queries that filter/sort by delivery count
CREATE INDEX profiles_completed_deliveries_idx ON public.profiles (completed_deliveries);

-- Trigger: increment completed_deliveries when an order transitions to completed
CREATE OR REPLACE FUNCTION increment_seller_deliveries()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status <> 'completed' THEN
    UPDATE public.profiles
      SET completed_deliveries = completed_deliveries + 1
      WHERE id = NEW.seller_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_completed_increment_deliveries
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION increment_seller_deliveries();
