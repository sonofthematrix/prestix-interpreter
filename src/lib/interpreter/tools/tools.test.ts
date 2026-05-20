import { describe, expect, it } from 'vitest';
import { translateTool } from './translateTool';
import { rememberTool, recallTool } from './memoryTool';

// ── translateTool ────────────────────────────────────────────────────────

describe('translateTool', () => {
    // ── Positive ─────────────────────────────────────────────────────────

    it('execute() with valid text returns success with formatted output', async () => {
        // Arrange
        const params = { text: 'Halo dunia', from: 'id', to: 'en' };

        // Act
        const result = await translateTool.execute(params);

        // Assert
        expect(result.success).toBe(true);
        expect(result.output).toContain('Halo dunia');
        expect(result.output).toContain('id→en');
    });

    // ── Negative ─────────────────────────────────────────────────────────

    it('execute() with empty text returns failure', async () => {
        // Arrange
        const params = { text: '', from: 'id', to: 'en' };

        // Act
        const result = await translateTool.execute(params);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No text provided');
    });

    // ── Negative: missing text key ───────────────────────────────────────

    it('execute() with missing text key returns failure', async () => {
        // Act
        const result = await translateTool.execute({ from: 'id', to: 'en' });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No text provided');
    });

    // ── Metadata ─────────────────────────────────────────────────────────

    it('has the correct name and description', () => {
        expect(translateTool.name).toBe('translate');
        expect(translateTool.description).toContain('Translate');
    });

    it('declares required parameters: text, from, to', () => {
        expect(translateTool.parameters.text).toEqual({
            type: 'string',
            description: 'Text to translate',
            required: true,
        });
        expect(translateTool.parameters.from).toEqual({
            type: 'string',
            description: 'Source language code',
            required: true,
        });
        expect(translateTool.parameters.to).toEqual({
            type: 'string',
            description: 'Target language code',
            required: true,
        });
    });
});

// ── rememberTool ─────────────────────────────────────────────────────────

describe('rememberTool', () => {
    // ── Positive ─────────────────────────────────────────────────────────

    it('execute() with content returns success', async () => {
        // Arrange
        const params = { content: 'Prestix is an interpreter', category: 'glossary' };

        // Act
        const result = await rememberTool.execute(params);

        // Assert
        expect(result.success).toBe(true);
        expect(result.output).toContain('Prestix is an interpreter');
        expect(result.output).toContain('glossary');
    });

    // ── Negative ─────────────────────────────────────────────────────────

    it('execute() with empty content returns failure', async () => {
        // Arrange
        const params = { content: '', category: 'glossary' };

        // Act
        const result = await rememberTool.execute(params);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No content provided');
    });

    // ── Negative: missing content key ────────────────────────────────────

    it('execute() with missing content key returns failure', async () => {
        // Act
        const result = await rememberTool.execute({ category: 'style' });

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No content provided');
    });

    // ── Default category ─────────────────────────────────────────────────

    it('execute() defaults category to "glossary" when not provided', async () => {
        // Arrange
        const params = { content: 'Some fact' };

        // Act
        const result = await rememberTool.execute(params);

        // Assert
        expect(result.success).toBe(true);
        expect(result.output).toContain('glossary');
    });

    // ── Metadata ─────────────────────────────────────────────────────────

    it('has the correct name and description', () => {
        expect(rememberTool.name).toBe('remember');
        expect(rememberTool.description).toContain('memory');
    });

    it('declares parameters: content (required) and category (optional)', () => {
        expect(rememberTool.parameters.content).toEqual({
            type: 'string',
            description: 'What to remember',
            required: true,
        });
        expect(rememberTool.parameters.category).toEqual({
            type: 'string',
            description: 'Memory category (glossary, style, correction)',
            required: false,
        });
    });
});

// ── recallTool ───────────────────────────────────────────────────────────

describe('recallTool', () => {
    // ── Positive ─────────────────────────────────────────────────────────

    it('execute() with query returns success', async () => {
        // Arrange
        const params = { query: 'Jakarta weather' };

        // Act
        const result = await recallTool.execute(params);

        // Assert
        expect(result.success).toBe(true);
        expect(result.output).toContain('Jakarta weather');
        expect(result.output).toContain('Memory search');
    });

    // ── Negative ─────────────────────────────────────────────────────────

    it('execute() with empty query returns failure', async () => {
        // Arrange
        const params = { query: '' };

        // Act
        const result = await recallTool.execute(params);

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No query provided');
    });

    // ── Negative: missing query key ──────────────────────────────────────

    it('execute() with missing query key returns failure', async () => {
        // Act
        const result = await recallTool.execute({});

        // Assert
        expect(result.success).toBe(false);
        expect(result.error).toBe('No query provided');
    });

    // ── Metadata ─────────────────────────────────────────────────────────

    it('has the correct name and description', () => {
        expect(recallTool.name).toBe('recall');
        expect(recallTool.description).toContain('memory');
    });

    it('declares query as required string parameter', () => {
        expect(recallTool.parameters.query).toEqual({
            type: 'string',
            description: 'What to search for in memory',
            required: true,
        });
    });
});
