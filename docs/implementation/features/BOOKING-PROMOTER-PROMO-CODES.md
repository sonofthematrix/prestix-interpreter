# Booking Promoter Attribution & Promo Codes

## Overview

Bookings can be attributed to promoters when users enter a **promo code** (referral code) at checkout. This nominates the promoter for commission and tracks performance.

## Promo Codes (Referral Codes)

Users enter these codes to nominate a promoter when making a booking:

| Code | Promoter | Tier |
|------|----------|------|
| DJSC2024 | DJ Sarah Chen | ELITE |
| NPATEL2024 | Nina Patel | ELITE |
| MRIV2024 | Marcus Rivera | GOLD |
| LMART2024 | Luna Martinez | SILVER |
| ATHOM2024 | Alex Thompson | BRONZE |
| PX-PROMO1 | Alex Promo | STARTER |
| PX-PROMO2 | Sam Curator | STARTER |
| PX-PROMO3 | Jordan Nights | BRONZE |
| PX-PROMO4 | Casey Vibe | SILVER |
| PX-PROMO5 | Riley Social | GOLD |
| PX-PROMO6 | Morgan Events | ELITE |

## Seeding Bookings with Promoters

To link existing bookings (without promoter) to promoters:

```bash
bun run db:seed:bookings-promoters
```

**Prerequisites:**
- Run `bun run db:seed:missfish` (venue, tables, tickets)
- Run `bun run db:seed:promoters` or `bun run scripts/seed-missfish-promoters.ts` (promoters)

The script:
1. Finds bookings without `promoterId`
2. Assigns promoters round-robin with their referral codes
3. Recomputes `promoterEarning` and `platformPassive` by tier
4. Creates `PromoterCommission` records

## Schema

- **Booking**: `promoterId`, `promoterReferralCode` (the code the user entered)
- **PromoterProfile**: `referralCode` (unique, e.g. `DJSC2024`)
- **PromoterCommission**: One per booking with promoter attribution

## Hub UI

The Bookings page (`/hub/bookings`) displays:
- **Promoter** column: Name and tier
- **Promo Code** column: The referral code used for the booking
