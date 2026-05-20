import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SuggestedLearning } from './types';
import { VectorLearningStore } from './vectorLearningStore';

describe('VectorLearningStore suggestions', () => {
    let store: VectorLearningStore;
    let savedDatabaseUrl: string | undefined;

    beforeEach(() => {
        savedDatabaseUrl = process.env.DATABASE_URL;
        delete process.env.DATABASE_URL;
        store = new VectorLearningStore();
    });

    afterEach(() => {
        if (savedDatabaseUrl === undefined) {
            delete process.env.DATABASE_URL;
        } else {
            process.env.DATABASE_URL = savedDatabaseUrl;
        }
        vi.restoreAllMocks();
    });

    describe('suggestMemory', () => {
        it('returns only suggestions created for the current turn', async () => {
            const first = await store.suggestMemory('first input', 'first output', 'id-en');
            const second = await store.suggestMemory('second input', 'second output', 'nl-id');

            expect(first).toHaveLength(1);
            expect(second).toHaveLength(1);
            expect(first[0].sourceText).toBe('first input');
            expect(second[0].sourceText).toBe('second input');

            const pending = await store.listSuggestions();
            expect(pending).toHaveLength(2);
        });
    });

    describe('confirmSuggestion', () => {
        const makeSuggestion = (overrides: Partial<SuggestedLearning>): SuggestedLearning => ({
            id: 'sug-1',
            kind: 'slang',
            sourceText: 'testword',
            suggestion: 'test meaning',
            mode: 'id-en',
            createdAt: new Date().toISOString(),
            ...overrides,
        });

        it('routes correction suggestions to addCorrection', async () => {
            const addCorrection = vi.spyOn(store, 'addCorrection').mockResolvedValue({
                type: 'correction',
                sourceText: 'source',
                wrongOutput: 'source',
                correctedOutput: 'corrected',
                mode: 'id-en',
                createdAt: new Date().toISOString(),
            });
            const addGlossary = vi.spyOn(store, 'addGlossary');

            (store as unknown as { suggestions: SuggestedLearning[] }).suggestions = [
                makeSuggestion({ kind: 'correction', suggestion: 'corrected output' }),
            ];

            await store.confirmSuggestion('sug-1');

            expect(addCorrection).toHaveBeenCalledOnce();
            expect(addGlossary).not.toHaveBeenCalled();
            expect(await store.listSuggestions()).toHaveLength(0);
        });

        it('routes style suggestions to addStyleRule', async () => {
            const addStyleRule = vi.spyOn(store, 'addStyleRule').mockResolvedValue({
                type: 'style',
                rule: 'Use formal tone',
                mode: 'id-en',
                createdAt: new Date().toISOString(),
            });
            const addGlossary = vi.spyOn(store, 'addGlossary');

            (store as unknown as { suggestions: SuggestedLearning[] }).suggestions = [
                makeSuggestion({ kind: 'style', suggestion: 'Use formal tone' }),
            ];

            await store.confirmSuggestion('sug-1');

            expect(addStyleRule).toHaveBeenCalledOnce();
            expect(addGlossary).not.toHaveBeenCalled();
            expect(await store.listSuggestions()).toHaveLength(0);
        });

        it('keeps the suggestion when persistence fails so confirmation can be retried', async () => {
            vi.spyOn(store, 'addGlossary').mockRejectedValue(new Error('insert failed'));

            (store as unknown as { suggestions: SuggestedLearning[] }).suggestions = [makeSuggestion({})];

            await expect(store.confirmSuggestion('sug-1')).rejects.toThrow('insert failed');
            expect(await store.listSuggestions()).toHaveLength(1);
            expect((await store.listSuggestions())[0].id).toBe('sug-1');
        });
    });
});
