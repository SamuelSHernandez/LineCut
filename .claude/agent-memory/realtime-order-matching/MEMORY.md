# Realtime Order Matching — Agent Memory

## Key File Locations
- `src/hooks/useRealtimeOrders.ts` — Supabase Realtime hook for orders (INSERT for sellers, UPDATE for buyers)
- `src/hooks/useRealtimeSellers.ts` — Supabase Realtime hook for seller_sessions by restaurant
- `src/lib/order-context.tsx` — OrderProvider: fetch-then-subscribe pattern; exposes useOrders, useActiveOrder
- `src/lib/seller-presence-context.tsx` — SellerPresenceProvider: Realtime-backed seller presence
- `src/lib/supabase/client.ts` — Browser Supabase client: `createClient()` via createBrowserClient()
- `supabase/migrations/005_realtime_replica_identity.sql` — REPLICA IDENTITY FULL + publication setup

## Database Schema Highlights
- `orders`: buyer_id, seller_id, restaurant_id, items (jsonb), status (enum), amounts in cents
- `seller_sessions`: seller_id, restaurant_id, status ('active'|'completed'|'cancelled'), started_at
- Profiles table joined as `profiles(display_name, trust_score)` — Supabase returns as array even for FK joins
- RLS: buyers read own orders, sellers read orders where seller_id = auth.uid()

## Supabase Realtime Patterns
- Channel naming: `orders:seller:{userId}`, `orders:buyer:{userId}`, `seller_sessions:restaurant:{restaurantId}`
- Filter syntax: `filter: \`seller_id=eq.${userId}\`` (string template, not object)
- REPLICA IDENTITY FULL required on both `orders` and `seller_sessions` for UPDATE events to include full row
- Tables must be added to `supabase_realtime` publication for Postgres Changes to work
- Cleanup: `supabase.removeChannel(channel)` in useEffect return
- Error handling: subscribe callback receives `(status, err)`; status values: `SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`

## React Compiler Compatibility
- Never call setState directly in Realtime event callbacks — wrap in `setTimeout(fn, 0)`
- This also applies to async callbacks from Supabase `.then()` chains

## Transport Architecture (post-migration)
- Primary: Supabase Realtime postgres_changes (cross-device, cross-browser)
- Local optimistic: direct setState after server action confirms success
- BroadcastChannel (`order-bus.ts`) is dead code — no longer imported by anything
- GoLivePanel no longer publishes seller-online/seller-offline via BroadcastChannel; Realtime handles it

## Seller Presence Context Pattern
- SellerPresenceProvider fetches all active sessions on mount (missed-event recovery)
- `getLiveSellersForRestaurant(restaurantId)` has a side-effect: it registers `watchedRestaurantId`
  so the Realtime subscription activates for that restaurant
- Supabase join `profiles(display_name, trust_score)` returns profiles as an array — access via `[0]`
- Falls back to hardcoded demo sellers (`getSellersByRestaurant`) when no live sellers exist

## Fetch-then-Subscribe Pattern (Order Context)
- On mount: fetch non-terminal orders for the user (role determines filter column)
- Then subscribe: Realtime events fill in new changes
- Deduplication: setOrders checks `prev.some(o => o.id === newOrder.id)` before adding
- Display fields (restaurantName, sellerName, buyerName) are client-side only — preserved on UPDATE via spread

## Known Limitations
- seller_sessions does not store fee or positionInLine — synthesized with placeholders in sessionToSeller()
- `use-push-notifications.ts` has a pre-existing ArrayBufferLike TS error unrelated to this work
