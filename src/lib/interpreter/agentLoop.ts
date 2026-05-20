import type { AgentObservation, AgentPlan, AgentResult, AgentStep, ChatMessage, InterpreterMode } from './types';
import { taskDecomposer } from './taskDecomposer';

export type AgentLoopState = {
    plan: AgentPlan;
    completedSteps: AgentStep[];
    status: 'planning' | 'executing' | 'completed' | 'failed';
};

export type StepExecutor = (step: AgentStep, plan: AgentPlan) => Promise<{ output: string; error?: string }>;

export class AgentLoop {
    private state: AgentLoopState = {
        plan: { input: '', steps: [], currentStep: 0, totalSteps: 0 },
        completedSteps: [],
        status: 'planning',
    };

    async execute(
        input: string,
        mode: InterpreterMode,
        executor?: StepExecutor,
    ): Promise<AgentResult> {
        // Step 1: Decompose input into execution plan
        this.state.status = 'planning';
        this.state.plan = await taskDecomposer.decompose(input, mode);

        if (this.state.plan.steps.length === 0) {
            this.state.status = 'failed';
            return {
                plan: this.state.plan,
                finalOutput: '',
                completedSteps: [],
            };
        }

        // Step 2: Execute each step sequentially
        this.state.status = 'executing';
        const completedSteps: AgentStep[] = [];

        for (let i = 0; i < this.state.plan.steps.length; i++) {
            const step = { ...this.state.plan.steps[i] };
            step.status = 'running';
            this.state.plan.currentStep = i;
            this.state.plan.steps[i] = step;

            try {
                if (executor) {
                    // Phase A: use provided executor for tool integration
                    const result = await executor(step, this.state.plan);
                    step.result = result.output;
                    step.error = result.error;
                    step.status = result.error ? 'failed' : 'completed';
                } else {
                    // Phase B: no executor yet, mark all as completed with description
                    step.result = step.description;
                    step.status = 'completed';
                }
            } catch (err) {
                step.status = 'failed';
                step.error = err instanceof Error ? err.message : 'Unknown error';
            }

            completedSteps.push({ ...step });
            this.state.completedSteps.push({ ...step });
        }

        // Step 3: Build final output from completed steps
        this.state.status = 'completed';
        const finalOutput = completedSteps
            .filter((s) => s.status === 'completed')
            .map((s) => s.result || s.description)
            .join('\n\n');

        return {
            plan: this.state.plan,
            finalOutput,
            completedSteps,
        };
    }

    private observations: AgentObservation[] = [];

    recordObservation(obs: AgentObservation): void {
        this.observations.push(obs);
    }

    getObservations(): AgentObservation[] {
        return [...this.observations];
    }

    getState(): AgentLoopState {
        return { ...this.state };
    }

    reset(): void {
        this.state = {
            plan: { input: '', steps: [], currentStep: 0, totalSteps: 0 },
            completedSteps: [],
            status: 'planning',
        };
        this.observations = [];
    }
}

export const agentLoop = new AgentLoop();
