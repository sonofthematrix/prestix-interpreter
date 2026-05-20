/**
 * Single source of truth for interpreter surface + metadata + assistant persona.
 *
 * - PRODUCT_BRAND: commercial / suite branding (Optimized Core).
 * - PRODUCT_MODEL: the named model surface users talk to (Prestix).
 */
export const PRODUCT_BRAND = "Optimized Core";
export const PRODUCT_MODEL = "Prestix";

/** Main hero title — the model name. */
export const PRODUCT_DISPLAY_NAME = PRODUCT_MODEL;

/** What the surface is for: clearer back-and-forth with people on the ground (Nederlands ↔ Bahasa Indonesia). */
export const PRODUCT_TAGLINE =
  "Talk with local people more clearly—live Dutch ↔ Bahasa Indonesia, typed or spoken.";

export const PRODUCT_METADATA_TITLE = `${PRODUCT_BRAND} · ${PRODUCT_MODEL} · Local communication · NL ↔ ID`;
export const PRODUCT_METADATA_DESCRIPTION = PRODUCT_TAGLINE;

/** Used inside LLM system prompts — the model identity, not the suite brand. */
export const ASSISTANT_LLM_PRODUCT_NAME = PRODUCT_MODEL;
