import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mock learningStore singleton ────────────────────────────────────────
const mockAcceptAmbientEntry = vi.hoisted(() => vi.fn());

vi.mock('./learningStore', () => ({
    jsonLearningStore: {
        acceptAmbientEntry: mockAcceptAmbientEntry,
    },
    JsonLearningStore: vi.fn(),
    learningStore: {
        acceptAmbientEntry: mockAcceptAmbientEntry,
    },
    vectorLearningStore: {
        acceptAmbientEntry: mockAcceptAmbientEntry,
    },
}));

import { AmbientListener } from './ambientListener';

// ── Tests ───────────────────────────────────────────────────────────────

describe('AmbientListener', () => {
    let listener: AmbientListener;

    beforeEach(() => {
        listener = new AmbientListener();
        mockAcceptAmbientEntry.mockClear();
    });

    // ── Default state ───────────────────────────────────────────────────

    describe('default state', () => {
        it('starts with enabled set to false (privacy-first default OFF)', () => {
            expect(listener.enabled).toBe(false);
        });

        it('starts with paused set to false', () => {
            expect(listener.paused).toBe(false);
        });

        it('is not active by default', () => {
            expect(listener.isActive()).toBe(false);
        });
    });

    // ── Lifecycle: start / stop ─────────────────────────────────────────

    describe('start and stop', () => {
        it('start sets enabled to true', () => {
            listener.start();
            expect(listener.enabled).toBe(true);
        });

        it('isActive returns true after start (when not paused)', () => {
            listener.start();
            expect(listener.isActive()).toBe(true);
        });

        it('stop sets enabled to false', () => {
            listener.start();
            listener.stop();
            expect(listener.enabled).toBe(false);
        });

        it('stop clears recent transcripts', () => {
            listener.start();
            listener.recentTranscripts = ['fragment 1', 'fragment 2'];

            listener.stop();

            expect(listener.recentTranscripts).toEqual([]);
        });

        it('isActive returns false after stop', () => {
            listener.start();
            listener.stop();
            expect(listener.isActive()).toBe(false);
        });
    });

    // ── Lifecycle: pause / resume ──────────────────────────────────────

    describe('pause and resume', () => {
        it('pause sets paused to true', () => {
            listener.pause();
            expect(listener.paused).toBe(true);
        });

        it('isActive returns false when enabled but paused', () => {
            listener.start();
            listener.pause();
            expect(listener.isActive()).toBe(false);
        });

        it('resume sets paused back to false', () => {
            listener.start();
            listener.pause();
            listener.resume();
            expect(listener.paused).toBe(false);
        });

        it('isActive returns true after resume', () => {
            listener.start();
            listener.pause();
            listener.resume();
            expect(listener.isActive()).toBe(true);
        });

        it('resume does not make the listener active if it was never started', () => {
            listener.resume();
            expect(listener.isActive()).toBe(false);
        });
    });

    // ── isActive ────────────────────────────────────────────────────────

    describe('isActive', () => {
        it('returns true only when enabled is true and paused is false', () => {
            expect(listener.isActive()).toBe(false);

            listener.enabled = true;
            listener.paused = false;
            expect(listener.isActive()).toBe(true);

            listener.paused = true;
            expect(listener.isActive()).toBe(false);

            listener.enabled = false;
            listener.paused = false;
            expect(listener.isActive()).toBe(false);
        });
    });

    // ── getStatus ──────────────────────────────────────────────────────

    describe('getStatus', () => {
        it('returns the correct enabled, paused, and recentCount values', () => {
            listener.enabled = true;
            listener.paused = false;
            listener.recentTranscripts = ['one', 'two', 'three'];

            const status = listener.getStatus();
            expect(status).toEqual({
                enabled: true,
                paused: false,
                recentCount: 3,
            });
        });

        it('reflects changes in state', () => {
            listener.start();
            expect(listener.getStatus().enabled).toBe(true);

            listener.pause();
            expect(listener.getStatus().paused).toBe(true);

            listener.stop();
            expect(listener.getStatus().enabled).toBe(false);
        });
    });

    // ── feedTranscript ─────────────────────────────────────────────────

    describe('feedTranscript', () => {
        it('does nothing when the listener is not active', async () => {
            await listener.feedTranscript('hello world and the cat');
            expect(listener.recentTranscripts).toHaveLength(0);
        });

        it('accumulates transcripts in recentTranscripts when active', async () => {
            listener.start();

            await listener.feedTranscript('hello world');
            await listener.feedTranscript('and the cat');

            expect(listener.recentTranscripts).toHaveLength(2);
            expect(listener.recentTranscripts[0]).toBe('hello world');
            expect(listener.recentTranscripts[1]).toBe('and the cat');
        });

        it('caps recentTranscripts at 50 entries, keeping the latest', async () => {
            listener.start();

            for (let i = 0; i < 60; i++) {
                await listener.feedTranscript(`fragment ${i}`);
            }

            expect(listener.recentTranscripts).toHaveLength(50);
            expect(listener.recentTranscripts[0]).toBe('fragment 10');
            expect(listener.recentTranscripts[49]).toBe('fragment 59');
        });
    });

    // ── onPatternDetected ──────────────────────────────────────────────

    describe('onPatternDetected', () => {
        it('registers a callback and returns a unique ID string', () => {
            const id = listener.onPatternDetected(() => {});
            expect(typeof id).toBe('string');
            expect(id).toBeTruthy();
        });

        it('returns incrementing IDs for successive registrations', () => {
            const id1 = listener.onPatternDetected(() => {});
            const id2 = listener.onPatternDetected(() => {});
            expect(id1).not.toBe(id2);
        });

        it('fires registered callbacks when feedTranscript detects unknown slang', async () => {
            listener.start();
            const callback = vi.fn();
            listener.onPatternDetected(callback);

            // Use a string with words that won't be in any marker list
            await listener.feedTranscript('xylophonezebra quantumstuffs');

            expect(callback).toHaveBeenCalled();
        });

        it('does not fire callbacks when no slang is detected', async () => {
            listener.start();
            const callback = vi.fn();
            listener.onPatternDetected(callback);

            // Use only words present in the real ENGLISH_MARKERS list
            await listener.feedTranscript('the and you want please');

            expect(callback).not.toHaveBeenCalled();
        });

        it('does not fire callbacks when the listener is not active', async () => {
            const callback = vi.fn();
            listener.onPatternDetected(callback);

            await listener.feedTranscript('xylophonezebra quantumstuffs');

            expect(callback).not.toHaveBeenCalled();
        });
    });

    // ── flushMemory ────────────────────────────────────────────────────

    describe('flushMemory', () => {
        it('does not call acceptAmbientEntry when the buffer is empty', async () => {
            await listener.flushMemory();
            expect(mockAcceptAmbientEntry).not.toHaveBeenCalled();
        });

        it('sends accumulated memories to the learning store and clears the buffer', async () => {
            listener.start();

            // Feed a transcript with unknown words to populate the buffer
            await listener.feedTranscript('xylophonezebra quantumstuffs');

            // flushMemory calls jsonLearningStore.acceptAmbientEntry internally
            await listener.flushMemory();

            expect(mockAcceptAmbientEntry).toHaveBeenCalled();
        });
    });
});
