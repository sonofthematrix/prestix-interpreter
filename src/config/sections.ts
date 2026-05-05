/**
 * Content sections config. Section order and indices (01, 02, 03, …) are driven by
 * the sections.json array. Add or reorder entries there; the displayed index updates
 * automatically from array position.
 */
import sectionsJson from "./sections.json";

export interface SectionConfig {
  id: string;
  titleKey: string;
  subtitleKey?: string;
}

/** Numbered sections in page order. Index (01, 02, …) is derived from position in this array. */
export const SECTIONS: SectionConfig[] = sectionsJson as SectionConfig[];

/** 1-based index for a section id, or undefined if not found. */
export function getSectionIndex(sectionId: string): number | undefined {
  const i = SECTIONS.findIndex((s) => s.id === sectionId);
  return i >= 0 ? i + 1 : undefined;
}

/** Section config by id. */
export function getSectionConfig(sectionId: string): SectionConfig | undefined {
  return SECTIONS.find((s) => s.id === sectionId);
}

/** Two-digit index string (01, 02, …) for a section id. */
export function getSectionIndexLabel(sectionId: string): string {
  const index = getSectionIndex(sectionId);
  return index != null ? String(index).padStart(2, "0") : "";
}
