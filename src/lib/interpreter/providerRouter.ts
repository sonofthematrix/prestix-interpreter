import type { ChatMessage, InterpreterProvider, TranslationResult } from "./types";

type TranslationProvider = {
  provider: InterpreterProvider;
  model: string;
  fallbackUsed: boolean;
  translate: (messages: ChatMessage[], signal: AbortSignal) => Promise<TranslationResult>;
};

type ProviderRouterResult = TranslationResult & {
  fallbackChainTried: string[];
  tokenizinSkippedReason?: string;
};

type ProviderResolution = {
  fallbackChainTried: string[];
  providers: TranslationProvider[];
  tokenizinSkippedReason?: string;
};

const providerRequestTimeoutMs = 15000;
const tokenizinTranslationScopeMarkers = [
  "ai:translate",
  "chat.completions",
  "chat:completions",
  "inference",
  "interpreter",
  "llm",
  "model:invoke",
  "models:invoke",
  "translate",
  "translation",
];

function getStringProperty(value: unknown, property: string): string | null {
  if (typeof value !== "object" || value === null || !(property in value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return typeof record[property] === "string" ? record[property] : null;
}

function extractTranslatedText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("choices" in payload)) {
    return null;
  }

  const choices = (payload as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const firstChoice = choices[0];
  if (typeof firstChoice !== "object" || firstChoice === null || !("message" in firstChoice)) {
    return null;
  }

  const message = (firstChoice as Record<string, unknown>).message;
  return getStringProperty(message, "content")?.trim() || null;
}

function extractOllamaText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("message" in payload)) {
    return null;
  }

  const message = (payload as Record<string, unknown>).message;
  return getStringProperty(message, "content")?.trim() || null;
}

function extractGeminiText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null || !("candidates" in payload)) {
    return null;
  }

  const candidates = (payload as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const firstCandidate = candidates[0];
  if (
    typeof firstCandidate !== "object" ||
    firstCandidate === null ||
    !("content" in firstCandidate)
  ) {
    return null;
  }

  const content = (firstCandidate as Record<string, unknown>).content;
  if (typeof content !== "object" || content === null || !("parts" in content)) {
    return null;
  }

  const parts = (content as Record<string, unknown>).parts;
  if (!Array.isArray(parts)) {
    return null;
  }

  return parts
    .map((part) => getStringProperty(part, "text"))
    .filter((text): text is string => Boolean(text))
    .join("")
    .trim() || null;
}

function geminiTextFromMessages(messages: ChatMessage[], role: ChatMessage["role"]): string {
  return messages
    .filter((message) => message.role === role)
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function asOpenAiCompatibleUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed;
  }

  if (trimmed.endsWith("/v1")) {
    return `${trimmed}/chat/completions`;
  }

  return `${trimmed}/v1/chat/completions`;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: unknown }).name === "AbortError")
  );
}

function linkParentAbortSignal(
  parentSignal: AbortSignal | undefined,
  controller: AbortController,
): () => void {
  if (!parentSignal) {
    return () => {};
  }

  if (parentSignal.aborted) {
    controller.abort();
    return () => {};
  }

  const abortProviderRequest = () => {
    controller.abort();
  };

  parentSignal.addEventListener("abort", abortProviderRequest, { once: true });
  return () => parentSignal.removeEventListener("abort", abortProviderRequest);
}

function splitScopeText(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((scope) => scope.trim().toLowerCase())
    .filter(Boolean);
}

function collectScopeWords(value: unknown, output: Set<string>): void {
  if (typeof value === "string") {
    for (const scope of splitScopeText(value)) {
      output.add(scope);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectScopeWords(item, output);
    }
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      collectScopeWords(item, output);
    }
  }
}

function decodeJwtPayload(token: string): unknown {
  const [, payload] = token.split(".");
  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

function tokenizinKeyIsTranslationScoped(apiKey: string): boolean {
  const scopeWords = new Set<string>();

  collectScopeWords(process.env.TOKENIZIN_TRANSLATION_SCOPE, scopeWords);
  collectScopeWords(process.env.TOKENIZIN_API_SCOPE, scopeWords);
  collectScopeWords(process.env.TOKENIZIN_API_SCOPES, scopeWords);
  collectScopeWords(process.env.TOKENIZIN_SCOPES, scopeWords);
  collectScopeWords(process.env.TOKENIZIN_PERMISSIONS, scopeWords);
  collectScopeWords(process.env.TOKENIZIN_CAPABILITIES, scopeWords);
  collectScopeWords(decodeJwtPayload(apiKey), scopeWords);

  return [...scopeWords].some((scope) =>
    tokenizinTranslationScopeMarkers.some((marker) => scope.includes(marker)),
  );
}

function missingEnvMessage(provider: InterpreterProvider, envNames: string[]): string {
  return `provider skipped: ${provider} missing ${envNames.join("/")}`;
}

async function requestOpenAiCompatible({
  apiKey,
  endpoint,
  fallbackUsed,
  headers,
  messages,
  model,
  provider,
  signal,
}: {
  apiKey: string;
  endpoint: string;
  fallbackUsed: boolean;
  headers?: Record<string, string>;
  messages: ChatMessage[];
  model: string;
  provider: InterpreterProvider;
  signal: AbortSignal;
}): Promise<TranslationResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...headers,
    },
    cache: "no-store",
    signal,
    body: JSON.stringify({
      model,
      messages,
    }),
  });

  if (!response.ok) {
    return { translatedText: null, provider, model, fallbackUsed, failedStatus: response.status };
  }

  const payload: unknown = await response.json();
  return {
    translatedText: extractTranslatedText(payload),
    provider,
    model,
    fallbackUsed,
    failedStatus: null,
  };
}

async function requestOllama({
  endpoint,
  messages,
  model,
  signal,
}: {
  endpoint: string;
  messages: ChatMessage[];
  model: string;
  signal: AbortSignal;
}): Promise<TranslationResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal,
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    return {
      translatedText: null,
      provider: "local",
      model,
      fallbackUsed: true,
      failedStatus: response.status,
    };
  }

  const payload: unknown = await response.json();
  return {
    translatedText: extractOllamaText(payload),
    provider: "local",
    model,
    fallbackUsed: true,
    failedStatus: null,
  };
}

async function requestGemini({
  apiKey,
  messages,
  model,
  signal,
}: {
  apiKey: string;
  messages: ChatMessage[];
  model: string;
  signal: AbortSignal;
}): Promise<TranslationResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const systemText = geminiTextFromMessages(messages, "system");
  const userText = geminiTextFromMessages(messages, "user");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    signal,
    body: JSON.stringify({
      ...(systemText
        ? {
            systemInstruction: {
              parts: [{ text: systemText }],
            },
          }
        : {}),
      contents: [
        {
          role: "user",
          parts: [{ text: userText }],
        },
      ],
    }),
  });

  if (!response.ok) {
    return {
      translatedText: null,
      provider: "gemini",
      model,
      fallbackUsed: true,
      failedStatus: response.status,
    };
  }

  const payload: unknown = await response.json();
  return {
    translatedText: extractGeminiText(payload),
    provider: "gemini",
    model,
    fallbackUsed: true,
    failedStatus: null,
  };
}

function parseOptionalHeaders(rawHeaders: string | undefined): Record<string, string> | undefined {
  if (!rawHeaders?.trim()) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(rawHeaders);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return undefined;
    }

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string") {
        headers[key] = value;
      }
    }

    return Object.keys(headers).length > 0 ? headers : undefined;
  } catch {
    return undefined;
  }
}

function buildProviderResolution(): ProviderResolution {
  const fallbackChainTried: string[] = ["provider resolution started"];
  const providers: TranslationProvider[] = [];
  const tokenizinApiKey = process.env.TOKENIZIN_API_KEY?.trim();
  const tokenizinBaseUrl = process.env.TOKENIZIN_BASE_URL?.trim();
  let tokenizinSkippedReason: string | undefined;
  const tokenizinModel =
    process.env.TOKENIZIN_MODEL_ID?.trim() ||
    process.env.TOKENIZIN_MODEL?.trim() ||
    "prestix-web-2.5";

  if (!tokenizinApiKey || !tokenizinBaseUrl) {
    const missing = [
      ...(!tokenizinApiKey ? ["TOKENIZIN_API_KEY"] : []),
      ...(!tokenizinBaseUrl ? ["TOKENIZIN_BASE_URL"] : []),
    ];
    fallbackChainTried.push(missingEnvMessage("tokenizin", missing));
  } else if (!tokenizinKeyIsTranslationScoped(tokenizinApiKey)) {
    tokenizinSkippedReason = "not_scoped_for_translation";
    fallbackChainTried.push("provider skipped: tokenizin safety not_scoped_for_translation");
  } else {
    const endpoint = asOpenAiCompatibleUrl(tokenizinBaseUrl);
    const headers = parseOptionalHeaders(process.env.TOKENIZIN_HEADERS);
    providers.push({
      provider: "tokenizin",
      model: tokenizinModel,
      fallbackUsed: false,
      translate: (messages, signal) =>
        requestOpenAiCompatible({
          apiKey: tokenizinApiKey,
          endpoint,
          fallbackUsed: false,
          headers,
          messages,
          model: tokenizinModel,
          provider: "tokenizin",
          signal,
        }),
    });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiApiKey) {
    const model =
      process.env.GEMINI_MODEL_FAST ||
      process.env.GEMINI_MODEL ||
      "gemini-2.0-flash";
    providers.push({
      provider: "gemini",
      model,
      fallbackUsed: true,
      translate: (messages, signal) =>
        requestGemini({
          apiKey: geminiApiKey,
          messages,
          model,
          signal,
        }),
    });
  } else {
    fallbackChainTried.push(missingEnvMessage("gemini", ["GEMINI_API_KEY"]));
  }

  const deepseekApiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseekApiKey) {
    const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";
    providers.push({
      provider: "deepseek",
      model,
      fallbackUsed: true,
      translate: (messages, signal) =>
        requestOpenAiCompatible({
          apiKey: deepseekApiKey,
          endpoint: "https://api.deepseek.com/chat/completions",
          fallbackUsed: true,
          messages,
          model,
          provider: "deepseek",
          signal,
        }),
    });
  } else {
    fallbackChainTried.push(missingEnvMessage("deepseek", ["DEEPSEEK_API_KEY"]));
  }

  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiApiKey) {
    const model =
      process.env.PRESTIX_INTERPRETER_MODEL ||
      process.env.PRESTIX_INTERPRETED_CALL_TRANSLATE_MODEL ||
      "gpt-4.1-mini";
    providers.push({
      provider: "openai",
      model,
      fallbackUsed: true,
      translate: (messages, signal) =>
        requestOpenAiCompatible({
          apiKey: openAiApiKey,
          endpoint: "https://api.openai.com/v1/chat/completions",
          fallbackUsed: true,
          messages,
          model,
          provider: "openai",
          signal,
        }),
    });
  } else {
    fallbackChainTried.push(missingEnvMessage("openai", ["OPENAI_API_KEY"]));
  }

  const localProviderRequested =
    process.env.PRESTIX_SANDBOX_TEXT_PROVIDER === "ollama" ||
    process.env.PRESTIX_SANDBOX_TEXT_PROVIDER === "local" ||
    Boolean(process.env.OLLAMA_BASE_URL);

  if (localProviderRequested) {
    const baseUrl = (process.env.OLLAMA_BASE_URL || "http://localhost:11434").replace(/\/+$/, "");
    const model = process.env.OLLAMA_MODEL || "llama3.1";
    providers.push({
      provider: "local",
      model,
      fallbackUsed: true,
      translate: (messages, signal) =>
        requestOllama({
          endpoint: `${baseUrl}/api/chat`,
          messages,
          model,
          signal,
        }),
    });
  } else {
    fallbackChainTried.push(
      "provider skipped: local missing OLLAMA_BASE_URL/PRESTIX_SANDBOX_TEXT_PROVIDER",
    );
  }

  return {
    fallbackChainTried,
    providers,
    tokenizinSkippedReason,
  };
}

export async function requestTranslation(
  messages: ChatMessage[],
  options: { signal?: AbortSignal } = {},
): Promise<ProviderRouterResult> {
  const { fallbackChainTried, providers, tokenizinSkippedReason } = buildProviderResolution();
  let lastFailure: TranslationResult | null = null;

  for (const provider of providers) {
    if (options.signal?.aborted) {
      fallbackChainTried.push("provider resolution aborted");
      break;
    }

    const controller = new AbortController();
    const unlinkParentAbortSignal = linkParentAbortSignal(options.signal, controller);
    const timeout = setTimeout(() => {
      controller.abort();
    }, providerRequestTimeoutMs);

    try {
      fallbackChainTried.push(`provider attempt: ${provider.provider}`);
      const result = await provider.translate(messages, controller.signal);
      if (result.translatedText) {
        fallbackChainTried.push(`provider success: ${provider.provider}`);
        return {
          ...result,
          fallbackChainTried,
          tokenizinSkippedReason,
        };
      }

      fallbackChainTried.push(
        result.failedStatus !== null
          ? `provider failed: ${provider.provider} status ${result.failedStatus}`
          : `provider failed: ${provider.provider} no translation`,
      );
      lastFailure = result;
    } catch (error) {
      if (isAbortError(error)) {
        fallbackChainTried.push(
          options.signal?.aborted
            ? `provider aborted: ${provider.provider}`
            : `provider timeout: ${provider.provider} after ${providerRequestTimeoutMs}ms`,
        );
      } else {
        fallbackChainTried.push(`provider failed: ${provider.provider}`);
      }

      lastFailure = {
        translatedText: null,
        provider: provider.provider,
        model: provider.model,
        fallbackUsed: provider.fallbackUsed,
        failedStatus: null,
        error:
          isAbortError(error) && options.signal?.aborted
            ? "Interpreter request timed out."
            : isAbortError(error)
              ? `${provider.provider} request timed out.`
              : error instanceof Error
                ? error.message
                : "Provider request failed.",
      };
    } finally {
      clearTimeout(timeout);
      unlinkParentAbortSignal();
    }
  }

  fallbackChainTried.push("all providers failed");

  return {
    ...(lastFailure ?? {
      translatedText: null,
      provider: null,
      model: null,
      fallbackUsed: false,
      failedStatus: null,
      error: "No translation provider is configured.",
    }),
    fallbackChainTried,
    tokenizinSkippedReason,
  };
}
