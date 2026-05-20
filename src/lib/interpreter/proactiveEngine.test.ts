import { describe, expect, it, beforeEach } from 'vitest';
import { ProactiveEngine } from './proactiveEngine';

describe('ProactiveEngine', () => {
    let engine: ProactiveEngine;

    beforeEach(() => {
        engine = new ProactiveEngine();
    });

    // ── generateSuggestions — morning time ───────────────────────────

    describe('generateSuggestions() — time-based', () => {
        it('returns morning suggestion when time is between 06:00 and 09:59', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '07:30:00',
            });

            const morningSuggestion = suggestions.find(
                (s) => s.text === 'Good morning! Need help with anything today?'
            );
            expect(morningSuggestion).toBeDefined();
            expect(morningSuggestion?.source).toBe('context');
            expect(morningSuggestion?.confidence).toBe(0.6);
        });

        it('returns morning suggestion at 06:00 (boundary)', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '06:00:00',
            });

            expect(suggestions.some((s) => s.text.includes('Good morning'))).toBe(true);
        });

        it('returns morning suggestion at 09:59 (boundary)', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '09:59:00',
            });

            expect(suggestions.some((s) => s.text.includes('Good morning'))).toBe(true);
        });

        it('returns no morning suggestion outside morning hours (10:00+)', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '10:00:00',
            });

            expect(suggestions.some((s) => s.text.includes('Good morning'))).toBe(false);
        });

        it('returns no morning suggestion before 06:00', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '05:59:00',
            });

            expect(suggestions.some((s) => s.text.includes('Good morning'))).toBe(false);
        });

        it('returns no morning suggestion at midnight', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '00:00:00',
            });

            expect(suggestions.some((s) => s.text.includes('Good morning'))).toBe(false);
        });
    });

    // ── generateSuggestions — learning context ───────────────────────

    describe('generateSuggestions() — learning context', () => {
        it('returns learning suggestion when learningContext has >10 characters', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: 'Learned pattern: gua = I (informal Indonesian)',
                timeOfDay: '14:00:00',
            });

            const learningSuggestion = suggestions.find(
                (s) => s.text === "I've been learning from our conversations. Want to review what I've picked up?"
            );
            expect(learningSuggestion).toBeDefined();
            expect(learningSuggestion?.source).toBe('learning');
            expect(learningSuggestion?.confidence).toBe(0.5);
        });

        it('returns no learning suggestion when learningContext is empty', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '14:00:00',
            });

            expect(suggestions.some((s) => s.source === 'learning')).toBe(false);
        });

        it('returns no learning suggestion when learningContext is too short (<=10 chars)', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: 'short', // 5 chars
                timeOfDay: '14:00:00',
            });

            expect(suggestions.some((s) => s.source === 'learning')).toBe(false);
        });
    });

    // ── generateSuggestions — history-based (translation follow-up) ──

    describe('generateSuggestions() — history-based', () => {
        it('returns translation follow-up when recent input includes "translate"', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: ['a', 'b', 'c', 'd', 'e', 'translate hello to Dutch'],
                learningContext: '',
                timeOfDay: '14:00:00',
            });

            const followUp = suggestions.find(
                (s) => s.text === 'I can help translate more phrases if you need.'
            );
            expect(followUp).toBeDefined();
            expect(followUp?.source).toBe('history');
            expect(followUp?.confidence).toBe(0.65);
        });

        it('returns translation follow-up when recent input includes "vertaal"', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: ['a', 'b', 'c', 'd', 'e', 'vertaal dit naar Bahasa'],
                learningContext: '',
                timeOfDay: '14:00:00',
            });

            expect(suggestions.some((s) => s.text === 'I can help translate more phrases if you need.')).toBe(true);
        });

        it('returns no translation follow-up when history is too short (≤5 inputs)', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: ['translate hello'],
                learningContext: '',
                timeOfDay: '14:00:00',
            });

            expect(suggestions.some((s) => s.text === 'I can help translate more phrases if you need.')).toBe(false);
        });

        it('returns no translation follow-up when last input does not mention translate', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: ['a', 'b', 'c', 'd', 'e', 'what is the weather?'],
                learningContext: '',
                timeOfDay: '14:00:00',
            });

            expect(suggestions.some((s) => s.text === 'I can help translate more phrases if you need.')).toBe(false);
        });
    });

    // ── generateSuggestions — empty / combined ───────────────────────

    describe('generateSuggestions() — edge cases', () => {
        it('returns empty array when context is completely empty', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: [],
                learningContext: '',
                timeOfDay: '14:00:00',
            });

            expect(suggestions).toEqual([]);
        });

        it('returns multiple suggestions when multiple conditions match', async () => {
            const suggestions = await engine.generateSuggestions({
                recentInputs: ['a', 'b', 'c', 'd', 'e', 'translate hello'],
                learningContext: 'Learned many things from conversations with you',
                timeOfDay: '07:00:00',
            });

            // Should have morning + learning + translation
            expect(suggestions.length).toBe(3);
        });
    });

    // ── addToHistory / getHistory ────────────────────────────────────

    describe('addToHistory() and getHistory()', () => {
        it('adds a suggestion to history', () => {
            const suggestion = {
                id: 's1',
                text: 'Try saying hello',
                confidence: 0.8,
                source: 'context' as const,
            };

            engine.addToHistory(suggestion);

            const history = engine.getHistory();
            expect(history).toHaveLength(1);
            expect(history[0]).toEqual(suggestion);
        });

        it('preserves order of added suggestions', () => {
            const s1 = { id: '1', text: 'first', confidence: 0.5, source: 'context' as const };
            const s2 = { id: '2', text: 'second', confidence: 0.6, source: 'history' as const };

            engine.addToHistory(s1);
            engine.addToHistory(s2);

            const history = engine.getHistory();
            expect(history).toHaveLength(2);
            expect(history[0].id).toBe('1');
            expect(history[1].id).toBe('2');
        });

        it('getHistory returns a copy (not the internal reference)', () => {
            engine.addToHistory({ id: 's1', text: 'test', confidence: 1, source: 'context' });

            const history = engine.getHistory();
            history.push({ id: 's2', text: 'mutated', confidence: 0, source: 'context' });

            // Original should be unchanged
            expect(engine.getHistory()).toHaveLength(1);
        });

        it('caps history at 50 entries by removing oldest first', () => {
            // Add 55 entries
            for (let i = 0; i < 55; i++) {
                engine.addToHistory({
                    id: `s${i}`,
                    text: `suggestion ${i}`,
                    confidence: 0.5,
                    source: 'context',
                });
            }

            const history = engine.getHistory();
            expect(history).toHaveLength(50);
            // First entries (0-4) should be removed, oldest remaining is entry 5
            expect(history[0].id).toBe('s5');
            expect(history[49].id).toBe('s54');
        });

        it('handles exactly 50 entries without capping', () => {
            for (let i = 0; i < 50; i++) {
                engine.addToHistory({
                    id: `s${i}`,
                    text: `suggestion ${i}`,
                    confidence: 0.5,
                    source: 'context',
                });
            }

            const history = engine.getHistory();
            expect(history).toHaveLength(50);
            expect(history[0].id).toBe('s0');
            expect(history[49].id).toBe('s49');
        });
    });
});
