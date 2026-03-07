# Push Notification Engineer — Memory

## Key Files Owned
- `public/sw.js` — Service Worker (push + notificationclick handlers)
- `src/lib/use-push-notifications.ts` — Client hook
- `src/lib/push.ts` — Server-side fire-and-forget helper (`sendPush`)
- `src/app/api/push/send/route.ts` — POST API route (web-push, VAPID, stale cleanup)
- `src/components/NotificationPrompt.tsx` — Permission banner (localStorage dismiss, mounted in DashboardShell)
- `supabase/migrations/006_push_subscriptions.sql` — Table + RLS

## Architecture Decisions
- `web-push` npm package used for server-side sending (not Supabase Edge Functions)
- Push notifications triggered from server actions (buyer/actions.ts, seller/order-actions.ts) via `sendPush()` — fire and forget, never blocks the action
- `sendPush()` calls `/api/push/send` via internal fetch; uses `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` env to construct base URL
- `webpush.setVapidDetails()` called INSIDE the POST handler, NOT at module scope — calling it at module scope causes `next build` to fail when VAPID env vars are absent

## Environment Variables Required
- `VAPID_PUBLIC_KEY` — server-side (also used by web-push library)
- `VAPID_PRIVATE_KEY` — server-side only
- `VAPID_SUBJECT` — mailto: email, server-side
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — client-side (same value as VAPID_PUBLIC_KEY)
- `SUPABASE_SERVICE_ROLE_KEY` — used in /api/push/send to bypass RLS when reading subscriptions
- `NEXT_PUBLIC_APP_URL` or `VERCEL_URL` — used by sendPush() to build the internal fetch URL

## TypeScript Gotchas
- `urlBase64ToUint8Array` must return `Uint8Array<ArrayBuffer>` (not just `Uint8Array`) — TypeScript 5 is strict about `ArrayBufferLike` vs `ArrayBuffer` for `applicationServerKey`
- Fix: `const buffer = new ArrayBuffer(rawData.length); const outputArray = new Uint8Array(buffer);`

## Supabase Patterns
- Server actions use `createClient()` from `@/lib/supabase/server` (cookie-based, authenticated)
- Admin/service-role operations use `createClient()` from `@supabase/supabase-js` directly with `SUPABASE_SERVICE_ROLE_KEY`
- Stripe webhook route in `src/app/api/stripe/webhooks/route.ts` is a good reference for the admin client pattern

## Order Status Machine
- Statuses: pending -> accepted -> in-progress -> ready -> completed (or cancelled at any pre-completion step)
- Transitions managed via `transition_order` RPC in seller/order-actions.ts
- Push notifications sent on: pending (new order to seller), accepted (to buyer), ready (to buyer), cancelled/declined (to buyer)

## Pre-existing Issues Fixed
- `SellerOrderCard.tsx`: `default` branch of `getStatusBadge` had `status` typed as `never` (exhaustive switch) — fixed with `(status as string).toUpperCase()`
- `seller-presence-context.tsx`: Supabase query return type mismatch — fixed with `data as unknown as SellerSessionRow[]`
- `SellerOrderCard.tsx`: linter was stripping `useRef` from React import — restored via `sed` (linter removes unused imports; if useRef is truly used in the file, check for drift)

## Notification Copy (per style guide — short, direct)
- New order to seller: "New order" / "{buyer} wants {n} item(s)"
- Accepted to buyer: "Order accepted" / "Your order was accepted. Hang tight."
- Ready to buyer: "Order ready" / "Your order is ready for pickup."
- Declined to buyer: "Order declined" / "Your order was declined. You won't be charged."
