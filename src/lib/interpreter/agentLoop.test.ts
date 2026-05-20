import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentLoop } from './agentLoop';
import type { AgentPlan, AgentResult, AgentStep } from './types';
import type { AgentLoopState, StepExecutor } from './agentLoop';

// ── Helpers ────────────────────────────────────────────────────────────

function createAgentLoop(): AgentLoop {
    return new AgentLoop();
}

function createMockExecutor(
    outputs: Array<{ output: string; error?: string }>,
): { executor: StepExecutor; calls: Array<{ step: AgentStep; plan: AgentPlan }> } {
    const calls: Array<{ step: AgentStep; plan: AgentPlan }> = [];
    const executor = vi.fn(async (step: AgentStep, plan: AgentPlan) => {
        calls.push({ step: { ...step }, plan: { ...plan } });
        const output = outputs[calls.length - 1];
        if (!output) {
            return { output: 'default' };
        }
        return output;
    });
    return { executor, calls };
}

function createThrowingExecutor(errorMessage: string): StepExecutor {
    return vi.fn(async (_step: AgentStep, _plan: AgentPlan) => {
        throw new Error(errorMessage);
    });
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('AgentLoop', () => {
    let agentLoop: AgentLoop;

    beforeEach(() => {
        agentLoop = createAgentLoop();
    });

    // ── Positive: simple input ─────────────────────────────────────────

    it('execute() on simple input returns result with 1 completed step', async () => {
        // Arrange
        const input = 'translate hello';

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl');

        // Assert
        expect(result.completedSteps).toHaveLength(1);
        expect(result.plan.steps).toHaveLength(1);
        expect(result.plan.totalSteps).toBe(1);

        const step = result.completedSteps[0]!;
        expect(step.status).toBe('completed');
        expect(step.result).toBeTruthy();
        expect(step.description).toBe(input);
    });

    // ── Positive: multi-step input ─────────────────────────────────────

    it('execute() on multi-step input returns result with multiple steps', async () => {
        // Arrange
        const input = 'vertaal hallo en vat samen de tekst';

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl');

        // Assert
        expect(result.completedSteps).toHaveLength(2);
        expect(result.plan.steps).toHaveLength(2);
        expect(result.plan.totalSteps).toBe(2);

        // All steps should be completed
        for (const step of result.completedSteps) {
            expect(step.status).toBe('completed');
            expect(step.id).toBeTruthy();
            expect(step.description).toBeTruthy();
        }

        // Steps should be in order
        expect(result.completedSteps[0]?.description).toContain('translate');
        expect(result.completedSteps[1]?.description).toContain('summarize');
    });

    // ── Negative: empty input ──────────────────────────────────────────

    it('execute() with empty input returns failed result', async () => {
        // Arrange
        const input = '';

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl');

        // Assert
        expect(result.finalOutput).toBe('');
        expect(result.completedSteps).toHaveLength(0);
        expect(result.plan.steps).toHaveLength(0);
        expect(result.plan.totalSteps).toBe(0);

        // State should reflect failure
        const state = agentLoop.getState();
        expect(state.status).toBe('failed');
    });

    // ── Positive: executor is called for each step ─────────────────────

    it('execute() with executor calls executor for each step', async () => {
        // Arrange
        const input = 'search weather in Jakarta and translate to Dutch';
        const { executor, calls } = createMockExecutor([
            { output: 'Weather is 30 degrees' },
            { output: 'Het weer is 30 graden' },
        ]);

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl', executor);

        // Assert
        expect(calls).toHaveLength(2);

        // First executor call
        expect(calls[0]?.step.description).toContain('search');
        // Second executor call
        expect(calls[1]?.step.description).toContain('translate');

        // All steps completed via executor
        expect(result.completedSteps).toHaveLength(2);
        expect(result.completedSteps[0]?.result).toBe('Weather is 30 degrees');
        expect(result.completedSteps[1]?.result).toBe('Het weer is 30 graden');
    });

    // ── Negative: executor throws ──────────────────────────────────────

    it('execute() with throwing executor marks step as failed with error', async () => {
        // Arrange
        const input = 'explain AI';
        const errorMessage = 'Tool execution crashed';
        const throwingExecutor = createThrowingExecutor(errorMessage);

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl', throwingExecutor);

        // Assert
        expect(result.completedSteps).toHaveLength(1);
        expect(result.completedSteps[0]?.status).toBe('failed');
        expect(result.completedSteps[0]?.error).toBe(errorMessage);
        expect(result.completedSteps[0]?.result).toBeUndefined();
    });

    // ── Negative: executor returns error ───────────────────────────────

    it('execute() with executor returning error marks step as failed with step.error', async () => {
        // Arrange
        const input = 'translate hallo';
        const errorOutput = 'Rate limit exceeded';
        const { executor } = createMockExecutor([
            { output: 'partial output', error: errorOutput },
        ]);

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl', executor);

        // Assert
        expect(result.completedSteps).toHaveLength(1);
        expect(result.completedSteps[0]?.status).toBe('failed');
        expect(result.completedSteps[0]?.error).toBe(errorOutput);
        // result should still be set (partial output)
        expect(result.completedSteps[0]?.result).toBe('partial output');
    });

    // ── getState / reset ───────────────────────────────────────────────

    it('getState() returns correct state after execution', async () => {
        // Arrange
        const input = 'translate hello';

        // Act
        await agentLoop.execute(input, 'id-nl');
        const state: AgentLoopState = agentLoop.getState();

        // Assert
        expect(state.status).toBe('completed');
        expect(state.plan.input).toBe(input);
        expect(state.plan.steps.length).toBeGreaterThan(0);
        expect(state.completedSteps.length).toBeGreaterThan(0);
    });

    it('reset() clears all state', async () => {
        // Arrange — execute something to populate state
        await agentLoop.execute('translate hello', 'id-nl');
        expect(agentLoop.getState().status).toBe('completed');
        expect(agentLoop.getState().completedSteps.length).toBeGreaterThan(0);

        // Act
        agentLoop.reset();

        // Assert
        const state = agentLoop.getState();
        expect(state.status).toBe('planning');
        expect(state.plan.input).toBe('');
        expect(state.plan.steps).toHaveLength(0);
        expect(state.plan.currentStep).toBe(0);
        expect(state.plan.totalSteps).toBe(0);
        expect(state.completedSteps).toHaveLength(0);
    });

    // ── AgentResult structure ──────────────────────────────────────────

    it('execute() returns AgentResult with plan, finalOutput, completedSteps', async () => {
        // Arrange
        const input = 'translate hello world';

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl');

        // Assert — all required properties present
        expect(result).toHaveProperty('plan');
        expect(result).toHaveProperty('finalOutput');
        expect(result).toHaveProperty('completedSteps');
        expect(result.plan.input).toBe(input);
        expect(result.plan.steps.length).toBeGreaterThan(0);
        expect(typeof result.finalOutput).toBe('string');
        expect(Array.isArray(result.completedSteps)).toBe(true);
    });

    it('finalOutput contains completed step results', async () => {
        // Arrange
        const input = 'vertaal hallo en vat samen de tekst';

        // Act
        const result: AgentResult = await agentLoop.execute(input, 'id-nl');

        // Assert — finalOutput is a concatenation of step results
        expect(result.finalOutput.length).toBeGreaterThan(0);
        // Both step descriptions (which are the results in no-executor mode) should appear
        for (const step of result.completedSteps) {
            expect(result.finalOutput).toContain(step.result || step.description);
        }
    });
});
