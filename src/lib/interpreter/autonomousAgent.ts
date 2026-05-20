import type {
    AgentObservation,
    AgentPlan,
    AgentState,
    AgentStep,
    AutonomousResult,
    InterpreterMode,
    ProactiveSuggestion,
    ToolResult,
} from './types';
import { agentLoop } from './agentLoop';
import { taskDecomposer } from './taskDecomposer';
import { toolExecutor } from './toolExecutor';
import { toolRegistry } from './toolRegistry';
import { proactiveEngine } from './proactiveEngine';

/**
 * Full autonomous agent: plan → execute → observe → adjust loop.
 * Extends the basic agent loop with observation tracking, plan adjustment, and proactive suggestions.
 */
export class AutonomousAgent {
    private state: AgentState = 'idle';
    private currentPlan: AgentPlan | null = null;
    private observations: AgentObservation[] = [];
    private maxIterations = 10; // safety limit to prevent infinite loops

    /**
     * Run the full autonomous loop:
     *   1. Plan — decompose input into executable steps
     *   2. For each step: execute → observe → adjust if needed
     *   3. Generate proactive suggestions
     */
    async run(input: string, mode: InterpreterMode): Promise<AutonomousResult> {
        this.state = 'planning';
        this.observations = [];
        let iterations = 0;

        // Phase 1: Plan
        this.currentPlan = await this.plan(input, mode);

        if (this.currentPlan.steps.length === 0) {
            this.state = 'failed';
            return {
                plan: this.currentPlan,
                observations: [],
                finalOutput: '',
                suggestions: [],
            };
        }

        // Phase 2: Execute → Observe → Adjust loop
        this.state = 'executing';
        let stepIndex = 0;

        while (stepIndex < this.currentPlan.steps.length && iterations < this.maxIterations) {
            const step = { ...this.currentPlan.steps[stepIndex] };
            step.status = 'running';
            this.currentPlan.currentStep = stepIndex;
            this.currentPlan.steps[stepIndex] = step;

            // Execute current step
            const result = await this.executeStep(step);
            step.result = result.output;
            step.error = result.error;
            step.status = result.success ? 'completed' : 'failed';
            this.currentPlan.steps[stepIndex] = step;

            // Observe the outcome
            this.state = 'observing';
            const observation = await this.observe(step, result);
            this.observations.push(observation);

            // Adjust plan if needed
            if (observation.needsAdjustment && observation.adjustment) {
                this.state = 'adjusting';
                this.currentPlan = await this.adjust(observation);
                // Continue from the same index — the failed step has been reset to pending
                iterations++;
                continue;
            }

            stepIndex++;
            iterations++;
        }

        // Phase 3: Build final output and suggestions
        this.state = 'completed';

        const finalOutput = this.currentPlan.steps
            .filter((s) => s.status === 'completed')
            .map((s) => s.result || s.description)
            .join('\n\n');

        const suggestions = await this.generateSuggestions(this.observations, input);

        return {
            plan: this.currentPlan,
            observations: this.observations,
            finalOutput,
            suggestions,
        };
    }

    /** Decompose input into an execution plan. Uses keyword-based decomposer (Phase C MVP). */
    private async plan(input: string, mode: InterpreterMode): Promise<AgentPlan> {
        return taskDecomposer.decompose(input, mode);
    }

    /** Execute a single step using the tool registry or fall back to description passthrough. */
    private async executeStep(step: AgentStep): Promise<ToolResult> {
        if (step.tool && toolRegistry.has(step.tool)) {
            return toolExecutor.execute(step.tool, {
                text: step.description,
                input: step.description,
                query: step.description,
            });
        }

        // Non-tool step — the description is the output (Phase B behavior)
        return { success: true, output: step.description };
    }

    /** Assess a step result and produce an observation with adjustment flags. */
    private async observe(step: AgentStep, result: ToolResult): Promise<AgentObservation> {
        const needsAdjustment = !result.success && Boolean(result.error);
        const observation: AgentObservation = {
            stepResult: result,
            assessment: result.success
                ? `Step "${step.description}" completed successfully`
                : `Step "${step.description}" failed: ${result.error || 'unknown error'}`,
            needsAdjustment,
        };

        if (needsAdjustment) {
            observation.adjustment = `Retry step with modified parameters: "${step.description}" (error: ${result.error})`;
        }

        return observation;
    }

    /** Modify the plan based on an observation that indicated adjustment is needed. */
    private async adjust(observation: AgentObservation): Promise<AgentPlan> {
        if (!this.currentPlan) {
            return { input: '', steps: [], currentStep: 0, totalSteps: 0 };
        }

        // Reset failed steps to pending with error context for retry
        const adjustedSteps = this.currentPlan.steps.map((s) => {
            if (s.status === 'failed') {
                return {
                    ...s,
                    status: 'pending' as const,
                    error: undefined,
                    description: `${s.description} (previous error: ${observation.stepResult.error})`,
                };
            }
            return s;
        });

        return {
            ...this.currentPlan,
            steps: adjustedSteps,
            currentStep: this.currentPlan.currentStep,
            totalSteps: adjustedSteps.length,
        };
    }

    /** Generate proactive suggestions from observations and proactive engine context. */
    private async generateSuggestions(
        observations: AgentObservation[],
        input: string,
    ): Promise<ProactiveSuggestion[]> {
        const suggestions: ProactiveSuggestion[] = [];

        // Suggestions derived from observations that needed adjustment
        for (const obs of observations) {
            if (obs.needsAdjustment && obs.adjustment) {
                suggestions.push({
                    id: `sug_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
                    text: obs.adjustment,
                    confidence: 0.7,
                    source: 'context',
                });
            }
        }

        // Also query the proactive engine for context-based suggestions
        try {
            const engineSuggestions = await proactiveEngine.generateSuggestions({
                recentInputs: [input],
                learningContext: '',
                timeOfDay: new Date().toLocaleTimeString('en-GB'),
            });
            suggestions.push(...engineSuggestions);
        } catch {
            // Proactive engine is optional — skip if unavailable
        }

        return suggestions;
    }

    getState(): AgentState {
        return this.state;
    }

    getObservations(): AgentObservation[] {
        return [...this.observations];
    }

    reset(): void {
        this.state = 'idle';
        this.currentPlan = null;
        this.observations = [];
        agentLoop.reset();
    }
}

/** Singleton autonomous agent instance. */
export const autonomousAgent = new AutonomousAgent();
