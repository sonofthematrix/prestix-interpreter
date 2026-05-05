# Hub Pages & Components Plan — Marketplace, Venues, Events, Promoter, Bookings, Purchases

This document outlines the page structure, components, and API surface for managing partner/venue/event/promoter/booking data seeded via the Miss Fish partner hub and used across the PRESTIX.VIP promoter hub.

## Schema entities (aligned with seed)

| Area        | Primary model(s)           | Relations / dependent data                    |
|------------|----------------------------|-----------------------------------------------|
| Marketplace | VenueProfile, PartnershipAgreement | User (owner), VenueTable, VenueTicket, VenueAnnouncement |
| Venues     | VenueProfile               | User, VenueTable[], VenueTicket[], VenueAnnouncement[], bookings |
| Events     | VenueTicket, VenueAnnouncement | VenueProfile, Booking[]                       |
| Promoter   | PromoterProfile            | User, PromoterReferral[], PromoterCommission[] |
| Bookings   | Booking                    | User (member), VenueProfile, VenueTable?, VenueTicket?, BookingPayment |
| Purchases  | BookingPayment, Booking    | Booking (totalAmount, status), PaymentRail     |

## Route structure (under `/hub`)

All hub pages are under `src/app/hub/`. Layout: shared nav + content; gate by auth (and optionally role) for create/edit/delete.

```
/hub                          → Hub dashboard (overview links)
/hub/marketplace              → List venues/partners (cards + table toggle)
/hub/marketplace/[id]         → View venue (read-only or edit link)
/hub/venues                   → List VenueProfile (cards + table)
/hub/venues/new               → Create venue
/hub/venues/[id]              → View venue
/hub/venues/[id]/edit         → Edit venue
/hub/events                   → List events (VenueTicket + VenueAnnouncement)
/hub/events/tickets           → List VenueTicket only
/hub/events/announcements     → List VenueAnnouncement only
/hub/events/tickets/new       → Create ticket (select venue)
/hub/events/tickets/[id]/edit → Edit ticket
/hub/events/announcements/new → Create announcement
/hub/events/announcements/[id]/edit → Edit announcement
/hub/promoters                → List PromoterProfile (cards + table)
/hub/promoters/[id]           → View promoter
/hub/promoters/[id]/edit      → Edit promoter
/hub/bookings                 → List Booking (cards + table)
/hub/bookings/[id]            → View booking (and dependent: add-ons, payment)
/hub/bookings/[id]/edit       → Edit booking (status, notes; payment read-only)
/hub/purchases                → List purchases (BookingPayment or Booking with payment)
/hub/purchases/[id]           → View payment/purchase detail
```

## Components

### Shared list components (view many records)

- **HubEntityCard** – Card layout for a single entity (venue, event, promoter, booking). Props: `title`, `subtitle`, `meta[]`, `imageUrl?`, `href`, `actions?`. Uses `@/components/ui/card`. When `href` is set, the card body links to the record view; Prestix brand: accent border, shadow, hover lift and ring glow.
- **HubDataTable** – Table with configurable columns, optional `getRowHref` for row click to record view, row actions (view/edit/delete). Prestix brand: border shadow, row hover with accent tint.
- **ViewToggle** – Toggle between “cards” and “table” for list pages.

### Branding & Icons (Prestix)

- **Card/table styling** – Cards and table rows use Prestix accent: border, hover ring, shadow, subtle motion. Rows and card bodies navigate to the record view when selected.
- **PromoHub icon** – Lucide **Megaphone** is the canonical icon for the Promoter Hub (announcement, broadcast, promotion, marketing). Used in the hub layout header. Alternatives considered: Sparkles, TrendingUp; Megaphone best matches promoter semantics.

### Entity-specific card/row content

- **VenueCard** / **VenueTableRow** – VenueProfile: name, slug, status, city, table count, ticket count.
- **EventTicketCard** / **EventTicketTableRow** – VenueTicket: name, venue, eventDate, price, soldCount.
- **AnnouncementCard** / **AnnouncementTableRow** – VenueAnnouncement: title, venue, publishAt, isActive.
- **PromoterCard** / **PromoterTableRow** – PromoterProfile: user ref, status, tier, referralCode, totalBookings.
- **BookingCard** / **BookingTableRow** – Booking: bookingNumber, venue, member, date, totalAmount, status.
- **PurchaseCard** / **PurchaseTableRow** – BookingPayment/Booking: amount, rail, status, booking ref.

### Forms (create / edit)

- Reuse ZenStack-style forms from `@/components/common/forms/` where applicable.
- **VenueForm** – VenueProfile create/edit (name, slug, description, venueType, address, contact, operatingHours, images, etc.).
- **VenueTableForm** – VenueTable create/edit (venueId, name, tableType, capacity, basePrice, minimumSpend, inclusions, add-ons).
- **VenueTicketForm** – VenueTicket create/edit (venueId, name, eventDate, price, inventory, inclusions).
- **VenueAnnouncementForm** – VenueAnnouncement create/edit (venueId, title, content, imageUrl, linkUrl, publishAt, expiresAt).
- **PromoterForm** – PromoterProfile edit (status, tier, referralCode, KYC, etc.).
- **BookingForm** – Booking edit (status, specialNotes, cancellation); create typically via public flow.

### Single-record pages (view / edit / delete)

- Each entity has a **view** page that shows all fields and related data (e.g. venue → tables, tickets, announcements, bookings).
- **Edit** pages use the form components above; **delete** is either a modal on the view page or a dedicated action that calls DELETE API and redirects to list.

## API routes (backend)

Use ZenStack `createClient(sessionUser)` for policy enforcement. Admin/venue context for list/create/update/delete as per schema.

| Method | Path | Purpose |
|--------|------|---------|
| GET    | /api/hub/venues | List VenueProfile (optional ?slug=, ?city=, ?status=) |
| GET    | /api/hub/venues/[id] | Get one VenueProfile with include tables, tickets, announcements |
| POST   | /api/hub/venues | Create VenueProfile |
| PATCH  | /api/hub/venues/[id] | Update VenueProfile |
| DELETE | /api/hub/venues/[id] | Delete VenueProfile (PLATFORM_ADMIN) |
| GET    | /api/hub/venues/[id]/tables | List VenueTable for venue |
| POST   | /api/hub/venues/[id]/tables | Create VenueTable |
| PATCH  | /api/hub/tables/[id] | Update VenueTable |
| DELETE | /api/hub/tables/[id] | Delete VenueTable |
| GET    | /api/hub/events/tickets | List VenueTicket (optional ?venueId=) |
| GET    | /api/hub/events/tickets/[id] | Get one VenueTicket |
| POST   | /api/hub/events/tickets | Create VenueTicket |
| PATCH  | /api/hub/events/tickets/[id] | Update VenueTicket |
| DELETE | /api/hub/events/tickets/[id] | Delete VenueTicket |
| GET    | /api/hub/events/announcements | List VenueAnnouncement (?venueId=) |
| GET    | /api/hub/events/announcements/[id] | Get one |
| POST   | /api/hub/events/announcements | Create |
| PATCH  | /api/hub/events/announcements/[id] | Update |
| DELETE | /api/hub/events/announcements/[id] | Delete |
| GET    | /api/hub/promoters | List PromoterProfile |
| GET    | /api/hub/promoters/[id] | Get one |
| PATCH  | /api/hub/promoters/[id] | Update (admin/self) |
| GET    | /api/hub/bookings | List Booking (?venueId=, ?memberId=, ?status=) |
| GET    | /api/hub/bookings/[id] | Get one with payment, add-ons |
| PATCH  | /api/hub/bookings/[id] | Update status, notes |
| GET    | /api/hub/purchases | List BookingPayment or Booking with payment |
| GET    | /api/hub/purchases/[id] | Get payment detail |
| GET    | /api/hub/marketplace | List venues for marketplace (VenueProfile + optional agreement); public or hub-scoped |

## Data flow

- **List pages**: Fetch from GET list APIs → render HubEntityCard grid or HubDataTable.
- **View page**: Fetch GET by id (with includes) → render read-only layout + Edit/Delete actions.
- **Create/Edit**: Load initial data if edit → form submit → POST/PATCH → redirect to view or list.
- **Delete**: Confirm → DELETE → redirect to list.
- All data from database via these APIs (no mock data; database-first per project rules).

## Auth & access

- Hub layout or per-page gate: require authenticated user; optional role checks (PLATFORM_ADMIN, VENUE_ADMIN) for create/update/delete where schema restricts.
- Venue owner: can update own VenueProfile, VenueTable, VenueTicket, VenueAnnouncement; can read own venue’s bookings.
- PLATFORM_ADMIN: full CRUD where schema allows.

## Implementation order

1. **Hub layout + nav** – `/hub` layout with links to marketplace, venues, events, promoters, bookings, purchases.
2. **API: GET list venues** – `/api/hub/venues` (and optional GET by id).
3. **Shared components** – HubEntityCard, HubDataTable, ViewToggle.
4. **Hub list pages** – Marketplace (venue list), Venues, Events (tickets + announcements), Promoters, Bookings, Purchases.
5. **API: remaining list + by-id** – events, promoters, bookings, purchases.
6. **View pages** – Single record view for each entity.
7. **Create/Edit forms + API** – Venues, tables, tickets, announcements, promoter edit, booking edit.
8. **Delete** – Where schema allows; wire to list and view pages.

## File locations

- Pages: `src/app/hub/**/*.tsx`
- Shared hub components: `src/components/hub/` (HubEntityCard, HubDataTable, ViewToggle, entity-specific cards/rows)
- Forms: `src/components/hub/forms/` or under `src/components/common/forms/` if shared
- API routes: `src/app/api/hub/**/route.ts`

## Implementation status

- **Done:** Hub layout and nav; dashboard; GET list + GET by id for venues, events/tickets, events/announcements, promoters, bookings, purchases; POST/PATCH/DELETE for venues, tables, tickets, announcements; shared components (HubEntityCard, HubDataTable, ViewToggle); list and view pages for all areas; create/edit forms for venue, table, ticket, announcement (controlled forms with API wiring); HubGate (auth required, optional role) in hub layout.
- **Schema:** VenueTable, VenueTicket, VenueAnnouncement have @@allow read/create/update/delete for venue owner and PLATFORM_ADMIN.
- **Optional later:** Role-restricted hub (set HubGate roleRequired={true}); booking PATCH (status/notes); delete confirmation modals.
