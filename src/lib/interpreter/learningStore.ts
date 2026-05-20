import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
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
} from "./types";

type InterpreterLearningStoreData = {
  items: (LearningEntry | ConversationMemory)[];
  suggestions: SuggestedLearning[];
};

type LearningEntryInput =
  | Omit<CorrectionMemory, "createdAt">
  | Omit<GlossaryMemory, "createdAt">
  | Omit<StyleMemory, "createdAt">;

const DEFAULT_LEARNING_PATH = path.join(process.cwd(), "data", "interpreter-learning.json");
const MAX_ITEMS = 500;
const MAX_CONTEXT_CORRECTIONS = 5;
const MAX_CONTEXT_GLOSSARY = 10;
const MAX_CONTEXT_STYLE = 6;

function emptyStore(): InterpreterLearningStoreData {
  return { items: [], suggestions: [] };
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeExamples(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const examples = value
    .filter((example): example is string => typeof example === "string")
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, 8);

  return examples.length > 0 ? examples : undefined;
}

import { isInterpreterMode } from "./typeGuards";
import { INDONESIAN_MARKERS, ENGLISH_MARKERS, DUTCH_MARKERS } from "./languageMarkers";

function normalizeCorrection(value: unknown): CorrectionMemory | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.sourceText !== "string" ||
    typeof record.wrongOutput !== "string" ||
    typeof record.correctedOutput !== "string" ||
    !isInterpreterMode(record.mode)
  ) {
    return null;
  }

  return {
    type: "correction",
    sourceText: normalizeText(record.sourceText),
    wrongOutput: normalizeText(record.wrongOutput),
    correctedOutput: normalizeText(record.correctedOutput),
    mode: record.mode,
    note: typeof record.note === "string" ? normalizeText(record.note) : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

function normalizeGlossary(value: unknown): GlossaryMemory | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.term !== "string" ||
    typeof record.meaning !== "string" ||
    !isInterpreterMode(record.mode)
  ) {
    return null;
  }

  return {
    type: "glossary",
    term: normalizeText(record.term),
    meaning: normalizeText(record.meaning),
    mode: record.mode,
    examples: normalizeExamples(record.examples),
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

function normalizeStyle(value: unknown): StyleMemory | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.rule !== "string" || !isInterpreterMode(record.mode)) {
    return null;
  }

  return {
    type: "style",
    rule: normalizeText(record.rule),
    mode: record.mode,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

function normalizeConversation(value: unknown): ConversationMemory | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (
    typeof record.type !== "string" ||
    record.type !== "conversation" ||
    typeof record.context !== "string" ||
    typeof record.sourceText !== "string" ||
    typeof record.learnedPattern !== "string" ||
    !isInterpreterMode(record.mode)
  ) {
    return null;
  }

  return {
    type: "conversation",
    context: normalizeText(record.context),
    sourceText: normalizeText(record.sourceText),
    learnedPattern: normalizeText(record.learnedPattern),
    mode: record.mode,
    confidence: typeof record.confidence === "number" ? record.confidence : 0.5,
    occurrences: typeof record.occurrences === "number" ? record.occurrences : 1,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
  };
}

function normalizeMemory(value: unknown): LearningEntry | ConversationMemory | null {
  if (typeof value !== "object" || value === null || !("type" in value)) {
    return normalizeCorrection(value);
  }

  const type = (value as Record<string, unknown>).type;
  if (type === "correction") {
    return normalizeCorrection(value);
  }

  if (type === "glossary") {
    return normalizeGlossary(value);
  }

  if (type === "style") {
    return normalizeStyle(value);
  }

  if (type === "conversation") {
    return normalizeConversation(value);
  }

  return null;
}

function collectArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}']+/u)
      .filter((token) => token.length >= 2),
  );
}

function containsTerm(text: string, term: string): boolean {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function relevanceScore(inputTokens: Set<string>, text: string): number {
  const memoryTokens = tokenize(text);
  let score = 0;

  for (const token of inputTokens) {
    if (memoryTokens.has(token)) {
      score += 1;
    }
  }

  return score;
}

function uniqueTypes(items: LearningEntry[]): LearningType[] {
  return Array.from(new Set(items.map((item) => item.type)));
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Simple heuristic confidence for auto-capture. */
function estimateAutoCaptureConfidence(input: string, output: string): ConfidenceScore {
  let score = 0.8;

  if (output.length < 10) {
    score -= 0.25;
  }

  const normalizedInput = input.toLowerCase().trim();
  const normalizedOutput = output.toLowerCase().trim();

  const inputWords = new Set(normalizedInput.split(/\s+/));
  let echoedWords = 0;
  for (const word of normalizedOutput.split(/\s+/)) {
    if (inputWords.has(word)) {
      echoedWords += 1;
    }
  }

  const outputWordCount = normalizedOutput.split(/\s+/).length || 1;
  const echoRatio = echoedWords / outputWordCount;
  if (echoRatio > 0.7) {
    score -= 0.3;
  }

  return Math.max(0, Math.min(1, score)) as ConfidenceScore;
}

/** Detect language of a word by checking against static marker lists. */
function detectWordLanguage(word: string): "id" | "en" | "nl" | "unknown" {
  const lower = word.toLowerCase();

  for (const marker of INDONESIAN_MARKERS) {
    if (marker === lower) return "id";
  }
  for (const marker of ENGLISH_MARKERS) {
    if (marker === lower) return "en";
  }
  for (const marker of DUTCH_MARKERS) {
    if (marker === lower) return "nl";
  }

  return "unknown";
}

/** Check if a word exists in any static marker list. */
function wordInAnyMarkerList(word: string): boolean {
  const lower = word.toLowerCase();
  return (
    INDONESIAN_MARKERS.includes(lower) ||
    ENGLISH_MARKERS.includes(lower) ||
    DUTCH_MARKERS.includes(lower)
  );
}

export class JsonLearningStore implements LearningStore {
  constructor(private readonly storagePath: string = DEFAULT_LEARNING_PATH) {}

  async listRelevant(input: string, mode: InterpreterMode): Promise<LearningContext> {
    const store = await this.readStore();
    const inputTokens = tokenize(input);
    const scopedItems = store.items.filter((item) => item.mode === mode);

    const relevantCorrections = scopedItems
      .filter((item): item is CorrectionMemory => item.type === "correction")
      .map((correction) => ({
        correction,
        score: relevanceScore(inputTokens, `${correction.sourceText} ${correction.wrongOutput}`),
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CONTEXT_CORRECTIONS)
      .map(({ correction }) => correction);

    const relevantGlossary = scopedItems
      .filter((item): item is GlossaryMemory => item.type === "glossary")
      .map((glossary) => {
        const exampleText = glossary.examples?.join(" ") ?? "";
        const exactMatch = containsTerm(input, glossary.term) ? 10 : 0;
        return {
          glossary,
          score: exactMatch + relevanceScore(inputTokens, `${glossary.term} ${exampleText}`),
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CONTEXT_GLOSSARY)
      .map(({ glossary }) => glossary);

    const relevantStyles = scopedItems
      .filter((item): item is StyleMemory => item.type === "style")
      .slice(0, MAX_CONTEXT_STYLE);

    const matchedItems: LearningEntry[] = [
      ...relevantCorrections,
      ...relevantGlossary,
      ...relevantStyles,
    ];

    if (matchedItems.length === 0) {
      return { context: "", matchesCount: 0, typesUsed: [] };
    }

    const sections: string[] = [
      "Interpreter learning context. Apply only when relevant; learning corrections override general rules.",
    ];

    if (relevantCorrections.length > 0) {
      sections.push(
        "Correction memory:",
        ...relevantCorrections.map((correction, index) => {
          const note = correction.note ? ` Note: ${correction.note}` : "";
          return `${index + 1}. Source: ${correction.sourceText} | Avoid: ${correction.wrongOutput} | Prefer: ${correction.correctedOutput}.${note}`;
        }),
      );
    }

    if (relevantGlossary.length > 0) {
      sections.push(
        "Glossary memory:",
        ...relevantGlossary.map((glossary, index) => {
          const examples = glossary.examples?.length
            ? ` Examples: ${glossary.examples.join("; ")}.`
            : "";
          return `${index + 1}. ${glossary.term} = ${glossary.meaning}.${examples}`;
        }),
      );
    }

    if (relevantStyles.length > 0) {
      sections.push(
        "Style memory:",
        ...relevantStyles.map((style, index) => `${index + 1}. ${style.rule}`),
      );
    }

    return {
      context: sections.join("\n"),
      matchesCount: matchedItems.length,
      typesUsed: uniqueTypes(matchedItems),
    };
  }

  async addCorrection(
    correction: Omit<CorrectionMemory, "type" | "createdAt">,
  ): Promise<CorrectionMemory> {
    const memory = await this.addMemory({ type: "correction", ...correction });
    if (memory.type !== "correction") {
      throw new Error("Could not save correction.");
    }

    return memory;
  }

  async addGlossary(glossary: Omit<GlossaryMemory, "type" | "createdAt">): Promise<GlossaryMemory> {
    const memory = await this.addMemory({ type: "glossary", ...glossary });
    if (memory.type !== "glossary") {
      throw new Error("Could not save glossary memory.");
    }

    return memory;
  }

  async addStyleRule(style: Omit<StyleMemory, "type" | "createdAt">): Promise<StyleMemory> {
    const memory = await this.addMemory({ type: "style", ...style });
    if (memory.type !== "style") {
      throw new Error("Could not save style memory.");
    }

    return memory;
  }

  async addMemory(memory: LearningEntryInput): Promise<LearningEntry> {
    const createdAt = new Date().toISOString();
    const savedMemory = normalizeMemory({ ...memory, createdAt });

    if (!savedMemory || savedMemory.type === "conversation") {
      throw new Error("Invalid interpreter learning memory.");
    }

    const store = await this.readStore();
    await this.writeStore({ items: [savedMemory, ...store.items].slice(0, MAX_ITEMS), suggestions: store.suggestions });

    return savedMemory;
  }

  /**
   * Detect unknown/slang words in input that don't appear in any static language marker list.
   */
  detectSlang(input: string, _mode: InterpreterMode): SlangDetection[] {
    const tokens = Array.from(tokenize(input));
    const detections: SlangDetection[] = [];

    for (const token of tokens) {
      if (token.length < 2) continue;
      if (wordInAnyMarkerList(token)) continue;

      const lang = detectWordLanguage(token);
      detections.push({
        word: token,
        language: lang,
        context: input.slice(0, 200),
        confidence: 0.4 as ConfidenceScore,
      });
    }

    return detections;
  }

  /**
   * Generate learning suggestions from a conversational turn.
   */
  async suggestMemory(
    input: string,
    output: string,
    mode: InterpreterMode,
  ): Promise<SuggestedLearning[]> {
    const store = await this.readStore();
    const slang = this.detectSlang(input, mode);
    const suggestions: SuggestedLearning[] = [];
    const now = new Date().toISOString();

    const knownTerms = new Set(
      store.items
        .filter((item): item is GlossaryMemory => item.type === "glossary")
        .map((g) => g.term.toLowerCase()),
    );

    for (const detection of slang) {
      if (knownTerms.has(detection.word.toLowerCase())) continue;

      suggestions.push({
        id: generateId(),
        kind: "slang",
        sourceText: detection.word,
        suggestion: `Add "${detection.word}" to glossary with meaning from context: "${detection.context}"`,
        mode,
        createdAt: now,
      });
    }

    const inputTokens = Array.from(tokenize(input));
    if (inputTokens.length >= 2 && output.trim().length > 0) {
      suggestions.push({
        id: generateId(),
        kind: "correction",
        sourceText: input.slice(0, 200),
        suggestion: `Correction pattern: input "${input.slice(0, 100)}" → output "${output.slice(0, 100)}"`,
        mode,
        createdAt: now,
      });
    }

    store.suggestions = [...suggestions, ...store.suggestions].slice(0, 200);
    await this.writeStore(store);

    return suggestions;
  }

  /**
   * Auto-capture high-confidence translations as learning entries.
   */
  async autoCaptureSuccessful(
    input: string,
    output: string,
    mode: InterpreterMode,
  ): Promise<void> {
    const confidence = estimateAutoCaptureConfidence(input, output);
    if (confidence <= 0.7) return;

    const store = await this.readStore();
    const now = new Date().toISOString();

    const inputTokens = Array.from(tokenize(input)).filter(
      (t) => t.length >= 4 && !wordInAnyMarkerList(t),
    );
    const uniqueTerms = Array.from(new Set(inputTokens)).slice(0, 5);

    for (const term of uniqueTerms) {
      const normalized = normalizeGlossary({
        type: "glossary",
        term,
        meaning: `Meaning from context (auto-captured): "${input.slice(0, 200)}"`,
        mode,
        createdAt: now,
      });

      if (normalized) {
        store.items = [normalized, ...store.items].slice(0, MAX_ITEMS);
      }
    }

    if (output.length > 30 && /[.!?]$/.test(output.trim())) {
      const normalized = normalizeStyle({
        type: "style",
        rule: `Auto-captured style: output should read naturally like "${output.slice(0, 120)}"`,
        mode,
        createdAt: now,
      });

      if (normalized) {
        store.items = [normalized, ...store.items].slice(0, MAX_ITEMS);
      }
    }

    await this.writeStore(store);
  }

  /**
   * Implements LearningStore.autoCapture — store high-confidence turn feedback.
   */
  async autoCapture(feedback: LearningFeedback): Promise<void> {
    try {
      await this.addGlossary({
        term: feedback.input.slice(0, 200),
        meaning: feedback.output.slice(0, 500),
        mode: feedback.mode,
      });
    } catch {
      // Silently ignore auto-capture failures — non-blocking pipeline step
    }
  }

  /**
   * Accept an ambient-listening entry into the learning store.
   */
  async acceptAmbientEntry(entry: AmbientMemory): Promise<void> {
    if (entry.discarded) return;
    if (!entry.processed) return;

    const store = await this.readStore();
    const now = new Date().toISOString();

    for (const slang of entry.extractedSlang) {
      const normalized = normalizeGlossary({
        type: "glossary",
        term: slang.word,
        meaning: `Ambient-captured slang: "${slang.word}" detected (confidence: ${slang.confidence})`,
        mode: "nl-id",
        createdAt: now,
      });

      if (normalized) {
        store.items = [normalized, ...store.items].slice(0, MAX_ITEMS);
      }
    }

    for (const pattern of entry.extractedPatterns) {
      const conv = normalizeConversation({
        type: "conversation",
        context: entry.transcript.slice(0, 500),
        sourceText: entry.transcript.slice(0, 500),
        learnedPattern: pattern,
        mode: "nl-id",
        confidence: entry.confidence,
        occurrences: 1,
        createdAt: now,
      });

      if (conv) {
        store.items = [conv, ...store.items].slice(0, MAX_ITEMS);
      }
    }

    await this.writeStore(store);
  }

  /**
   * Return all pending learning suggestions for user confirmation.
   */
  async listSuggestions(): Promise<SuggestedLearning[]> {
    const store = await this.readStore();
    return store.suggestions;
  }

  /**
   * Convert a pending suggestion into a persisted learning entry.
   */
  async confirmSuggestion(id: string): Promise<void> {
    const store = await this.readStore();
    const index = store.suggestions.findIndex((s) => s.id === id);
    if (index === -1) return;

    const suggestion = store.suggestions[index];
    const now = new Date().toISOString();

    let normalized: LearningEntry | null = null;

    if (suggestion.kind === "glossary" || suggestion.kind === "slang") {
      normalized = normalizeGlossary({
        type: "glossary",
        term: suggestion.sourceText.slice(0, 200),
        meaning: suggestion.suggestion.slice(0, 500),
        mode: suggestion.mode,
        createdAt: now,
      });
    } else if (suggestion.kind === "correction") {
      normalized = normalizeCorrection({
        type: "correction",
        sourceText: suggestion.sourceText.slice(0, 200),
        wrongOutput: suggestion.sourceText.slice(0, 200),
        correctedOutput: suggestion.suggestion.slice(0, 500),
        mode: suggestion.mode,
        createdAt: now,
      });
    } else if (suggestion.kind === "style") {
      normalized = normalizeStyle({
        type: "style",
        rule: suggestion.suggestion.slice(0, 500),
        mode: suggestion.mode,
        createdAt: now,
      });
    }

    if (normalized) {
      store.items = [normalized, ...store.items].slice(0, MAX_ITEMS);
    }

    store.suggestions.splice(index, 1);
    await this.writeStore(store);
  }

  /**
   * Remove a pending suggestion by ID.
   */
  async rejectSuggestion(id: string): Promise<void> {
    const store = await this.readStore();
    const index = store.suggestions.findIndex((s) => s.id === id);
    if (index === -1) return;

    store.suggestions.splice(index, 1);
    await this.writeStore(store);
  }

  private async readStore(): Promise<InterpreterLearningStoreData> {
    try {
      const raw = await readFile(this.storagePath, "utf8");
      const parsed: unknown = JSON.parse(raw);

      if (typeof parsed !== "object" || parsed === null) {
        return emptyStore();
      }

      const record = parsed as Record<string, unknown>;
      const rawItems = [
        ...collectArray(record, "items"),
        ...collectArray(record, "corrections"),
        ...collectArray(record, "glossary"),
        ...collectArray(record, "glossaries"),
        ...collectArray(record, "styles"),
      ];
      const items = rawItems
        .map(normalizeMemory)
        .filter((item): item is LearningEntry => item !== null)
        .slice(0, MAX_ITEMS);

      const rawSuggestions = collectArray(record, "suggestions");
      const suggestions: SuggestedLearning[] = rawSuggestions
        .filter((s): s is SuggestedLearning => {
          if (typeof s !== "object" || s === null) return false;
          const sug = s as Record<string, unknown>;
          return (
            typeof sug.id === "string" &&
            typeof sug.kind === "string" &&
            typeof sug.sourceText === "string" &&
            typeof sug.suggestion === "string" &&
            typeof sug.mode === "string" &&
            typeof sug.createdAt === "string"
          );
        })
        .slice(0, 200);

      return { items, suggestions };
    } catch (error) {
      const code = error instanceof Error && "code" in error ? error.code : null;
      if (code === "ENOENT") {
        return emptyStore();
      }

      throw error;
    }
  }

  private async writeStore(store: InterpreterLearningStoreData): Promise<void> {
    await mkdir(path.dirname(this.storagePath), { recursive: true });
    const temporaryPath = `${this.storagePath}.tmp`;
    await writeFile(
      temporaryPath,
      `${JSON.stringify(
        {
          items: store.items.slice(0, MAX_ITEMS),
          suggestions: store.suggestions.slice(0, 200),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.storagePath);
  }
}

export const jsonLearningStore = new JsonLearningStore();

// ═══════════════════════════════════════════════════
// Smart singleton: uses VectorLearningStore (DB + pgvector)
// when DATABASE_URL is set, otherwise falls back to JSON file.
// ═══════════════════════════════════════════════════
import { vectorLearningStore } from './vectorLearningStore';

function resolveLearningStore(): LearningStore {
    if (process.env.DATABASE_URL) {
        return vectorLearningStore;
    }
    return jsonLearningStore;
}

/** Primary learning store — auto-selects DB or JSON backend. */
export const learningStore: LearningStore = new Proxy({} as LearningStore, {
    get(_target, prop: string) {
        const store = resolveLearningStore();
        const value = (store as unknown as Record<string, unknown>)[prop];
        if (typeof value === 'function') {
            return value.bind(store);
        }
        return value;
    },
});
