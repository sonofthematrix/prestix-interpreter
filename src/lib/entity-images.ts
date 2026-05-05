/**
 * Entity Image Utilities
 *
 * Provides standardized functions to extract images from different entity types
 * that have image fields in the database schema.
 */

export interface EntityImageInfo {
  images: string[];
  hasImages: boolean;
  posterImage?: string;
}

/**
 * Extract images from VenueTable entity
 */
export function getVenueTableImages(table: any): EntityImageInfo {
  const images = Array.isArray(table.images) ? table.images.filter(Boolean) : [];
  return {
    images,
    hasImages: images.length > 0,
    posterImage: images[0] || undefined,
  };
}

/**
 * Extract images from VenueEvent entity
 */
export function getVenueEventImages(event: any): EntityImageInfo {
  const images = event.imageUrl ? [event.imageUrl] : [];
  return {
    images,
    hasImages: images.length > 0,
    posterImage: images[0] || undefined,
  };
}

/**
 * Extract images from VenueTicket entity
 */
export function getVenueTicketImages(ticket: any): EntityImageInfo {
  let raw = ticket?.images;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw ? [raw] : [];
    }
  }
  const images = Array.isArray(raw) ? raw.filter((x: unknown) => x && typeof x === "string") : [];
  return {
    images,
    hasImages: images.length > 0,
    posterImage: images[0] || undefined,
  };
}

/**
 * Extract images from VenueAnnouncement entity
 */
export function getVenueAnnouncementImages(announcement: any): EntityImageInfo {
  const images = announcement.imageUrl ? [announcement.imageUrl] : [];
  return {
    images,
    hasImages: images.length > 0,
    posterImage: images[0] || undefined,
  };
}

/**
 * Extract images from VenuePromotion entity
 */
export function getVenuePromotionImages(promotion: any): EntityImageInfo {
  const images = promotion.imageUrl ? [promotion.imageUrl] : [];
  return {
    images,
    hasImages: images.length > 0,
    posterImage: images[0] || undefined,
  };
}

/**
 * Extract images from Notification entity
 */
export function getNotificationImages(notification: any): EntityImageInfo {
  const images = notification.imageUrl ? [notification.imageUrl] : [];
  return {
    images,
    hasImages: images.length > 0,
    posterImage: images[0] || undefined,
  };
}

/**
 * Generic entity image extractor - tries to determine entity type and extract images
 */
export function getEntityImages(entity: any, entityType?: string): EntityImageInfo {
  // Try to detect entity type from properties if not provided
  if (!entityType) {
    if (entity.tableNumber !== undefined) entityType = 'venueTable';
    else if (entity.startDateTime !== undefined) entityType = 'venueEvent';
    else if (entity.soldCount !== undefined) entityType = 'venueTicket';
    else if (entity.publishAt !== undefined) entityType = 'venueAnnouncement';
    else if (entity.discountType !== undefined) entityType = 'venuePromotion';
    else if (entity.referenceType !== undefined) entityType = 'notification';
  }

  switch (entityType) {
    case 'venueTable':
      return getVenueTableImages(entity);
    case 'venueEvent':
      return getVenueEventImages(entity);
    case 'venueTicket':
      return getVenueTicketImages(entity);
    case 'venueAnnouncement':
      return getVenueAnnouncementImages(entity);
    case 'venuePromotion':
      return getVenuePromotionImages(entity);
    case 'notification':
      return getNotificationImages(entity);
    default:
      // Fallback: try common image field names
      if (entity.imageUrl) {
        return {
          images: [entity.imageUrl],
          hasImages: true,
          posterImage: entity.imageUrl,
        };
      }
      if (entity.images && Array.isArray(entity.images)) {
        const images = entity.images.filter(Boolean);
        return {
          images,
          hasImages: images.length > 0,
          posterImage: images[0] || undefined,
        };
      }
      return {
        images: [],
        hasImages: false,
      };
  }
}