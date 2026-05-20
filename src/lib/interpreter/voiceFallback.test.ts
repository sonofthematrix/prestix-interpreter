import { describe, expect, it } from "vitest";
import { resolveTtsFallbackProvider } from "./voiceFallback";

describe("tts fallback provider", () => {
  it("uses openai when elevenlabs is blocked but openai is available", () => {
    expect(resolveTtsFallbackProvider({
      elevenLabsBlocked: true,
      openAiApiKeyPresent: true,
    })).toBe("openai");
  });

  it("stays on elevenlabs when there is no blocker", () => {
    expect(resolveTtsFallbackProvider({
      elevenLabsBlocked: false,
      openAiApiKeyPresent: true,
    })).toBe("elevenlabs");
  });

  it("returns none when elevenlabs is blocked and no openai key exists", () => {
    expect(resolveTtsFallbackProvider({
      elevenLabsBlocked: true,
      openAiApiKeyPresent: false,
    })).toBe("none");
  });
});
