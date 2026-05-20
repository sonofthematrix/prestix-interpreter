import type { AmbientMemory, ConfidenceScore, SlangDetection } from './types';
import { learningStore } from './learningStore';
import {
    INDONESIAN_MARKERS,
    ENGLISH_MARKERS,
    DUTCH_MARKERS,
    DYNAMIC_MARKERS,
} from './languageMarkers';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Split text into lowercased tokens of >= 2 chars, excluding pure numbers. */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^\p{L}\p{N}']+/u)
        .filter((t) => t.length >= 2)
        .filter((t) => !/^\d+$/.test(t));
}

/** Generate a unique ID for AmbientMemory entries. */
function generateId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

// ---------------------------------------------------------------------------
// AmbientListener
// ---------------------------------------------------------------------------

/**
 * Passive ambient listening engine.
 *
 * Captures transcript fragments (NEVER audio) while the user is speaking and
 * extracts unknown slang/pattern words that aren't recognized by any static
 * or dynamic language marker. Accumulated memories are flushed into the
 * learning store on demand via `flushMemory()`.
 *
 * Privacy-first: default OFF, transcripts are ephemeral, no audio storage.
 */
export class AmbientListener {
    /** Master on/off switch — privacy-first default off. */
    enabled: boolean = false;

    /** Temporary pause without clearing accumulated data. */
    paused: boolean = false;

    /** Last N transcript fragments for pattern detection (max 50). */
    recentTranscripts: string[] = [];

    /** Registered pattern-detection callbacks keyed by ID. */
    callbacks: Map<string, Function> = new Map();

    /** Accumulated AmbientMemory entries awaiting flush. */
    private memoryBuffer: AmbientMemory[] = [];

    /** Monotonic counter for callback registration keys. */
    private callbackCounter = 0;

    // -----------------------------------------------------------------------
    // Lifecycle
    // -----------------------------------------------------------------------

    /** Enable ambient listening. */
    start(): void {
        this.enabled = true;
    }

    /** Disable ambient listening and clear recent transcripts. */
    stop(): void {
        this.enabled = false;
        this.recentTranscripts = [];
    }

    /** Pause listening without resetting state. */
    pause(): void {
        this.paused = true;
    }

    /** Resume after a pause. */
    resume(): void {
        this.paused = false;
    }

    /** Whether the listener is actively collecting. */
    isActive(): boolean {
        return this.enabled && !this.paused;
    }

    // -----------------------------------------------------------------------
    // Transcript pipeline
    // -----------------------------------------------------------------------

    /**
     * Feed a speech transcript fragment into the listener.
     *
     * - Silently returns if the listener is not active.
     * - Accumulates in `recentTranscripts` (capped at 50).
     * - Extracts unknown slang words and creates an AmbientMemory
     *   entry if any are found.
     * - Fires all registered pattern-detection callbacks.
     */
    async feedTranscript(transcript: string): Promise<void> {
        if (!this.isActive()) return;

        // Keep the last 50 transcript fragments
        this.recentTranscripts.push(transcript);
        if (this.recentTranscripts.length > 50) {
            this.recentTranscripts = this.recentTranscripts.slice(-50);
        }

        // Extract unknown slang patterns
        const slang = this.extractSlangFromTranscript(transcript);

        // If interesting patterns are found, buffer a memory entry
        if (slang.length > 0) {
            const memory = this.buildAmbientMemory(transcript, slang);
            this.memoryBuffer.push(memory);

            // Notify registered callbacks
            const patterns = memory.extractedPatterns;
            for (const callback of this.callbacks.values()) {
                try {
                    callback(patterns);
                } catch {
                    // Non-blocking — one broken callback shouldn't break others
                }
            }
        }
    }

    /**
     * Tokenize the transcript and return every word that is NOT recognised
     * by any static or dynamic language marker, together with a best-effort
     * language guess.
     */
    extractSlangFromTranscript(transcript: string): SlangDetection[] {
        const tokens = Array.from(new Set(tokenize(transcript)));
        const detections: SlangDetection[] = [];

        // Build a unified set of every word the system already knows
        const known = this.getAllKnownWords();

        for (const token of tokens) {
            if (known.has(token)) continue;

            const language = this.guessLanguage(token);
            const confidence = computeSlangConfidence(token);

            detections.push({
                word: token,
                language,
                context: transcript.slice(0, 200),
                confidence,
            });
        }

        return detections;
    }

    /**
     * Create an AmbientMemory entry from a transcript fragment and its
     * extracted slang detections.
     */
    buildAmbientMemory(transcript: string, slang: SlangDetection[]): AmbientMemory {
        const patterns = slang.map((s) => s.word);
        const detectedLanguage = slang.length > 0 ? slang[0].language : 'unknown';
        const avgConfidence =
            slang.length > 0
                ? slang.reduce((sum, s) => sum + s.confidence, 0) / slang.length
                : 0;

        return {
            id: generateId(),
            transcript: transcript.slice(0, 500),
            detectedLanguage,
            extractedSlang: slang,
            extractedPatterns: patterns,
            confidence: avgConfidence as ConfidenceScore,
            processed: false,
            discarded: false,
            createdAt: new Date().toISOString(),
        };
    }

    /**
     * Process all accumulated AmbientMemory entries into the learning store
     * via `acceptAmbientEntry()`, then clear the buffer.
     *
     * Each entry is marked `processed = true` before submission.
     * Failures from individual entries are swallowed so a single bad entry
     * doesn't block the rest of the flush.
     */
    async flushMemory(): Promise<void> {
        for (const memory of this.memoryBuffer) {
            if (memory.discarded) continue;

            memory.processed = true;
            try {
                await learningStore.acceptAmbientEntry?.(memory);
            } catch {
                // Non-blocking — single entry failure doesn't stop the flush
            }
        }

        this.memoryBuffer = [];
    }

    // -----------------------------------------------------------------------
    // Callback registration
    // -----------------------------------------------------------------------

    /**
     * Register a callback that fires whenever `feedTranscript` discovers
     * new slang patterns. Returns an opaque ID that can be used to
     * deregister later if needed.
     */
    onPatternDetected(callback: (patterns: string[]) => void): string {
        const id = `cb_${++this.callbackCounter}`;
        this.callbacks.set(id, callback);
        return id;
    }

    // -----------------------------------------------------------------------
    // Status
    // -----------------------------------------------------------------------

    /** Return a snapshot of the listener's current state. */
    getStatus(): { enabled: boolean; paused: boolean; recentCount: number } {
        return {
            enabled: this.enabled,
            paused: this.paused,
            recentCount: this.recentTranscripts.length,
        };
    }

    // -----------------------------------------------------------------------
    // Internal helpers
    // -----------------------------------------------------------------------

    /** All words the listener currently considers "known". */
    private getAllKnownWords(): Set<string> {
        const known = new Set<string>();
        for (const marker of INDONESIAN_MARKERS) known.add(marker);
        for (const marker of ENGLISH_MARKERS) known.add(marker);
        for (const marker of DUTCH_MARKERS) known.add(marker);
        for (const marker of DYNAMIC_MARKERS.id) known.add(marker);
        for (const marker of DYNAMIC_MARKERS.en) known.add(marker);
        for (const marker of DYNAMIC_MARKERS.nl) known.add(marker);
        return known;
    }

    /**
     * Best-effort language guess for a single unknown token using simple
     * character-pattern heuristics. Falls back to `'unknown'` when no
     * pattern is conclusive.
     */
    private guessLanguage(word: string): 'id' | 'en' | 'nl' | 'unknown' {
        const lower = word.toLowerCase();

        // Dutch digraphs / trigraphs
        if (/\b(?:ij|sch|eeuw|ieuw|aa|ee|oo|uu)\b/.test(lower)) return 'nl';

        // Indonesian common patterns
        if (/\b(?:ng|ny|au)\b/.test(lower) || /(?:nya|kan|kah|lah|pun|tah)$/.test(lower)) return 'id';

        // English common suffixes
        if (/(?:ing|tion|ment|ness|able|ful|less)$/.test(lower)) return 'en';

        return 'unknown';
    }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const ambientListener = new AmbientListener();

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Heuristic confidence for a single unknown word (0–1). */
function computeSlangConfidence(word: string): ConfidenceScore {
    let score = 0.3; // base confidence for any 2+ char word not in markers

    if (word.length >= 4) score += 0.15;
    if (word.length >= 6) score += 0.1;
    // Contains at least one vowel
    if (/[aeiouàáâãäåæçèéêëìíîïðòóôõöøùúûüý]/.test(word)) score += 0.1;

    return Math.min(score, 1.0) as ConfidenceScore;
}
