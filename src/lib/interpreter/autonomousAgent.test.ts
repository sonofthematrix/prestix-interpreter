import { describe, expect, it, beforeEach, vi } from 'vitest';

// ── Mock singletons used by AutonomousAgent ──────────────────────────
// These are hoisted and run before the imports, so the mock
// factories must be self-contained (no references to external vars).

const mockDecompose = vi.hoisted(() => vi.fn());
const mockToolRegistryHas = vi.hoisted(() => vi.fn().mockReturnValue(false));
const mockGenerateSuggestions = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockAgentLoopReset = vi.hoisted(() => vi.fn());
const mockToolExecute = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true, output: 'tool output' }));

vi.mock('./taskDecomposer', () => ({
    taskDecomposer: {
        decompose: mockDecompose,
    },
    TaskDecomposer: vi.fn(),
}));

vi.mock('./agentLoop', () => ({
    agentLoop: {
        reset: mockAgentLoopReset,
    },
    AgentLoop: vi.fn(),
}));

vi.mock('./toolRegistry', () => ({
    toolRegistry: {
        has: mockToolRegistryHas,
    },
    ToolRegistry: vi.fn(),
}));

vi.mock('./toolExecutor', () => ({
    toolExecutor: {
        execute: mockToolExecute,
    },
    ToolExecutor: vi.fn(),
}));

vi.mock('./proactiveEngine', () => ({
    proactiveEngine: {
        generateSuggestions: mockGenerateSuggestions,
    },
    ProactiveEngine: vi.fn(),
}));

import { AutonomousAgent } from './autonomousAgent';

// ── Helpers ──────────────────────────────────────────────────────────

/** Create a minimal pending step. */
function pendingStep(overrides: Partial<{ id: string; description: string; tool: string | undefined }> = {}) {
    return {
        id: overrides.id || 's1',
        description: overrides.description || 'step 1',
        status: 'pending' as const,
        tool: overrides.tool,
    };
}

/** Create a minimal plan with the given steps. */
function planWith(input: string, steps: ReturnType<typeof pendingStep>[]) {
    return {
        input,
        steps,
        currentStep: 0,
        totalSteps: steps.length,
    };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('AutonomousAgent', () => {
    let agent: AutonomousAgent;

    beforeEach(() => {
        agent = new AutonomousAgent();
        vi.clearAllMocks();
        // Defaults: no tools registered, proactive engine returns empty
        mockToolRegistryHas.mockReturnValue(false);
        mockGenerateSuggestions.mockResolvedValue([]);
    });

    // ── run() positive cases ─────────────────────────────────────────

    describe('run()', () => {
        it('returns AutonomousResult with plan, observations, finalOutput, and suggestions on simple input', async () => {
            mockDecompose.mockResolvedValue(planWith('test input', [pendingStep()]));

            const result = await agent.run('test input', 'nl-id');

            expect(result).toHaveProperty('plan');
            expect(result).toHaveProperty('observations');
            expect(result).toHaveProperty('finalOutput');
            expect(result).toHaveProperty('suggestions');
        });

        it('returns plan with correct structure (input, steps, currentStep, totalSteps)', async () => {
            const step = pendingStep({ description: 'translate: hello' });
            mockDecompose.mockResolvedValue(planWith('translate hello', [step]));

            const result = await agent.run('translate hello', 'nl-id');

            expect(result.plan.input).toBe('translate hello');
            expect(result.plan.steps).toHaveLength(1);
            expect(typeof result.plan.currentStep).toBe('number');
            expect(result.plan.totalSteps).toBe(1);
        });

        it('returns observations array with one entry per step', async () => {
            mockDecompose.mockResolvedValue(
                planWith('test', [pendingStep({ id: 'a', description: 'first' })])
            );

            const result = await agent.run('test', 'nl-id');

            expect(Array.isArray(result.observations)).toBe(true);
            expect(result.observations.length).toBe(1);
            expect(result.observations[0].assessment).toContain('first');
        });

        it('returns finalOutput as non-empty string for completed steps', async () => {
            mockDecompose.mockResolvedValue(
                planWith('test', [pendingStep({ description: 'step output' })])
            );

            const result = await agent.run('test', 'nl-id');

            expect(typeof result.finalOutput).toBe('string');
            expect(result.finalOutput).toBe('step output');
        });

        it('returns suggestions array', async () => {
            mockDecompose.mockResolvedValue(planWith('test', [pendingStep()]));

            const result = await agent.run('test', 'nl-id');

            expect(Array.isArray(result.suggestions)).toBe(true);
        });

        it('includes plan.steps in the result', async () => {
            const steps = [
                pendingStep({ id: 's1', description: 'step 1' }),
                pendingStep({ id: 's2', description: 'step 2' }),
            ];
            mockDecompose.mockResolvedValue(planWith('multi-step', steps));

            const result = await agent.run('multi-step', 'nl-id');

            expect(result.plan.steps).toHaveLength(2);
            expect(result.plan.steps[0].id).toBe('s1');
            expect(result.plan.steps[0].description).toBe('step 1');
        });

        it('marks steps as completed when they succeed', async () => {
            mockDecompose.mockResolvedValue(planWith('test', [pendingStep({ id: 's1', description: 'do it' })]));

            const result = await agent.run('test', 'nl-id');

            expect(result.plan.steps[0].status).toBe('completed');
            expect(result.plan.steps[0].error).toBeUndefined();
        });
    });

    // ── run() negative cases ─────────────────────────────────────────

    describe('run() — empty / failed input', () => {
        it('returns failed result on empty input (no steps)', async () => {
            mockDecompose.mockResolvedValue(planWith('', []));

            const result = await agent.run('', 'nl-id');

            expect(result.plan.steps).toHaveLength(0);
            expect(result.finalOutput).toBe('');
            expect(result.observations).toHaveLength(0);
            expect(result.suggestions).toHaveLength(0);
        });

        it('records failed step as observation with needsAdjustment when tool errors', async () => {
            // A failing tool step triggers the observe→adjust loop.
            // The adjust() method resets the step to 'pending' for retry,
            // so the final plan shows the step as 'pending' (not 'failed').
            mockToolRegistryHas.mockReturnValue(true);
            mockToolExecute.mockResolvedValue({
                success: false,
                output: '',
                error: 'tool crash',
            });
            mockDecompose.mockResolvedValue(
                planWith('bad input', [pendingStep({ tool: 'bad-tool', description: 'do bad' })])
            );

            const result = await agent.run('bad input', 'nl-id');

            // Observation captures the failure with needsAdjustment flag
            const failureObs = result.observations.find((o) => !o.stepResult.success);
            expect(failureObs).toBeDefined();
            expect(failureObs?.stepResult.error).toBe('tool crash');
            expect(failureObs?.needsAdjustment).toBe(true);
            // After adjustment retries, the step is left as 'pending'
            expect(result.plan.steps[0].status).toBe('pending');
            // No completed steps → empty finalOutput
            expect(result.finalOutput).toBe('');
        });
    });

    // ── getState() ───────────────────────────────────────────────────

    describe('getState()', () => {
        it('starts in idle state', () => {
            expect(agent.getState()).toBe('idle');
        });

        it('returns completed after successful run', async () => {
            mockDecompose.mockResolvedValue(planWith('test', [pendingStep()]));

            await agent.run('test', 'nl-id');

            expect(agent.getState()).toBe('completed');
        });

        it('returns failed after run with empty plan', async () => {
            mockDecompose.mockResolvedValue(planWith('', []));

            await agent.run('', 'nl-id');

            expect(agent.getState()).toBe('failed');
        });
    });

    // ── getObservations() ────────────────────────────────────────────

    describe('getObservations()', () => {
        it('returns empty array at start', () => {
            expect(agent.getObservations()).toEqual([]);
        });

        it('returns observations populated after run', async () => {
            mockDecompose.mockResolvedValue(planWith('test', [pendingStep()]));

            await agent.run('test', 'nl-id');

            const obs = agent.getObservations();
            expect(obs.length).toBe(1);
            expect(obs[0].needsAdjustment).toBe(false);
        });
    });

    // ── reset() ─────────────────────────────────────────────────────

    describe('reset()', () => {
        it('clears state back to idle', async () => {
            mockDecompose.mockResolvedValue(planWith('test', [pendingStep()]));

            await agent.run('test', 'nl-id');
            expect(agent.getState()).toBe('completed');

            agent.reset();

            expect(agent.getState()).toBe('idle');
        });

        it('clears observations on reset', async () => {
            mockDecompose.mockResolvedValue(planWith('test', [pendingStep()]));

            await agent.run('test', 'nl-id');
            expect(agent.getObservations().length).toBe(1);

            agent.reset();

            expect(agent.getObservations()).toEqual([]);
        });

        it('calls agentLoop.reset() when resetting', async () => {
            agent.reset();

            expect(mockAgentLoopReset).toHaveBeenCalled();
        });
    });
});
