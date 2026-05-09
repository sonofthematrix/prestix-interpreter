/**
 * Single source of truth for interpreter surface + metadata + assistant persona.
 * Update here when product naming or positioning changes.
 */
export const PRODUCT_DISPLAY_NAME = "Prestix Assistant";
export const PRODUCT_TAGLINE =
  "AI assistant with a built-in live English–Indonesian interpreter.";

export const PRODUCT_METADATA_TITLE = "Prestix Assistant · EN ↔ ID interpreter";
export const PRODUCT_METADATA_DESCRIPTION = PRODUCT_TAGLINE;

/** Used inside LLM system prompts (must match PRODUCT_DISPLAY_NAME). */
export const ASSISTANT_LLM_PRODUCT_NAME = PRODUCT_DISPLAY_NAME;
