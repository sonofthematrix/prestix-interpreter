import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { LearningStore, SuggestedLearning, InterpreterMode } from './types';

// ── Mocks ───────────────────────────────────────────────────────────────
const mockDynamicMarkers = vi.hoisted(() => ({
    en: new Set<string>(),
    nl: new Set<string>(),
    id: new Set<string>(),
}));

const mockAddDynamicMarker = vi.hoisted(() => vi.fn());

// We import the real module after mocking, but vitest hoists the mock.
// The hoisted mocks let us provide controlled static + dynamic markers.
vi.mock('./languageMarkers', () => ({
    INDONESIAN_MARKERS: ['gua', 'saya', 'mau', 'ini', 'itu'],
    ENGLISH_MARKERS: ['the', 'and', 'you', 'hello', 'world'],
    DUTCH_MARKERS: ['het', 'een', 'ik', 'wat', 'niet'],
    addDynamicMarker: mockAddDynamicMarker,
    DYNAMIC_MARKERS: mockDynamicMarkers,
    hasMarker: vi.fn(),
    getDynamicMarkers: vi.fn(),
    hasDynamicMarker: vi.fn(),
    clearDynamicMarkers: vi.fn(),
}));

import { ConversationLearner } from './conversationLearner';

// ── Helpers ────────────────────────────────────────────────────────────

function createMockStore(): LearningStore {
    return {
        listRelevant: vi.fn().mockResolvedValue({ context: '', matchesCount: 0, typesUsed: [] }),
        addCorrection: vi.fn(),
        addGlossary: vi.fn(),
        addStyleRule: vi.fn(),
        suggestMemory: vi.fn().mockResolvedValue([]),
        autoCapture: vi.fn().mockResolvedValue(undefined),
        acceptAmbientEntry: vi.fn(),
        listSuggestions: vi.fn().mockResolvedValue([]),
        confirmSuggestion: vi.fn().mockResolvedValue(undefined),
        rejectSuggestion: vi.fn().mockResolvedValue(undefined),
    };
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('ConversationLearner', () => {
    let learner: ConversationLearner;
    let mockStore: LearningStore;

    beforeEach(() => {
        mockStore = createMockStore();
        learner = new ConversationLearner(mockStore);
        mockAddDynamicMarker.mockClear();
        mockDynamicMarkers.en.clear();
        mockDynamicMarkers.nl.clear();
        mockDynamicMarkers.id.clear();
    });

    // ── detectUnknownWords ─────────────────────────────────────────────

    describe('detectUnknownWords', () => {
        it('returns an empty array when all words are known from static markers', () => {
            const unknown = learner.detectUnknownWords('gua mau ini');
            expect(unknown).toEqual([]);
        });

        it('returns unknown words that are not in any marker list', () => {
            const unknown = learner.detectUnknownWords('gua blargh zargon mau');
            expect(unknown).toContain('blargh');
            expect(unknown).toContain('zargon');
            expect(unknown).not.toContain('gua');
        });

        it('recognises dynamically registered markers as known words', () => {
            mockDynamicMarkers.id.add('blargh');

            const unknown = learner.detectUnknownWords('gua blargh mau');
            expect(unknown).not.toContain('blargh');
            expect(unknown).toEqual([]);
        });

        it('deduplicates repeated unknown tokens', () => {
            const unknown = learner.detectUnknownWords('blargh blargh blargh');
            expect(unknown).toEqual(['blargh']);
        });

        it('excludes pure numbers', () => {
            const unknown = learner.detectUnknownWords('test 12345 more');
            expect(unknown).not.toContain('12345');
        });
    });

    // ── getAllKnownWords ────────────────────────────────────────────────

    describe('getAllKnownWords', () => {
        it('includes all words from static marker arrays', () => {
            const known = learner.getAllKnownWords();
            expect(known.has('gua')).toBe(true);
            expect(known.has('the')).toBe(true);
            expect(known.has('het')).toBe(true);
        });

        it('includes all dynamic markers from every language', () => {
            mockDynamicMarkers.en.add('en-dyn');
            mockDynamicMarkers.nl.add('nl-dyn');
            mockDynamicMarkers.id.add('id-dyn');

            const known = learner.getAllKnownWords();
            expect(known.has('en-dyn')).toBe(true);
            expect(known.has('nl-dyn')).toBe(true);
            expect(known.has('id-dyn')).toBe(true);
        });
    });

    // ── learnFromTurn ───────────────────────────────────────────────────

    describe('learnFromTurn', () => {
        const mode: InterpreterMode = 'id-en';

        it('does nothing when input and output contain only known words', async () => {
            await learner.learnFromTurn('gua mau', 'hello world', mode);

            expect(mockStore.autoCapture).not.toHaveBeenCalled();
            expect(mockStore.suggestMemory).not.toHaveBeenCalled();
        });

        it('auto-captures and registers dynamic markers for high-confidence detections', async () => {
            // "longerword" (9 chars) + appears in both input and output = high confidence
            await learner.learnFromTurn(
                'longerword is here',
                'longerword appears again',
                mode,
            );

            expect(mockStore.autoCapture).toHaveBeenCalled();
            // register via addDynamicMarker for unknown language
            expect(mockAddDynamicMarker).toHaveBeenCalled();
        });

        it('queues suggestions for medium-confidence words via suggestMemory', async () => {
            // Short unknown word "xy" (2 chars, short) → lower confidence
            await learner.learnFromTurn('xy something', 'other output', mode);

            // "xy" is unknown but only 2 chars → base 0.25, vowel check passes → 0.35
            // That's >= 0.3 but <= 0.7 → suggestMemory path
            expect(mockStore.suggestMemory).toHaveBeenCalledWith('xy something', 'other output', mode);
        });

        it('discards very low-confidence tokens (below 0.3)', async () => {
            // "nc" and "zx" are 2 chars with no vowels, only in input
            // "bq" and "cv" are 2 chars with no vowels, only in output
            // Each gets base 0.25, no bonuses → turn max = 0.25 < 0.3
            await learner.learnFromTurn('nc zx', 'bq cv', mode);

            expect(mockStore.autoCapture).not.toHaveBeenCalled();
            expect(mockStore.suggestMemory).not.toHaveBeenCalled();
        });
    });

    // ── getPendingSuggestions / confirmSuggestion / rejectSuggestion ────

    describe('getPendingSuggestions', () => {
        it('returns suggestions from the store', async () => {
            const suggestions: SuggestedLearning[] = [
                { id: 's1', kind: 'slang', sourceText: 'w1', suggestion: 's', mode: 'id-en', createdAt: '2025' },
            ];
            (mockStore.listSuggestions as ReturnType<typeof vi.fn>).mockResolvedValue(suggestions);

            const result = await learner.getPendingSuggestions();
            expect(result).toEqual(suggestions);
        });

        it('returns an empty array when listSuggestions is not implemented', async () => {
            const storeWithoutList: LearningStore = { ...mockStore, listSuggestions: undefined };
            const bareLearner = new ConversationLearner(storeWithoutList);

            const result = await bareLearner.getPendingSuggestions();
            expect(result).toEqual([]);
        });
    });

    describe('confirmSuggestion', () => {
        it('delegates to the store confirmSuggestion method', async () => {
            await learner.confirmSuggestion('abc-123');
            expect(mockStore.confirmSuggestion).toHaveBeenCalledWith('abc-123');
        });
    });

    describe('rejectSuggestion', () => {
        it('delegates to the store rejectSuggestion method', async () => {
            await learner.rejectSuggestion('abc-456');
            expect(mockStore.rejectSuggestion).toHaveBeenCalledWith('abc-456');
        });
    });
});
