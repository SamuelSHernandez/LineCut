# Geofence Engineer Memory

## Project Stack
- Next.js 16 App Router, React 19, TypeScript, Supabase, Tailwind CSS v4
- React Compiler enabled — never call setState directly in useEffect body
- Path alias: `@/*` → `./src/*`
- Supabase clients: browser=`@/lib/supabase/client`, server=`@/lib/supabase/server`

## Key File Locations
- `src/lib/geo.ts` — existing Haversine via `getDistanceMiles()` (returns miles, Earth radius 3958.8 mi)
- `src/lib/use-geofence.ts` — geofence hook + helpers (created this session)
- `src/lib/restaurants.ts` — `fetchRestaurants()` (Supabase + fallback array), `Restaurant` type has lat/lng
- `src/lib/types.ts` — shared types: Restaurant, SellerSession, Seller, Order, etc.
- `src/components/seller/GoLivePanel.tsx` — Go Live UI, integrates useGeofence
- `src/app/(dashboard)/seller/actions.ts` — `goLive()` server action with proximity check
- `src/lib/profile-context.tsx` — `useProfile()` hook
- `src/lib/order-bus.ts` — `sellerBus` for real-time seller presence broadcast

## Geo Math
- `getDistanceMiles` returns miles; multiply by 1609.344 to get meters
- Client geofence radius: 150m. Server validation radius: 200m (extra tolerance for GPS jitter)
- No external geo SDKs — all math is in-house haversine

## Privacy Contract
- Raw GeolocationCoordinates are NEVER stored in React state, logged, or transmitted to external services
- Coordinates used as ephemeral local variables only: compute distance → discard
- In handleGoLive: fresh `getCurrentPosition()` call produces local `coords` variable → passed directly to server action → discarded
- Server action uses coords only for distance calculation, never persists them

## Geofence UX Flow (two-tap pattern)
1. First tap ("CHECK LOCATION"): calls `geofence.check()`, returns early — button shows "CHECKING LOCATION..."
2. Status resolves to "inside": button becomes "I'M IN LINE" — user taps again to proceed
3. On second tap: fresh `getCurrentPosition()` call, coords passed transiently to `goLive()` server action
4. "outside" status: button disabled, distance banner shown, retry link offered
5. "denied"/"unavailable": error banner shown, proceed button enabled (server is backstop)

## Linter Behavior
- The project ESLint config aggressively removes unused imports on save
- When editing GoLivePanel.tsx in multiple passes, `sellerBus` and `useProfile` imports get stripped if not all references exist at lint time
- Always add all imports in a single edit pass or verify after each edit

## Style Guide Tokens (Tailwind)
- Colors: `text-ketchup`, `text-mustard`, `text-chalkboard`, `text-sidewalk`, `bg-ticket`, `bg-butcher-paper`
- Status green: `#2D6A2D` (active/inside), bg `#DDEFDD`, border `#b4d9b4`
- Status red: `text-ketchup` (#C4382A), bg `#FBE9E7`, border `#f0b0aa`
- Fonts: `font-[family-name:var(--font-display)]` / `--font-body` / `--font-mono`
- Cards: `rounded-[10px]`, buttons: `rounded-[6px]`, min-h-[48px] touch targets
