import { describe, expect, it } from "vitest";
import { getAssistantGreeting, shouldQueueAssistantMicGreeting } from "./assistantGreeting";

describe("assistant mic greeting helpers", () => {
  it("queues the greeting only for a first-time browser assistant session", () => {
    expect(
      shouldQueueAssistantMicGreeting({
        conversationCount: 0,
        hasSpokenGreeting: false,
        lastOutput: "",
        sessionMode: "assistant",
        speechInputEngine: "browser",
      }),
    ).toBe(true);
  });

  it("does not queue the greeting after the conversation already started", () => {
    expect(
      shouldQueueAssistantMicGreeting({
        conversationCount: 1,
        hasSpokenGreeting: false,
        lastOutput: "",
        sessionMode: "assistant",
        speechInputEngine: "browser",
      }),
    ).toBe(false);
  });

  it("does not queue the greeting twice or outside browser assistant mode", () => {
    expect(
      shouldQueueAssistantMicGreeting({
        conversationCount: 0,
        hasSpokenGreeting: true,
        lastOutput: "",
        sessionMode: "assistant",
        speechInputEngine: "browser",
      }),
    ).toBe(false);

    expect(
      shouldQueueAssistantMicGreeting({
        conversationCount: 0,
        hasSpokenGreeting: false,
        lastOutput: "",
        sessionMode: "interpreter",
        speechInputEngine: "browser",
      }),
    ).toBe(false);

    expect(
      shouldQueueAssistantMicGreeting({
        conversationCount: 0,
        hasSpokenGreeting: false,
        lastOutput: "",
        sessionMode: "assistant",
        speechInputEngine: "local-whisper",
      }),
    ).toBe(false);
  });

  it("returns a Dutch spoken greeting routed for id-nl TTS", () => {
    expect(getAssistantGreeting()).toEqual({
      mode: "id-nl",
      text: "Hé, Prestix hier — zeg het maar, ik denk met je mee.",
    });
  });
});
