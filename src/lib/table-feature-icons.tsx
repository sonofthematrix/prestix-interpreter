/**
 * Maps table/venue feature names to Lucide icons for consistent visual representation.
 * Case-insensitive; partial matches supported (e.g. "bottle" → Bottle service icon).
 */

import type { LucideIcon } from "lucide-react";
import {
  Sofa,
  Wine,
  Crown,
  Mountain,
  UtensilsCrossed,
  ChefHat,
  Lock,
  Music,
  Waves,
  Sun,
  Building2,
  TreePine,
  Armchair,
  Bed,
  Circle,
  Sparkles,
} from "lucide-react";

const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  lounge: Sofa,
  "bottle service": Wine,
  "bottle": Wine,
  premium: Crown,
  view: Mountain,
  omakase: UtensilsCrossed,
  "chef's bar": ChefHat,
  "chefs bar": ChefHat,
  "fine dining": UtensilsCrossed,
  private: Lock,
  "dance floor": Music,
  "dance floor access": Music,
  "bar access": Wine,
  "pool view": Waves,
  "pool": Waves,
  "beach access": Sun,
  "beach": Sun,
  "sunset view": Sun,
  "city view": Building2,
  "ocean view": Waves,
  "ocean": Waves,
  outdoor: TreePine,
  "comfortable seating": Armchair,
  "seating": Armchair,
  balcony: Building2,
  daybed: Bed,
  "beach service": Sun,
  "standing table": UtensilsCrossed,
  standard: Circle,
  "premium view": Mountain,
  "dance floor view": Music,
  "vip": Crown,
  "vip entry": Crown,
  "mixers": Wine,
  "dedicated server": UtensilsCrossed,
  "dedicated host": UtensilsCrossed,
  "champagne": Wine,
  "entry": Sparkles,
};

/** Get Lucide icon for a feature name. Returns undefined if no match. */
export function getFeatureIcon(featureName: string): LucideIcon | undefined {
  const normalized = featureName.trim().toLowerCase();
  // Exact match first
  if (FEATURE_ICON_MAP[normalized]) return FEATURE_ICON_MAP[normalized];
  // Partial match: feature contains key or key contains feature
  for (const [key, Icon] of Object.entries(FEATURE_ICON_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return Icon;
  }
  return undefined;
}
