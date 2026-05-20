import type { ChatMessage, InterpreterProvider, TranslationResult } from "./types";
import { applyGuardrails } from "./guardrails";

/**
 * Local GPU provider — talks to LM Studio's OpenAI-compatible API.
 * CUDA lives inside LM Studio on the host; the app only makes HTTP calls.
 */

type ResolvedModelCache = {
  baseUrl: string;
  model: string;
};

let resolvedModelCache: ResolvedModelCache | null = null;

function firstDefinedString(...values: Array<string | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return null;
}

function normalizeBaseUrl(rawBaseUrl: string): string {
  const trimmed = rawBaseUrl.trim().replace(/\/+$/, "");

  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.replace(/\/chat\/completions$/, "");
  }

  if (trimmed.endsWith("/models")) {
    return trimmed.replace(/\/models$/, "");
  }

  return trimmed;
}

function resolveBaseUrl(): string {
  return normalizeBaseUrl(
    firstDefinedString(
      process.env.LM_STUDIO_BASE_URL,
      process.env.LMSTUDIO_URL,
      process.env.LM_STUDIO_URL,
      process.env.LOCAL_GPU_BASE_URL,
      "http://127.0.0.1:1234",
    ) ?? "http://127.0.0.1:1234",
  );
}

function resolveChatCompletionsUrl(baseUrl: string): string {
  const root = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
  return `${root}/chat/completions`;
}

function resolveModelsUrl(baseUrl: string): string {
  const root = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
  return `${root}/models`;
}

function extractString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractModelCandidates(payload: unknown): string[] {
  const items: unknown[] = [];

  if (Array.isArray(payload)) {
    items.push(...payload);
  } else if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) {
      items.push(...record.data);
    }
    if (Array.isArray(record.models)) {
      items.push(...record.models);
    }
  }

  return items
    .map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (typeof item !== "object" || item === null) {
        return null;
      }

      const record = item as Record<string, unknown>;
      return (
        extractString(record.id) ??
        extractString(record.name) ??
        extractString(record.model) ??
        null
      );
    })
    .filter((candidate): candidate is string => Boolean(candidate));
}

function selectPreferredModel(models: string[]): string | null {
  return (
    models.find((model) => /prestix/i.test(model)) ??
    models.find((model) => /hermes/i.test(model)) ??
    models[0] ??
    null
  );
}

async function discoverModel(baseUrl: string, signal: AbortSignal): Promise<string | null> {
  if (resolvedModelCache?.baseUrl === baseUrl) {
    return resolvedModelCache.model;
  }

  try {
    const response = await fetch(resolveModelsUrl(baseUrl), {
      method: "GET",
      cache: "no-store",
      signal,
    });

    if (!response.ok) {
      resolvedModelCache = { baseUrl, model: "" };
      return null;
    }

    const payload: unknown = await response.json();
    const model = selectPreferredModel(extractModelCandidates(payload));
    resolvedModelCache = { baseUrl, model: model ?? "" };
    return model;
  } catch {
    return null;
  }
}

function extractAssistantText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("choices" in payload)) {
    return null;
  }

  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const firstChoice = choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null) {
    return null;
  }

  const choiceRecord = firstChoice as Record<string, unknown>;
  const message = choiceRecord.message;
  if (typeof message === "object" && message !== null) {
    const content = extractString((message as Record<string, unknown>).content);
    if (content) {
      return content;
    }
  }

  const text = extractString(choiceRecord.text);
  if (text) {
    return text;
  }

  const delta = choiceRecord.delta;
  if (typeof delta === "object" && delta !== null) {
    return extractString((delta as Record<string, unknown>).content);
  }

  return null;
}

function resolveExplicitModel(): string | null {
  return firstDefinedString(
    process.env.PRESTIX_ASSISTANT_MODEL,
    process.env.LM_STUDIO_MODEL,
    process.env.LMSTUDIO_MODEL,
    process.env.LOCAL_GPU_MODEL,
  );
}

export async function requestLocalGpu({
  messages,
  signal,
  fallbackUsed = false,
}: {
  messages: ChatMessage[];
  signal: AbortSignal;
  fallbackUsed?: boolean;
}): Promise<TranslationResult> {
  try {
    const baseUrl = resolveBaseUrl();
    const model = resolveExplicitModel() ?? (await discoverModel(baseUrl, signal));

    if (!model) {
      return {
        translatedText: null,
        provider: "local-gpu",
        model: null,
        fallbackUsed,
        failedStatus: null,
        error:
          "LM Studio model not found. Load the Hermes 3B / Prestix assistant model in LM Studio, or set LM_STUDIO_MODEL, LMSTUDIO_MODEL, or PRESTIX_ASSISTANT_MODEL.",
      };
    }

    const response = await fetch(resolveChatCompletionsUrl(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal,
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 512,
        stream: false,
      }),
    });

    if (!response.ok) {
      return {
        translatedText: null,
        provider: "local-gpu",
        model,
        fallbackUsed,
        failedStatus: response.status,
        error: `LM Studio request failed with status ${response.status}.`,
      };
    }

    const payload: unknown = await response.json();
    const assistantText = extractAssistantText(payload);

    if (!assistantText) {
      return {
        translatedText: null,
        provider: "local-gpu",
        model,
        fallbackUsed,
        failedStatus: null,
        error: "LM Studio returned no assistant text.",
      };
    }

    const guardrailed = applyGuardrails(assistantText.trim());
    const text = guardrailed.text.trim();

    return {
      translatedText: text ? text : null,
      provider: "local-gpu" as InterpreterProvider,
      model,
      fallbackUsed,
      failedStatus: null,
    };
  } catch (error) {
    return {
      translatedText: null,
      provider: "local-gpu",
      model: resolveExplicitModel() ?? "lm-studio",
      fallbackUsed,
      failedStatus: null,
      error: error instanceof Error ? error.message : "Local GPU inference failed",
    };
  }
}

export function resetLocalGpu(): void {
  resolvedModelCache = null;
}
