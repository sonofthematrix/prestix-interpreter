import { describe, expect, it } from 'vitest';
import { TaskDecomposer } from './taskDecomposer';
import type { AgentPlan, AgentStep } from './types';

// ── Helpers ────────────────────────────────────────────────────────────

function createDecomposer(): TaskDecomposer {
    return new TaskDecomposer();
}

function allIdsUnique(steps: AgentStep[]): boolean {
    const ids = steps.map((s) => s.id);
    return new Set(ids).size === ids.length;
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('TaskDecomposer', () => {
    // ── Positive: single-step inputs ───────────────────────────────────

    it('decompose() on simple single-task input returns 1-step plan', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'translate hello to Indonesian';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(1);
        expect(plan.totalSteps).toBe(1);
        expect(plan.currentStep).toBe(0);
        expect(plan.input).toBe(input);
        expect(plan.steps[0]?.description).toBe(input);
        expect(plan.steps[0]?.status).toBe('pending');
        expect(plan.steps[0]?.id).toBeTruthy();
    });

    // ── Positive: multi-step with "en/and" (translate+summarize) ───────

    it('decompose() on Dutch "vertaal...en vat samen" yields 2 steps', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'vertaal hallo en vat samen de tekst';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(2);
        expect(plan.totalSteps).toBe(2);
        expect(plan.currentStep).toBe(0);
        expect(plan.input).toBe(input);

        // First step: translate
        expect(plan.steps[0]?.description).toContain('translate');
        expect(plan.steps[0]?.description).toContain('hallo');
        expect(plan.steps[0]?.tool).toBe('translate');
        expect(plan.steps[0]?.status).toBe('pending');

        // Second step: summarize
        expect(plan.steps[1]?.description).toContain('summarize');
        expect(plan.steps[1]?.description).toContain('de tekst');
        expect(plan.steps[1]?.tool).toBe('summarize');
        expect(plan.steps[1]?.status).toBe('pending');
    });

    // ── Positive: multi-step with "en/and" (search+translate) ──────────

    it('decompose() on "search...and translate" pattern returns 2-step plan', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'search weather in Jakarta and translate to Dutch';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(2);
        expect(plan.totalSteps).toBe(2);

        // First step: search
        expect(plan.steps[0]?.description).toContain('search');
        expect(plan.steps[0]?.description).toContain('weather in Jakarta');
        expect(plan.steps[0]?.tool).toBe('search');
        expect(plan.steps[0]?.status).toBe('pending');

        // Second step: translate
        expect(plan.steps[1]?.description).toContain('translate');
        expect(plan.steps[1]?.description).toContain('to Dutch');
        expect(plan.steps[1]?.tool).toBe('translate');
        expect(plan.steps[1]?.status).toBe('pending');
    });

    // ── Positive: "explain...then translate" pattern ───────────────────

    it('decompose() on "explain...then translate" pattern yields 2 steps', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'explain quantum computing then translate to Indonesian';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(2);
        expect(plan.totalSteps).toBe(2);

        // First step: explain
        expect(plan.steps[0]?.description).toContain('explain');
        expect(plan.steps[0]?.description).toContain('quantum computing');
        expect(plan.steps[0]?.tool).toBe('explain');

        // Second step: translate
        expect(plan.steps[1]?.description).toContain('translate');
        expect(plan.steps[1]?.description).toContain('to Indonesian');
        expect(plan.steps[1]?.tool).toBe('translate');
    });

    // ── Positive: "first...then" pattern ───────────────────────────────

    it('decompose() on "first...then" pattern yields 2 steps with mapped tools', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'first search the news then translate to Indonesian';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(2);
        expect(plan.totalSteps).toBe(2);

        // First step: search (mapped from search_or_explain)
        expect(plan.steps[0]?.description).toContain('search the news');
        expect(plan.steps[0]?.tool).toBe('search');
        expect(plan.steps[0]?.status).toBe('pending');

        // Second step: translate (mapped from translate_or_summarize)
        expect(plan.steps[1]?.description).toContain('translate to Indonesian');
        expect(plan.steps[1]?.tool).toBe('translate');
        expect(plan.steps[1]?.status).toBe('pending');
    });

    // ── Negative: empty input ──────────────────────────────────────────

    it('decompose() on empty string returns empty steps', async () => {
        // Arrange
        const decomposer = createDecomposer();

        // Act
        const plan: AgentPlan = await decomposer.decompose('', 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(0);
        expect(plan.totalSteps).toBe(0);
        expect(plan.currentStep).toBe(0);
        expect(plan.input).toBe('');
    });

    // ── Negative: whitespace input ─────────────────────────────────────

    it('decompose() on whitespace returns empty steps', async () => {
        // Arrange
        const decomposer = createDecomposer();

        // Act
        const plan: AgentPlan = await decomposer.decompose('   \t\n  ', 'id-nl');

        // Assert
        expect(plan.steps).toHaveLength(0);
        expect(plan.totalSteps).toBe(0);
        expect(plan.currentStep).toBe(0);
    });

    // ── Structure validation ───────────────────────────────────────────

    it('decompose() plan has correct structure: input, steps, currentStep, totalSteps', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'translate hello world';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'en-id');

        // Assert — verify all required properties exist and are correct types
        expect(plan).toHaveProperty('input');
        expect(plan).toHaveProperty('steps');
        expect(plan).toHaveProperty('currentStep');
        expect(plan).toHaveProperty('totalSteps');
        expect(plan.input).toBe(input);
        expect(Array.isArray(plan.steps)).toBe(true);
        expect(typeof plan.currentStep).toBe('number');
        expect(typeof plan.totalSteps).toBe('number');
        expect(plan.currentStep).toBe(0);
        expect(plan.totalSteps).toBe(plan.steps.length);
    });

    it('each step has id, description, and status pending', async () => {
        // Arrange
        const decomposer = createDecomposer();

        // Act
        const plan: AgentPlan = await decomposer.decompose('explain AI', 'id-nl');

        // Assert
        for (const step of plan.steps) {
            expect(step).toHaveProperty('id');
            expect(typeof step.id).toBe('string');
            expect(step.id.length).toBeGreaterThan(0);
            expect(step).toHaveProperty('description');
            expect(typeof step.description).toBe('string');
            expect(step.description.length).toBeGreaterThan(0);
            expect(step).toHaveProperty('status');
            expect(step.status).toBe('pending');
        }
    });

    it('step IDs are unique within a plan', async () => {
        // Arrange
        const decomposer = createDecomposer();
        const input = 'vertaal hallo en vat samen de tekst';

        // Act
        const plan: AgentPlan = await decomposer.decompose(input, 'id-nl');

        // Assert — multi-step plan must have unique IDs
        expect(plan.steps.length).toBeGreaterThan(1);
        expect(allIdsUnique(plan.steps)).toBe(true);
    });
});
