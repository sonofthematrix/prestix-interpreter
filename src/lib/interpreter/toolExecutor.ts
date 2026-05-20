import type { ToolResult } from './types';
import { toolRegistry } from './toolRegistry';

/** Dispatches tool calls to registered tools and normalizes results. */
export class ToolExecutor {
    constructor(private registry: typeof toolRegistry) {}

    /** Execute a tool by name with the given parameters. */
    async execute(toolName: string, params: Record<string, unknown>): Promise<ToolResult> {
        const tool = this.registry.get(toolName);
        if (!tool) {
            return { success: false, output: '', error: `Tool '${toolName}' not found` };
        }

        try {
            const result = await tool.execute(params);
            return result;
        } catch (err) {
            return {
                success: false,
                output: '',
                error: err instanceof Error ? err.message : 'Tool execution failed',
            };
        }
    }

    /** Return the names of all registered tools. */
    listAvailable(): string[] {
        return this.registry.list().map((t) => t.name);
    }
}

/** Singleton executor wired to the default tool registry. */
export const toolExecutor = new ToolExecutor(toolRegistry);
