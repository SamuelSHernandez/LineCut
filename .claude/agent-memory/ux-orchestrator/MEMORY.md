# UX Orchestrator Memory

## Agent Discovery
- No `ux-*` agents found in project or home directory (as of 2026-03-07). Self-audit mode used.
- Only `ux-orchestrator.md` exists as the orchestrator itself.

## Common UX Audit Failures in LineCut
See [audit-patterns.md](./audit-patterns.md) for details.

## LineCut Style Guide Key Facts
- Avatar initials: Display font, **16px**, not 14px
- Touch targets: 44px minimum (w-11/h-11 or min-h-[44px])
- Drawer close button: must be w-11 h-11 (44x44), not w-8 h-8
- Buttons: DM Sans weight 600, rounded-[6px], sizes sm/md/lg
- Confirm/CTA buttons: use min-h-[48px] for primary actions
- Never use `focus:outline-none` alone -- always pair with `focus:ring-2 focus:ring-ketchup/20`
- Separators: use `text-sidewalk` not `text-[#ddd4c4]` for visible pipe chars (contrast)
- Avatars: 36px (w-9 h-9), NOT 32px (w-8 h-8). Initials 16px, NOT 14px.
- Headings: always set explicit `text-chalkboard` -- don't rely on inheritance
- Action buttons: use `min-h-[48px]` not `h-11` (44px) for primary CTA buttons
- Restaurant selectors: use `role="radio"` + `aria-checked` inside `role="radiogroup"`
- Order cards: use `<article>` with `aria-label`, items as `<ul>`/`<li>`
- Status badges: add `role="status"` for screen reader announcements
- Dynamic content (order arrivals, status changes): wrap in `aria-live="polite"`
- Error messages: always add `role="alert"`
- Decorative SVGs/avatars: always add `aria-hidden="true"`
- Double-tap prevention: track `isProcessing` state, reset on status change with safety timeout
