import type { AgentPlan, AgentStep, InterpreterMode } from './types';

// Simple keyword-based decomposition (Phase B MVP)
// Future: LLM-based decomposition

function generateStepId(): string {
    return `step_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const DECOMPOSITION_PATTERNS: Array<{ pattern: RegExp; steps: string[] }> = [
    // "translate X and summarize Y" → 2 steps
    { pattern: /(?:vertaal|translate)\s+(.+?)\s+(?:en|and)\s+(?:vat samen|summarize)\s+(.+)/i, steps: ['translate', 'summarize'] },
    // "search X and translate Y" → 2 steps  
    { pattern: /(?:zoek|search)\s+(.+?)\s+(?:en|and)\s+(?:vertaal|translate)\s+(.+)/i, steps: ['search', 'translate'] },
    // "explain X then translate Y" → 2 steps
    { pattern: /(?:leg uit|explain)\s+(.+?)\s+(?:dan|then)\s+(?:vertaal|translate)\s+(.+)/i, steps: ['explain', 'translate'] },
    // "first X then Y" → detect split
    { pattern: /(?:eerst|first)\s+(.+?)\s+(?:dan|then)\s+(.+)/i, steps: ['search_or_explain', 'translate_or_summarize'] },
];

function tryDecompose(input: string): { descriptions: string[]; tools: string[] } | null {
    for (const { pattern, steps } of DECOMPOSITION_PATTERNS) {
        const match = input.match(pattern);
        if (match) {
            const descriptions: string[] = [];
            const tools: string[] = [];
            for (let i = 0; i < steps.length; i++) {
                descriptions.push(`${steps[i]}: ${match[i + 1]?.trim() || match[1]?.trim() || ''}`);
                tools.push(steps[i] === 'search_or_explain' ? 'search' : steps[i] === 'translate_or_summarize' ? 'translate' : steps[i]);
            }
            return { descriptions, tools };
        }
    }
    return null;
}

export class TaskDecomposer {
    async decompose(input: string, _mode: InterpreterMode): Promise<AgentPlan> {
        // Handle empty/whitespace input
        const trimmed = input.trim();
        if (!trimmed) {
            return {
                input,
                steps: [],
                currentStep: 0,
                totalSteps: 0,
            };
        }

        const decomposition = tryDecompose(trimmed);
        
        let steps: AgentStep[];
        
        if (decomposition) {
            steps = decomposition.descriptions.map((desc, i) => ({
                id: generateStepId(),
                description: desc,
                tool: decomposition.tools[i] || undefined,
                status: 'pending' as const,
            }));
        } else {
            // Single step — no decomposition needed
            steps = [{
                id: generateStepId(),
                description: trimmed,
                status: 'pending' as const,
            }];
        }
        
        return {
            input: trimmed,
            steps,
            currentStep: 0,
            totalSteps: steps.length,
        };
    }
}

export const taskDecomposer = new TaskDecomposer();
