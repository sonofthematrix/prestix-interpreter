import { describe, expect, it, beforeEach } from 'vitest';
import { ToolRegistry, toolRegistry } from './toolRegistry';
import type { ToolDefinition } from './types';

function makeTool(name: string): ToolDefinition {
    return {
        name,
        description: `Tool ${name}`,
        parameters: {},
        execute: async () => ({ success: true, output: `${name} executed` }),
    };
}

describe('ToolRegistry', () => {
    let registry: ToolRegistry;

    beforeEach(() => {
        registry = new ToolRegistry();
    });

    // ── Positive: register + get ─────────────────────────────────────────

    it('register() adds a tool and get() retrieves it by name', () => {
        // Arrange
        const tool = makeTool('translate');

        // Act
        registry.register(tool);
        const retrieved = registry.get('translate');

        // Assert
        expect(retrieved).toBeDefined();
        expect(retrieved!.name).toBe('translate');
        expect(retrieved!.description).toBe('Tool translate');
    });

    // ── Negative: get() for non-existent tool ────────────────────────────

    it('get() returns undefined for a non-existent tool', () => {
        // Arrange — registry is empty

        // Act
        const result = registry.get('nonexistent');

        // Assert
        expect(result).toBeUndefined();
    });

    // ── has() positive ───────────────────────────────────────────────────

    it('has() returns true for a registered tool', () => {
        // Arrange
        registry.register(makeTool('translate'));

        // Act
        const exists = registry.has('translate');

        // Assert
        expect(exists).toBe(true);
    });

    // ── has() negative ───────────────────────────────────────────────────

    it('has() returns false for an unregistered tool', () => {
        // Arrange — registry is empty

        // Act
        const exists = registry.has('nonexistent');

        // Assert
        expect(exists).toBe(false);
    });

    // ── list() positive ──────────────────────────────────────────────────

    it('list() returns all registered tools', () => {
        // Arrange
        const toolA = makeTool('translate');
        const toolB = makeTool('remember');
        registry.register(toolA);
        registry.register(toolB);

        // Act
        const tools = registry.list();

        // Assert
        expect(tools).toHaveLength(2);
        expect(tools.map((t) => t.name)).toEqual(['translate', 'remember']);
    });

    // ── list() negative / edge ───────────────────────────────────────────

    it('list() returns an empty array when no tools are registered', () => {
        // Arrange — registry is empty

        // Act
        const tools = registry.list();

        // Assert
        expect(tools).toEqual([]);
    });

    // ── getAllDescriptions() positive ────────────────────────────────────

    it('getAllDescriptions() returns a formatted string with tool names and parameter details', () => {
        // Arrange
        const tool: ToolDefinition = {
            name: 'translate',
            description: 'Translate text',
            parameters: {
                text: { type: 'string', description: 'Text to translate', required: true },
                from: { type: 'string', description: 'Source language', required: false },
            },
            execute: async () => ({ success: true, output: '' }),
        };
        registry.register(tool);

        // Act
        const desc = registry.getAllDescriptions();

        // Assert
        expect(desc).toContain('translate');
        expect(desc).toContain('Translate text');
        expect(desc).toContain('text: string (required)');
        expect(desc).toContain('from: string (optional)');
    });

    // ── getAllDescriptions() negative / edge ─────────────────────────────

    it('getAllDescriptions() returns an empty string when no tools are registered', () => {
        // Arrange — registry is empty

        // Act
        const desc = registry.getAllDescriptions();

        // Assert
        expect(desc).toBe('');
    });

    // ── register() overwrites existing tool with same name ───────────────

    it('register() overwrites a previously registered tool with the same name', () => {
        // Arrange
        const toolV1 = makeTool('translate');
        toolV1.description = 'Version 1';
        const toolV2 = makeTool('translate');
        toolV2.description = 'Version 2';
        registry.register(toolV1);

        // Act
        registry.register(toolV2);
        const retrieved = registry.get('translate');

        // Assert
        expect(retrieved!.description).toBe('Version 2');
    });

    // ── singleton ────────────────────────────────────────────────────────

    it('the default export is a pre-constructed ToolRegistry singleton', () => {
        // Assert
        expect(toolRegistry).toBeInstanceOf(ToolRegistry);
    });
});
