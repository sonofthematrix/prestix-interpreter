import type { ProactiveSuggestion } from './types';

export type ProactiveContext = {
    recentInputs: string[];
    learningContext: string;
    timeOfDay: string;
};

export class ProactiveEngine {
    private suggestionHistory: ProactiveSuggestion[] = [];

    async generateSuggestions(context: ProactiveContext): Promise<ProactiveSuggestion[]> {
        const suggestions: ProactiveSuggestion[] = [];

        // Time-based suggestions
        const hour = parseInt(context.timeOfDay.split(':')[0] || '0', 10);
        if (hour >= 6 && hour < 10) {
            suggestions.push({
                id: this.generateId(),
                text: 'Good morning! Need help with anything today?',
                confidence: 0.6,
                source: 'context',
            });
        }

        // Learning-based suggestions
        if (context.learningContext && context.learningContext.length > 10) {
            suggestions.push({
                id: this.generateId(),
                text: 'I\'ve been learning from our conversations. Want to review what I\'ve picked up?',
                confidence: 0.5,
                source: 'learning',
            });
        }

        // History-based suggestions
        if (context.recentInputs.length > 5) {
            const lastInput = context.recentInputs[context.recentInputs.length - 1] || '';
            if (lastInput.includes('translate') || lastInput.includes('vertaal')) {
                suggestions.push({
                    id: this.generateId(),
                    text: 'I can help translate more phrases if you need.',
                    confidence: 0.65,
                    source: 'history',
                });
            }
        }

        return suggestions;
    }

    addToHistory(suggestion: ProactiveSuggestion): void {
        this.suggestionHistory.push(suggestion);
        if (this.suggestionHistory.length > 50) {
            this.suggestionHistory.shift();
        }
    }

    getHistory(): ProactiveSuggestion[] {
        return [...this.suggestionHistory];
    }

    private generateId(): string {
        return `pro_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    }
}

export const proactiveEngine = new ProactiveEngine();
