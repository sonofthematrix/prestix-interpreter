import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CorrectionMemory,
  GlossaryMemory,
  InterpreterMode,
  LearningContext,
  LearningEntry,
  LearningStore,
  LearningType,
  StyleMemory,
} from "./types";

type InterpreterLearningStoreData = {
  items: LearningEntry[];
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
  return { items: [] };
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

function isInterpreterMode(value: unknown): value is InterpreterMode {
  return value === "id-en" || value === "en-id";
}

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

function normalizeMemory(value: unknown): LearningEntry | null {
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

    if (!savedMemory) {
      throw new Error("Invalid interpreter learning memory.");
    }

    const store = await this.readStore();
    await this.writeStore({ items: [savedMemory, ...store.items].slice(0, MAX_ITEMS) });

    return savedMemory;
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

      return { items };
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
      `${JSON.stringify({ items: store.items.slice(0, MAX_ITEMS) }, null, 2)}\n`,
      "utf8",
    );
    await rename(temporaryPath, this.storagePath);
  }
}

export const jsonLearningStore = new JsonLearningStore();
