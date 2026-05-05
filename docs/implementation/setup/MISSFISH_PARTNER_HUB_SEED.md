# Miss Fish Bali — Partner Hub Seed (Prestix.vip)

## Overview

The Miss Fish partner hub seed populates the Prestix.vip promoter hub with **public-domain researched data** for **Miss Fish Bali** (Berawa/Canggu): venue, tables, event tickets, announcements, and optional partnership agreement.

## Data sources (public domain)

- **Official site:** [missfishbali.com](https://www.missfishbali.com/)
- **Address:** Jalan Raya Semat No. 4, Tibubeneng, North Kuta, Badung, Bali 80361
- **Type:** Japanese omakase restaurant + nightclub (three spaces: omakase bar, lounge, patio)
- **Hours:** Tuesday–Sunday 6 PM–2 AM (Monday closed); reservations essential
- **Contact:** +62-813-9000-6477; [Bookings](https://www.missfishbali.com/bookings/); [Instagram](https://www.instagram.com/missfishbali/)

## Schema entities touched

| Category        | Entity               | Purpose                                      |
|----------------|----------------------|----------------------------------------------|
| **Venue**      | `User`               | Venue owner (VENUE_ADMIN)                    |
| **Venue**      | `VenueProfile`       | Partner venue: name, slug, address, gallery  |
| **Venue**      | `VenueTable`         | Tables & prices (Lounge, Premium, Omakase)  |
| **Events**     | `VenueTicket`        | Parties/events (International Series, Sundaze, Escape) |
| **Marketplace**| `VenueAnnouncement`  | Marketing (Reserve Your Night, She’s With Us) |
| **Partner**    | `PartnershipAgreement` | Updated if already exists (create via app) |

## Local images

Images under `public/images/partners/missfish/` are used for cover, logo, gallery, tables, and events:

- **Venue — bar:** `venue/bar/` (neon sign, bartender)
- **Venue — food:** `venue/food/` (nigiri, dining spread, sushi prep)
- **Marketplace — promoters:** `marketplace/promoters/` (logo, flyers, DJ, She’s With Us)
- **Events — parties:** `events/parties/` (dancing, masked guests, patron)

Adding more images (e.g. scraped from the website) into these folders and re-running the script will not overwrite existing venue/ticket data; update the script’s `MISSFISH.galleryImages` (and any table/ticket `images` arrays) if you want new paths included.

## How to run

```bash
# From repo root (loads .env via dotenv)
bun run db:seed:missfish
# or
npx tsx scripts/seed-missfish-partner-hub.ts
```

**ZenStack v3:** The seed uses `createClient(systemUser)` and only `findFirst` + `create`/`update` (no `upsert`) to stay compatible with ZenStack v3. If you see `z.iso.datetime` errors, ensure postinstall has run so that nested Zod 3 under `@zenstackhq/orm` is removed and the ORM uses the project’s Zod 4.

## Idempotency

- Venue owner and **VenueProfile** are upserted by email and slug.
- **VenueTable** and **VenueTicket** are created only if a matching name does not already exist for the venue.
- **VenueAnnouncement** is created only if a matching title does not exist.
- **PartnershipAgreement**: create is restricted by policy to the venue owner; the script only updates an existing agreement. To create one, use the app as the venue owner or run a one-off with elevated context.

## Promoter hub usage

After seeding, the venue appears in the Prestix.vip promoter hub with:

- **Venue:** Miss Fish Bali (slug `miss-fish-bali`), address and gallery
- **Tables:** Book tables with indicative IDR prices and minimum spend
- **Events:** Event tickets for recurring and one-off parties
- **Marketplace:** Announcements and branding (She’s With Us, Reserve Your Night)

Prices in the script are **indicative** (IDR); adjust in the script or via admin for production.
