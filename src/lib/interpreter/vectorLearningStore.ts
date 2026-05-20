/**
 * VectorLearningStore — database-backed learning store with 4-layer retrieval.
 *
 * Layers:
 *   1. Exact term match     — exact word match in glossary (highest priority)
 *   2. Vector similarity    — cosine similarity via pgvector (<=> operator)
 *   3. Token-based relevance — word overlap scoring (fallback, current behavior)
 *   4. Correction memory    — semantic similarity on correction source text
 *
 * Falls back to JsonLearningStore if DATABASE_URL is not set.
 */

import type {
    AmbientMemory,
    ConfidenceScore,
    ConversationMemory,
    CorrectionMemory,
    GlossaryMemory,
    InterpreterMode,
    LearningContext,
    LearningEntry,
    LearningFeedback,
    LearningStore,
    LearningType,
    SlangDetection,
    StyleMemory,
    SuggestedLearning,
} from './types';


import { generateEmbedding, embeddingToSql, cosineSimilarity } from './embeddingService';

import { Pool } from 'pg';

const MAX_CONTEXT_CORRECTIONS = 5;
const MAX_CONTEXT_GLOSSARY = 10;
const MAX_CONTEXT_STYLE = 6;
const MAX_ITEMS = 500;
const VECTOR_SIMILARITY_THRESHOLD = 0.35;

// ── Token utilities (duplicated here to keep store self-contained) ──

function tokenize(text: string): Set<string> {
    return new Set(
        text
            .toLowerCase()
            .split(/[^\p{L}\p{N}']+/u)
            .filter((token) => token.length >= 2),
    );
}

function containsTerm(text: string, term: string): boolean {
    return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

function relevanceScore(inputTokens: Set<string>, text: string): number {
    const memoryTokens = tokenize(text);
    let score = 0;
    for (const token of inputTokens) {
        if (memoryTokens.has(token)) score += 1;
    }
    return score;
}

function uniqueTypes(items: LearningEntry[]): LearningType[] {
    return Array.from(new Set(items.map((item) => item.type)));
}

function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Row type from DB ──

interface LearningMemoryRow {
    id: string;
    type: string;
    mode: string;
    term: string | null;
    meaning: string | null;
    sourceText: string | null;
    wrongOutput: string | null;
    correctedOutput: string | null;
    rule: string | null;
    note: string | null;
    createdAt: string;
    embedding_vec: number[] | null;
}

// ── Mappers ──

function rowToCorrection(row: LearningMemoryRow): CorrectionMemory {
    return {
        type: 'correction',
        sourceText: row.sourceText ?? '',
        wrongOutput: row.wrongOutput ?? '',
        correctedOutput: row.correctedOutput ?? '',
        mode: row.mode as InterpreterMode,
        note: row.note ?? undefined,
        createdAt: new Date(row.createdAt).toISOString(),
    };
}

function rowToGlossary(row: LearningMemoryRow): GlossaryMemory {
    return {
        type: 'glossary',
        term: row.term ?? '',
        meaning: row.meaning ?? '',
        mode: row.mode as InterpreterMode,
        createdAt: new Date(row.createdAt).toISOString(),
    };
}

function rowToStyle(row: LearningMemoryRow): StyleMemory {
    return {
        type: 'style',
        rule: row.rule ?? '',
        mode: row.mode as InterpreterMode,
        createdAt: new Date(row.createdAt).toISOString(),
    };
}

export class VectorLearningStore implements LearningStore {
    private pool: Pool | null = null;
    private _fallback: any = null;

    private get fallback(): any {
        if (!this._fallback) {
            // Lazy require to break circular dependency with learningStore.ts
            const { JsonLearningStore } = require('./learningStore');
            this._fallback = new JsonLearningStore();
        }
        return this._fallback;
    }

    constructor() {}

    private getPool(): Pool | null {
        if (this.pool) return this.pool;
        if (!process.env.DATABASE_URL) return null;

        try {
            this.pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000,
            });
            return this.pool;
        } catch {
            return null;
        }
    }

    private async query(sql: string, params?: unknown[]): Promise<LearningMemoryRow[]> {
        const pool = this.getPool();
        if (!pool) return [];
        const result = await pool.query(sql, params);
        return result.rows as LearningMemoryRow[];
    }

    // ═══════════════════════════════════════════════════════
    //  listRelevant — 4-layer retrieval
    // ═══════════════════════════════════════════════════════

    async listRelevant(input: string, mode: InterpreterMode): Promise<LearningContext> {
        const pool = this.getPool();
        if (!pool) return this.fallback.listRelevant(input, mode);

        const inputTokens = tokenize(input);
        const inputEmbedding = await generateEmbedding(input);

        // ── Layer 1: Exact term match (via SQL ILIKE) ──
        let exactGlossaryRows: LearningMemoryRow[] = [];
        if (inputTokens.size > 0) {
            const termConditions = Array.from(inputTokens)
                .map((_, i) => `term ILIKE $${i + 3}`)
                .join(' OR ');
            const termParams = Array.from(inputTokens).map((t) => `%${t}%`);
            exactGlossaryRows = await this.query(
                `SELECT * FROM learning_memories
                 WHERE type = 'glossary' AND mode = $1 AND (${termConditions})
                 LIMIT $2`,
                [mode, MAX_CONTEXT_GLOSSARY, ...termParams],
            );
        }

        // ── Layer 2: Vector semantic similarity ──
        let vectorRows: LearningMemoryRow[] = [];
        if (inputEmbedding) {
            const vecLiteral = `'${embeddingToSql(inputEmbedding)}'::vector`;
            vectorRows = await this.query(
                `SELECT *, embedding_vec <=> ${vecLiteral} AS _distance
                 FROM learning_memories
                 WHERE type IN ('glossary', 'correction')
                   AND mode = $1
                   AND embedding_vec IS NOT NULL
                 ORDER BY embedding_vec <=> ${vecLiteral}
                 LIMIT $2`,
                [mode, MAX_CONTEXT_GLOSSARY + MAX_CONTEXT_CORRECTIONS],
            );
        }

        // ── Layer 3: Token-based relevance (DB-backed) ──
        const allRows = await this.query(
            `SELECT * FROM learning_memories
             WHERE mode = $1
             ORDER BY "createdAt" DESC
             LIMIT $2`,
            [mode, MAX_ITEMS],
        );

        // ── Combine layers ──

        // Track seen IDs to avoid duplicates across layers
        const seenIds = new Set<string>();

        // Layer 1 glossary (exact match — highest priority)
        const exactGlossary: GlossaryMemory[] = [];
        for (const row of exactGlossaryRows) {
            if (!seenIds.has(row.id)) {
                seenIds.add(row.id);
                exactGlossary.push(rowToGlossary(row));
            }
        }

        // Layer 2 vector matches (split into glossary + corrections)
        const vectorGlossary: GlossaryMemory[] = [];
        const vectorCorrections: CorrectionMemory[] = [];
        for (const row of vectorRows) {
            if (seenIds.has(row.id)) continue;
            seenIds.add(row.id);
            if (row.type === 'glossary') {
                vectorGlossary.push(rowToGlossary(row));
            } else if (row.type === 'correction') {
                vectorCorrections.push(rowToCorrection(row));
            }
        }

        // Layer 3 token-based from remaining rows
        const tokenCorrections: CorrectionMemory[] = [];
        const tokenGlossary: GlossaryMemory[] = [];
        for (const row of allRows) {
            if (seenIds.has(row.id)) continue;
            const text = [row.term, row.meaning, row.sourceText, row.wrongOutput, row.rule]
                .filter(Boolean)
                .join(' ');
            const score = relevanceScore(inputTokens, text);
            if (score === 0) continue;
            seenIds.add(row.id);

            if (row.type === 'correction') {
                tokenCorrections.push(rowToCorrection(row));
            } else if (row.type === 'glossary') {
                tokenGlossary.push(rowToGlossary(row));
            }
        }

        // Layer 4: semantic similarity on corrections not yet matched
        let semanticCorrections: CorrectionMemory[] = [];
        if (inputEmbedding) {
            const remainingCorrections = allRows.filter(
                (r) => r.type === 'correction' && !seenIds.has(r.id) && r.embedding_vec,
            );
            const scored = remainingCorrections
                .map((row) => ({
                    correction: rowToCorrection(row),
                    score: row.embedding_vec
                        ? cosineSimilarity(inputEmbedding, row.embedding_vec)
                        : 0,
                }))
                .filter((e) => e.score >= VECTOR_SIMILARITY_THRESHOLD)
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_CONTEXT_CORRECTIONS);
            for (const entry of scored) seenIds.add(entry.correction.sourceText);
            semanticCorrections = scored.map((e) => e.correction);
        }

        // Merge corrections: vector first, then token, then semantic
        const relevantCorrections = [
            ...vectorCorrections,
            ...tokenCorrections,
            ...semanticCorrections,
        ].slice(0, MAX_CONTEXT_CORRECTIONS);

        // Merge glossary: exact first, then vector, then token
        const relevantGlossary = [
            ...exactGlossary,
            ...vectorGlossary,
            ...tokenGlossary,
        ].slice(0, MAX_CONTEXT_GLOSSARY);

        // Style: always include all matching style rules
        const relevantStyles: StyleMemory[] = allRows
            .filter((r) => r.type === 'style' && !seenIds.has(r.id))
            .slice(0, MAX_CONTEXT_STYLE)
            .map(rowToStyle);

        const matchedItems: LearningEntry[] = [
            ...relevantCorrections,
            ...relevantGlossary,
            ...relevantStyles,
        ];

        if (matchedItems.length === 0) {
            return { context: '', matchesCount: 0, typesUsed: [] };
        }

        const sections: string[] = [
            'Interpreter learning context. Apply only when relevant; learning corrections override general rules.',
        ];

        if (relevantCorrections.length > 0) {
            sections.push(
                'Correction memory:',
                ...relevantCorrections.map((correction, index) => {
                    const note = correction.note ? ` Note: ${correction.note}` : '';
                    return `${index + 1}. Source: ${correction.sourceText} | Avoid: ${correction.wrongOutput} | Prefer: ${correction.correctedOutput}.${note}`;
                }),
            );
        }

        if (relevantGlossary.length > 0) {
            sections.push(
                'Glossary memory:',
                ...relevantGlossary.map((glossary, index) => {
                    const examples = glossary.examples?.length
                        ? ` Examples: ${glossary.examples.join('; ')}.`
                        : '';
                    return `${index + 1}. ${glossary.term} = ${glossary.meaning}.${examples}`;
                }),
            );
        }

        if (relevantStyles.length > 0) {
            sections.push(
                'Style memory:',
                ...relevantStyles.map((style, index) => `${index + 1}. ${style.rule}`),
            );
        }

        return {
            context: sections.join('\n'),
            matchesCount: matchedItems.length,
            typesUsed: uniqueTypes(matchedItems),
        };
    }

    // ═══════════════════════════════════════════════════════
    //  addCorrection / addGlossary / addStyleRule
    // ═══════════════════════════════════════════════════════

    async addCorrection(
        correction: Omit<CorrectionMemory, 'type' | 'createdAt'>,
    ): Promise<CorrectionMemory> {
        const pool = this.getPool();
        if (!pool) return this.fallback.addCorrection(correction);

        const id = generateId();
        const now = new Date().toISOString();
        const embeddingText = `${correction.sourceText} ${correction.correctedOutput}`;
        const embedding = await generateEmbedding(embeddingText);
        const vecLiteral = embedding ? `'${embeddingToSql(embedding)}'::vector` : 'NULL';

        await pool.query(
            `INSERT INTO learning_memories (id, type, mode, "sourceText", "wrongOutput", "correctedOutput", note, embedding_vec, "createdAt")
             VALUES ($1, 'correction', $2, $3, $4, $5, $6, ${vecLiteral}, $7)`,
            [id, correction.mode, correction.sourceText, correction.wrongOutput, correction.correctedOutput, correction.note ?? null, now],
        );

        return {
            type: 'correction',
            sourceText: correction.sourceText,
            wrongOutput: correction.wrongOutput,
            correctedOutput: correction.correctedOutput,
            mode: correction.mode,
            note: correction.note,
            createdAt: now,
        };
    }

    async addGlossary(
        glossary: Omit<GlossaryMemory, 'type' | 'createdAt'>,
    ): Promise<GlossaryMemory> {
        const pool = this.getPool();
        if (!pool) return this.fallback.addGlossary(glossary);

        const id = generateId();
        const now = new Date().toISOString();
        const embeddingText = `${glossary.term} ${glossary.meaning}`;
        const embedding = await generateEmbedding(embeddingText);
        const vecLiteral = embedding ? `'${embeddingToSql(embedding)}'::vector` : 'NULL';

        await pool.query(
            `INSERT INTO learning_memories (id, type, mode, term, meaning, embedding_vec, "createdAt")
             VALUES ($1, 'glossary', $2, $3, $4, ${vecLiteral}, $5)`,
            [id, glossary.mode, glossary.term, glossary.meaning, now],
        );

        return {
            type: 'glossary',
            term: glossary.term,
            meaning: glossary.meaning,
            mode: glossary.mode,
            createdAt: now,
        };
    }

    async addStyleRule(style: Omit<StyleMemory, 'type' | 'createdAt'>): Promise<StyleMemory> {
        const pool = this.getPool();
        if (!pool) return this.fallback.addStyleRule(style);

        const id = generateId();
        const now = new Date().toISOString();

        await pool.query(
            `INSERT INTO learning_memories (id, type, mode, rule, "createdAt")
             VALUES ($1, 'style', $2, $3, $4)`,
            [id, style.mode, style.rule, now],
        );

        return { type: 'style', rule: style.rule, mode: style.mode, createdAt: now };
    }

    // ═══════════════════════════════════════════════════════
    //  Suggestions & ambient
    // ═══════════════════════════════════════════════════════

    async suggestMemory(
        input: string,
        output: string,
        mode: InterpreterMode,
    ): Promise<SuggestedLearning[]> {
        // Delegate to fallback for suggestion storage (simple enough for JSON)
        return this.fallback.suggestMemory(input, output, mode);
    }

    async autoCapture(feedback: LearningFeedback): Promise<void> {
        try {
            await this.addGlossary({
                term: feedback.input.slice(0, 200),
                meaning: feedback.output.slice(0, 500),
                mode: feedback.mode,
            });
        } catch {
            // Non-blocking
        }
    }

    async acceptAmbientEntry(entry: AmbientMemory): Promise<void> {
        if (entry.discarded || !entry.processed) return;

        for (const slang of entry.extractedSlang) {
            try {
                await this.addGlossary({
                    term: slang.word,
                    meaning: `Ambient-captured slang: "${slang.word}" (confidence: ${slang.confidence})`,
                    mode: 'nl-id' as InterpreterMode,
                });
            } catch {
                // Non-blocking
            }
        }
    }

    async listSuggestions(): Promise<SuggestedLearning[]> {
        return this.fallback.listSuggestions();
    }

    async confirmSuggestion(id: string): Promise<void> {
        // Complex — delegate to fallback for now
        return this.fallback.confirmSuggestion(id);
    }

    async rejectSuggestion(id: string): Promise<void> {
        return this.fallback.rejectSuggestion(id);
    }
}

/** Singleton — uses DB if DATABASE_URL is set, otherwise falls back to JSON file. */
export const vectorLearningStore = new VectorLearningStore();
