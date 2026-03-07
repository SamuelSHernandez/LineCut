-- Enable REPLICA IDENTITY FULL on orders so that UPDATE events include
-- the full old row in the Supabase Realtime payload. Without this, UPDATE
-- events only include the columns that changed, which breaks our subscriptions
-- that filter on buyer_id / seller_id.
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Enable REPLICA IDENTITY FULL on seller_sessions so UPDATE events
-- (status changes to 'completed' / 'cancelled') include restaurant_id
-- in the payload, allowing clients to filter by restaurant.
ALTER TABLE public.seller_sessions REPLICA IDENTITY FULL;

-- Add both tables to the Supabase Realtime publication.
-- The publication is created by Supabase by default; we just add our tables.
-- If the publication does not exist yet this will error — that is intentional
-- so the migration fails loudly rather than silently skipping Realtime.
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_sessions;
