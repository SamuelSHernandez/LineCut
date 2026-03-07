# UX Audit Patterns - LineCut

## Recurring Issues and Fixes

### 1. Touch Targets Below 44px Minimum
**Where it happens:** Close buttons (w-8 h-8), quantity +/- buttons (w-7), cancel/ghost buttons, cuisine filter pills, back links
**Fix:** Use `w-11 h-11` or `min-h-[44px]` on all interactive elements. For inline links add `min-h-[44px] py-2`.

### 2. Drawer Accessibility (Critical)
**Missing pieces found:**
- No `role="dialog"` or `aria-modal="true"`
- No focus trapping (Tab key escapes to page behind)
- No Escape key handler
- No body scroll lock
- Close button too small
- Overlay not marked `aria-hidden="true"`
**Fix:** Add useEffect for keydown listener (Escape + Tab trap), ref for drawer, focus close button on mount, lock body scroll.

### 3. Missing aria-labels
**Where it happens:** SVG icons without titles, toggle buttons without context, trust score badges (just a number), quantity buttons (just +/-), search inputs relying solely on placeholder
**Fix:** Add `aria-label` to all buttons, `aria-pressed` to toggles, `<title>` inside SVGs, `role="status"` + `aria-live="polite"` for dynamic states.

### 4. Interaction Discoverability
**SellerList double-tap pattern:** Original required tap-to-select then tap-again-to-open-drawer. Users expect immediate action on tap. Changed to open drawer immediately on selection.

### 5. Focus Visibility
**Issue:** `focus:outline-none` used without replacement ring style
**Fix:** Always pair with `focus:ring-2 focus:ring-ketchup/20` for visible focus indication (WCAG 2.4.7).

### 6. Avatar Initials Size
**Style guide says 16px** but code had 14px. Always cross-reference STYLE_GUIDE.md for exact values.

### 7. Semantic Markup
- Seller lists should use `role="list"` + `role="listitem"` for screen readers
- Order item lists same treatment
- Status changes need `aria-live="polite"` regions
