# Ideation Agent Memory

## Project: LineCut
- P2P pickup app -- people in restaurant lines buy food for hungry customers nearby
- Brand voice: direct, local, no BS, street-smart. Never say "platform" or "marketplace"
- Design system: deli-ticket aesthetic (butcher paper, dashed dividers, ticket stubs)
- See `STYLE_GUIDE.md` for full design system (colors, typography, components)

## Key Conventions Observed
- Display font (Bebas Neue) always ALL CAPS
- Mono font for metadata/labels: 11px, uppercase, tracking 2px
- Cards use `bg-ticket` with `border-[#eee6d8]`, 10px radius, dashed internal dividers
- Seller/user names: first name + last initial + period (e.g., "Marco T.")
- Trust score shown as waiting-style badge: `bg-[#FFF3D6] text-[#8B6914]`
- Never use pure white or pure black
- Avatars: 36px circle, mustard bg, initials in display font

## Architecture Patterns
- Server components for pages, client components for interactive pieces
- Hardcoded data files in `src/lib/` (restaurants.ts pattern)
- Types centralized in `src/lib/types.ts`
- Dashboard wrapped in `DashboardShell` with `ProfileProvider` context
- Buyer components live in `src/components/buyer/`
- Dashboard routes under `src/app/(dashboard)/` route group
- Profile route at `/profile` (added since initial build)
- GoLivePanel does `window.location.reload()` after goLive server action -- known jank

## Order Sync (Mar 2026)
- Plan at `docs/order-sync-plan.md`, challenge at `docs/order-sync-challenge.md`
- Decision: BroadcastChannel API for cross-tab sync (no real backend yet)
- Two channels: `linecut-orders` (order lifecycle) and `linecut-sellers` (seller presence)
- Seller presence uses roll-call pattern to handle late-joining buyer tabs
- `sellers.ts` and `sample-orders.ts` to be deleted -- replaced by live cross-tab state
- Key risk: empty buyer experience without seller tab open (challenge doc #2)
- Key risk: same-browser-only limitation of BroadcastChannel (challenge doc #1)
- Denormalized fields on Order (`sellerName`, `buyerName`, `restaurantName`) are temporary convenience -- must be joined from DB when real tables exist

## Planning Patterns
- User prefers hybrid approaches (structured options + free-text flexibility)
- Plans should include explicit "out of scope" lists to prevent scope creep
- Implementation order matters -- types and data first, then modify existing, then build new
- Always define hardcoded test data with realistic NYC-specific details
- User wants thorough edge case analysis before implementation
- Gate/paywall decisions: user prefers "block at action, not at browse" pattern

## Ideation Patterns Observed
- Composite scores (trust, reputation) are risky at early stage -- raw signals more honest than hollow composites
- Billing gates create dropout cliffs -- in-context modals preserve momentum better than page redirects
- Stripe Connect onboarding friction is a known supply-side killer for P2P apps
- Profile completeness != trust. Distinguish "filled out a form" from "proven reliable through behavior"

## Payment Analysis (Mar 2026)
- Full analysis at `docs/stripe-payment-analysis.md`, challenge at `docs/stripe-payment-challenge.md`
- `priceEstimate` is a misnomer -- prices are known/fixed, not estimates. Field should be renamed to `price`.
- Agent configs `stripe-connect-payments.md` and `stripe-payment-orchestrator.md` have wrong fee model (fixed $8+$2 vs actual variable seller fee + 15% platform fee). Must be corrected before implementation.
- Decision: Destination charges via Stripe Connect Express, PaymentIntents with manual capture
- Key open question: capture at "accepted" (simpler) vs "ready" (safer) -- challenge doc argues for "ready"
- Structural business risk: seller fronts cash for food, gets reimbursed 2+ days later. Not solvable by Stripe.
- No in-app communication channel exists -- mid-order problems (out-of-stock) have no resolution path except cancellation
