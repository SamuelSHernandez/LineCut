# LineCut Backlog

Non-blocking items organized by category for post-beta work.

## UX Polish

- Dark mode support
- Mobile bottom nav / hamburger menu
- Avatar error fallback (broken image handling)
- Rich chat: photos, emoji reactions, typing indicators
- Order modification after placement (before acceptance)
- Seller daily goals and gamification (streaks, badges)
- Animated order status transitions
- Pull-to-refresh on buyer/seller dashboards
- Skeleton loading states for all data-fetching views

## Security & Trust

- Per-IP rate limiting (middleware-level)
- Account takeover detection (unusual login patterns)
- Photo evidence for disputes (upload proof images)
- Automated dispute resolution rules engine
- Session replay prevention (token rotation)
- Content Security Policy headers

## Growth

- Referral / invite system with reward credits
- Seller shift analytics (peak hours, avg earnings)
- Smart fee suggestions based on demand/time-of-day
- Restaurant leaderboard (most popular, fastest service)
- Buyer loyalty program (frequent order discounts)
- Social sharing of completed orders

## Platform

- Multi-language support (i18n)
- Comprehensive accessibility audit (WCAG 2.1 AA)
- Email branding and templates (order confirmations, receipts)
- Payment card management UI (saved cards, default selection)
- Group / bulk orders (multiple buyers, single seller)
- Seller multi-restaurant sessions
- Transactional outbox pattern for event reliability
- Webhook retry queue with exponential backoff
- Database connection pooling optimization
- CDN-based image optimization pipeline
- Offline-first PWA enhancements (service worker caching)
- Admin dashboard analytics (revenue, order volume charts)
