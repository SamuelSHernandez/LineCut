# Seller Order Flow -- Implementation Plan

## Summary

Build the seller's side of the order lifecycle: when a seller is live (has an active Supabase session), simulated buyer orders appear in their dashboard. The seller drives each order through status transitions (pending, accepted, in-progress, ready, completed) using action buttons. Completed orders move to Past Handoffs and feed the earnings display. Everything is local state -- no backend order matching.

---

## Architecture Decision

The seller page (`/seller/page.tsx`) is a server component. It fetches user profile, restaurants, and active session from Supabase. The new order management is entirely client-side. The plan introduces a single new client component (`SellerOrderManager`) that receives the active session as a prop and owns all order state, simulation timers, and status transitions. This component renders the three sections that replace the current placeholders: Active Orders, Past Handoffs, and Earnings.

The server page becomes thinner -- it keeps auth/profile/session fetching but delegates the order-related UI to `SellerOrderManager`.

---

## File-by-File Plan

### 1. New file: `src/lib/sample-orders.ts`

Hardcoded incoming orders that simulate what buyers would send. Two orders per restaurant, using real menu items from `menu-items.ts` and matching the existing `Order` interface from `types.ts`.

**Data shape:** Array of `Order` objects, one function to retrieve them by restaurant ID.

**Sample orders:**

Order 1 -- Katz's:
- id: `"sample-order-katzs-1"`
- buyerId: `"buyer-demo-1"`
- sellerId: will be set dynamically to match the logged-in seller
- restaurantId: `"katzs"`
- items: `[{ menuItemId: "katzs-1", name: "Pastrami on Rye", priceEstimate: 24.95, quantity: 2 }, { menuItemId: "katzs-4", name: "Matzo Ball Soup", priceEstimate: 8.95, quantity: 1 }]`
- specialInstructions: `"Extra mustard on both sandwiches"`
- status: `"pending"`
- itemsEstimate: 58.85
- sellerFee: 5.00
- platformFee: 7.50 (calculated as min(max(58.85 * 0.15, 1.0), 8.0) = 8.00 -- wait, 58.85 * 0.15 = 8.83, capped at 8.00)
- total: 71.85
- createdAt: dynamically set to session start + 8 seconds
- **Buyer display name:** "Jamie L."

Order 2 -- Katz's:
- id: `"sample-order-katzs-2"`
- buyerId: `"buyer-demo-2"`
- items: `[{ menuItemId: "katzs-3", name: "Reuben", priceEstimate: 26.95, quantity: 1 }]`
- specialInstructions: `""`
- itemsEstimate: 26.95
- sellerFee: 5.00
- platformFee: 4.04 (26.95 * 0.15 = 4.04)
- total: 35.99
- createdAt: dynamically set to session start + 22 seconds
- **Buyer display name:** "Rosa M."

Order 1 -- Joe's Pizza:
- id: `"sample-order-joes-1"`
- buyerId: `"buyer-demo-3"`
- items: `[{ menuItemId: "joes-1", name: "Plain Slice", priceEstimate: 3.50, quantity: 3 }, { menuItemId: "joes-2", name: "Sicilian Slice", priceEstimate: 4.50, quantity: 1 }]`
- specialInstructions: `"Well done on the plain slices"`
- itemsEstimate: 15.00
- sellerFee: 3.00
- platformFee: 2.25 (15.00 * 0.15 = 2.25)
- total: 20.25
- createdAt: session start + 5 seconds
- **Buyer display name:** "Terrence W."

Order 1 -- Russ & Daughters:
- id: `"sample-order-russ-1"`
- buyerId: `"buyer-demo-4"`
- items: `[{ menuItemId: "russ-1", name: "Classic Bagel & Lox", priceEstimate: 18.00, quantity: 1 }, { menuItemId: "russ-3", name: "Super Heebster", priceEstimate: 21.00, quantity: 1 }]`
- specialInstructions: `"Lox on an everything bagel if they have it"`
- itemsEstimate: 39.00
- sellerFee: 4.50
- platformFee: 5.85 (39.00 * 0.15 = 5.85)
- total: 49.35
- createdAt: session start + 12 seconds
- **Buyer display name:** "Anya P."

**Buyer name mapping:** Since the `Order` type only has `buyerId` (not buyer name), add a separate lookup:

```
export const buyerNames: Record<string, string> = {
  "buyer-demo-1": "Jamie L.",
  "buyer-demo-2": "Rosa M.",
  "buyer-demo-3": "Terrence W.",
  "buyer-demo-4": "Anya P.",
};
```

**Function:** `getSampleOrdersForRestaurant(restaurantId: string, sellerId: string): Order[]` -- returns the relevant orders with `sellerId` set and `createdAt` left as a relative delay in seconds (the component will compute the real timestamp).

**Why a separate file:** Keeps sample data co-located with other hardcoded data in `src/lib/`. Mirrors the pattern of `restaurants.ts`, `sellers.ts`, `menu-items.ts`.

---

### 2. New file: `src/components/seller/SellerOrderManager.tsx`

**Client component.** This is the main orchestrator. It receives props from the server page and manages all order state.

**Props:**
- `activeSession: SellerSession | null` -- from the server page
- `restaurantId: string | null` -- extracted from the active session by the parent

**Internal state:**
- `orders: Order[]` -- the live list of orders (both active and completed)
- `arrivedOrderIds: Set<string>` -- tracks which sample orders have "arrived" (controls staggered appearance)

**Behavior when `activeSession` is not null:**
1. On mount (or when activeSession changes from null to non-null), start simulation timers.
2. Timer 1: After the first order's delay (e.g., 8 seconds from now), add Order 1 to state with status `"pending"`.
3. Timer 2: After the second order's delay (e.g., 22 seconds from now), add Order 2 to state with status `"pending"`.
4. The `createdAt` timestamp on each order is set to the actual wall-clock time when it "arrives."

**Behavior when `activeSession` is null:**
- Clear all orders. Clear all timers. Show nothing (the parent page handles showing EmptyState).

**Status transition handler:** `handleStatusChange(orderId: string, newStatus: OrderStatus)`:
- Updates the order's status in local state.
- Valid transitions: pending -> accepted, accepted -> in-progress, in-progress -> ready, ready -> completed, pending -> cancelled.
- No invalid transitions allowed.

**Derived state:**
- `activeOrders`: orders where status is not `"completed"` and not `"cancelled"`
- `completedOrders`: orders where status is `"completed"`
- `earnings`: sum of `sellerFee` across completed orders (this is what the seller actually earns)

**Renders three sections:**
1. Earnings display (replaces PlaceholderCard)
2. Active Orders list (replaces EmptyState)
3. Past Handoffs list (replaces EmptyState)

If there are no active orders and no completed orders (but session is live and orders haven't arrived yet), show a "waiting for orders" state with the scissors animation.

---

### 3. New file: `src/components/seller/SellerOrderCard.tsx`

**Client component.** Renders a single order from the seller's perspective.

**Props:**
- `order: Order`
- `buyerName: string`
- `onStatusChange: (orderId: string, newStatus: OrderStatus) => void`

**Layout (top to bottom):**

**Header row:**
- Left: Buyer avatar (36px circle, mustard bg, initials in display font) + buyer name in body font 15px
- Right: Status badge (uses existing badge styles from style guide)
  - pending: Waiting style (`bg-[#FFF3D6] text-[#8B6914]`), label "PENDING"
  - accepted: Active style (`bg-[#DDEFDD] text-[#2D6A2D]`), label "ACCEPTED"
  - in-progress: Active style, label "IN PROGRESS"
  - ready: ketchup-tinted (`bg-[#FDECEA] text-[#C4382A]`), label "READY"

**Dashed divider**

**Order items list:**
- Each item: name + " x" + quantity on the left, price estimate on the right
- Font: body 13px for name, mono 12px for price
- If specialInstructions is non-empty, show below items with mono 11px label "SPECIAL INSTRUCTIONS" and body 13px text, italicized

**Dashed divider**

**Earnings summary (seller's perspective):**
- "Your fee" on left, sellerFee amount on right (body 13px / mono 12px)
- This is what matters to the seller -- they don't need to see the full buyer breakdown

**Dashed divider**

**Action area (depends on status):**

- **Pending:** Two buttons side by side
  - "ACCEPT" -- ketchup primary button, flex-1
  - "DECLINE" -- ghost button (text-ketchup, no bg), auto width

- **Accepted:** One full-width button
  - "STARTED ORDERING" -- mustard button
  - Caption below: "Tap when you've placed their order at the counter."

- **In Progress:** One full-width button
  - "ORDER'S READY" -- mustard button
  - Caption: "Tap when you've got the food in hand."

- **Ready:** One full-width button
  - "HANDED OFF" -- ketchup primary button
  - Caption: "Tap once the buyer has their food."

- **Completed:** No action buttons. Card shows in Past Handoffs section instead.
- **Cancelled:** Card disappears from active orders (not shown in past handoffs either).

**Card container styling:**
- `bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]`
- When status is `"pending"`, add a left border accent: `border-l-4 border-l-mustard` to draw attention to new incoming orders

**Timestamp:** Below the action area, right-aligned, mono 11px sidewalk color: "RECEIVED [time ago]" e.g., "RECEIVED 2 MIN AGO". Updates every 30 seconds.

---

### 4. New file: `src/components/seller/SellerEarnings.tsx`

**Client component.** Replaces the PlaceholderCard earnings section.

**Props:**
- `completedOrders: Order[]`

**Layout:** Same grid-of-3 structure as the current placeholder, but with real numbers derived from completedOrders.

- "Today" column: sum of sellerFee from all completed orders (since everything is session-based, all completed orders are "today")
- "This Week" column: same value (all activity is within current session)
- "All Time" column: same value

**When no completed orders:** Show $0.00 for all three, but without the "COMING SOON" watermark. Use a solid card instead of dashed border.

**Card styling:**
- Solid `bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.06)]`
- Section header: "YOUR EARNINGS" in display font 18px (same as current PlaceholderCard title)

---

### 5. New file: `src/components/seller/PastHandoffs.tsx`

**Client component.** Shows completed orders as a compact list.

**Props:**
- `completedOrders: Order[]`
- `buyerNames: Record<string, string>`

**Layout:** Each completed order as a compact row (not full card -- save vertical space):

- Left: buyer avatar (36px) + buyer name + item count summary (e.g., "3 items")
- Right: seller fee earned in display font, green color (`text-[#2D6A2D]`), prefixed with "+"
- Below the row: mono 11px timestamp of when the order was completed (use createdAt as proxy)

Rows separated by dashed dividers.

**When no completed orders:** Show EmptyState with message "No handoffs yet. Your completed orders will show up here."

**Container:** Same ticket card styling as other sections.

---

### 6. Modified file: `src/app/(dashboard)/seller/page.tsx`

**Changes:**
- Import `SellerOrderManager` instead of `PlaceholderCard` (for earnings) and remove the inline Active Orders and Past Handoffs EmptyState sections.
- Remove the `PlaceholderCard` import.
- Keep: Welcome header, GoLivePanel, Onboarding link.
- Add: `SellerOrderManager` component between GoLivePanel and the Onboarding link.
- Pass `activeSession` and `activeSession?.restaurantId ?? null` to `SellerOrderManager`.

**New page structure (top to bottom):**
1. Welcome header (unchanged)
2. GoLivePanel (unchanged)
3. `<SellerOrderManager activeSession={activeSession} restaurantId={activeSession?.restaurantId ?? null} />` (new)
4. Onboarding link (unchanged)

**When seller is NOT live (no activeSession):** `SellerOrderManager` receives null and renders the three sections with their empty/zero states:
- Earnings: $0.00 across the board
- Active Orders: EmptyState "No active orders. Go live to start receiving orders."
- Past Handoffs: EmptyState "No handoffs yet. Your completed orders will show up here."

**When seller IS live:** `SellerOrderManager` kicks off simulation and renders live order cards, real earnings, and past handoffs.

---

### 7. No changes to `src/lib/types.ts`

The existing `Order`, `OrderItem`, `OrderStatus` types already cover everything needed. No new types required.

---

## Hardcoded Data Notes

**Seller fee on sample orders:** Must match the fee from the seller data in `sellers.ts` for the corresponding restaurant. However, since the logged-in seller is a real user (not one of the hardcoded sellers), the sample orders use a flat $5.00 fee as a reasonable default. The seller's actual fee isn't stored on their profile yet -- this is a known gap for later.

**Platform fee calculation:** Reuse the same formula from `OrderConfirmation.tsx`: `min(max(itemsEstimate * 0.15, 1.0), 8.0)`. Duplicate the formula in `sample-orders.ts` since the values are pre-computed in the hardcoded data.

**Buyer names:** Stored as a simple Record in `sample-orders.ts` since there's no buyer profile system yet.

---

## Copy Strings (All UI Text)

### SellerOrderManager
- Waiting state (live but no orders yet): "Waiting for orders. Buyers nearby can see you're in line."
- Section headers: "YOUR EARNINGS", "ACTIVE ORDERS", "PAST HANDOFFS"

### SellerOrderCard
- Pending actions: "ACCEPT" / "DECLINE"
- Accepted action: "STARTED ORDERING"
- Accepted caption: "Tap when you've placed their order at the counter."
- In-progress action: "ORDER'S READY"
- In-progress caption: "Tap when you've got the food in hand."
- Ready action: "HANDED OFF"
- Ready caption: "Tap once the buyer has their food."
- Earnings label: "Your fee"
- Special instructions label: "SPECIAL INSTRUCTIONS"
- Timestamp: "RECEIVED [N] MIN AGO" / "RECEIVED JUST NOW"
- Decline confirmation: none (immediate -- keep it fast)

### SellerEarnings
- Column labels: "Today", "This Week", "All Time"

### PastHandoffs
- Item summary format: "[N] items" or "1 item"
- Fee format: "+$[amount]"
- Empty state: "No handoffs yet. Your completed orders will show up here."

---

## Implementation Order

Build in this sequence. Each step produces something testable.

**Step 1: `src/lib/sample-orders.ts`**
Create the hardcoded order data and buyer name lookup. No UI yet -- just data. Can be verified by importing in a test or console log.

**Step 2: `src/components/seller/SellerOrderCard.tsx`**
Build the card component with all status variants. It is a pure display + action component -- no timers, no simulation logic. Can be tested by rendering with hardcoded props.

**Step 3: `src/components/seller/SellerEarnings.tsx`**
Build the earnings display. Pure props-in, UI-out. Can be tested with an empty array and with sample completed orders.

**Step 4: `src/components/seller/PastHandoffs.tsx`**
Build the past handoffs list. Same pattern -- pure display component.

**Step 5: `src/components/seller/SellerOrderManager.tsx`**
Build the orchestrator. Wire up simulation timers, state management, and render the three sub-components. This is where the staggered order arrival logic lives.

**Step 6: Modify `src/app/(dashboard)/seller/page.tsx`**
Swap out PlaceholderCard and inline EmptyState sections for the new SellerOrderManager. Remove unused imports.

---

## Edge Cases to Handle

1. **Seller ends session while orders are in-progress:** All orders disappear. This is correct for a simulation -- in production, you'd warn the seller about active orders before ending a session.

2. **Seller declines an order:** Remove it from the active list immediately. Don't move to past handoffs (declined orders aren't handoffs).

3. **Page reload while live:** The server page re-fetches the active session from Supabase. The SellerOrderManager re-mounts, simulation timers restart, and orders appear fresh. This means completed orders from before the reload are lost. Acceptable for a hardcoded simulation.

4. **Rapid status transitions:** Each button click should disable the button briefly (200ms) to prevent double-taps. Use a local `transitioning` state per card, not a global lock.

5. **Timer cleanup:** All `setTimeout` calls in SellerOrderManager must be cleaned up in the useEffect return function. If activeSession changes from non-null to null, clear all pending timers.

6. **Stale "time ago" display:** The "RECEIVED X MIN AGO" timestamp on each card should use a 30-second interval to update. Clean up on unmount.

---

## What This Plan Does NOT Cover

- Real-time order matching between buyers and sellers (backend)
- Push notifications to sellers for incoming orders
- Seller fee configuration (currently hardcoded)
- Sound or vibration alerts for new orders
- Order history persistence across sessions
- Buyer-side status updates reflecting seller actions (the two sides are currently disconnected)
- Animations for order card appearance (could add later with CSS transitions)

---

## File Summary

| File | Action | Type |
|------|--------|------|
| `src/lib/sample-orders.ts` | Create | Data |
| `src/components/seller/SellerOrderCard.tsx` | Create | Client component |
| `src/components/seller/SellerEarnings.tsx` | Create | Client component |
| `src/components/seller/PastHandoffs.tsx` | Create | Client component |
| `src/components/seller/SellerOrderManager.tsx` | Create | Client component |
| `src/app/(dashboard)/seller/page.tsx` | Modify | Server component |
| `src/lib/types.ts` | No change | -- |
