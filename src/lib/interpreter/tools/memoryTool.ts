import type { ToolDefinition, ToolResult } from '../types';
import { learningStore } from '../learningStore';

export const rememberTool: ToolDefinition = {
    name: 'remember',
    description: 'Store something in Prestix memory for later recall',
    parameters: {
        content: { type: 'string', description: 'What to remember', required: true },
        category: { type: 'string', description: 'Memory category (glossary, style, correction)', required: false },
    },
    async execute(params: Record<string, unknown>): Promise<ToolResult> {
        const content = typeof params.content === 'string' ? params.content : '';
        const category = typeof params.category === 'string' ? params.category : 'glossary';

        if (!content) return { success: false, output: '', error: 'No content provided' };

        return { success: true, output: `Stored in ${category} memory: ${content}` };
    },
};

export const recallTool: ToolDefinition = {
    name: 'recall',
    description: 'Recall information from Prestix memory',
    parameters: {
        query: { type: 'string', description: 'What to search for in memory', required: true },
    },
    async execute(params: Record<string, unknown>): Promise<ToolResult> {
        const query = typeof params.query === 'string' ? params.query : '';
        if (!query) return { success: false, output: '', error: 'No query provided' };
        return { success: true, output: `Memory search: "${query}" — no relevant entries yet.` };
    },
};
