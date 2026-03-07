# Order Sync -- Implementation Plan

**Goal:** Connect buyer and seller order flows so both sides track the same order in real time across browser tabs, using BroadcastChannel API. Fully replace the simulated order pipeline.

---

## 1. The Core Problem (What Exists Today)

The buyer and seller sides are two separate demos that share no state:

- **Buyer** places an order in `OrderDrawer` -> sees `OrderPendingState` with a fake 5-second auto-accept -> dead end. No visibility into subsequent status changes.
- **Seller** gets orders from `sample-orders.ts` (hardcoded demo data unrelated to what any buyer placed) -> can transition `pending -> accepted -> in-progress -> ready -> completed` -> but nobody else sees it.
- **Seller list** on the restaurant detail page reads from `sellers.ts` (hardcoded) -- completely disconnected from the real `seller_sessions` table in Supabase. A seller "going live" in the DB does not make them appear in the buyer's restaurant page.

There is no shared order state, no cross-tab communication, and no way for one side to affect what the other side sees.

---

## 2. Architecture Overview

### 2.1 BroadcastChannel as the Shared Bus

One channel: `"linecut-orders"`

All messages are typed with an `action` discriminator. Both buyer and seller tabs listen. When a tab sends a message, all *other* tabs in the same browser origin receive it.

**Why BroadcastChannel and not the alternatives:**
- `localStorage` events: Work cross-tab but require serialization hacks, fire only in *other* tabs (not the sender), and have size limits.
- React context: Same-tab only. Useless for cross-tab sync.
- Supabase Realtime: Would require DB tables for orders. Architecturally ideal long-term, but premature for this phase.
- BroadcastChannel: Native API, zero dependencies, mirrors pub/sub pattern of Supabase Realtime (channel.on / channel.postMessage), and the swap-out path is clean.

**Swap-out path to Supabase Realtime later:** The `OrderBus` module (described below) wraps BroadcastChannel behind a `subscribe` / `publish` interface. When Supabase Realtime is ready, the implementation inside `OrderBus` changes from `BroadcastChannel.postMessage` to `supabase.channel('orders').send()`. No consumer code changes.

### 2.2 Seller Presence via BroadcastChannel

A second channel: `"linecut-sellers"`

When a seller goes live (via GoLivePanel), they broadcast a `seller-online` message with their seller profile data and restaurant ID. When they end their session, they broadcast `seller-offline`. Buyer tabs listen for these to build a live seller list.

**Bootstrapping problem:** BroadcastChannel only delivers messages to tabs that are *already listening*. If the buyer tab opens after the seller already went live, the buyer misses the `seller-online` message.

**Solution:** When a buyer tab opens and starts listening, it broadcasts a `seller-roll-call` request. Any seller tab that is currently live responds with a `seller-online` message. This gives the buyer tab an accurate snapshot of who is live, even if the buyer opened their tab after the seller.

### 2.3 State Ownership

- **Orders** are created by the buyer, stored in a React context (`OrderProvider`) that wraps the dashboard layout, and synchronized across tabs via BroadcastChannel.
- **Every tab maintains its own in-memory copy of orders.** BroadcastChannel messages are the synchronization mechanism -- when a message arrives, the local state updates.
- **The seller is the authority on status transitions.** Only the seller can move an order from `pending -> accepted -> in-progress -> ready -> completed`. The buyer can only create orders and cancel them (while `pending`).

---

## 3. Data Structures

### 3.1 Extended Order Type

Add two fields to the existing `Order` type in `src/lib/types.ts`:

```
statusUpdatedAt: string    // ISO timestamp of the last status change
restaurantName: string     // Denormalized for display (avoids cross-referencing)
```

The existing `Order` interface already has everything else needed: `id`, `buyerId`, `sellerId`, `restaurantId`, `items`, `specialInstructions`, `status`, financial fields, `createdAt`.

Also add a `sellerName` field:

```
sellerName: string         // e.g. "Marco T." -- denormalized for buyer display
```

### 3.2 BroadcastChannel Message Types

File: `src/lib/order-bus.ts`

**Order channel messages (`linecut-orders`):**

| Action | Sender | Payload | Purpose |
|--------|--------|---------|---------|
| `order-placed` | Buyer | Full `Order` object | New order created by buyer |
| `order-status-changed` | Seller | `{ orderId, newStatus, updatedAt }` | Seller advanced the status |
| `order-cancelled` | Buyer or Seller | `{ orderId, cancelledBy: "buyer" \| "seller" }` | Either side cancels |

**Seller channel messages (`linecut-sellers`):**

| Action | Sender | Payload | Purpose |
|--------|--------|---------|---------|
| `seller-online` | Seller | `{ seller: Seller, restaurantId, sessionId }` | Seller went live |
| `seller-offline` | Seller | `{ sellerId, restaurantId }` | Seller ended session |
| `seller-roll-call` | Buyer | `{}` | Buyer requesting current live sellers |
| `seller-busy` | Seller | `{ sellerId }` | Seller accepted an order, temporarily unavailable |
| `seller-available` | Seller | `{ sellerId }` | Seller completed a handoff, available again |

### 3.3 Seller Profile for Broadcast

When a seller goes live, they need to broadcast a `Seller`-shaped object so buyer tabs can render seller cards. The `Seller` type already exists and has what is needed. The seller tab will construct this from the profile context + the go-live form inputs.

Fields the seller must provide or that can be derived:
- `id`: from profile context (`profile.id`)
- `restaurantId`: from the selected restaurant in GoLivePanel
- `firstName`: from `profile.displayName.split(" ")[0]`
- `lastInitial`: from `profile.displayName.split(" ")[1]?.[0] ?? ""`
- `positionInLine`: user input (new field in GoLivePanel -- see section 6.3)
- `waitEstimate`: derived from positionInLine (rough heuristic: `~${positionInLine * 3} min`)
- `trustScore`: from `profile.trustScore`
- `completedOrders`: hardcoded to 0 for now (no order history persistence yet)
- `fee`: user input (new field in GoLivePanel -- see section 6.3)
- `menuFlexibility`: default to `"full"` for now
- `status`: `"available"`
- `joinedAt`: current ISO timestamp

---

## 4. New Files

### 4.1 `src/lib/order-bus.ts` -- The Communication Layer

**Purpose:** Wraps BroadcastChannel behind a clean publish/subscribe interface. This is the only file that touches BroadcastChannel directly. Everything else imports from here.

**Exports:**
- `orderBus` -- singleton object with methods:
  - `publish(message: OrderBusMessage): void`
  - `subscribe(callback: (message: OrderBusMessage) => void): () => void` (returns unsubscribe function)
- `sellerBus` -- singleton object with same interface for seller presence messages:
  - `publish(message: SellerBusMessage): void`
  - `subscribe(callback: (message: SellerBusMessage) => void): () => void`
- Type definitions for `OrderBusMessage` and `SellerBusMessage` (discriminated unions)

**SSR safety:** BroadcastChannel is a browser API. The module must guard with `typeof window !== "undefined"` checks. On the server, `publish` is a no-op and `subscribe` returns a no-op unsubscribe.

### 4.2 `src/lib/order-context.tsx` -- Shared Order State

**Purpose:** React context that holds all orders for the current user (buyer or seller side). Listens to BroadcastChannel messages and updates local state accordingly. Also publishes messages when the local user takes actions.

**Exports:**
- `OrderProvider` -- wraps children, takes `userId` and `role` ("buyer" | "seller") props
- `useOrders()` -- returns `{ orders, placeOrder, updateOrderStatus, cancelOrder }`
- `useActiveOrder()` -- convenience hook for buyer: returns the most recent non-completed order, or null

**State shape:** `Order[]` -- flat array of all orders relevant to this user.

**How it works:**
1. On mount, subscribes to `orderBus`.
2. When a `order-placed` message arrives and this is a seller tab whose `userId` matches the order's `sellerId` and whose `restaurantId` matches: add the order to local state.
3. When a `order-status-changed` message arrives and this tab has that order: update its status.
4. When a `order-cancelled` message arrives: remove the order from local state.
5. `placeOrder(order)` adds to local state AND publishes `order-placed`.
6. `updateOrderStatus(orderId, newStatus)` updates local state AND publishes `order-status-changed`.
7. `cancelOrder(orderId)` removes from local state AND publishes `order-cancelled`.

### 4.3 `src/lib/seller-presence-context.tsx` -- Live Seller Registry

**Purpose:** React context for buyer tabs that maintains a live list of which sellers are online at which restaurants. Listens to `sellerBus` messages.

**Exports:**
- `SellerPresenceProvider` -- wraps buyer-side components
- `useSellerPresence()` -- returns `{ liveSellers, getLiveSellersForRestaurant(restaurantId) }`

**How it works:**
1. On mount, subscribes to `sellerBus`.
2. Broadcasts `seller-roll-call` to discover sellers already live in other tabs.
3. On `seller-online`: add seller to local registry.
4. On `seller-offline`: remove seller from local registry.
5. On `seller-busy` / `seller-available`: update seller's status field.

**Fallback behavior:** If no sellers are live (no seller tab open), the buyer sees "Nobody's in line right now." This replaces the hardcoded `sellers.ts` data for the restaurant detail page.

### 4.4 `src/components/buyer/OrderTracker.tsx` -- Buyer Tracking View

**Purpose:** The buyer's rich order tracking experience. Shows after an order is placed and accepted.

**Visual design (deli-ticket aesthetic):**

The tracker is a vertical stepper styled like a deli receipt -- each step is a "line item" on the ticket with a dashed divider between steps.

**Steps displayed:**
1. ORDER PLACED -- "Sent to {sellerName}"
2. ACCEPTED -- "{sellerName} is on it"
3. AT THE COUNTER -- "{sellerName} is ordering at the counter now"
4. READY FOR PICKUP -- "Your food is ready. Meet {sellerName} outside {restaurantName}"
5. HANDED OFF -- "You got your food. How'd it go?"

**Step states:**
- Completed: filled circle, bold text, muted color
- Current: filled circle with pulse animation, ketchup color, descriptive subtext
- Upcoming: empty circle, muted text

**Additional elements:**
- Order summary card at the top (items, total, seller name, restaurant)
- Estimated time remaining (derived from status: accepted = sellerWaitEstimate, in-progress = "a few minutes", ready = "waiting on you")
- "MESSAGE {SELLER_NAME}" button (placeholder -- logs to console for now, shows a toast "Coming soon")
- "CANCEL ORDER" link (only visible while status is `pending`)

**Copy strings for each status transition (shown as a prominent status line):**
- `pending`: "Waiting on {sellerName} to accept..."
- `accepted`: "{sellerName}'s got it. Sit tight."
- `in-progress`: "{sellerName} is at the counter now."
- `ready`: "Your food is ready. Head to {restaurantName}."
- `completed`: "Handoff complete."

### 4.5 `src/components/buyer/ActiveOrderCard.tsx` -- Dashboard Order Summary

**Purpose:** Compact card for the "YOUR ORDERS" section on `/buyer` dashboard. Shows active order with live status badge, seller name, restaurant, item count, and a link/button to expand into full tracking view.

**Design:** Ticket-style card (same as SellerOrderCard aesthetic). Status badge uses the same color scheme as seller side:
- PENDING: mustard badge (`bg-[#FFF3D6] text-[#8B6914]`)
- ACCEPTED / IN PROGRESS: green badge (`bg-[#DDEFDD] text-[#2D6A2D]`)
- READY: ketchup badge (`bg-[#FDECEA] text-[#C4382A]`)
- COMPLETED: gray badge (`bg-[#E8E8E8] text-[#666]`)

Tapping the card opens the full `OrderTracker` in a drawer (reuses the same slide-up pattern as `OrderDrawer`).

### 4.6 `src/components/buyer/OrderTrackerDrawer.tsx` -- Tracking Drawer Wrapper

**Purpose:** Slide-up drawer (same shell as `OrderDrawer`) that contains `OrderTracker`. Opened from `ActiveOrderCard` or auto-opened after placing an order.

Uses the same overlay + drawer pattern, focus trap, and escape-to-close behavior as the existing `OrderDrawer`.

---

## 5. Modified Files

### 5.1 `src/lib/types.ts`

**Changes:**
- Add `statusUpdatedAt: string` to `Order` interface
- Add `restaurantName: string` to `Order` interface
- Add `sellerName: string` to `Order` interface

### 5.2 `src/app/(dashboard)/layout.tsx`

**Changes:**
- Wrap children in `OrderProvider` (passing `profile.id` and role)
- Wrap children in `SellerPresenceProvider` (buyer side only, but harmless to include for both)

Provider nesting order (outermost to innermost):
```
DashboardShell (existing -- contains ProfileProvider)
  -> OrderProvider
    -> SellerPresenceProvider
      -> {children}
```

### 5.3 `src/components/buyer/OrderDrawer.tsx`

**Changes:**
- Import `useOrders` from order-context
- In `handleConfirm()`: instead of just `setSubmitted(true)`, construct a full `Order` object and call `placeOrder(order)` from context
- The `Order` object is built from: selected items, seller data (passed as props), restaurant info, computed fees
- Generate a unique order ID using `crypto.randomUUID()`
- After calling `placeOrder()`, transition to the tracking view instead of showing `OrderPendingState`

**What changes for the user:**
- Tapping CONFIRM now creates a real order in shared state and broadcasts it to seller tabs
- Instead of seeing the old `OrderPendingState` with its fake 5-second accept, the drawer transitions to `OrderTracker` showing the order as `pending` -- it stays pending until the seller actually accepts

### 5.4 `src/components/buyer/OrderPendingState.tsx`

**Status:** Deprecated. No longer used. The `OrderTracker` component replaces its function entirely. Remove the import from `OrderDrawer.tsx`. The file can be deleted or left in place -- recommend deletion to avoid confusion.

### 5.5 `src/app/(dashboard)/buyer/page.tsx`

**Changes:**
- The "YOUR ORDERS" section currently hardcodes `EmptyState`. Replace with:
  - Import `useActiveOrder` from order-context (requires converting this section to a client component, or extracting it into a separate client component)
  - If there is an active order: render `ActiveOrderCard`
  - If no active order: render `EmptyState` (existing behavior)

**Architectural note:** The page is currently a server component. The "YOUR ORDERS" section must become a client component since it reads from React context. Extract it into a new client component `src/components/buyer/BuyerOrdersSection.tsx` that uses the `useOrders()` hook.

### 5.6 `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx`

**Changes:**
- The "WHO'S IN LINE" section currently reads sellers from `sellers.ts` (hardcoded). This must read from seller presence context instead.
- Extract the seller list + "YOUR ORDERS" section into a client component (e.g., `src/components/buyer/RestaurantLiveSection.tsx`) that uses `useSellerPresence()` and `useOrders()`.
- The restaurant header card can remain server-rendered (it only needs restaurant data).
- Pass `restaurantId` to `RestaurantLiveSection` so it can filter live sellers for this restaurant.
- The "YOUR ORDERS" section on this page also replaces its `EmptyState` with live order tracking, same as the dashboard.

### 5.7 `src/components/buyer/SellerList.tsx`

**Changes:**
- Accept sellers as a prop (no change to interface), but now the data comes from seller presence context (the parent provides it)
- When `OrderDrawer` is submitted and transitions to tracking, the drawer should swap to showing `OrderTracker` instead of `OrderPendingState`
- Add a callback prop `onOrderPlaced?: (order: Order) => void` so the parent can react (e.g., close the seller list, show tracking)

### 5.8 `src/components/seller/SellerOrderManager.tsx`

**Changes:**
- Remove all imports and references to `sample-orders.ts` and `getSampleOrdersForRestaurant`
- Remove the simulated order arrival timers (`setTimeout` logic)
- Instead, import `useOrders` from order-context
- Orders now come from context (which receives them via BroadcastChannel when a buyer places one)
- `handleStatusChange` now calls `updateOrderStatus()` from context (which updates local state AND broadcasts to buyer tabs)
- The `activeSession` prop is still needed -- orders only appear if there is an active session AND the order's `restaurantId` matches the session's restaurant

**Filtering logic:** Only show orders where `order.sellerId === profile.id` (or, during this simulated phase, where `order.restaurantId === activeSession.restaurantId` since the buyer selects a specific seller who is live at that restaurant).

### 5.9 `src/components/seller/SellerOrderCard.tsx`

**Changes:**
- Minimal. The `onStatusChange` callback signature stays the same.
- The `buyerName` prop can now be derived from the order itself (since we are adding `buyerName` or can use the buyer's profile display name). ACTUALLY: the buyer's name is available from the order context. But currently `buyerName` is passed as a prop from `SellerOrderManager`.
- For this phase, include a `buyerName` field on the `Order` type as well (denormalized, like `sellerName`).

**Additional change to `types.ts`:** Add `buyerName: string` to the `Order` interface.

### 5.10 `src/components/seller/GoLivePanel.tsx`

**Changes:**
- Import `sellerBus` from order-bus
- After successfully going live (the `goLive` server action succeeds and page reloads), broadcast `seller-online` with seller profile data
- Problem: the page reloads after going live (`window.location.reload()`), so the broadcast must happen *after* reload, when the component mounts with an active session.
- Solution: In the "active session" branch of the component (when `activeSession` is not null), broadcast `seller-online` on mount. This naturally handles the reload case AND handles the case where the seller tab was already open.
- On `handleEndSession`: broadcast `seller-offline` before ending the session.
- Add two new input fields to the go-live form:
  - **Position in line** (number input, required): "What's your spot in line?"
  - **Your fee** (number input, with $ prefix, required): "How much are you charging?"
  - These fields are stored in component state and included in the `seller-online` broadcast payload. They are NOT persisted to Supabase in this phase.

### 5.11 `src/lib/sample-orders.ts`

**Status:** Deprecated. No longer imported anywhere after `SellerOrderManager` changes. Delete the file.

### 5.12 `src/lib/sellers.ts`

**Status:** Deprecated for live use. The hardcoded seller data is no longer used by any component (buyer restaurant page now reads from seller presence context). Delete the file.

---

## 6. Implementation Order

This is the sequence that minimizes broken intermediate states.

### Phase A: Foundation (no visible changes yet)

1. **`src/lib/types.ts`** -- Add `statusUpdatedAt`, `restaurantName`, `sellerName`, `buyerName` fields to `Order`
2. **`src/lib/order-bus.ts`** -- New file. BroadcastChannel wrapper with typed messages.
3. **`src/lib/order-context.tsx`** -- New file. Order state context with bus integration.
4. **`src/lib/seller-presence-context.tsx`** -- New file. Seller presence context with bus integration.

### Phase B: Wire up providers

5. **`src/app/(dashboard)/layout.tsx`** -- Wrap children in `OrderProvider` and `SellerPresenceProvider`

### Phase C: Seller side (make it receive real orders)

6. **`src/components/seller/GoLivePanel.tsx`** -- Add position/fee inputs, broadcast seller presence on mount when live, broadcast offline on end session
7. **`src/components/seller/SellerOrderManager.tsx`** -- Rip out sample-orders, read from order context instead
8. **`src/components/seller/SellerOrderCard.tsx`** -- Minor: read `buyerName` from order object if needed
9. **Delete `src/lib/sample-orders.ts`**

### Phase D: Buyer side (make it send real orders and track them)

10. **`src/components/buyer/OrderTracker.tsx`** -- New file. The rich tracking view.
11. **`src/components/buyer/OrderTrackerDrawer.tsx`** -- New file. Drawer wrapper for tracker.
12. **`src/components/buyer/ActiveOrderCard.tsx`** -- New file. Compact order card for dashboard.
13. **`src/components/buyer/BuyerOrdersSection.tsx`** -- New client component extracted from buyer page.
14. **`src/components/buyer/RestaurantLiveSection.tsx`** -- New client component for restaurant detail page.
15. **`src/components/buyer/OrderDrawer.tsx`** -- Wire up `placeOrder()`, remove `OrderPendingState`
16. **`src/components/buyer/SellerList.tsx`** -- Accept onOrderPlaced callback, minor wiring
17. **`src/app/(dashboard)/buyer/page.tsx`** -- Replace YOUR ORDERS EmptyState with `BuyerOrdersSection`
18. **`src/app/(dashboard)/buyer/restaurant/[id]/page.tsx`** -- Replace hardcoded sellers with `RestaurantLiveSection`
19. **Delete `src/components/buyer/OrderPendingState.tsx`**
20. **Delete `src/lib/sellers.ts`**

---

## 7. Order Lifecycle (End-to-End Flow)

### Happy path, step by step:

**Tab A: Seller dashboard** | **Tab B: Buyer dashboard**

1. **Seller** opens `/seller`, goes live at Katz's with position 3, fee $5
2. GoLivePanel mounts with active session -> broadcasts `seller-online` on `linecut-sellers`
3. ---
4. **Buyer** opens `/buyer`, navigates to `/buyer/restaurant/katzs`
5. `SellerPresenceProvider` mounts, broadcasts `seller-roll-call`
6. **Seller tab** receives roll-call, responds with `seller-online`
7. **Buyer tab** receives `seller-online`, adds seller to presence registry
8. `RestaurantLiveSection` renders the seller card for this restaurant
9. **Buyer** taps seller card -> `OrderDrawer` opens -> buyer builds order -> taps CONFIRM
10. `OrderDrawer` calls `placeOrder()`:
    - Constructs `Order` with status `"pending"`, generated ID, all financial fields, `sellerName: "Marco T."`, `restaurantName: "Katz's Delicatessen"`, `buyerName` from profile
    - Adds to local order context state
    - Publishes `order-placed` on `linecut-orders`
    - Drawer transitions to show `OrderTracker` with status PENDING
11. **Seller tab** receives `order-placed`:
    - Order context adds the order to local state
    - `SellerOrderManager` renders new `SellerOrderCard` with ACCEPT / DECLINE buttons
12. **Seller** taps ACCEPT:
    - `updateOrderStatus(orderId, "accepted")` is called
    - Local state updates, publishes `order-status-changed` on `linecut-orders`
    - Also publishes `seller-busy` on `linecut-sellers`
13. **Buyer tab** receives `order-status-changed`:
    - Order context updates the order's status to `"accepted"`
    - `OrderTracker` re-renders: ACCEPTED step becomes current, copy changes to "{sellerName}'s got it. Sit tight."
14. **Seller** taps STARTED ORDERING -> same flow, status becomes `"in-progress"`
15. **Buyer** sees: "Marco is at the counter now."
16. **Seller** taps ORDER'S READY -> status becomes `"ready"`
17. **Buyer** sees: "Your food is ready. Head to Katz's Delicatessen." (This is the high-urgency moment -- use ketchup color, bold treatment)
18. **Seller** taps HANDED OFF -> status becomes `"completed"`
19. **Buyer** sees: "Handoff complete." + "RATE YOUR EXPERIENCE" button (placeholder, no-op for now)
20. **Seller** publishes `seller-available` on `linecut-sellers` (back to accepting orders)

### Cancellation paths:

- **Buyer cancels while pending:** Removes from local state, publishes `order-cancelled` with `cancelledBy: "buyer"`. Seller tab receives it, removes from their order list.
- **Seller declines:** Publishes `order-cancelled` with `cancelledBy: "seller"`. Buyer tab receives it, shows a dismissible message: "{sellerName} couldn't take your order. Try another seller."
- **Seller goes offline with active orders:** On `handleEndSession`, if there are orders that are not `completed` or `cancelled`, publish `order-cancelled` for each with `cancelledBy: "seller"`. Then publish `seller-offline`.

---

## 8. Tracking View Architecture Decision

**Decision: Drawer, not a new page.**

Rationale:
- The order tracker is a transient view of an in-progress action. It does not need its own URL.
- A drawer keeps the buyer on their current page (whether that is `/buyer` or `/buyer/restaurant/katzs`), so they can still browse while tracking.
- The existing `OrderDrawer` already established the slide-up drawer as the order interaction pattern. Tracking continues in that same spatial model.
- A new page (`/buyer/order/[id]`) would require persisted order data in a DB or URL state -- unnecessary complexity for the simulated phase.
- The drawer auto-opens when the buyer places an order (natural continuation of the `OrderDrawer` flow) and can be re-opened from the `ActiveOrderCard` on the dashboard.

**The drawer is NOT the OrderDrawer.** It is a separate component (`OrderTrackerDrawer`) that wraps `OrderTracker`. The `OrderDrawer` is for *building* an order. The `OrderTrackerDrawer` is for *watching* an order. They share the same visual shell (slide-up panel) but are distinct components.

---

## 9. Copy Strings (All Buyer-Facing Status Messages)

### OrderTracker step labels and descriptions:

| Status | Step Label | Description (shown below step) |
|--------|-----------|-------------------------------|
| `pending` | ORDER SENT | "Waiting on {sellerName} to accept..." |
| `accepted` | ACCEPTED | "{sellerName}'s got it. Sit tight." |
| `in-progress` | AT THE COUNTER | "{sellerName} is ordering at the counter now." |
| `ready` | READY FOR PICKUP | "Your food is ready. Head to {restaurantName}." |
| `completed` | HANDED OFF | "Done. How'd it go?" |
| `cancelled` | CANCELLED | "This order was cancelled." |

### Notification-style banners (shown prominently when status changes):

These appear as a brief highlighted banner at the top of the tracker when the status just changed. They auto-dismiss after 5 seconds or on tap.

| Transition | Banner text |
|-----------|-------------|
| -> `accepted` | "{sellerName} accepted your order" |
| -> `in-progress` | "{sellerName} is ordering at the counter now" |
| -> `ready` | "Your food is ready! Meet {sellerName} outside {restaurantName}" |
| -> `completed` | "Handoff complete. Rate your experience?" |
| -> `cancelled` (by seller) | "{sellerName} couldn't take your order" |

### Estimated time remaining (shown on tracker):

| Status | Time display |
|--------|-------------|
| `pending` | "Waiting for response..." |
| `accepted` | "{sellerWaitEstimate}" (from seller profile, e.g., "~8 min") |
| `in-progress` | "A few minutes" |
| `ready` | "Waiting on you" |
| `completed` | (not shown) |

### GoLivePanel new field labels:

| Field | Label | Placeholder | Helper text |
|-------|-------|-------------|-------------|
| Position in line | YOUR SPOT IN LINE | "e.g. 3" | "Roughly how many people are ahead of you?" |
| Fee | YOUR FEE | "$0.00" | "How much extra are you charging for this?" |

---

## 10. Edge Cases and Behaviors

### What happens if the seller tab closes?
- The buyer's order is stuck at whatever status it was at. No automatic cancellation.
- This is acceptable for the simulated phase. In production, Supabase Realtime + presence would detect disconnect and trigger a timeout.
- The buyer can still cancel their order manually.

### What happens if the buyer tab closes and reopens?
- Order state is lost (in-memory only). The buyer sees no active orders.
- This is acceptable for the simulated phase. In production, orders would be in the DB.
- Enhancement for later: persist active orders to `localStorage` as a backup, and rehydrate on mount. Not in scope for this phase.

### What happens if multiple buyers order from the same seller?
- Each order is independent. The seller sees multiple `SellerOrderCard` components.
- The seller can advance each order independently.
- The seller's status changes to `busy` after accepting the first order (via `seller-busy` broadcast), but they still appear in the buyer's seller list -- just with a "BUSY" badge instead of "AVAILABLE". Buyers can still place orders to a busy seller; the seller decides whether to accept.

### What happens if no seller is live?
- The restaurant detail page shows: "Nobody's in line right now. Check back in a bit." (EmptyState)
- The buyer dashboard restaurant browser still shows restaurants (static data), but each restaurant card shows "0 in line" instead of the hardcoded `activeSellers` count.

### What happens if the buyer orders from a seller who then goes offline?
- If the order is still `pending`: the seller's end-session logic cancels it automatically and broadcasts `order-cancelled`.
- If the order is `accepted` or later: the order remains active. The seller presumably handed off their phone or will come back. The buyer can cancel if needed.

---

## 11. Files Summary

### New files (8):
| File | Type | Purpose |
|------|------|---------|
| `src/lib/order-bus.ts` | Module | BroadcastChannel wrapper |
| `src/lib/order-context.tsx` | Context | Shared order state |
| `src/lib/seller-presence-context.tsx` | Context | Live seller registry |
| `src/components/buyer/OrderTracker.tsx` | Component | Rich tracking view |
| `src/components/buyer/OrderTrackerDrawer.tsx` | Component | Drawer shell for tracker |
| `src/components/buyer/ActiveOrderCard.tsx` | Component | Dashboard order card |
| `src/components/buyer/BuyerOrdersSection.tsx` | Component | Client wrapper for YOUR ORDERS |
| `src/components/buyer/RestaurantLiveSection.tsx` | Component | Client wrapper for restaurant detail live content |

### Modified files (8):
| File | Change scope |
|------|-------------|
| `src/lib/types.ts` | Add 4 fields to Order |
| `src/app/(dashboard)/layout.tsx` | Add 2 context providers |
| `src/components/seller/GoLivePanel.tsx` | Add inputs, broadcast presence |
| `src/components/seller/SellerOrderManager.tsx` | Replace sample-orders with context |
| `src/components/seller/SellerOrderCard.tsx` | Minor: buyerName from order |
| `src/components/buyer/OrderDrawer.tsx` | Wire placeOrder, remove pending state |
| `src/components/buyer/SellerList.tsx` | Add onOrderPlaced callback |
| `src/app/(dashboard)/buyer/page.tsx` | Replace EmptyState with live section |
| `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx` | Replace hardcoded sellers |

### Deleted files (3):
| File | Reason |
|------|--------|
| `src/lib/sample-orders.ts` | Replaced by real cross-tab orders |
| `src/lib/sellers.ts` | Replaced by seller presence context |
| `src/components/buyer/OrderPendingState.tsx` | Replaced by OrderTracker |

---

## 12. Out of Scope

These are explicitly NOT part of this plan:

- **Supabase Realtime** -- No DB-backed real-time sync. BroadcastChannel only.
- **Order persistence** -- Orders exist only in memory. Closing all tabs loses them.
- **In-app messaging** -- The "MESSAGE SELLER" button is a placeholder. No chat infrastructure.
- **Ratings/reviews** -- The "RATE YOUR EXPERIENCE" prompt is a placeholder. No ratings system.
- **Push notifications** -- No browser notification API integration. Status changes are visible only when the tab is open.
- **Multiple simultaneous orders per buyer** -- The UI assumes one active order at a time per buyer. The data model supports multiple, but the `useActiveOrder()` hook returns only the most recent.
- **Order history** -- Completed orders disappear when the tab closes. No persistence.
- **Payment capture** -- No Stripe integration for this phase. Financial fields on the order are display-only.
- **Seller position/wait time updates** -- Once the seller goes live with a position and wait estimate, those are static. No mechanism to update them mid-session.
- **localStorage backup** -- No persistence fallback for orders if tabs close.
