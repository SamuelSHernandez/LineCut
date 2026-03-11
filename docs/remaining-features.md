# LineCut — Remaining Features

## High Priority (required for real-world launch)

- [x] **Identity Verification (KYC)** — Didit integration, KYC gate on GoLivePanel, webhook + callback routes.
- [x] **Dispute / Support Flow** — DisputeForm on completed orders, disputes table + RLS, admin review queue.
- [x] **Refund Logic for Edge Cases** — Partial refunds for buyer no-shows, full refunds for disputes, admin resolve endpoint.
- [x] **Admin Dashboard** — Stats, orders list, disputes list + resolve, restaurant + menu CRUD.
- [x] **Dynamic Restaurant Management** — Admin UI to add/edit/delete restaurants with coordinates.
- [x] **Menu Management** — Admin UI for menu items grouped by restaurant, inline editing.

## Medium Priority (needed for usable product)

- [x] **Order History** — Past order history view for buyers and sellers, receipt/summary for completed orders.
- [x] **Earnings Dashboard for Sellers** — Daily/weekly totals, payout history, pending balance visibility.
- [x] **Seller Session Management** — Graceful "end shift" (finish current orders, stop accepting new ones).
- [x] **Email Notifications** — Transactional emails: order confirmation, receipt, payout summary.
- [x] **Rate Limiting / Abuse Prevention** — Per-user message caps (30/order), order spam prevention, account suspension.
- [x] **Chat Message Cleanup** — Hard-delete messages 30 min after order completion for privacy.

## Lower Priority (polish for launch)

- [x] **Blocked Users / Reporting** — Block/report bad actors, bidirectional filtering, admin reports queue.
- [x] **Tipping** — Post-handoff tipping with Stripe, preset amounts, earnings integration.
- [x] ~~**Multi-Restaurant Seller Sessions**~~ — Non-goal. Sellers are physically in one line at one restaurant.
- [x] **PWA Enhancements** — Offline caching, install prompts, manifest, meta tags.
- [x] **Analytics / Metrics** — Event tracking, enhanced admin dashboard with funnels + revenue.
- [x] **Accessibility Audit** — Color contrast, focus indicators, ARIA, keyboard nav, semantic HTML, touch targets, reduced motion.
- [x] **Testing** — Vitest + Testing Library, 117 tests across 12 suites (unit, component, server action, API).
