import { describe, expect, it } from "vitest";
import {
  getIdleOutputPlaceholder,
  getStandbySpeechOutputProvider,
  resolveSendNowAction,
  shouldUseBrowserTtsFallback,
} from "./assistantUx";

describe("assistant UX helpers", () => {
  it("submits typed input when send now is pressed with text", () => {
    expect(resolveSendNowAction("  hello  ")).toBe("submit-input");
  });

  it("flushes the speech buffer when send now is pressed without typed text", () => {
    expect(resolveSendNowAction("   ")).toBe("flush-buffer");
  });

  it("marks browser voice as ready when speech synthesis is available", () => {
    expect(getStandbySpeechOutputProvider(true)).toBe("browser");
    expect(getStandbySpeechOutputProvider(false)).toBe("pending");
  });

  it("shows a voice-first idle prompt when spoken replies are available", () => {
    expect(getIdleOutputPlaceholder("browser")).toBe("Tap handsfree mic and start talking.");
    expect(getIdleOutputPlaceholder("elevenlabs")).toBe("Tap handsfree mic and start talking.");
  });

  it("explains when browser voice is unavailable", () => {
    expect(getIdleOutputPlaceholder("unsupported")).toBe("Voice output unsupported in this browser.");
  });

  it("shows a unified Prestix-ready placeholder when speech output is still pending", () => {
    expect(getIdleOutputPlaceholder("pending")).toBe("Prestix is ready.");
    expect(getIdleOutputPlaceholder("error")).toBe("Prestix is ready.");
  });

  it("falls back to browser speech when server TTS is unavailable but the browser can speak", () => {
    expect(shouldUseBrowserTtsFallback(204, true)).toBe(true);
    expect(shouldUseBrowserTtsFallback(500, true)).toBe(true);
    expect(shouldUseBrowserTtsFallback(204, false)).toBe(false);
  });
});
