import type { ToolDefinition } from './types';

export class ToolRegistry {
    private tools: Map<string, ToolDefinition> = new Map();

    register(tool: ToolDefinition): void {
        this.tools.set(tool.name, tool);
    }

    get(name: string): ToolDefinition | undefined {
        return this.tools.get(name);
    }

    list(): ToolDefinition[] {
        return Array.from(this.tools.values());
    }

    has(name: string): boolean {
        return this.tools.has(name);
    }

    /** Returns formatted descriptions for prompt injection */
    getAllDescriptions(): string {
        const descriptions: string[] = [];
        for (const tool of this.list()) {
            const params = Object.entries(tool.parameters)
                .map(
                    ([key, param]) =>
                        `${key}: ${param.type}${param.required ? ' (required)' : ' (optional)'} — ${param.description}`,
                )
                .join(', ');
            descriptions.push(`- ${tool.name}: ${tool.description}${params ? ` [${params}]` : ''}`);
        }
        return descriptions.join('\n');
    }
}

export const toolRegistry = new ToolRegistry();
