import { NextRequest, NextResponse } from "next/server";
import { learningStore } from "../../../lib/interpreter/learningStore";
import { checkRateLimit, getClientIp } from "../../../lib/rate-limit";
import {
  cleanInterpreterOutput,
  composeInterpreterPrompt,
  composeUnifiedPrompt,
  normalizeAssistantHistory,
  outputLooksTooLiteral,
  outputLooksWrongLanguage,
} from "../../../lib/interpreter/promptComposer";
import { requestTranslation } from "../../../lib/interpreter/providerRouter";
import type {
  AgentPlan,
  AgentStep,
  InterpreterMode,
  InterpreterProvider,
  LearningType,
  SessionMode,
} from "../../../lib/interpreter/types";
import { isInterpreterMode, isSessionMode } from "../../../lib/interpreter/typeGuards";
import { agentLoop } from "../../../lib/interpreter/agentLoop";
import { conversationLearner } from "../../../lib/interpreter/conversationLearner";
import type { SuggestedLearning } from "../../../lib/interpreter/types";
import { toolRegistry } from "../../../lib/interpreter/toolRegistry";
import { toolExecutor } from "../../../lib/interpreter/toolExecutor";
import { translateTool } from "../../../lib/interpreter/tools/translateTool";
import { rememberTool, recallTool } from "../../../lib/interpreter/tools/memoryTool";
import { autonomousAgent } from "../../../lib/interpreter/autonomousAgent";

// Register available tools for agent mode
toolRegistry.register(translateTool);
toolRegistry.register(rememberTool);
toolRegistry.register(recallTool);

type RequestBody = {
  input?: unknown;
  mode?: unknown;
  sessionMode?: unknown;
  history?: unknown;
  confirmLearning?: unknown; // { id: string; accepted: boolean }
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
  learningSuggestions: SuggestedLearning[];
  // Agent mode fields (only present when sessionMode='agent')
  agentPlan?: AgentPlan;
  agentSteps?: AgentStep[];
};

export const dynamic = "force-dynamic";

const interpreterRouteTimeoutMs = 30000;

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
    learningSuggestions: overrides?.learningSuggestions ?? [],
    agentPlan: overrides?.agentPlan,
    agentSteps: overrides?.agentSteps,
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
  const interpreterMode = isInterpreterMode(body.mode) ? body.mode : null;
  const sessionMode = isSessionMode(body.sessionMode) ? body.sessionMode : "assistant";

  if (!input) {
    return NextResponse.json(errorPayload("Input is required."), { status: 400 });
  }

  // Interpreter skill (tolk mode) requires a language direction
  const isTolkSkillActive = sessionMode === "interpreter";
  if (isTolkSkillActive && !interpreterMode) {
    return NextResponse.json(errorPayload("Tolk skill requires mode: nl-id, id-nl, en-id, or id-en."), { status: 400 });
  }

  const effectiveMode: InterpreterMode = interpreterMode ?? "en-id";

  // Agent mode: multi-step task execution with tools
  if (sessionMode === 'agent') {
    if (!input) {
      return NextResponse.json(errorPayload('Input is required.'), { status: 400 });
    }

    try {
      // Create a step executor that uses tools when available
      const stepExecutor = async (step: import('../../../lib/interpreter/types').AgentStep, _plan: import('../../../lib/interpreter/types').AgentPlan) => {
        if (step.tool && toolRegistry.has(step.tool)) {
          // Tool step: execute via toolExecutor
          const result = await toolExecutor.execute(step.tool, {
            text: step.description,
            input: step.description,
            query: step.description,
          });
          return {
            output: result.success ? result.output : `Tool '${step.tool}' failed: ${result.error || 'unknown error'}`,
            error: result.success ? undefined : result.error,
          };
        }
        // Non-tool step: placeholder (Phase A — future: LLM execution)
        return { output: step.description };
      };

      const result = await agentLoop.execute(input, effectiveMode, stepExecutor);
      agentLoop.reset();

      const payload: InterpreterResponsePayload = {
        translatedText: result.finalOutput,
        error: null,
        provider: null,
        model: null,
        fallbackUsed: false,
        fallbackChainTried: [],
        learningMatchesCount: 0,
        learningTypesUsed: [],
        learningSuggestions: [],
        agentPlan: result.plan,
        agentSteps: result.completedSteps,
      };

      return NextResponse.json(payload);
    } catch (err) {
      agentLoop.reset();
      return NextResponse.json(
        errorPayload(routeErrorMessage(err)),
        { status: 500 },
      );
    }
  }

  // Autonomous mode: full plan→execute→observe→adjust loop
  if (sessionMode === 'autonomous') {
      if (!input) {
          return NextResponse.json(errorPayload('Input is required.'), { status: 400 });
      }
      
      try {
          const result = await autonomousAgent.run(input, effectiveMode);
          autonomousAgent.reset();
          
          // Include suggestions so the frontend can show proactive prompts
          const suggestions: SuggestedLearning[] = result.suggestions.map((s) => ({
              id: s.id,
              kind: 'style' as const, // map to existing format for frontend compat
              sourceText: s.text,
              suggestion: s.source,
              mode: effectiveMode,
              createdAt: new Date().toISOString(),
          }));
          
          const payload: InterpreterResponsePayload = {
              translatedText: result.finalOutput,
              error: null,
              provider: null,
              model: null,
              fallbackUsed: false,
              fallbackChainTried: [],
              learningMatchesCount: 0,
              learningTypesUsed: [],
              learningSuggestions: suggestions,
              agentPlan: result.plan,
              agentSteps: result.plan.steps,
          };
          
          return NextResponse.json(payload);
      } catch (err) {
          autonomousAgent.reset();
          return NextResponse.json(
              errorPayload(routeErrorMessage(err)),
              { status: 500 },
          );
      }
  }

  const learningContext = await learningStore.listRelevant(input, effectiveMode);

  // History is always used — the unified assistant is conversational.
  // In tolk skill mode, history is suppressed (stateless translation).
  const assistantHistory = normalizeAssistantHistory(body.history);

  const buildMessages = (strict: boolean) =>
    isTolkSkillActive
      ? composeInterpreterPrompt({
          input,
          learningEntries: learningContext.context,
          mode: interpreterMode!,
          strict,
        })
      : composeUnifiedPrompt({
          input,
          learningEntries: learningContext.context,
          history: assistantHistory,
          mode: effectiveMode,
        });

  let translation = await requestTranslation(buildMessages(false), { signal });
  let translatedText = cleanInterpreterOutput(translation.translatedText ?? "");
  let fallbackChainTried = translation.fallbackChainTried;

  // Quality guard: in tolk skill mode, retry with strict prompt if output looks wrong.
  // In assistant mode, still check but only retry if clearly a bad translation (wrong language).
  if (
    translatedText &&
    interpreterMode &&
    (outputLooksWrongLanguage(translatedText, interpreterMode) ||
      (isTolkSkillActive && outputLooksTooLiteral(input, translatedText)))
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

  // Handle learning confirmation from client
  if (body.confirmLearning && typeof body.confirmLearning === 'object') {
    const confirm = body.confirmLearning as { id?: unknown; accepted?: unknown };
    if (typeof confirm.id === 'string' && typeof confirm.accepted === 'boolean') {
      if (confirm.accepted) {
        await conversationLearner.confirmSuggestion(confirm.id);
      } else {
        await conversationLearner.rejectSuggestion(confirm.id);
      }
    }
  }

  // Trigger conversation learning for assistant mode (skip for force-translate)
  let learningSuggestions: SuggestedLearning[] = [];
  if (!isTolkSkillActive && translatedText) {
    await conversationLearner.learnFromTurn(input, translatedText, effectiveMode);
    learningSuggestions = await conversationLearner.getPendingSuggestions();
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
    learningSuggestions,
  };

  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, 30, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly.", retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

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
