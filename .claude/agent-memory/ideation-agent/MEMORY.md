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
- No `/profile` route exists yet (as of Mar 2026)

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
