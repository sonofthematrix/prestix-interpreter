import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { AmbientMemory, InterpreterMode, SuggestedLearning } from './types';

// ── Mock node:fs/promises ──────────────────────────────────────────────
const fsMocks = vi.hoisted(() => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:fs/promises', () => fsMocks);

// Import after mock so the module uses our controlled fs
import { JsonLearningStore } from './learningStore';

// ── Helpers ────────────────────────────────────────────────────────────
function emptyStoreJson(): string {
    return JSON.stringify({ items: [], suggestions: [] });
}

function storeJsonWithGlossary(term: string, meaning: string, mode: InterpreterMode): string {
    return JSON.stringify({
        items: [
            {
                type: 'glossary',
                term,
                meaning,
                mode,
                examples: [],
                createdAt: '2025-01-01T00:00:00.000Z',
            },
        ],
        suggestions: [],
    });
}

// ── Tests ───────────────────────────────────────────────────────────────

describe('JsonLearningStore', () => {
    let store: JsonLearningStore;
    let writtenJson: string;

    beforeEach(() => {
        writtenJson = '';
        fsMocks.readFile.mockResolvedValue(emptyStoreJson());
        fsMocks.writeFile.mockImplementation(async (_path: string, data: string) => {
            writtenJson = data;
        });
        fsMocks.mkdir.mockResolvedValue(undefined);
        fsMocks.rename.mockResolvedValue(undefined);
        store = new JsonLearningStore('/tmp/test-learning.json');
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    // ── addCorrection / addGlossary (existing methods) ──────────────────

    describe('addCorrection', () => {
        it('persists a correction and returns it with a createdAt timestamp', async () => {
            const result = await store.addCorrection({
                sourceText: 'Gua lapar',
                wrongOutput: 'I am hungry',
                correctedOutput: "I'm starving",
                mode: 'id-en',
            });

            expect(result.type).toBe('correction');
            expect(result.sourceText).toBe('Gua lapar');
            expect(result.correctedOutput).toBe("I'm starving");
            expect(result.createdAt).toBeTruthy();
            expect(fsMocks.writeFile).toHaveBeenCalledOnce();
        });

        it('accepts a correction even with an empty sourceText since the validator treats it as a string', async () => {
            const result = await store.addCorrection({
                sourceText: '',
                wrongOutput: 'bad',
                correctedOutput: 'good',
                mode: 'id-en',
            });

            expect(result.type).toBe('correction');
            expect(result.sourceText).toBe('');
            expect(result.correctedOutput).toBe('good');
        });
    });

    describe('addGlossary', () => {
        it('persists a glossary entry and returns it with a createdAt timestamp', async () => {
            const result = await store.addGlossary({
                term: 'mampus',
                meaning: 'screwed / doomed (informal)',
                mode: 'id-en',
            });

            expect(result.type).toBe('glossary');
            expect(result.term).toBe('mampus');
            expect(result.createdAt).toBeTruthy();
            expect(fsMocks.writeFile).toHaveBeenCalledOnce();
        });
    });

    // ── listRelevant (existing method) ──────────────────────────────────

    describe('listRelevant', () => {
        it('returns empty context when no items match the mode', async () => {
            fsMocks.readFile.mockResolvedValue(storeJsonWithGlossary('gua', 'I/me', 'id-en'));

            const result = await store.listRelevant('testing something', 'nl-id' as InterpreterMode);

            expect(result.context).toBe('');
            expect(result.matchesCount).toBe(0);
            expect(result.typesUsed).toEqual([]);
        });

        it('returns matching items when tokens overlap', async () => {
            fsMocks.readFile.mockResolvedValue(storeJsonWithGlossary('gua', 'I/me (slang)', 'id-en'));

            const result = await store.listRelevant('gua mau makan', 'id-en');

            expect(result.matchesCount).toBeGreaterThan(0);
            expect(result.typesUsed).toContain('glossary');
            expect(result.context).toContain('gua');
        });
    });

    // ── detectSlang ─────────────────────────────────────────────────────

    describe('detectSlang', () => {
        it('returns empty array for a string with only known Indonesian words', () => {
            // All tokens appear in the real INDONESIAN_MARKERS (gua, mau, ini)
            const detections = store.detectSlang('gua mau ini', 'id-en');
            expect(detections).toEqual([]);
        });

        it('returns empty array for a string with only known English words', () => {
            // All tokens appear in the real ENGLISH_MARKERS (the, and, for, with)
            const detections = store.detectSlang('the and for with', 'en-id');
            expect(detections).toEqual([]);
        });

        it('returns detections for words not in any static marker list', () => {
            const detections = store.detectSlang('blargh zibberflap xyz', 'id-en');

            expect(detections.length).toBeGreaterThan(0);
            const words = detections.map((d) => d.word);
            expect(words).toContain('blargh');
            expect(words).toContain('zibberflap');
        });

        it('skips tokens shorter than 2 characters', () => {
            const detections = store.detectSlang('a b c d', 'id-en');
            expect(detections).toEqual([]);
        });

        it('returns confidence of 0.4 for each detection', () => {
            const detections = store.detectSlang('unfamiliar zargon', 'id-en');
            for (const d of detections) {
                expect(d.confidence).toBe(0.4);
            }
        });

        it('includes truncated context from input', () => {
            const detections = store.detectSlang('some weirdword here', 'id-en');
            const detection = detections.find((d) => d.word === 'weirdword');
            expect(detection).toBeDefined();
            expect(detection!.context).toContain('weirdword');
        });
    });

    // ── suggestMemory ────────────────────────────────────────────────────

    describe('suggestMemory', () => {
        it('returns suggestions for unknown slang words not already in glossary', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            const suggestions = await store.suggestMemory('hear ye weirdphrases abound', 'hey nonny nonny', 'en-id');

            expect(suggestions.length).toBeGreaterThan(0);
            const slangSuggestions = suggestions.filter((s) => s.kind === 'slang');
            expect(slangSuggestions.length).toBeGreaterThan(0);
        });

        it('skips slang words that already exist in the glossary', async () => {
            fsMocks.readFile.mockResolvedValue(storeJsonWithGlossary('blargh', 'already known', 'id-en'));

            const suggestions = await store.suggestMemory('blargh again', 'output', 'id-en');

            const slangForBlargh = suggestions.filter(
                (s) => s.kind === 'slang' && s.sourceText === 'blargh',
            );
            expect(slangForBlargh).toHaveLength(0);
        });

        it('includes a correction suggestion when input has at least 2 tokens and output is non-empty', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            const suggestions = await store.suggestMemory(
                'Halo apa kabar',
                'Hello, how are you?',
                'id-en',
            );

            const correction = suggestions.find((s) => s.kind === 'correction');
            expect(correction).toBeDefined();
            expect(correction!.mode).toBe('id-en');
        });

        it('persists suggestions to the store', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            await store.suggestMemory('unique thing', 'response', 'id-en');

            const parsed = JSON.parse(writtenJson);
            expect(parsed.suggestions.length).toBeGreaterThan(0);
        });
    });

    // ── autoCaptureSuccessful ────────────────────────────────────────────

    describe('autoCaptureSuccessful', () => {
        it('does nothing when confidence is too low (output < 10 chars)', async () => {
            await store.autoCaptureSuccessful('input', 'short', 'id-en');

            // Short output lowers confidence below 0.7, so nothing should be written
            expect(fsMocks.writeFile).not.toHaveBeenCalled();
        });

        it('does nothing when output heavily echoes the input (echo ratio > 0.7)', async () => {
            const input = 'hello world how are you today';
            await store.autoCaptureSuccessful(input, input, 'en-id');

            expect(fsMocks.writeFile).not.toHaveBeenCalled();
        });

        it('auto-captures glossary entries for unknown tokens when confidence is high', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            await store.autoCaptureSuccessful(
                'blargfest zargonator is happening',
                'The blargfest zargonator is really happening today!',
                'id-en',
            );

            expect(fsMocks.writeFile).toHaveBeenCalled();
            const parsed = JSON.parse(writtenJson);
            const glossaryItems = parsed.items.filter((i: { type: string }) => i.type === 'glossary');
            expect(glossaryItems.length).toBeGreaterThan(0);
        });

        it('auto-captures a style rule when output is long enough and ends with punctuation', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            await store.autoCaptureSuccessful(
                'Gua mau beli makanan malam ini',
                'I would like to buy some food for tonight, please.',
                'id-en',
            );

            const parsed = JSON.parse(writtenJson);
            const styleItems = parsed.items.filter((i: { type: string }) => i.type === 'style');
            expect(styleItems.length).toBeGreaterThan(0);
        });
    });

    // ── autoCapture (interface wrapper) ──────────────────────────────────

    describe('autoCapture', () => {
        it('persists feedback as a glossary entry', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            await store.autoCapture({
                input: 'tolong bantu saya',
                output: 'please help me',
                mode: 'id-en',
                accepted: true,
                timestamp: new Date().toISOString(),
            });

            expect(fsMocks.writeFile).toHaveBeenCalled();
            const parsed = JSON.parse(writtenJson);
            const glossaryItems = parsed.items.filter((i: { type: string }) => i.type === 'glossary');
            expect(glossaryItems.length).toBeGreaterThan(0);
        });

        it('does not throw when addGlossary fails internally', async () => {
            // Force writeFile to throw so inner addGlossary fails
            fsMocks.writeFile.mockRejectedValueOnce(new Error('disk full'));

            await expect(
                store.autoCapture({
                    input: 'test',
                    output: 'test',
                    mode: 'id-en',
                    accepted: true,
                    timestamp: new Date().toISOString(),
                }),
            ).resolves.toBeUndefined();
        });
    });

    // ── acceptAmbientEntry ───────────────────────────────────────────────

    describe('acceptAmbientEntry', () => {
        it('does nothing for a discarded entry', async () => {
            const entry: AmbientMemory = {
                id: 'mem-1',
                transcript: 'some text',
                detectedLanguage: 'unknown',
                extractedSlang: [{ word: 'blarg', language: 'unknown', context: 'text', confidence: 0.5 }],
                extractedPatterns: ['blarg'],
                confidence: 0.5,
                processed: true,
                discarded: true,
                createdAt: new Date().toISOString(),
            };

            await store.acceptAmbientEntry(entry);
            expect(fsMocks.writeFile).not.toHaveBeenCalled();
        });

        it('does nothing for an unprocessed entry', async () => {
            const entry: AmbientMemory = {
                id: 'mem-2',
                transcript: 'some text',
                detectedLanguage: 'unknown',
                extractedSlang: [{ word: 'blarg', language: 'unknown', context: 'text', confidence: 0.5 }],
                extractedPatterns: ['blarg'],
                confidence: 0.5,
                processed: false,
                discarded: false,
                createdAt: new Date().toISOString(),
            };

            await store.acceptAmbientEntry(entry);
            expect(fsMocks.writeFile).not.toHaveBeenCalled();
        });

        it('creates glossary entries for extracted slang and conversation entries for patterns', async () => {
            fsMocks.readFile.mockResolvedValue(emptyStoreJson());

            const entry: AmbientMemory = {
                id: 'mem-3',
                transcript: 'ambient text with patterns',
                detectedLanguage: 'nl',
                extractedSlang: [{ word: 'zargon', language: 'nl', context: 'text', confidence: 0.8 }],
                extractedPatterns: ['zargon', 'pattern-a'],
                confidence: 0.8,
                processed: true,
                discarded: false,
                createdAt: new Date().toISOString(),
            };

            await store.acceptAmbientEntry(entry);

            expect(fsMocks.writeFile).toHaveBeenCalled();
            const parsed = JSON.parse(writtenJson);
            const glossary = parsed.items.filter((i: { type: string }) => i.type === 'glossary');
            const conversations = parsed.items.filter((i: { type: string }) => i.type === 'conversation');
            expect(glossary.length).toBeGreaterThan(0);
            expect(conversations.length).toBeGreaterThan(0);
        });
    });

    // ── listSuggestions / confirmSuggestion / rejectSuggestion ──────────

    describe('suggestion lifecycle', () => {
        const sampleSuggestion: SuggestedLearning = {
            id: 'sug-1',
            kind: 'slang',
            sourceText: 'testword',
            suggestion: 'Add "testword" to glossary',
            mode: 'id-en',
            createdAt: new Date().toISOString(),
        };

        it('listSuggestions returns an empty array when there are no suggestions', async () => {
            const suggestions = await store.listSuggestions();
            expect(suggestions).toEqual([]);
        });

        it('confirmSuggestion converts a suggestion into a persisted learning entry and removes it from queue', async () => {
            fsMocks.readFile.mockResolvedValue(
                JSON.stringify({ items: [], suggestions: [sampleSuggestion] }),
            );

            await store.confirmSuggestion('sug-1');

            expect(fsMocks.writeFile).toHaveBeenCalled();
            const parsed = JSON.parse(writtenJson);
            expect(parsed.suggestions).toHaveLength(0);
            expect(parsed.items.length).toBeGreaterThan(0);
        });

        it('confirmSuggestion does nothing for a non-existent ID', async () => {
            fsMocks.readFile.mockResolvedValue(
                JSON.stringify({ items: [], suggestions: [sampleSuggestion] }),
            );

            await store.confirmSuggestion('nonexistent');

            // No write should occur since the ID was not found
            expect(fsMocks.writeFile).not.toHaveBeenCalled();
        });

        it('rejectSuggestion removes a suggestion by ID from the queue', async () => {
            fsMocks.readFile.mockResolvedValue(
                JSON.stringify({ items: [], suggestions: [sampleSuggestion] }),
            );

            await store.rejectSuggestion('sug-1');

            expect(fsMocks.writeFile).toHaveBeenCalled();
            const parsed = JSON.parse(writtenJson);
            expect(parsed.suggestions).toHaveLength(0);
        });

        it('rejectSuggestion does nothing for a non-existent ID', async () => {
            fsMocks.readFile.mockResolvedValue(
                JSON.stringify({ items: [], suggestions: [sampleSuggestion] }),
            );

            await store.rejectSuggestion('nonexistent');

            // No write should occur since the ID was not found
            expect(fsMocks.writeFile).not.toHaveBeenCalled();
        });
    });
});
