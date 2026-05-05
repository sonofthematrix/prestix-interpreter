import { NextRequest, NextResponse } from "next/server";
import { jsonLearningStore } from "../../../lib/interpreter/learningStore";
import {
  cleanInterpreterOutput,
  composeInterpreterPrompt,
  outputLooksTooLiteral,
  outputLooksWrongLanguage,
} from "../../../lib/interpreter/promptComposer";
import { requestTranslation } from "../../../lib/interpreter/providerRouter";
import type { InterpreterMode, InterpreterProvider, LearningType } from "../../../lib/interpreter/types";

type RequestBody = {
  input?: unknown;
  mode?: unknown;
};

type InterpreterResponsePayload = {
  translatedText: string;
  error: string | null;
  provider: InterpreterProvider | null;
  model: string | null;
  fallbackUsed: boolean;
  fallbackChainTried: string[];
  tokenizinSkippedReason?: string;
  learningMatchesCount: number;
  learningTypesUsed: LearningType[];
};

export const dynamic = "force-dynamic";

const interpreterRouteTimeoutMs = 30000;

function isInterpreterMode(value: unknown): value is InterpreterMode {
  return value === "id-en" || value === "en-id";
}

function errorPayload(
  error: string,
  overrides?: Partial<Omit<InterpreterResponsePayload, "translatedText" | "error">>,
): InterpreterResponsePayload {
  return {
    translatedText: "",
    error,
    provider: overrides?.provider ?? null,
    model: overrides?.model ?? null,
    fallbackUsed: overrides?.fallbackUsed ?? false,
    fallbackChainTried: overrides?.fallbackChainTried ?? [],
    tokenizinSkippedReason: overrides?.tokenizinSkippedReason,
    learningMatchesCount: overrides?.learningMatchesCount ?? 0,
    learningTypesUsed: overrides?.learningTypesUsed ?? [],
  };
}

function routeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Interpreter route failed.";
}

function timeoutPayload(): InterpreterResponsePayload {
  return errorPayload("Interpreter request timed out.", {
    fallbackChainTried: ["provider resolution started", "route timeout: 30000ms"],
  });
}

function withInterpreterRouteTimeout(
  work: (signal: AbortSignal) => Promise<NextResponse>,
): Promise<NextResponse> {
  let didTimeout = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const controller = new AbortController();

  const timeoutWork = new Promise<NextResponse>((resolve) => {
    timeout = setTimeout(() => {
      didTimeout = true;
      controller.abort();
      resolve(NextResponse.json(timeoutPayload(), { status: 504 }));
    }, interpreterRouteTimeoutMs);
  });

  const guardedWork = work(controller.signal).catch((error) => {
    if (didTimeout) {
      return null;
    }

    throw error;
  });

  return Promise.race([guardedWork, timeoutWork]).then((response) => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }

    return response ?? NextResponse.json(timeoutPayload(), { status: 504 });
  });
}

async function handleInterpreterPost(request: NextRequest, signal: AbortSignal) {
  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json(errorPayload("Invalid JSON body."), { status: 400 });
  }

  const input = typeof body.input === "string" ? body.input.trim() : "";
  const mode = isInterpreterMode(body.mode) ? body.mode : null;

  if (!input) {
    return NextResponse.json(errorPayload("Input is required."), { status: 400 });
  }

  if (!mode) {
    return NextResponse.json(errorPayload("Mode must be id-en or en-id."), { status: 400 });
  }

  const learningContext = await jsonLearningStore.listRelevant(input, mode);
  const buildMessages = (strict: boolean) =>
    composeInterpreterPrompt({
      input,
      learningEntries: learningContext.context,
      mode,
      strict,
    });

  let translation = await requestTranslation(buildMessages(false), { signal });
  let translatedText = cleanInterpreterOutput(translation.translatedText ?? "");
  let fallbackChainTried = translation.fallbackChainTried;

  if (
    translatedText &&
    (outputLooksWrongLanguage(translatedText, mode) ||
      outputLooksTooLiteral(input, translatedText))
  ) {
    translation = await requestTranslation(buildMessages(true), { signal });
    translatedText = cleanInterpreterOutput(translation.translatedText ?? "");
    fallbackChainTried = [
      ...fallbackChainTried,
      "strict retry started",
      ...translation.fallbackChainTried,
    ];
  }

  const learningMetadata = {
    learningMatchesCount: learningContext.matchesCount,
    learningTypesUsed: learningContext.typesUsed,
  };

  if (translation.failedStatus !== null) {
    return NextResponse.json(
      errorPayload(
        `${translation.provider ?? "translation"} request failed with status ${translation.failedStatus}.`,
        {
          provider: translation.provider,
          model: translation.model,
          fallbackUsed: translation.fallbackUsed,
          fallbackChainTried,
          tokenizinSkippedReason: translation.tokenizinSkippedReason,
          ...learningMetadata,
        },
      ),
      { status: 502 },
    );
  }

  if (!translatedText) {
    return NextResponse.json(
      errorPayload(translation.error || "Interpreter returned no translation.", {
        provider: translation.provider,
        model: translation.model,
        fallbackUsed: translation.fallbackUsed,
        fallbackChainTried,
        tokenizinSkippedReason: translation.tokenizinSkippedReason,
        ...learningMetadata,
      }),
      { status: 502 },
    );
  }

  const payload: InterpreterResponsePayload = {
    translatedText,
    error: null,
    provider: translation.provider,
    model: translation.model,
    fallbackUsed: translation.fallbackUsed,
    fallbackChainTried,
    tokenizinSkippedReason: translation.tokenizinSkippedReason,
    ...learningMetadata,
  };

  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  return withInterpreterRouteTimeout((signal) => handleInterpreterPost(request, signal)).catch(
    (error) =>
      NextResponse.json(
        errorPayload(routeErrorMessage(error), {
          fallbackChainTried: ["provider resolution started", "route error"],
        }),
        { status: 500 },
      ),
  );
}
