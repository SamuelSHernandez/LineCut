# LineCut Orchestrator Memory

## Project State (2026-03-07)

### Implemented Features
- Landing page with waitlist signup
- Supabase auth (email signup, login, check-email, callback)
- Dashboard shell with nav (buyer/seller tabs)
- Buyer dashboard with restaurant browser (search, cuisine filters, Mapbox map)
- Seller dashboard (basic)
- Onboarding flows (buyer/seller)
- Restaurant detail page with seller list and order placement flow
- Cross-tab order sync via BroadcastChannel (order-bus.ts, order-context.tsx, seller-presence-context.tsx)
- OrderTracker with vertical stepper (replaces old OrderPendingState)
- OrderTrackerDrawer, ActiveOrderCard, BuyerOrdersSection, RestaurantLiveSection
- GoLivePanel broadcasts seller-online/offline, responds to roll calls
- SellerOrderManager uses order context (no more sample-orders.ts)

### Key Architecture Notes
- `restaurants.ts` exports both `restaurants` (fallback const) and `fetchRestaurants()` (Supabase query). Buyer page uses `fetchRestaurants()` + `getWaitTimeStats()`.
- Restaurant detail page uses fallback `restaurants` const for lookup by ID.
- `RestaurantBrowser` accepts `restaurants` and `waitStats` as props (server-fetched, passed down).
- `RestaurantCard` is now a `<Link>` (not `<button>`), removed `isSelected`/`onClick` props. Has optional `waitStats` prop.
- Linter/formatter actively modifies files -- adds types, adjusts component signatures. Must read current state before editing.
- `types.ts` has: `Restaurant`, `WaitTimeStats`, `SellerSession`, `Seller`, `MenuItem`, `OrderItem`, `OrderStatus`, `Order`, `PayoutAccount`.
- `Order` type now includes: `statusUpdatedAt`, `restaurantName`, `sellerName`, `buyerName`.
- Next.js 16 (not 14 as system prompt says) -- uses `params: Promise<{ id: string }>` pattern.
- React Compiler enforces no direct setState in effect body -- use setTimeout(fn, 0) workaround.
- DashboardShell wraps children in: ProfileProvider > OrderProvider > SellerPresenceProvider.
- `seller-presence-context.tsx` falls back to hardcoded sellers from `sellers.ts` when no live sellers exist.
- `order-bus.ts` uses BroadcastChannel with 5-second message buffering for replay to new subscribers.

### Deleted Files
- `src/lib/sample-orders.ts` -- replaced by cross-tab order context
- `src/components/buyer/OrderPendingState.tsx` -- replaced by OrderTracker

### File Paths
- Dashboard layout: `src/app/(dashboard)/layout.tsx`
- Dashboard shell: `src/components/DashboardShell.tsx`
- Buyer page: `src/app/(dashboard)/buyer/page.tsx`
- Restaurant detail: `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx`
- Seller data: `src/lib/sellers.ts` (kept as fallback demo data)
- Menu data: `src/lib/menu-items.ts`
- Order bus: `src/lib/order-bus.ts`
- Order context: `src/lib/order-context.tsx`
- Seller presence: `src/lib/seller-presence-context.tsx`
- Buyer components: `src/components/buyer/` (SellerCard, SellerList, OrderDrawer, MenuItemPill, OrderConfirmation, OrderTracker, OrderTrackerDrawer, ActiveOrderCard, BuyerOrdersSection, RestaurantLiveSection)
- Seller components: `src/components/seller/` (GoLivePanel, SellerOrderManager, SellerOrderCard, SellerEarnings, PastHandoffs)

### Style Guide Essentials
- Colors: ketchup (#C4382A), mustard (#E2A832), chalkboard (#1A1A18), butcher-paper (#F5EDE0), ticket (#FFFDF5), sidewalk (#8C8778)
- Fonts via CSS vars: `--font-display` (Bebas Neue), `--font-body` (DM Sans), `--font-mono` (JetBrains Mono)
- Font ref pattern: `font-[family-name:var(--font-display)]`
- Cards: bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]
- Dividers: border-t border-dashed border-[#ddd4c4] (never solid, except total line)
- Never pure white or black
