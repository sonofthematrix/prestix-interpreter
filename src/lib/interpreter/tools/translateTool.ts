import type { ToolDefinition, ToolResult } from '../types';

export const translateTool: ToolDefinition = {
    name: 'translate',
    description: 'Translate text between languages (id, en, nl)',
    parameters: {
        text: { type: 'string', description: 'Text to translate', required: true },
        from: { type: 'string', description: 'Source language code', required: true },
        to: { type: 'string', description: 'Target language code', required: true },
    },
    async execute(params: Record<string, unknown>): Promise<ToolResult> {
        const text = typeof params.text === 'string' ? params.text : '';
        const from = typeof params.from === 'string' ? params.from : 'id';
        const to = typeof params.to === 'string' ? params.to : 'en';

        if (!text) return { success: false, output: '', error: 'No text provided' };

        // Phase A MVP: return structured response, actual translation via provider
        // When integrated with agentLoop executor, this gets delegated to the provider chain
        return {
            success: true,
            output: `[Translation requested: ${from}→${to}] ${text}`,
        };
    },
};
