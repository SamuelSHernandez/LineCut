# Restaurant Detail Page & Order Placement Flow -- Implementation Plan

> **Date:** 2026-03-07
> **Status:** Ready for implementation
> **Scope:** Buyer clicks restaurant card -> sees sellers in line -> places order -> waits for acceptance

---

## 1. New & Modified Files

### New Files

| File | Purpose |
|------|---------|
| `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx` | Server component: restaurant detail page |
| `src/components/buyer/SellerCard.tsx` | Individual seller card in the seller list |
| `src/components/buyer/SellerList.tsx` | Client component: renders list of sellers, handles selection |
| `src/components/buyer/OrderDrawer.tsx` | Client component: slide-up order placement panel |
| `src/components/buyer/MenuItemPill.tsx` | Tappable menu item pill for quick-add |
| `src/components/buyer/OrderConfirmation.tsx` | Client component: price breakdown + confirm button |
| `src/components/buyer/OrderPendingState.tsx` | Client component: post-submission waiting screen |
| `src/lib/sellers.ts` | Hardcoded seller data per restaurant |
| `src/lib/menu-items.ts` | Hardcoded popular menu items per restaurant |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/types.ts` | Add `Seller`, `MenuItem`, `Order`, `OrderStatus` types |
| `src/components/buyer/RestaurantCard.tsx` | Wrap in `Link` to navigate to detail page instead of just selecting |
| `src/components/buyer/RestaurantBrowser.tsx` | Remove `selectedId` click-to-highlight behavior; card click now navigates |

---

## 2. Data Structures

All new types go in `src/lib/types.ts`, appended below the existing `Restaurant` interface.

### Seller

```
interface Seller {
  id: string
  restaurantId: string          // FK to Restaurant.id
  firstName: string             // "Marco"
  lastInitial: string           // "T"
  positionInLine: number        // e.g. 3 (3rd from counter)
  waitEstimate: string          // "~8 min"
  trustScore: number            // 0-100, same scale as buyer trust score
  completedOrders: number       // lifetime completed orders
  fee: number                   // seller's fee in dollars, e.g. 5.00
  menuFlexibility: "full" | "popular-only" | "preset"
  status: "available" | "busy"  // busy = currently fulfilling another order
  joinedAt: string              // ISO timestamp, when they joined the line
}
```

**Display name format:** `firstName` + space + `lastInitial` + period. Example: "Marco T." -- matches style guide rule: "Use the person's first name + last initial."

### MenuItem

```
interface MenuItem {
  id: string
  restaurantId: string
  name: string                  // "Pastrami on Rye"
  priceEstimate: number         // estimated price in dollars, e.g. 24.95
  popular: boolean              // if true, shown as quick-tap pill
}
```

### Order

```
interface Order {
  id: string
  buyerId: string
  sellerId: string
  restaurantId: string
  items: OrderItem[]
  specialInstructions: string
  status: OrderStatus
  itemsEstimate: number         // sum of item price estimates
  sellerFee: number             // seller's fee
  platformFee: number           // LineCut's cut
  total: number                 // itemsEstimate + sellerFee + platformFee
  createdAt: string             // ISO timestamp
}

interface OrderItem {
  menuItemId: string
  name: string
  priceEstimate: number
  quantity: number
}

type OrderStatus = "pending" | "accepted" | "in-progress" | "ready" | "completed" | "cancelled"
```

### Platform Fee Calculation

For the hardcoded phase, use a flat rule:

- **Platform fee** = 15% of `itemsEstimate`, minimum $1.00, maximum $8.00
- Display as "LineCut fee" -- never say "platform fee" or "service fee" (brand voice: direct, no corporate speak)

---

## 3. Hardcoded Test Data

### Sellers (`src/lib/sellers.ts`)

**Katz's Delicatessen** (`restaurantId: "katzs"`) -- 2 active sellers:

| Field | Seller 1 | Seller 2 |
|-------|----------|----------|
| id | `"seller-katzs-1"` | `"seller-katzs-2"` |
| firstName | `"Marco"` | `"Dee"` |
| lastInitial | `"T"` | `"R"` |
| positionInLine | `3` | `7` |
| waitEstimate | `"~8 min"` | `"~18 min"` |
| trustScore | `92` | `78` |
| completedOrders | `47` | `12` |
| fee | `5.00` | `3.50` |
| menuFlexibility | `"full"` | `"popular-only"` |
| status | `"available"` | `"available"` |

**Joe's Pizza** (`restaurantId: "joes-pizza"`) -- 1 active seller:

| Field | Seller 1 |
|-------|----------|
| id | `"seller-joes-1"` |
| firstName | `"Nico"` |
| lastInitial | `"V"` |
| positionInLine | `2` |
| waitEstimate | `"~5 min"` |
| trustScore | `88` |
| completedOrders | `31` |
| fee | `3.00` |
| menuFlexibility | `"full"` |
| status | `"available"` |

**Russ & Daughters** (`restaurantId: "russ-daughters"`) -- 1 active seller:

| Field | Seller 1 |
|-------|----------|
| id | `"seller-russ-1"` |
| firstName | `"Sasha"` |
| lastInitial | `"K"` |
| positionInLine | `5` |
| waitEstimate | `"~12 min"` |
| trustScore | `95` |
| completedOrders | `63` |
| fee | `4.50` |
| menuFlexibility | `"full"` |
| status | `"available"` |

### Menu Items (`src/lib/menu-items.ts`)

**Katz's Delicatessen:**

| name | priceEstimate | popular |
|------|--------------|---------|
| Pastrami on Rye | 24.95 | true |
| Corned Beef on Rye | 24.95 | true |
| Reuben | 26.95 | true |
| Matzo Ball Soup | 8.95 | true |
| Knish | 6.95 | false |
| Hot Dog | 5.95 | false |

**Joe's Pizza:**

| name | priceEstimate | popular |
|------|--------------|---------|
| Plain Slice | 3.50 | true |
| Sicilian Slice | 4.50 | true |
| Fresh Mozzarella Slice | 5.00 | true |
| Two Slices + Drink | 9.50 | true |
| Whole Pie (Plain) | 28.00 | false |

**Russ & Daughters:**

| name | priceEstimate | popular |
|------|--------------|---------|
| Classic Bagel & Lox | 18.00 | true |
| Whitefish Salad on Bagel | 16.00 | true |
| Super Heebster | 21.00 | true |
| Chopped Liver on Rye | 14.00 | true |
| Borscht | 9.00 | false |
| Babka (Chocolate) | 16.00 | false |

---

## 4. Restaurant Detail Page

### Route

`/buyer/restaurant/[id]` -- file at `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx`

This is a **server component** that:
1. Reads the `[id]` param
2. Looks up the restaurant from the hardcoded `restaurants` array
3. Looks up the sellers from the hardcoded `sellers` array filtered by `restaurantId`
4. Looks up the menu items from the hardcoded `menuItems` array filtered by `restaurantId`
5. If no restaurant found for the given id, calls `notFound()`
6. Passes data down to client components

### Page Layout (Top to Bottom)

#### A. Back Navigation

A simple back link at the top of the page. No breadcrumbs -- the app is not deep enough to warrant them yet.

- Text: a left arrow character + "BACK TO RESTAURANTS"
- Font: mono, 11px, uppercase, tracking 2px, sidewalk color
- Links to `/buyer`
- Styled as a `Link` component, not a browser-back button (predictable behavior)

#### B. Restaurant Header

A ticket-styled card (`bg-ticket`, same card styling as existing cards) spanning full width. Contains:

- **Restaurant name** -- Display font, 32px (H1 scale), all caps, tracking 2px
- **Address** -- Body font, 13px, sidewalk color
- **Cuisine pills** -- Same pill styling as RestaurantCard (butcher-paper bg, dashed border, 12px body font)
- **Dashed divider** -- `border-t border-dashed border-[#ddd4c4]`
- **Stats row** below the divider, three items spaced evenly:
  - Active sellers count: green Active badge, e.g. "2 IN LINE"
  - Wait estimate: mono 11px, e.g. "~8-18 MIN"
  - Average seller fee: mono 11px, e.g. "FEE FROM $3.50"

#### C. Section Heading: "WHO'S IN LINE"

- Display font, 22px (H2 scale), tracking 1px
- Below: a one-line subtitle in body 13px sidewalk: "Tap a seller to start your order."

#### D. Seller List

Rendered by `SellerList` client component. Displays `SellerCard` components in a vertical stack with 16px gaps.

Details in section 5 below.

#### E. Section Heading: "YOUR ORDERS" (future)

Same empty state as currently shown on `/buyer` page. Keep this placeholder section for continuity. Reuse the existing `EmptyState` component.

---

## 5. Seller Card Component

**File:** `src/components/buyer/SellerCard.tsx`

**Component type:** Client component (`"use client"`)

**Props:**

```
interface SellerCardProps {
  seller: Seller
  isSelected: boolean
  onSelect: (sellerId: string) => void
}
```

### Card Layout

Uses the standard ticket card styling (`bg-ticket rounded-[10px] border border-[#eee6d8] p-5 shadow-card`). When selected: `border-2 border-ketchup shadow-elevated`.

**Row 1: Seller identity**
- Left side:
  - Avatar circle (36px, mustard bg, initials in display font 14px) -- reuse the exact avatar pattern from `DashboardNav`
  - Next to avatar, vertically stacked:
    - Seller name: body font, 15px, weight 600. E.g. "Marco T."
    - Trust score badge: waiting-style badge (`bg-[#FFF3D6] text-[#8B6914]`), mono 11px. E.g. "TRUST: 92"
- Right side:
  - Fee displayed prominently: display font, 22px, ketchup color. E.g. "$5.00"
  - Below fee: mono 11px, sidewalk. "THEIR FEE"

**Dashed divider**

**Row 2: Line position & stats**
Three data points in a horizontal row, evenly spaced:

1. **Position**: mono 11px, uppercase. Label "SPOT" in sidewalk, value in chalkboard bold. E.g. "#3"
2. **Wait**: mono 11px, uppercase. Label "WAIT" in sidewalk, value in chalkboard bold. E.g. "~8 MIN"
3. **Orders done**: mono 11px, uppercase. Label "DONE" in sidewalk, value in chalkboard bold. E.g. "47"

**Row 3: Flexibility indicator**
A single line in body 13px, sidewalk color:
- `"full"` -> "Can order anything on the menu."
- `"popular-only"` -> "Sticking to the popular items."
- `"preset"` -> "Has a set list -- check before ordering."

**Row 4: Action**
- If `status === "busy"`: show a disabled state. Text: "HANDLING ANOTHER ORDER" in complete-style badge (`bg-[#E8E8E8] text-[#666]`). Card has reduced opacity (0.6).
- If `status === "available"` and not selected: the whole card is a `<button>` with `onClick={() => onSelect(seller.id)}`
- If selected: card gets the ketchup border and the bottom of the card shows a ketchup primary button: "ORDER THROUGH [FIRST NAME]" -- display font, all caps. Clicking this button opens the `OrderDrawer`.

---

## 6. Order Placement Flow

### Step 1: Buyer selects a seller

In the `SellerList` component:
- State: `selectedSellerId: string | null`
- State: `drawerOpen: boolean`
- Clicking a seller card sets `selectedSellerId`
- Clicking "ORDER THROUGH MARCO" on the selected card sets `drawerOpen = true`

### Step 2: OrderDrawer opens

**File:** `src/components/buyer/OrderDrawer.tsx`

**Behavior:** A panel that slides up from the bottom of the screen on mobile, or appears as a right-side panel on desktop (md breakpoint and above).

- Mobile: fixed position, bottom 0, full width, max-height 85vh, rounded top corners (10px), scrollable content area. Dark overlay behind it (`bg-chalkboard/40`). Can be dismissed by tapping the overlay or a close button.
- Desktop (md+): fixed position, right 0, top 0, full height, width 420px, no rounded corners. Same overlay behavior.

**Props:**

```
interface OrderDrawerProps {
  seller: Seller
  restaurant: Restaurant
  menuItems: MenuItem[]
  onClose: () => void
  onSubmit: (order: NewOrderPayload) => void
}

interface NewOrderPayload {
  sellerId: string
  restaurantId: string
  items: { menuItemId: string; name: string; priceEstimate: number; quantity: number }[]
  specialInstructions: string
}
```

### Drawer Layout (Top to Bottom)

#### Drawer Header
- Close button: top-right, an "X" character in chalkboard, tappable 44x44 hit area
- Title: Display font, 22px. "YOUR ORDER"
- Subtitle: Body 13px, sidewalk. "Through [seller first name] at [restaurant name]"

#### Dashed divider

#### Popular Items Section
- Label: Mono 11px, uppercase, tracking 2px, sidewalk. "POPULAR ITEMS"
- Below: a flex-wrap row of `MenuItemPill` components for items where `popular === true`

**MenuItemPill component** (`src/components/buyer/MenuItemPill.tsx`):
- Renders as a tappable pill/chip
- Default state: `bg-butcher-paper border border-[#ddd4c4]`, body 13px, chalkboard text. Shows item name + price estimate in sidewalk. E.g. "Pastrami on Rye -- $24.95"
- Selected state: `bg-ketchup/10 border border-ketchup text-ketchup` (light red tint background)
- Tapping toggles the item into/out of the order
- When selected, a small quantity control appears inline or adjacent: minus button, count, plus button. Default quantity is 1. Min 1, max 10.

#### Full Menu Section (if restaurant has non-popular items)
- Label: Mono 11px, uppercase. "MORE ITEMS"
- Same pills, but for items where `popular === false`
- Collapsed by default behind a "Show more" ghost button. Tapping reveals them.

#### Special Instructions
- Label: Mono 11px, uppercase, tracking 2px, sidewalk. "SPECIAL INSTRUCTIONS"
- A `<textarea>` styled consistently with the existing search input:
  - `bg-butcher-paper rounded-[6px] border border-[#ddd4c4]`
  - body 13px, chalkboard text, sidewalk placeholder
  - Placeholder: "Extra mustard, no pickle, cut in half..."
  - 3 rows default height, auto-expands up to 6 rows
  - Focus state: `border-ketchup`

#### Dashed divider

#### Price Breakdown (OrderConfirmation component)
- Only visible when at least one item is selected
- Renders inside the drawer, pinned to the bottom (sticky)

**OrderConfirmation component** (`src/components/buyer/OrderConfirmation.tsx`):

```
interface OrderConfirmationProps {
  items: OrderItem[]
  sellerFee: number
  onConfirm: () => void
}
```

Layout:
- Line items listed vertically:
  - Each item: body 13px. "[quantity]x [name]" left-aligned, "$[price]" right-aligned
- Dashed divider
- "Items estimate" -- body 13px, right-aligned dollar amount
- "Marco's fee" -- body 13px, right-aligned dollar amount (use seller's first name, never "seller fee")
- "LineCut fee" -- body 13px, right-aligned dollar amount
- Solid divider (this is the ONE exception where a solid line is acceptable -- to visually separate the total)
- "TOTAL" -- display font, 18px, left-aligned label. Dollar amount right-aligned, display font, 22px, ketchup color

Below the breakdown:
- Primary button (ketchup, full width, lg size): "PLACE ORDER -- $[TOTAL]"
- Caption below button: body 11px, sidewalk, centered. "Prices are estimates. Final amount may vary."

**Important copy note:** The word "estimate" must appear. These are not real menu prices -- the seller is buying on behalf of the buyer. The actual charge may differ. This expectation must be set clearly.

### Step 3: Order submitted

When the buyer taps "PLACE ORDER":

1. The drawer transitions to the `OrderPendingState` component (replaces drawer content, does not close the drawer)
2. A hardcoded `Order` object is created in local state with `status: "pending"`

**OrderPendingState component** (`src/components/buyer/OrderPendingState.tsx`):

```
interface OrderPendingStateProps {
  order: Order
  sellerName: string
  restaurantName: string
  onClose: () => void
}
```

Layout:
- Centered content
- The scissors icon (reuse the SVG from `EmptyState`) at top, with a slow CSS pulse animation
- Heading: Display font, 22px. "ORDER SENT"
- Body text: body 15px, sidewalk, centered, max-width ~280px. "Waiting on [seller first name] to accept. Hang tight -- they're [position]th from the counter."
- The order summary (items list, total) shown below in compact form
- A mono 11px timestamp: "PLACED AT [time]"
- Dashed divider
- Ghost button: "CANCEL ORDER" in ketchup color

For the hardcoded demo: after 5 seconds, automatically transition the status to `"accepted"` and update the heading to "ORDER ACCEPTED" with body text "[Seller first name]'s got it. They'll grab your order when they hit the counter." and swap the scissors animation to a static checkmark. This simulates the real-time flow without a backend.

---

## 7. Navigation Flow

### Forward Navigation

1. Buyer is on `/buyer` -- sees restaurant cards in `RestaurantBrowser`
2. Buyer clicks a restaurant card -> navigates to `/buyer/restaurant/[id]`
3. On the detail page, buyer taps a seller -> seller card expands to show "ORDER THROUGH [NAME]" button
4. Buyer taps the button -> `OrderDrawer` slides open (overlay, not a page navigation)
5. Buyer builds order and taps "PLACE ORDER" -> drawer content transitions to `OrderPendingState`
6. Buyer can close the drawer at any time to return to the restaurant detail page

### Backward Navigation

- Detail page has explicit "BACK TO RESTAURANTS" link at top -> `/buyer`
- Browser back button also works naturally (detail page is a real route)
- Drawer close (X button, overlay tap, or Escape key) dismisses the drawer without navigation
- No breadcrumbs needed at this depth

### Changes to RestaurantCard

The current `RestaurantCard` is a `<button>` with an `onClick` handler. It needs to become navigable:

- Wrap the card content in a Next.js `Link` component pointing to `/buyer/restaurant/${restaurant.id}`
- Remove the `onClick` prop from `RestaurantCardProps`
- Remove the `isSelected` prop and its border styling (selection state is no longer needed on the browse page -- clicking navigates away)
- Keep the hover shadow/scale effects for affordance

### Changes to RestaurantBrowser

- Remove the `selectedId` state entirely
- Remove the `handleSelectFromMap` scroll-to-card behavior
- The map can remain interactive -- clicking a marker on the map should navigate to that restaurant's detail page (change `onSelectRestaurant` callback to use `router.push`)
- This means `RestaurantBrowser` needs `useRouter` from `next/navigation`

---

## 8. UX Details & Brand Voice

### Copy -- Key Strings

| Location | Text |
|----------|------|
| Back link | "<- BACK TO RESTAURANTS" (use left arrow character) |
| Section heading | "WHO'S IN LINE" |
| Section subtitle | "Tap a seller to start your order." |
| Seller action button | "ORDER THROUGH MARCO" (dynamic first name, all caps) |
| Drawer title | "YOUR ORDER" |
| Drawer subtitle | "Through Marco at Katz's Delicatessen" |
| Popular items label | "POPULAR ITEMS" |
| More items label | "MORE ITEMS" |
| Instructions label | "SPECIAL INSTRUCTIONS" |
| Instructions placeholder | "Extra mustard, no pickle, cut in half..." |
| Confirm button | "PLACE ORDER -- $47.85" |
| Price disclaimer | "Prices are estimates. Final amount may vary." |
| Pending heading | "ORDER SENT" |
| Pending body | "Waiting on Marco to accept. Hang tight -- they're 3rd from the counter." |
| Accepted heading | "ORDER ACCEPTED" |
| Accepted body | "Marco's got it. They'll grab your order when they hit the counter." |
| Cancel button | "CANCEL ORDER" |
| No sellers state | "Nobody's in line here right now. Check back at lunch." |
| Busy seller | "HANDLING ANOTHER ORDER" |
| Flexibility: full | "Can order anything on the menu." |
| Flexibility: popular-only | "Sticking to the popular items." |
| Flexibility: preset | "Has a set list -- check before ordering." |
| Fee label | "[FIRST NAME]'S FEE" |
| Platform fee label | "LINECUT FEE" |

### Responsive Behavior

**Mobile (< md breakpoint):**
- Restaurant header: full width, stacked layout
- Seller cards: full width, vertical stack
- Order drawer: slides up from bottom, 85vh max height
- Menu item pills: wrap to multiple rows
- Price breakdown: sticky at bottom of drawer

**Desktop (md+):**
- Restaurant header: full width within the `max-w-5xl` container (same as dashboard shell)
- Seller cards: full width within container
- Order drawer: slides in from right, 420px wide, full height
- Everything else same

### Animations

- Drawer open: slide up (mobile) or slide from right (desktop), 300ms ease-out
- Drawer close: reverse, 200ms ease-in
- Seller card selection: border color transition, 200ms
- Pending -> Accepted transition: fade crossfade, 400ms
- Scissors pulse: reuse existing `pulse` keyframe from globals.css
- Menu pill toggle: background-color transition, 150ms

### Accessibility

- Drawer must trap focus when open
- Escape key closes the drawer
- Seller cards must be keyboard-navigable (they are buttons)
- All interactive elements need minimum 44x44px touch targets
- Price breakdown values should use `aria-label` for screen readers (e.g., "Total: forty-seven dollars and eighty-five cents")
- Overlay must have `aria-hidden` on background content when drawer is open

### Trust & Safety Signals

- Trust score displayed prominently on each seller card (same badge style as buyer's own trust score)
- Completed orders count shown as social proof ("47 orders done")
- Menu flexibility indicator sets expectations before ordering
- Price estimate disclaimer prevents disputes
- The "CANCEL ORDER" option is always visible during pending state

---

## 9. Component Hierarchy

```
page.tsx (server component)
  |
  +-- Link ("BACK TO RESTAURANTS")
  |
  +-- Restaurant Header (static markup in page.tsx, not a separate component)
  |
  +-- SellerList (client component)
  |     |
  |     +-- SellerCard (one per seller)
  |     |
  |     +-- OrderDrawer (conditionally rendered)
  |           |
  |           +-- MenuItemPill (one per menu item)
  |           +-- OrderConfirmation (price breakdown + submit)
  |           +-- OrderPendingState (replaces drawer content after submit)
  |
  +-- EmptyState (reused, for "YOUR ORDERS" placeholder)
```

### State Management

All order-flow state lives in `SellerList`. No global state or context needed for this feature. The state shape:

- `selectedSellerId: string | null` -- which seller card is expanded
- `drawerOpen: boolean` -- whether the order drawer is visible
- `orderItems: Map<string, { menuItem: MenuItem; quantity: number }>` -- items added to the order
- `specialInstructions: string` -- free text
- `submittedOrder: Order | null` -- set after "PLACE ORDER" is tapped
- `orderAccepted: boolean` -- flipped by the 5-second demo timer

When the drawer closes, all order state resets (items cleared, instructions cleared). This is intentional -- there is no "save draft" concept. You either place it or you don't. Fits the brand: decisive, no dawdling.

---

## 10. What This Plan Intentionally Excludes

These are out of scope for this phase. Listing them explicitly so the implementation agent does not build them:

1. **Real-time updates** -- no WebSocket/Supabase Realtime subscriptions. Seller availability is static hardcoded data.
2. **Payment processing** -- no Stripe, no wallet, no payment capture. The "PLACE ORDER" button creates a local state object only.
3. **Seller-side acceptance flow** -- no notification to the seller. The 5-second auto-accept is a simulation.
4. **Order history persistence** -- orders exist only in component state. Refreshing the page loses them.
5. **Chat between buyer and seller** -- not in scope.
6. **Seller ratings/reviews** -- trust score is shown but not editable or computable.
7. **Menu item search** -- the menu lists are short enough that search adds no value.
8. **Restaurant photos or images** -- no image assets needed.
9. **Deep linking to a specific seller** -- URL only resolves to restaurant level.
10. **Error states for network failures** -- everything is local/hardcoded, nothing can fail.

---

## 11. Implementation Order

Recommended sequence for the implementation agent:

1. **Types first** -- Add `Seller`, `MenuItem`, `Order`, `OrderItem`, `OrderStatus` to `src/lib/types.ts`
2. **Test data** -- Create `src/lib/sellers.ts` and `src/lib/menu-items.ts` with all hardcoded data
3. **Modify RestaurantCard** -- Convert from button to Link, remove selection state
4. **Modify RestaurantBrowser** -- Remove selectedId state, update map click to navigate
5. **Restaurant detail page** -- Build `src/app/(dashboard)/buyer/restaurant/[id]/page.tsx` with header and seller list
6. **SellerCard** -- Build the card component with selection behavior
7. **SellerList** -- Build the list wrapper with selection state management
8. **MenuItemPill** -- Build the tappable pill component
9. **OrderDrawer** -- Build the drawer with menu items, instructions, and price breakdown
10. **OrderConfirmation** -- Build the price breakdown section
11. **OrderPendingState** -- Build the post-submission waiting state with auto-accept demo
12. **Polish** -- Animations, responsive behavior, accessibility, keyboard navigation
