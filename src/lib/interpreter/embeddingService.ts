/**
 * Embedding service — generates 384-dim vectors via OpenAI text-embedding-3-small.
 * Used by VectorLearningStore for semantic similarity search via pgvector.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 384;
const EMBEDDING_ENDPOINT = 'https://api.openai.com/v1/embeddings';

interface EmbeddingResponse {
    data: { embedding: number[] }[];
}

/** Simple in-memory cache to avoid re-embedding identical text. */
const cache = new Map<string, number[]>();
const MAX_CACHE_SIZE = 2000;

/**
 * Generate a 384-dim embedding vector for the given text.
 * Returns null if OpenAI is not configured or the call fails.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
    if (!text || !OPENAI_API_KEY) return null;

    const key = text.slice(0, 500);
    const cached = cache.get(key);
    if (cached) return cached;

    try {
        const response = await fetch(EMBEDDING_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: EMBEDDING_MODEL,
                input: text.slice(0, 8191), // OpenAI token limit
                dimensions: EMBEDDING_DIMENSIONS,
            }),
        });

        if (!response.ok) return null;

        const json = (await response.json()) as EmbeddingResponse;
        const embedding = json.data?.[0]?.embedding;
        if (!embedding || embedding.length !== EMBEDDING_DIMENSIONS) return null;

        // Cache management
        if (cache.size >= MAX_CACHE_SIZE) {
            const firstKey = cache.keys().next().value;
            if (firstKey) cache.delete(firstKey);
        }
        cache.set(key, embedding);

        return embedding;
    } catch {
        return null;
    }
}

/**
 * Create the pgvector-compatible string representation of an embedding.
 * Format: '[0.1,0.2,0.3,...]'
 */
export function embeddingToSql(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
}

/**
 * Compute cosine similarity between two vectors in JS.
 * Used as fallback when pgvector operator is unavailable.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dot / denominator;
}
