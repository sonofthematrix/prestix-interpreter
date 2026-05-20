/**
 * Migrate existing learning entries from data/interpreter-learning.json
 * into PostgreSQL learning_memories table with 384-dim embeddings.
 *
 * Usage: npx tsx scripts/migrate-learning-to-db.ts
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import 'dotenv/config';

const LEARNING_PATH = path.join(process.cwd(), 'data', 'interpreter-learning.json');

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set. Cannot migrate.');
    process.exit(1);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
    console.warn('⚠ OPENAI_API_KEY not set — embeddings will be NULL (vector search disabled until backfilled).');
}

async function generateEmbedding(text: string): Promise<number[] | null> {
    if (!OPENAI_API_KEY) return null;
    try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: text.slice(0, 8191),
                dimensions: 384,
            }),
        });
        if (!response.ok) return null;
        const json = (await response.json()) as { data: { embedding: number[] }[] };
        return json.data?.[0]?.embedding ?? null;
    } catch {
        return null;
    }
}

interface LegacyEntry {
    type: string;
    mode: string;
    term?: string;
    meaning?: string;
    sourceText?: string;
    wrongOutput?: string;
    correctedOutput?: string;
    rule?: string;
    note?: string;
    createdAt?: string;
}

async function main() {
    const raw = await readFile(LEARNING_PATH, 'utf8');
    const data = JSON.parse(raw);
    const items: LegacyEntry[] = data.items ?? [];

    if (items.length === 0) {
        console.log('No items to migrate.');
        return;
    }

    console.log(`Found ${items.length} entries to migrate.`);

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 3,
    });

    // Clear existing non-seeded data
    await pool.query('DELETE FROM learning_memories');

    let migrated = 0;
    let withEmbeddings = 0;
    let skipped = 0;

    for (const item of items) {
        if (!['correction', 'glossary', 'style'].includes(item.type)) {
            skipped++;
            continue;
        }

        const id = crypto.randomUUID();
        const createdAt = item.createdAt ?? new Date().toISOString();

        // Generate embedding from the most semantically relevant text
        const embeddingText = [
            item.term,
            item.meaning,
            item.sourceText,
            item.correctedOutput,
        ]
            .filter(Boolean)
            .join(' ');

        const embedding = embeddingText ? await generateEmbedding(embeddingText) : null;

        try {
            if (embedding) {
                const vecLiteral = `'[${embedding.join(',')}]'::vector`;
                await pool.query(
                    `INSERT INTO learning_memories (id, type, mode, term, meaning, "sourceText", "wrongOutput", "correctedOutput", rule, note, embedding_vec, "createdAt")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ${vecLiteral}, $11)`,
                    [
                        id,
                        item.type,
                        item.mode,
                        item.term ?? null,
                        item.meaning ?? null,
                        item.sourceText ?? null,
                        item.wrongOutput ?? null,
                        item.correctedOutput ?? null,
                        item.rule ?? null,
                        item.note ?? null,
                        createdAt,
                    ],
                );
                withEmbeddings++;
            } else {
                await pool.query(
                    `INSERT INTO learning_memories (id, type, mode, term, meaning, "sourceText", "wrongOutput", "correctedOutput", rule, note, "createdAt")
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        id,
                        item.type,
                        item.mode,
                        item.term ?? null,
                        item.meaning ?? null,
                        item.sourceText ?? null,
                        item.wrongOutput ?? null,
                        item.correctedOutput ?? null,
                        item.rule ?? null,
                        item.note ?? null,
                        createdAt,
                    ],
                );
            }
            migrated++;

            if (migrated % 10 === 0) {
                console.log(`  Migrated ${migrated}/${items.length}...`);
            }
        } catch (err) {
            console.error(`  Failed to migrate entry: ${(err as Error).message}`);
        }
    }

    await pool.end();

    console.log(`\nDone. Migrated: ${migrated} | With embeddings: ${withEmbeddings} | Skipped: ${skipped}`);
}

main().catch(console.error);
