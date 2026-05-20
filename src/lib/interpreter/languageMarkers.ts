/**
 * Language-specific word markers used for:
 *  - Detecting source language of user input (voice/page.tsx → detectSourceLanguage)
 *  - Detecting wrong output language in translation quality guard (promptComposer.ts → outputLooksWrongLanguage)
 * 
 * These lists are unions of the markers previously duplicated across both files.
 * More markers = better detection. Keep alphabetically sorted.
 */

export const INDONESIAN_MARKERS = [
  "aja",
  "ajak",
  "apa",
  "bisa",
  "boleh",
  "dari",
  "dengan",
  "dong",
  "gua",
  "gue",
  "gw",
  "ini",
  "itu",
  "jadi",
  "kalau",
  "kamar",
  "kamu",
  "kasih",
  "ke",
  "kenapa",
  "lo",
  "lu",
  "malam",
  "mampus",
  "mau",
  "mereka",
  "nih",
  "saya",
  "terima",
  "tidak",
  "untuk",
];

export const ENGLISH_MARKERS = [
  "and",
  "book",
  "can",
  "could",
  "do",
  "don't",
  "for",
  "he",
  "how",
  "i",
  "need",
  "not",
  "or",
  "please",
  "room",
  "she",
  "thanks",
  "that",
  "the",
  "they",
  "this",
  "to",
  "tonight",
  "understand",
  "want",
  "we",
  "what",
  "where",
  "why",
  "with",
  "would",
  "you",
];

export const DUTCH_MARKERS = [
  "alsjeblieft",
  "bedankt",
  "daar",
  "dat",
  "die",
  "een",
  "graag",
  "het",
  "hier",
  "hoeveel",
  "ik",
  "je",
  "jij",
  "kunnen",
  "met",
  "morgen",
  "naar",
  "nederlands",
  "niet",
  "van",
  "vandaag",
  "voor",
  "waar",
  "wat",
  "weten",
  "wie",
  "wil",
  "willen",
];

/**
 * Check if text contains any word from the given marker list.
 * Uses word-boundary regex for accurate matching.
 */
export function hasMarker(text: string, markers: string[]): boolean {
  const normalized = text.toLowerCase();
  return markers.some((marker) =>
    new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(normalized),
  );
}

// ─── Dynamic markers injected from conversation learning ────────────────────

/**
 * Runtime-extensible marker sets that conversationLearner populates
 * with slang, corrections, and learned words. Persisted separately from
 * the static compile-time marker arrays above.
 */
export const DYNAMIC_MARKERS: Record<'en' | 'nl' | 'id', Set<string>> = {
  en: new Set(),
  nl: new Set(),
  id: new Set(),
};

/**
 * Return the currently-learned dynamic markers for a language.
 * Used by conversationLearner to check what has already been captured.
 */
export function getDynamicMarkers(language: 'en' | 'nl' | 'id'): string[] {
  return Array.from(DYNAMIC_MARKERS[language]);
}

/**
 * Register a learned word as a dynamic marker for the given language.
 * Word is lowercased and must be at least 2 characters long.
 */
export function addDynamicMarker(word: string, language: 'en' | 'nl' | 'id'): void {
  const normalized = word.toLowerCase();
  if (normalized.length >= 2) {
    DYNAMIC_MARKERS[language].add(normalized);
  }
}

/**
 * Check if any dynamic marker for the given language appears in `text`.
 * Uses the same word-boundary regex strategy as hasMarker() so
 * partial substring matches (e.g. "it" inside "with") are excluded.
 */
export function hasDynamicMarker(text: string, language: 'en' | 'nl' | 'id'): boolean {
  const markers = Array.from(DYNAMIC_MARKERS[language]);
  if (markers.length === 0) return false;
  return hasMarker(text, markers);
}

/**
 * Remove all learned dynamic markers.
 * When a language is provided only that set is cleared;
 * otherwise every language's markers are dropped.
 */
export function clearDynamicMarkers(language?: 'en' | 'nl' | 'id'): void {
  if (language) {
    DYNAMIC_MARKERS[language].clear();
  } else {
    DYNAMIC_MARKERS.en.clear();
    DYNAMIC_MARKERS.nl.clear();
    DYNAMIC_MARKERS.id.clear();
  }
}
