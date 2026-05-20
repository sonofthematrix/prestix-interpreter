import type { SessionMode } from "./types";
import type { SpeechInputEngine } from "./microphonePermission";

export type RecognitionLang = "id-ID" | "nl-NL";

export type AssistantMicGreeting = {
  /** TTS routing: Dutch output uses id-nl (NL voice / language_code nl). */
  mode: "id-nl";
  text: string;
};

export function shouldQueueAssistantMicGreeting({
  conversationCount,
  hasSpokenGreeting,
  lastOutput,
  sessionMode,
  speechInputEngine,
}: {
  conversationCount: number;
  hasSpokenGreeting: boolean;
  lastOutput: string;
  sessionMode: SessionMode;
  speechInputEngine: SpeechInputEngine;
}): boolean {
  return (
    sessionMode === "assistant" &&
    speechInputEngine === "browser" &&
    !hasSpokenGreeting &&
    conversationCount === 0 &&
    !lastOutput.trim()
  );
}

/** Eén vaste begroeting: assistent praat alleen Nederlands. */
export function getAssistantGreeting(): AssistantMicGreeting {
  return {
    mode: "id-nl",
    text: "Hé, Prestix hier — zeg het maar, ik denk met je mee.",
  };
}
