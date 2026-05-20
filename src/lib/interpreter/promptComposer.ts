import { ASSISTANT_LLM_PRODUCT_NAME } from "./branding";
import type { AssistantHistoryTurn, ChatMessage, InterpreterMode } from "./types";
import { DUTCH_MARKERS, ENGLISH_MARKERS, getDynamicMarkers, hasMarker, INDONESIAN_MARKERS } from "./languageMarkers";
import { toolRegistry } from './toolRegistry';

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

  if (mode === "id-nl" || mode === "id-en") {
    const targetLang = mode === "id-nl" ? "Dutch" : "English";
    return [
      `You are a live Indonesian-to-${targetLang} interpreter.`,
      `Interpret the user's meaning naturally into spoken ${targetLang}.`,
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
      `Do not translate literally if natural ${targetLang} would phrase it differently.`,
      `Output ${targetLang} only.`,
      ...sharedRules,
    ].join(" ");
  }

  // nl-id or en-id: source European language → Indonesian
  const sourceLang = mode === "nl-id" ? "Dutch" : "English";
  return [
    `You are a live ${sourceLang}-to-Indonesian interpreter.`,
    `Interpret the user's meaning into natural spoken Indonesian.`,
    `The speaker is communicating with local Indonesian people; sound natural for daily use.`,
    "Use ordinary, natural Indonesian speech.",
    "Do not sound overly formal unless the input is formal.",
    "Do not translate literally if natural Indonesian would phrase it differently.",
    "Output Indonesian only.",
    ...sharedRules,
  ].join(" ");
}

function strictSystemPrompt(mode: InterpreterMode, style: string): string {
  if (mode === "id-nl" || mode === "id-en") {
    const targetLang = mode === "id-nl" ? "Dutch" : "English";
    return [
      systemPrompt(mode, style),
      "Your previous answer was still Indonesian or too literal.",
      `Interpret the meaning into natural spoken ${targetLang} only.`,
      "Do not paraphrase in the same language.",
      "Interpret the full meaning into the target language naturally.",
    ].join(" ");
  }

  const sourceLang = mode === "nl-id" ? "Dutch" : "English";
  return [
    systemPrompt(mode, style),
    `Your previous answer was still ${sourceLang} or too literal.`,
    "Interpret the meaning into natural spoken Indonesian only.",
    "Do not paraphrase in the same language.",
    "Interpret the full meaning into the target language naturally.",
  ].join(" ");
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
  if (mode === "id-en" || mode === "id-nl") {
    return hasMarker(text, INDONESIAN_MARKERS);
  }

  if (mode === "en-id" || mode === "nl-id") {
    const looksEuropean =
      hasMarker(text, ENGLISH_MARKERS) || hasMarker(text, DUTCH_MARKERS);
    return looksEuropean && !hasMarker(text, INDONESIAN_MARKERS);
  }

  return false;
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

/**
 * Interpreter skill overlay. When the user activates the tolk skill,
 * EVERY input is translated. No conversation, no answers — pure tolken.
 * Quality guards (wrong language, too-literal) still apply.
 */
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
  const overlayMessage = "⚡ TOLK SKILL ACTIVE — interpret this directly into the target language. Do not answer, do not explain, do not converse. Just the natural spoken interpretation:";

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
      content: `${overlayMessage}\n\n${input}`,
    },
  ];
}

function buildDynamicSlangHint(mode: InterpreterMode): string {
    const markers: string[] = [];

    // For id→en / id→nl: grab learned Indonesian slang
    if (mode === 'id-en' || mode === 'id-nl') {
        markers.push(...getDynamicMarkers('id'));
    }

    // For en→id / nl→id: grab learned English and Dutch slang
    if (mode === 'en-id' || mode === 'nl-id') {
        markers.push(...getDynamicMarkers('en'));
        markers.push(...getDynamicMarkers('nl'));
    }

    if (markers.length > 0) {
        return `Newly learned slang: ${markers.join(', ')}`;
    }

    return '';
}

function assistantSystemPrompt(mode: InterpreterMode): string {
  const persona = [
    `You are ${ASSISTANT_LLM_PRODUCT_NAME}, a voice-first AI tolk-assistant for someone living or traveling in Indonesia.`,
    "Your job is to help naturally — sometimes that means answering a question, sometimes translating, sometimes a bit of both.",
    "Be direct, warm, practical, and lightly playful. Sound plainspoken and sharp, never stiff or corporate.",
    "Do the obvious helpful thing first instead of listing options.",
    "If something is unclear or uncertain, say that plainly instead of bluffing.",
    "Keep answers concise unless the user asks for more detail.",
    "Do not use markdown. Do not wrap output in quotes.",
  ];

  const translationSkill = [
    "",
    "TRANSLATION SKILL (always available):",
    "Understand Indonesian street language and slang: gua/gue/gw = I/me, lu/lo = you, nih = emphasis, dong = soft insistence, aja = just/simply, mampus = screwed/damn, ajak = invite.",
    "- If the user says something in one language, respond naturally in the other — like a human tolk would.",
    "- If the user asks for a translation (\"translate...\", \"hoe zeg je...\", \"apa artinya...\"), give exactly the translation — not a conversation.",
    "- If the user is clearly just talking, respond conversationally.",
    "- Prefer natural spoken phrasing over word-for-word translation.",
    "- Preserve names, numbers, times, places, prices, emotion, and intent.",
  ];

  const dynamicSlang = buildDynamicSlangHint(mode);
  const translationWithDynamics = dynamicSlang
      ? [...translationSkill, dynamicSlang]
      : translationSkill;

  if (mode === "id-en") {
    return [
      ...persona,
      'Reply in natural spoken English only.',
      ...translationWithDynamics,
      "When translating ID→EN: interpret naturally into spoken English. Do not paraphrase back into Indonesian.",
    ].join(" ");
  }

  if (mode === "id-nl") {
    return [
      ...persona,
      'Reply in natural spoken Dutch (Nederlands) only.',
      ...translationWithDynamics,
      "When translating ID→NL: interpret naturally into spoken Dutch. Do not paraphrase back into Indonesian.",
    ].join(" ");
  }

  if (mode === "en-id") {
    return [
      ...persona,
      'Reply in natural spoken Indonesian only.',
      ...translationWithDynamics,
      "When translating EN→ID: make it sound local, clear, and easy to say out loud. Use ordinary Indonesian, not overly formal.",
    ].join(" ");
  }

  // nl-id
  return [
    ...persona,
    'Reply in natural spoken Indonesian only.',
    ...translationWithDynamics,
    "When translating NL→ID: make it sound local, clear, and easy to say out loud. Use ordinary Indonesian, not overly formal.",
  ].join(" ");
}

function agentSystemPrompt(mode: InterpreterMode): string {
    const toolDescriptions = toolRegistry.getAllDescriptions();

    const basePrompt = [
        `You are Prestix, a voice-first AI assistant with agent capabilities.`,
        'You can break down complex requests into steps and execute them sequentially using available tools.',
        'Plan your approach: think about what steps are needed, then execute them one at a time.',
        'Be transparent about your reasoning when helpful.',
        'If a step fails, explain what went wrong and suggest alternatives.',
        'Keep responses concise and actionable.',
        'Do not use markdown. Do not wrap output in quotes.',
        `Current language pair: ${mode}`,
    ];

    if (toolDescriptions) {
        basePrompt.push('', 'AVAILABLE TOOLS:', toolDescriptions);
    }

    return basePrompt.join(' ');
}

/**
 * Unified assistant + tolk prompt. This is the DEFAULT mode.
 * The assistant naturally handles both conversation and translation based on context.
 */
export function composeUnifiedPrompt({
  input,
  learningEntries,
  history,
  mode,
}: {
  input: string;
  learningEntries: string;
  history?: AssistantHistoryTurn[];
  mode: InterpreterMode;
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

// Legacy alias — routes still reference this. Remove after Phase 1 migration.
export { composeUnifiedPrompt as composeAssistantPrompt };
export { agentSystemPrompt };
