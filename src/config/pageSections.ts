/**
 * Page sections in scroll order for scroll-spy and URL.
 * URL format: /?lang=en&section=02 (query params only, no hash).
 */
export interface PageSectionConfig {
  id: string;
  titleKey: string;
}

export const PAGE_SECTIONS: PageSectionConfig[] = [
  { id: "choose-role", titleKey: "role.title" },
  { id: "mission", titleKey: "section.mission" },
  { id: "platform", titleKey: "section.marketplace" },
  { id: "unique-value", titleKey: "section.account_management" },
  { id: "venues", titleKey: "section.venues" },
  { id: "event-organizers", titleKey: "section.event_organizers" },
  { id: "promoters", titleKey: "section.promoters" },
  { id: "influencers", titleKey: "section.influencers" },
  { id: "roadmap", titleKey: "section.roadmap" },
  { id: "vip-experience", titleKey: "section.vip_experience" },
  { id: "contact", titleKey: "contact.heading" },
];

/** 1-based index for section id. */
export function getPageSectionIndex(sectionId: string): number | undefined {
  const i = PAGE_SECTIONS.findIndex((s) => s.id === sectionId);
  return i >= 0 ? i + 1 : undefined;
}

/** Section id that owns the header/footer breakouts (Bike/E-Bike + benefit cards). When this section is active (URL or scroll), breakouts are visible. */
export const BREAKOUTS_SECTION_ID = "vip-experience";

/** 1-based index for the section that controls breakout visibility. */
export const BREAKOUTS_SECTION_INDEX = getPageSectionIndex(BREAKOUTS_SECTION_ID) ?? 10;

/** Section param value from 1-based index (e.g. "01", "07"). */
export function getSectionParam(index: number): string {
  return String(index).padStart(2, "0");
}

/** Parse section param value to 1-based index. Supports "01", "07", "7". */
export function parseSectionParam(value: string | null): number | null {
  if (value == null || !String(value).trim()) return null;
  const s = String(value).trim();
  const match = s.match(/^(\d{1,2})$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return n >= 1 && n <= PAGE_SECTIONS.length ? n : null;
}

/** Parse search string (e.g. "?lang=en&section=02") to get 1-based section index. */
export function parseSectionFromSearch(search: string): number | null {
  if (!search || typeof search !== "string") return null;
  const q = search.startsWith("?") ? search : `?${search}`;
  const params = new URLSearchParams(q);
  return parseSectionParam(params.get("section"));
}

/** Build query string for section link: "lang=en&section=02". */
export function buildSectionQueryString(sectionIndex: number, lang?: string): string {
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  params.set("section", getSectionParam(sectionIndex));
  return params.toString();
}

/** @deprecated Use getSectionParam + query string instead. Kept for any legacy hash usage. */
export function getSectionHash(index: number): string {
  return `#${getSectionParam(index)}`;
}

/** @deprecated Use parseSectionFromSearch or parseSectionParam instead. */
export function parseSectionHash(hash: string): number | null {
  if (!hash || !hash.startsWith("#")) return null;
  const rest = hash.slice(1).split("?")[0].trim();
  return parseSectionParam(rest);
}
