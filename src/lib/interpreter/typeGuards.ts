import type { InterpreterMode, SessionMode } from "./types";

/** Duplicated across route.ts, learningStore.ts, providerRouter.ts, voice/page.tsx. Single source. */
export function isInterpreterMode(value: unknown): value is InterpreterMode {
  return value === "nl-id" || value === "id-nl" || value === "en-id" || value === "id-en";
}

/** Duplicated across route.ts and voice/page.tsx. Single source. */
export function isSessionMode(value: unknown): value is SessionMode {
  return value === "interpreter" || value === "assistant" || value === "agent" || value === "autonomous";
}
