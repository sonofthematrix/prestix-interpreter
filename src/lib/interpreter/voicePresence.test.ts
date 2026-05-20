import { describe, expect, it } from "vitest";
import { getVoicePresenceCopy } from "./voicePresence";

describe("voice presence copy", () => {
  it("returns unified prestix core label for assistant mode", () => {
    expect(getVoicePresenceCopy("assistant")).toEqual({
      label: "prestix core",
      hint: "voice-first assistant online",
    });
  });

  it("returns unified prestix core label for interpreter mode", () => {
    expect(getVoicePresenceCopy("interpreter")).toEqual({
      label: "prestix core",
      hint: "voice-first assistant online",
    });
  });
});
