import type {
    ConfidenceScore,
    InterpreterMode,
    LearningFeedback,
    SlangDetection,
    SuggestedLearning,
} from './types';
import type { LearningStore } from './types';
import { learningStore } from './learningStore';
import {
    INDONESIAN_MARKERS,
    ENGLISH_MARKERS,
    DUTCH_MARKERS,
    addDynamicMarker,
    DYNAMIC_MARKERS,
} from './languageMarkers';

/**
 * Orchestration layer between the voice UI and the learning store.
 *
 * Called after every successful assistant / interpreter turn to:
 *  - Detect unknown slang words
 *  - Generate suggestions for user confirmation
 *  - Auto-capture high-confidence learnings directly into the store
 */
export class ConversationLearner {
    constructor(private readonly store: LearningStore = learningStore) {}

    // ---------------------------------------------------------------------------
    // Public API
    // ---------------------------------------------------------------------------

    /**
     * Main entry point — call after every successful turn.
     *
     * Pipeline:
     *  1. Detect unknown words in input & output
     *  2. Compute per-word confidence
     *  3. Auto-capture (confidence > 0.7) or queue as suggestion (0.3 – 0.7)
     */
    async learnFromTurn(input: string, output: string, mode: InterpreterMode): Promise<void> {
        const inputUnknown = this.detectUnknownWords(input);
        const outputUnknown = this.detectUnknownWords(output);
        const allUnknown = Array.from(new Set([...inputUnknown, ...outputUnknown]));

        if (allUnknown.length === 0) return;

        // Build per-word confidence
        const detections: SlangDetection[] = allUnknown.map((word) => {
            const inInput = inputUnknown.includes(word);
            const inOutput = outputUnknown.includes(word);
            return {
                word,
                language: 'unknown' as const,
                context: `${mode} turn`,
                confidence: computeWordConfidence(word, inInput && inOutput),
            };
        });

        // Turn-level confidence = highest individual word confidence
        const turnConfidence: ConfidenceScore = detections.length > 0
            ? Math.max(...detections.map((d) => d.confidence))
            : 0;

        if (turnConfidence > 0.7) {
            // Auto-capture — store directly as a high-confidence glossary entry
            const feedback: LearningFeedback = {
                input,
                output,
                mode,
                accepted: true,
                timestamp: new Date().toISOString(),
            };
            await this.store.autoCapture?.(feedback);

            // Register detected words so future turns skip them
            for (const det of detections) {
                if (det.confidence > 0.7) {
                    if (det.language === 'unknown') {
                        addDynamicMarker(det.word, 'en');
                        addDynamicMarker(det.word, 'nl');
                        addDynamicMarker(det.word, 'id');
                    } else {
                        addDynamicMarker(det.word, det.language);
                    }
                }
            }
        } else if (turnConfidence >= 0.3) {
            // Medium confidence — queue for user confirmation
            await this.store.suggestMemory?.(input, output, mode);
        }
        // Confidence < 0.3: discard (likely noise / typos)
    }

    /**
     * Tokenize `text` and return every word that is NOT recognised
     * by any static or dynamic language marker.
     */
    detectUnknownWords(text: string): string[] {
        const tokens = tokenize(text);
        const known = this.getAllKnownWords();
        const unknown = tokens.filter((token) => !known.has(token));
        return Array.from(new Set(unknown));
    }

    /** All words the learner currently considers "known". */
    getAllKnownWords(): Set<string> {
        const known = new Set<string>();
        for (const marker of INDONESIAN_MARKERS) known.add(marker);
        for (const marker of ENGLISH_MARKERS) known.add(marker);
        for (const marker of DUTCH_MARKERS) known.add(marker);
        for (const marker of Array.from(DYNAMIC_MARKERS.id)) known.add(marker);
        for (const marker of Array.from(DYNAMIC_MARKERS.en)) known.add(marker);
        for (const marker of Array.from(DYNAMIC_MARKERS.nl)) known.add(marker);
        return known;
    }

    /** List pending suggestions awaiting user review. */
    async getPendingSuggestions(): Promise<SuggestedLearning[]> {
        if (this.store.listSuggestions) {
            return this.store.listSuggestions();
        }
        return [];
    }

    /** Confirm a suggestion — persists it to the learning store. */
    async confirmSuggestion(id: string): Promise<void> {
        await this.store.confirmSuggestion?.(id);
    }

    /** Reject a suggestion — removes it from the queue. */
    async rejectSuggestion(id: string): Promise<void> {
        await this.store.rejectSuggestion?.(id);
    }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const conversationLearner = new ConversationLearner();

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

/** Heuristic confidence for a single unknown word (0–1). */
function computeWordConfidence(word: string, appearsInBoth: boolean): ConfidenceScore {
    let score = 0.25; // base for anything 2+ chars

    if (word.length >= 4) score += 0.15;
    if (word.length >= 6) score += 0.1;
    // Contains at least one vowel
    if (/[aeiouàáâãäåæçèéêëìíîïðòóôõöøùúûüý]/.test(word)) score += 0.1;
    // Appears in both input and output = stronger signal
    if (appearsInBoth) score += 0.25;
    // Starts with uppercase = likely a proper noun / slang term
    if (/^[A-Z]/.test(word)) score += 0.1;

    return Math.min(score, 1.0) as ConfidenceScore;
}
