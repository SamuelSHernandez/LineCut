# LineCut Orchestrator Memory

## Project State (2026-03-07)

### Implemented Features
- Landing page with waitlist signup
- Supabase auth (email signup, login, check-email, callback)
- Dashboard shell with nav (buyer/seller tabs)
- Buyer dashboard with restaurant browser (search, cuisine filters, Mapbox map)
- Seller dashboard (basic)
- Onboarding flows (buyer/seller)
- Restaurant detail page with seller list and order placement flow (hardcoded data)

### Key Architecture Notes
- `restaurants.ts` exports both `restaurants` (fallback const) and `fetchRestaurants()` (Supabase query). Buyer page uses `fetchRestaurants()` + `getWaitTimeStats()`.
- Restaurant detail page uses fallback `restaurants` const for lookup by ID.
- `RestaurantBrowser` accepts `restaurants` and `waitStats` as props (server-fetched, passed down).
- `RestaurantCard` is now a `<Link>` (not `<button>`), removed `isSelected`/`onClick` props. Has optional `waitStats` prop.
- Linter/formatter actively modifies files -- adds types like `WaitTimeStats`, `SellerSession` to `types.ts`, adjusts component signatures. Must read current state before editing.
- `types.ts` has: `Restaurant`, `WaitTimeStats`, `SellerSession`, `Seller`, `MenuItem`, `OrderItem`, `OrderStatus`, `Order`.
- Next.js 16 (not 14 as system prompt says) -- uses `params: Promise<{ id: string }>` pattern.

### File Paths
- Dashboard layout: `src/app/(dashboard)/layout.tsx`
- Buyer page: `src/app/(dashboard)/buyer/page.tsx`
- Restaurant detail: `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx`
- Seller data: `src/lib/sellers.ts`
- Menu data: `src/lib/menu-items.ts`
- Components: `src/components/buyer/` (SellerCard, SellerList, OrderDrawer, MenuItemPill, OrderConfirmation, OrderPendingState)

### Style Guide Essentials
- Colors: ketchup (#C4382A), mustard (#E2A832), chalkboard (#1A1A18), butcher-paper (#F5EDE0), ticket (#FFFDF5), sidewalk (#8C8778)
- Fonts via CSS vars: `--font-display` (Bebas Neue), `--font-body` (DM Sans), `--font-mono` (JetBrains Mono)
- Font ref pattern: `font-[family-name:var(--font-display)]`
- Cards: bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]
- Dividers: border-t border-dashed border-[#ddd4c4] (never solid, except total line)
- Never pure white or black
