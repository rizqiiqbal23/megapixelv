# Agent Memory

Last updated: 2026-05-20

## Project Snapshot

- Next.js app for Megapixelv booking site.
- Main route is `/`.
- Admin route is `/admin`.
- Global styling uses pastel pink / soft feminine UI.
- Background image is `/image/bg.png`.
- Logo assets:
  - `/image/logo.png` in header
  - `/image/logo1.png` in pricelist modal

## Important User Preferences

- Do not auto-commit unless explicitly asked.
- Keep replies concise and factual.
- Preserve current UI direction unless the user asks for a redesign.
- Use the existing icons/style when possible.
- If the user asks to revert, revert only the last requested scope.

## Current Booking Page Behavior

- Home page uses a fit-to-viewport mobile layout.
- Mobile content is scaled to fit the screen when needed.
- Scrolling is handled by an internal viewport container, not only `window`.
- Auto-scroll exists for:
  - selecting a date
  - closing the selected date
  - opening the time picker
- The page also polls `/api/bookings?meta=1` every 5 seconds and reloads if `lastUpdatedAt` changes.

## Booking State / Data

- Booking data comes from `/api/bookings`.
- Cache keys:
  - `booking_cache_v1`
  - `booking_cache_updated_at_v1`
- `lastUpdatedAt` is tied to real data updates, not cache-only fetches.
- Manual overrides are stored separately in admin.

## Calendar Rules

- Calendar shows only the current month and the next 2 months.
- Selected dates open the camera status card.
- Promo dates are marked with a small vertical ribbon badge in the top-right corner of the day cell.
- Promo marker uses a discount icon, not text.
- Calendar note includes:
  - "Yang masuk kalender hanya yang sudah DP."

## Promo System

- Promo editor exists in `/admin`.
- Promo data is stored in DB via:
  - `lib/promo-data.ts`
  - `lib/promo-store.ts`
- API routes:
  - `GET /api/promo`
  - `GET/POST/PUT/DELETE /api/admin/promo`
  - `POST /api/promo/consume`
- Promo quota decreases when booking flow consumes promo for the selected date.

## Modal / Popup Rules

- These modals exist and should remain scrollable internally:
  - Cara Book
  - Photo Gallery
  - Pricelist
  - Peraturan Booking
- Each modal uses a bottom-sheet style with fit-scale logic for small screens.
- Modal content should still scroll when content exceeds screen height.

## Photo Gallery

- Top navigation includes:
  - Cara Book
  - Photo Gallery
- Photo Gallery modal exists.
- Current Google Drive photo source for Nikon is commented out temporarily.
- Gallery currently shows placeholder cards while photo links are disabled.
- Clicking a photo opens a fullscreen lightbox popup.

## Pricelist

- Frontend pricelist data comes from `/api/pricelist`.
- Admin pricelist editor exists in `/admin`.
- Pricelist modal uses the same data source as the frontend.

## Home Layout

- Header is full width and sticky.
- Brand text: `MEGAPIXELV`.
- Main page background uses the image background plus soft pink overlay.
- Floating ornaments stay on the edges/corners, not in the center.

## Admin Layout

- Admin has a hamburger menu on the left of the title.
- Menu sections:
  - Override
  - Pricelist
  - Promo
- Only one admin section is shown at a time.

## Booking Form

- Google Form helper lives in `components/booking-form.ts`.
- Booking form prefill supports:
  - camera
  - date
  - time
- Promo code is consumed during booking flow when applicable.

## Notes For Future Changes

- If a layout starts feeling broken on some phone sizes, check the scale-fit wrapper first.
- If scroll stops working, check the modal/page `overflow-hidden` rules and the internal scroll viewport.
- If gallery photos need to show again, restore the commented Drive file IDs in `components/PhotoGalleryModal.tsx`.
