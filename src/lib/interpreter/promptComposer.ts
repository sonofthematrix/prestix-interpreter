import { ASSISTANT_LLM_PRODUCT_NAME } from "./branding";
import type { AssistantHistoryTurn, ChatMessage, InterpreterMode } from "./types";

// Kept here so server + client can agree on the same caps. Server enforces them
// authoritatively; client trims first to keep the request small.
export const ASSISTANT_HISTORY_MAX_TURNS = 16;
export const ASSISTANT_HISTORY_MAX_CONTENT_CHARS = 4000;

function isAssistantHistoryRole(value: unknown): value is AssistantHistoryTurn["role"] {
  return value === "user" || value === "assistant";
}

function clampContent(content: string): string {
  if (content.length <= ASSISTANT_HISTORY_MAX_CONTENT_CHARS) {
    return content;
  }

  const suffix = "…[truncated]";
  return `${content.slice(0, ASSISTANT_HISTORY_MAX_CONTENT_CHARS - suffix.length)}${suffix}`;
}

// Defensive normalizer: tolerates anything but only emits well-typed turns,
// drops empty messages, clamps oversized content, and keeps only the most
// recent N turns so the prompt stays bounded.
export function normalizeAssistantHistory(
  raw: unknown,
  maxTurns: number = ASSISTANT_HISTORY_MAX_TURNS,
): AssistantHistoryTurn[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const cleaned: AssistantHistoryTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (!isAssistantHistoryRole(role) || typeof content !== "string") {
      continue;
    }
    const trimmed = content.trim();
    if (!trimmed) {
      continue;
    }
    cleaned.push({ role, content: clampContent(trimmed) });
  }

  return cleaned.slice(-Math.max(0, maxTurns));
}

const translationStyle = "natural_interpreter";

const INDONESIAN_MARKERS = [
  "gua",
  "gue",
  "gw",
  "lu",
  "lo",
  "nih",
  "dong",
  "aja",
  "kalau",
  "jadi",
  "mampus",
  "ajak",
  "saya",
  "kamu",
  "mereka",
  "tidak",
  "mau",
  "kamar",
  "malam",
  "untuk",
  "dengan",
  "dari",
  "ke",
  "ini",
  "itu",
];

const ENGLISH_MARKERS = [
  "the",
  "and",
  "or",
  "to",
  "for",
  "with",
  "this",
  "that",
  "they",
  "you",
  "want",
  "book",
  "room",
  "tonight",
  "understand",
  "don't",
  "do not",
];

function systemPrompt(mode: InterpreterMode, style: string): string {
  const sharedRules = [
    `Translation style: ${style}.`,
    "Use relevant correction/glossary/style memory from interpreter learning context when provided.",
    "Learning corrections have priority over general prompt rules.",
    "Preserve names, booking details, times, places, prices, emotion, tone, and intent.",
    "Do not translate word-for-word when that sounds unnatural.",
    "Prefer what a human interpreter would say out loud.",
    "Do not explain.",
    "Do not use markdown.",
    "Do not wrap the output in quotes.",
  ];

  if (mode === "id-en") {
    return [
      "You are a live Indonesian-to-English interpreter.",
      "Interpret the user's meaning naturally into spoken English.",
      "Preserve meaning, intent, tone, and speaking style.",
      "Understand Indonesian street language and slang:",
      "gua/gue/gw = I/me;",
      "lu/lo = you;",
      "nih = emphasis, you know, or omit when natural;",
      "dong = soft insistence or emphasis;",
      "aja = just, simply, or only depending on context;",
      "mampus = we're screwed, damn, or dead depending on context;",
      "ajak = invite or ask to come along.",
      "Do not normalize Indonesian into Indonesian.",
      "Do not translate literally if natural English would phrase it differently.",
      "Output English only.",
      ...sharedRules,
    ].join(" ");
  }

  return [
    "You are a live English-to-Indonesian interpreter.",
    "Interpret the user's meaning into natural spoken Indonesian.",
    "Use ordinary, natural Indonesian speech.",
    "Do not sound overly formal unless the input is formal.",
    "Do not translate literally if natural Indonesian would phrase it differently.",
    "Output Indonesian only.",
    ...sharedRules,
  ].join(" ");
}

function strictSystemPrompt(mode: InterpreterMode, style: string): string {
  if (mode === "id-en") {
    return [
      systemPrompt(mode, style),
      "Your previous answer was still Indonesian or too literal.",
      "Interpret the meaning into natural spoken English only.",
      "Do not paraphrase in the same language.",
      "Interpret the full meaning into the target language naturally.",
    ].join(" ");
  }

  return [
    systemPrompt(mode, style),
    "Your previous answer was still English or too literal.",
    "Interpret the meaning into natural spoken Indonesian only.",
    "Do not paraphrase in the same language.",
    "Interpret the full meaning into the target language naturally.",
  ].join(" ");
}

function hasWordMarker(text: string, markers: string[]): boolean {
  return markers.some((marker) =>
    new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
  );
}

function comparableTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

export function cleanInterpreterOutput(text: string): string {
  let cleaned = text.trim();

  const fencedMatch = cleaned.match(/^```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```$/);
  if (fencedMatch?.[1]) {
    cleaned = fencedMatch[1].trim();
  }

  const first = cleaned.at(0);
  const last = cleaned.at(-1);
  if (
    cleaned.length >= 2 &&
    ((first === '"' && last === '"') || (first === "'" && last === "'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  return cleaned;
}

export function outputLooksWrongLanguage(text: string, mode: InterpreterMode): boolean {
  if (mode === "id-en") {
    return hasWordMarker(text, INDONESIAN_MARKERS);
  }

  return hasWordMarker(text, ENGLISH_MARKERS) && !hasWordMarker(text, INDONESIAN_MARKERS);
}

export function outputLooksTooLiteral(input: string, output: string): boolean {
  const inputTokens = comparableTokens(input);
  const outputTokens = comparableTokens(output);

  if (inputTokens.length < 4 || outputTokens.length < 4) {
    return false;
  }

  const inputSet = new Set(inputTokens);
  const outputSet = new Set(outputTokens);
  const sharedTokenCount = [...inputSet].filter((token) => outputSet.has(token)).length;
  const overlapRatio = sharedTokenCount / Math.min(inputSet.size, outputSet.size);
  const tokenLengthDelta = Math.abs(inputTokens.length - outputTokens.length);

  return overlapRatio >= 0.6 && tokenLengthDelta <= 3;
}

export function composeInterpreterPrompt({
  input,
  learningEntries,
  mode,
  strict = false,
  style = translationStyle,
}: {
  input: string;
  learningEntries: string;
  mode: InterpreterMode;
  strict?: boolean;
  style?: string;
}): ChatMessage[] {
  return [
    {
      role: "system",
      content: strict ? strictSystemPrompt(mode, style) : systemPrompt(mode, style),
    },
    ...(learningEntries
      ? [
          {
            role: "system" as const,
            content: learningEntries,
          },
        ]
      : []),
    {
      role: "user",
      content: `Interpret this text according to the direction. Return only the natural spoken interpretation:\n\n${input}`,
    },
  ];
}

function assistantSystemPrompt(mode: InterpreterMode): string {
  if (mode === "id-en") {
    return [
      `You are ${ASSISTANT_LLM_PRODUCT_NAME}, a live voice AI assistant speaking with the user in Indonesian.`,
      "You have a built-in English interpreter: only switch to interpreting when the user clearly asks for translation.",
      "Reply in natural spoken Indonesian only.",
      "Be direct, helpful, and conversational.",
      "Keep answers concise unless the user clearly asks for depth.",
      "Do not translate the user unless they explicitly ask for translation.",
      "Do not explain your language choice.",
      "Do not use markdown.",
      "Do not wrap the output in quotes.",
    ].join(" ");
  }

  return [
    `You are ${ASSISTANT_LLM_PRODUCT_NAME}, a live voice AI assistant speaking with the user in English.`,
    "You have a built-in Indonesian interpreter: only switch to interpreting when the user clearly asks for translation.",
    "Reply in natural spoken English only.",
    "Be direct, helpful, and conversational.",
    "Keep answers concise unless the user clearly asks for depth.",
    "Do not translate the user unless they explicitly ask for translation.",
    "Do not explain your language choice.",
    "Do not use markdown.",
    "Do not wrap the output in quotes.",
  ].join(" ");
}

export function composeAssistantPrompt({
  input,
  learningEntries,
  mode,
  history,
}: {
  input: string;
  learningEntries: string;
  mode: InterpreterMode;
  history?: AssistantHistoryTurn[];
}): ChatMessage[] {
  const priorTurns = normalizeAssistantHistory(history ?? []);

  return [
    {
      role: "system",
      content: assistantSystemPrompt(mode),
    },
    ...(learningEntries
      ? [
          {
            role: "system" as const,
            content: learningEntries,
          },
        ]
      : []),
    ...priorTurns.map<ChatMessage>((turn) => ({ role: turn.role, content: turn.content })),
    {
      role: "user",
      content: input,
    },
  ];
}
