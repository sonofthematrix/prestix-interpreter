# Entity Digital Media Management

## Overview

This document describes the mechanism for maintaining digital media (images) on entity edit/create pages across the Hub application, and catalogs which entities have image support and how it is implemented.

## Reference Implementation: VenueTicket Edit

The **VenueTicket edit page** (`/hub/events/tickets/[id]/edit`) is the canonical implementation for multi-image management:

1. **Form state**: `images: string[]` — array of image URLs
2. **Display**: Grid of thumbnails using `CachedImage` with remove button per image
3. **Add**: `ImageUpload` component (URL input + file upload) appends to the array
4. **Remove**: Per-image X button filters the image out of the array
5. **Persistence**: PATCH request sends `images` array to API; API stores as Json in DB

### Components Used

- `ImageUpload` — URL input, drag-and-drop upload, preview (optional)
- `CachedImage` — Optimized image display with proxy for blob storage
- `Button` (variant="destructive") — Remove per-image

### Pattern for Single Image (imageUrl)

For entities with `imageUrl` (single string) instead of `images` (array):

- Use `ImageUpload` with `value={form.imageUrl}`, `onChange`, `onRemove`
- No grid; single preview when `showPreview={true}`

---

## Entity Image Field Inventory

| Entity | Schema Field | Type | Hub Edit Page | Hub New Page | Implementation |
|--------|-------------|------|---------------|--------------|-----------------|
| **VenueTicket** | `images` | Json (string[]) | `/hub/events/tickets/[id]/edit` | `/hub/events/tickets/new` | Multi-image grid + ImageUpload |
| **VenueTable** | `images` | Json (string[]) | `/hub/venues/[id]/tables/[tableId]/edit` | `/hub/venues/[id]/tables/new` | Multi-image grid + ImageUpload |
| **VenueAnnouncement** | `imageUrl` | String | `/hub/events/announcements/[id]/edit` | `/hub/events/announcements/new` | Single ImageUpload |
| **VenueEvent** | `imageUrl` | String | — | — | No Hub edit page |
| **VenuePromotion** | `imageUrl` | String | — | — | No Hub edit page |
| **VenueProfile** | `coverImage`, `logoImage`, `galleryImages` | String, String, Json | `/hub/venues/[id]/edit` | — | Venue edit has no image fields |
| **Notification** | `imageUrl` | String | — | — | Admin-only |

---

## API Support

All relevant APIs already support image fields:

- **VenueTicket**: `PATCH /api/hub/events/tickets/[id]` — `images` (array)
- **VenueTable**: `PATCH /api/hub/tables/[id]` — `images` (array); `POST /api/hub/venues/[id]/tables` — `images` (array)
- **VenueAnnouncement**: `PATCH /api/hub/events/announcements/[id]` — `imageUrl` (string)

---

## Implementation Checklist for New Entities

When adding image support to a new entity edit/create page:

1. **Schema**: Ensure `images` (Json) or `imageUrl` (String) exists in `zenstack/schema.zmodel`
2. **API**: Include image field in PATCH/POST allowed keys and body handling
3. **Form state**: Add `images: string[]` or `imageUrl: string` to form
4. **Multi-image (images array)**:
   - Grid of `CachedImage` thumbnails with remove button
   - `ImageUpload` with `value=""`, `onChange` that appends to array, `showPreview={false}`
5. **Single image (imageUrl)**:
   - `ImageUpload` with `value={form.imageUrl}`, `onChange`, `onRemove`, `showPreview={true}`
6. **Submit**: Include `images` or `imageUrl` in request body

---

## Entities Not Yet Covered (Future Work)

- **VenueEvent**: Has `imageUrl` but no Hub edit page; would need event edit route
- **VenuePromotion**: Has `imageUrl` but no Hub promotions management UI
- **VenueProfile**: Has `coverImage`, `logoImage`, `galleryImages`; venue edit page does not expose these
- **Notification**: Admin-only; image support would be in admin forms

---

## Related Files

- `src/components/ui/image-upload.tsx` — ImageUpload component
- `src/components/common/CachedImage.tsx` — Cached image display
- `src/lib/entity-images.ts` — Utilities for extracting images from entities
- `src/app/api/upload/image/route.ts` — Image upload API (Vercel Blob)
