# Order State Machine - Agent Memory

## Architecture Decisions

- **Status transitions go through `transition_order` RPC** (migration 006). Never update `orders.status` directly.
- **SELECT FOR UPDATE** in the RPC prevents race conditions on concurrent transitions.
- **Payment capture happens at `in-progress -> ready`**, not at accept. This is deliberate per `docs/stripe-payment-challenge.md`.
- **Payment void happens at decline/cancel**, called AFTER the RPC transitions status.
- `capturePaymentIntent` and `cancelPaymentIntent` in `src/lib/stripe/payment-intents.ts` no longer update order status -- the RPC handles it.
- **Idempotent transitions**: If order is already in target status, the RPC returns the row without error (no audit log entry).
- **System actor UUID**: `00000000-0000-0000-0000-000000000000` used for auto-cancel.

## Key File Paths

- SQL migration: `supabase/migrations/006_order_transitions.sql`
- State machine types: `src/lib/orders/state-machine.ts`
- Server actions: `src/app/(dashboard)/seller/order-actions.ts`
- Seller order card UI: `src/components/seller/SellerOrderCard.tsx`
- Seller order manager: `src/components/seller/SellerOrderManager.tsx`
- Stripe payment intents: `src/lib/stripe/payment-intents.ts`
- Audit log table: `order_events` (in migration 006)
- Push notifications: `src/lib/push.ts` (fire-and-forget via internal API)

## Order Status Enum (SQL + TypeScript)

`pending` | `accepted` | `in-progress` | `ready` | `completed` | `cancelled`

## Valid Transitions

| From | To | Actors |
|------|-----|--------|
| pending | accepted | seller |
| pending | cancelled | seller, buyer, system |
| accepted | in-progress | seller |
| accepted | cancelled | seller, system |
| in-progress | ready | seller |
| in-progress | cancelled | seller, system |
| ready | completed | seller, buyer |
| ready | cancelled | system |

## Patterns

- Server actions authenticate via `supabase.auth.getUser()`, redirect to login if unauthenticated.
- RPC errors contain prefixed codes like `ORDER_NOT_FOUND:`, `INVALID_TRANSITION:`, `PERMISSION_DENIED:`.
- Push notifications added by external linter -- `sendPush()` from `@/lib/push` used fire-and-forget.
- Auto-cancel: client-side countdown timer in `SellerOrderCard` (5 min timeout). Future: Edge Function for server-side.
- Monetary values stored in cents (integers) in the DB.

## Supabase Conventions

- Migration files numbered sequentially: `001_` through `006_`.
- RPC functions use `SECURITY DEFINER` to bypass RLS.
- Admin client via `createClient(url, service_role_key)` for Stripe operations.
- Auth client via `@/lib/supabase/server.ts` for user-facing server actions.
