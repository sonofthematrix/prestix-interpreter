export type InterpreterMode = "id-en" | "en-id";
export type SessionMode = "interpreter" | "assistant";

export type InterpreterProvider = "tokenizin" | "gemini" | "deepseek" | "openai" | "local";

export type LearningType = "correction" | "glossary" | "style";

export type CorrectionMemory = {
  type: "correction";
  sourceText: string;
  wrongOutput: string;
  correctedOutput: string;
  mode: InterpreterMode;
  note?: string;
  createdAt: string;
};

export type GlossaryMemory = {
  type: "glossary";
  term: string;
  meaning: string;
  mode: InterpreterMode;
  examples?: string[];
  createdAt: string;
};

export type StyleMemory = {
  type: "style";
  rule: string;
  mode: InterpreterMode;
  createdAt: string;
};

export type LearningEntry = CorrectionMemory | GlossaryMemory | StyleMemory;

export type LearningContext = {
  context: string;
  matchesCount: number;
  typesUsed: LearningType[];
};

export type ConversationStatus = "pending" | "translating" | "translated" | "error";

export type ConversationSegment = {
  id: string;
  timestamp: string;
  speaker: "speaker_a" | "speaker_b" | "unknown";
  source: "typed" | "speech";
  sessionMode: SessionMode;
  mode: InterpreterMode;
  input: string;
  output?: string;
  status: ConversationStatus;
  provider?: InterpreterProvider;
  fallbackUsed?: boolean;
  error?: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AssistantHistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

export type TranslationResult = {
  translatedText: string | null;
  provider: InterpreterProvider | null;
  model: string | null;
  fallbackUsed: boolean;
  failedStatus: number | null;
  error?: string;
};

export interface LearningStore {
  listRelevant(input: string, mode: InterpreterMode): Promise<LearningContext>;
  addCorrection(entry: Omit<CorrectionMemory, "type" | "createdAt">): Promise<CorrectionMemory>;
  addGlossary(entry: Omit<GlossaryMemory, "type" | "createdAt">): Promise<GlossaryMemory>;
  addStyleRule(entry: Omit<StyleMemory, "type" | "createdAt">): Promise<StyleMemory>;
}

export interface ConversationStore {
  appendSegment(segment: ConversationSegment): Promise<void>;
  listRecent(limit: number): Promise<ConversationSegment[]>;
}
