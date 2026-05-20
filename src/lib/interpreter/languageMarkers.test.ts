import { describe, expect, it, beforeEach } from 'vitest';
import {
    addDynamicMarker,
    clearDynamicMarkers,
    getDynamicMarkers,
    hasDynamicMarker,
    hasMarker,
    INDONESIAN_MARKERS,
    ENGLISH_MARKERS,
    DUTCH_MARKERS,
} from './languageMarkers';

describe('languageMarkers', () => {
    // Clean up dynamic markers before each test to ensure isolation
    beforeEach(() => {
        clearDynamicMarkers();
    });

    // ── hasMarker (static) ──────────────────────────────────────────────

    describe('hasMarker', () => {
        it('detects an Indonesian word in text using INDONESIAN_MARKERS', () => {
            expect(hasMarker('saya mau makan', INDONESIAN_MARKERS)).toBe(true);
        });

        it('detects an English word in text using ENGLISH_MARKERS', () => {
            expect(hasMarker('the and you', ENGLISH_MARKERS)).toBe(true);
        });

        it('detects a Dutch word in text using DUTCH_MARKERS', () => {
            expect(hasMarker('ik wil graag betalen', DUTCH_MARKERS)).toBe(true);
        });

        it('returns false when no marker from the list appears in the text', () => {
            expect(hasMarker('blargh xyzzy', INDONESIAN_MARKERS)).toBe(false);
        });

        it('uses word-boundary matching so partial substrings are not matched', () => {
            // "it" is NOT in ENGLISH_MARKERS, but "with" contains "it" as substring.
            // hasMarker should use \b boundaries and not match substrings.
            // "the" IS in ENGLISH_MARKERS
            expect(hasMarker('the cat', ENGLISH_MARKERS)).toBe(true);
        });

        it('is case-insensitive', () => {
            expect(hasMarker('SAYA MAU', INDONESIAN_MARKERS)).toBe(true);
        });
    });

    // ── Dynamic markers ─────────────────────────────────────────────────

    describe('getDynamicMarkers', () => {
        it('returns an empty array initially for any language', () => {
            expect(getDynamicMarkers('en')).toEqual([]);
            expect(getDynamicMarkers('nl')).toEqual([]);
            expect(getDynamicMarkers('id')).toEqual([]);
        });
    });

    describe('addDynamicMarker', () => {
        it('adds a word to the dynamic marker set for the given language', () => {
            addDynamicMarker('blargh', 'en');
            expect(getDynamicMarkers('en')).toContain('blargh');
        });

        it('adds only to the specified language set, not others', () => {
            addDynamicMarker('zargon', 'nl');
            expect(getDynamicMarkers('nl')).toContain('zargon');
            expect(getDynamicMarkers('en')).not.toContain('zargon');
            expect(getDynamicMarkers('id')).not.toContain('zargon');
        });

        it('lowercases the word before adding', () => {
            addDynamicMarker('CAPSLOCK', 'en');
            expect(getDynamicMarkers('en')).toContain('capslock');
            expect(getDynamicMarkers('en')).not.toContain('CAPSLOCK');
        });

        it('deduplicates — adding the same word twice still yields one entry', () => {
            addDynamicMarker('unique', 'id');
            addDynamicMarker('unique', 'id');
            const markers = getDynamicMarkers('id');
            const occurrences = markers.filter((m) => m === 'unique').length;
            expect(occurrences).toBe(1);
        });

        it('rejects words shorter than 2 characters', () => {
            addDynamicMarker('a', 'en');
            expect(getDynamicMarkers('en')).toEqual([]);
        });
    });

    describe('hasDynamicMarker', () => {
        it('returns false when no dynamic markers exist for the language', () => {
            expect(hasDynamicMarker('hello world', 'en')).toBe(false);
        });

        it('returns true when a dynamic marker word is present in the text', () => {
            addDynamicMarker('blargh', 'en');
            expect(hasDynamicMarker('the word blargh appears here', 'en')).toBe(true);
        });

        it('returns false when the text does not contain any dynamic marker', () => {
            addDynamicMarker('blargh', 'en');
            expect(hasDynamicMarker('completely different words', 'en')).toBe(false);
        });

        it('uses word-boundary matching to avoid partial substring matches', () => {
            addDynamicMarker('test', 'en');
            // "testing" contains "test" but as a substring, should not match
            expect(hasDynamicMarker('testing something', 'en')).toBe(false);
            // "test" as a standalone word should match
            expect(hasDynamicMarker('this is a test case', 'en')).toBe(true);
        });
    });

    describe('clearDynamicMarkers', () => {
        it('clears only the specified language when a language argument is provided', () => {
            addDynamicMarker('en-word', 'en');
            addDynamicMarker('nl-word', 'nl');

            clearDynamicMarkers('en');

            expect(getDynamicMarkers('en')).toEqual([]);
            expect(getDynamicMarkers('nl')).toContain('nl-word');
        });

        it('clears all language sets when no language argument is provided', () => {
            addDynamicMarker('en-word', 'en');
            addDynamicMarker('nl-word', 'nl');
            addDynamicMarker('id-word', 'id');

            clearDynamicMarkers();

            expect(getDynamicMarkers('en')).toEqual([]);
            expect(getDynamicMarkers('nl')).toEqual([]);
            expect(getDynamicMarkers('id')).toEqual([]);
        });
    });

    // ── Static marker arrays ───────────────────────────────────────────

    describe('static marker arrays', () => {
        it('INDONESIAN_MARKERS contains common Indonesian words', () => {
            expect(INDONESIAN_MARKERS).toContain('saya');
            expect(INDONESIAN_MARKERS).toContain('mau');
            expect(INDONESIAN_MARKERS).toContain('gua');
        });

        it('ENGLISH_MARKERS contains common English words', () => {
            expect(ENGLISH_MARKERS).toContain('the');
            expect(ENGLISH_MARKERS).toContain('you');
            expect(ENGLISH_MARKERS).toContain('want');
        });

        it('DUTCH_MARKERS contains common Dutch words', () => {
            expect(DUTCH_MARKERS).toContain('het');
            expect(DUTCH_MARKERS).toContain('ik');
            expect(DUTCH_MARKERS).toContain('wat');
        });
    });
});
