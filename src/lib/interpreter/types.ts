/** Live tolken: NL ↔ Bahasa Indonesia. Legacy en-id/id-en blijft in learning JSON leesbaar. */
export type InterpreterMode = "nl-id" | "id-nl" | "en-id" | "id-en";
export type SessionMode = 'interpreter' | 'assistant' | 'agent' | 'autonomous';

export type InterpreterProvider = "tokenizin" | "gemini" | "deepseek" | "openai" | "local" | "local-gpu";

// ── Agentix types ──

export type AgentStep = {
    id: string;
    description: string;
    tool?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    result?: string;
    error?: string;
};

export type AgentPlan = {
    input: string;
    steps: AgentStep[];
    currentStep: number;
    totalSteps: number;
};

export type AgentResult = {
    plan: AgentPlan;
    finalOutput: string;
    completedSteps: AgentStep[];
};

// ── Tool system types (Phase A) ──

export type ToolParameter = {
    type: string;
    description: string;
    required: boolean;
};

export type ToolDefinition = {
    name: string;
    description: string;
    parameters: Record<string, ToolParameter>;
    execute: (params: Record<string, unknown>) => Promise<ToolResult>;
};

export type ToolResult = {
    success: boolean;
    output: string;
    error?: string;
};

// ── Autonomous agent types (Phase C) ──

export type AgentState = 'idle' | 'planning' | 'executing' | 'observing' | 'adjusting' | 'completed' | 'failed';

export type AgentObservation = {
    stepResult: ToolResult;
    assessment: string;
    needsAdjustment: boolean;
    adjustment?: string;
};

export type ProactiveSuggestion = {
    id: string;
    text: string;
    confidence: number;
    source: 'context' | 'history' | 'learning' | 'ambient';
};

export type AutonomousResult = {
    plan: AgentPlan;
    observations: AgentObservation[];
    finalOutput: string;
    suggestions: ProactiveSuggestion[];
};

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

/** Confidence score (0-1) for learned memory entries. */
export type ConfidenceScore = number;

/** Memory derived from general conversation context — not a correction/glossary/style. */
export type ConversationMemory = {
    type: 'conversation';
    context: string;
    sourceText: string;
    learnedPattern: string;
    mode: InterpreterMode;
    confidence: ConfidenceScore;
    occurrences: number;
    createdAt: string;
};

/** Slang / unknown word detected in input. */
export type SlangDetection = {
    word: string;
    language: 'id' | 'en' | 'nl' | 'unknown';
    context: string;
    confidence: ConfidenceScore;
};

/** User-reviewable learning suggestion. */
export type SuggestedLearning = {
    id: string;
    kind: 'correction' | 'glossary' | 'style' | 'slang';
    sourceText: string;
    suggestion: string;
    mode: InterpreterMode;
    createdAt: string;
};

/** Feedback from a successful (or corrected) translation cycle. */
export type LearningFeedback = {
    input: string;
    output: string;
    mode: InterpreterMode;
    accepted: boolean;
    correctedOutput?: string;
    timestamp: string;
};

/** Ambient-listening capture — passive, privacy-first. */
export type AmbientMemory = {
    id: string;
    transcript: string;
    detectedLanguage: 'id' | 'en' | 'nl' | 'unknown';
    extractedSlang: SlangDetection[];
    extractedPatterns: string[];
    confidence: ConfidenceScore;
    processed: boolean;
    discarded: boolean;
    createdAt: string;
};

export type ConversationStatus = "pending" | "translating" | "translated" | "error";

export type SpeakerId = 'speaker_a' | 'speaker_b' | 'unknown';
export type ConversationFilter = SpeakerId | 'all';

export type ConversationLogEntry = {
  id: string;
  timestamp: string;
  speaker: SpeakerId;
  source: 'typed' | 'speech';
  sessionMode: SessionMode;
  mode: InterpreterMode;
  input: string;
  output?: string;
  status: ConversationStatus;
  provider?: InterpreterProvider | string;
  model?: string;
  fallbackUsed?: boolean;
  learningMatchesCount?: number;
  learningTypesUsed?: string[];
  error?: string;
};

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
    addCorrection(entry: Omit<CorrectionMemory, 'type' | 'createdAt'>): Promise<CorrectionMemory>;
    addGlossary(entry: Omit<GlossaryMemory, 'type' | 'createdAt'>): Promise<GlossaryMemory>;
    addStyleRule(entry: Omit<StyleMemory, 'type' | 'createdAt'>): Promise<StyleMemory>;

    /** Suggest auto-detected learnings for user confirmation (optional). */
    suggestMemory?(input: string, output: string, mode: InterpreterMode): Promise<SuggestedLearning[]>;

    /** Auto-capture learning from a completed translation cycle (optional). */
    autoCapture?(feedback: LearningFeedback): Promise<void>;

    /** Accept an ambient-listening entry into learning (optional). */
    acceptAmbientEntry?(entry: AmbientMemory): Promise<void>;

    /** List pending suggestions awaiting user confirmation (optional). */
    listSuggestions?(): Promise<SuggestedLearning[]>;

    /** Confirm a suggested learning and persist it (optional). */
    confirmSuggestion?(id: string): Promise<void>;

    /** Reject a suggested learning and remove it from the queue (optional). */
    rejectSuggestion?(id: string): Promise<void>;
}

export interface ConversationStore {
  appendSegment(segment: ConversationSegment): Promise<void>;
  listRecent(limit: number): Promise<ConversationSegment[]>;
}
