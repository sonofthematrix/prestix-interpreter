import { describe, expect, it, beforeEach, vi } from 'vitest';
import { ToolExecutor } from './toolExecutor';
import { ToolRegistry } from './toolRegistry';
import type { ToolDefinition, ToolResult } from './types';

describe('ToolExecutor', () => {
    let registry: ToolRegistry;
    let executor: ToolExecutor;

    beforeEach(() => {
        registry = new ToolRegistry();
        executor = new ToolExecutor(registry);
    });

    // ── Helper ───────────────────────────────────────────────────────────

    function registerTool(name: string, execute: ToolDefinition['execute']): void {
        registry.register({
            name,
            description: `Tool ${name}`,
            parameters: {},
            execute,
        });
    }

    // ── Positive: execute() calls tool and returns result ────────────────

    it('execute() calls the registered tool and returns its result', async () => {
        // Arrange
        registerTool('greet', async (_params) => ({ success: true, output: 'Hello!' }));

        // Act
        const result = await executor.execute('greet', {});

        // Assert
        expect(result.success).toBe(true);
        expect(result.output).toBe('Hello!');
    });

    // ── Positive: execute() passes params to the tool ────────────────────

    it('execute() forwards parameters to the tool', async () => {
        // Arrange
        const spy = vi.fn(async (_params) => ({ success: true, output: 'ok' }));
        registerTool('echo', spy);

        // Act
        await executor.execute('echo', { message: 'hi' });

        // Assert
        expect(spy).toHaveBeenCalledWith({ message: 'hi' });
    });

    // ── Negative: execute() for non-existent tool ────────────────────────

    it('execute() returns an error result for a non-existent tool', async () => {
        // Arrange — registry is empty

        // Act
        const result = await executor.execute('ghost', {});

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toContain('ghost');
        expect(result.output).toBe('');
    });

    // ── Negative: execute() catches tool errors gracefully ────────────────

    it('execute() catches tool-thrown errors and returns a failure result', async () => {
        // Arrange
        registerTool('explode', async () => {
            throw new Error('BOOM');
        });

        // Act
        const result = await executor.execute('explode', {});

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('BOOM');
        expect(result.output).toBe('');
    });

    // ── Negative: execute() handles non-Error throws ─────────────────────

    it('execute() returns a generic message when the tool throws a non-Error value', async () => {
        // Arrange
        registerTool('bad', async () => {
            throw 'raw string error'; // eslint-disable-line no-throw-literal
        });

        // Act
        const result = await executor.execute('bad', {});

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('Tool execution failed');
    });

    // ── Positive: listAvailable() ────────────────────────────────────────

    it('listAvailable() returns the names of all registered tools', () => {
        // Arrange
        registerTool('translate', async () => ({ success: true, output: '' }));
        registerTool('remember', async () => ({ success: true, output: '' }));
        registerTool('recall', async () => ({ success: true, output: '' }));

        // Act
        const names = executor.listAvailable();

        // Assert
        expect(names).toEqual(['translate', 'remember', 'recall']);
    });

    // ── Negative: listAvailable() with empty registry ────────────────────

    it('listAvailable() returns an empty array when no tools are registered', () => {
        // Arrange — registry is empty

        // Act
        const names = executor.listAvailable();

        // Assert
        expect(names).toEqual([]);
    });

    // ── Constructor: accepts custom registry ─────────────────────────────

    it('constructor accepts a custom registry and operates on it', async () => {
        // Arrange
        const customRegistry = new ToolRegistry();
        customRegistry.register({
            name: 'custom',
            description: 'Custom tool',
            parameters: {},
            execute: async () => ({ success: true, output: 'custom result' }),
        });
        const customExecutor = new ToolExecutor(customRegistry);

        // Act
        const result = await customExecutor.execute('custom', {});

        // Assert
        expect(result.success).toBe(true);
        expect(result.output).toBe('custom result');
    });
});
