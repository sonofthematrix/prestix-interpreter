import { describe, expect, it } from "vitest";
import { pickPreferredBrowserVoice } from "./browserVoice";

describe("browser voice picker", () => {
  it("prefers the same-language default voice before robotic name heuristics", () => {
    const voice = pickPreferredBrowserVoice(
      [
        { name: "Google UK English Male", lang: "en-GB", default: false },
        { name: "Google US English", lang: "en-US", default: true },
      ],
      "en-US",
    );

    expect(voice?.name).toBe("Google US English");
  });

  it("prefers Indonesian voices for Indonesian output", () => {
    const voice = pickPreferredBrowserVoice(
      [
        { name: "Google US English Male", lang: "en-US", default: false },
        { name: "Bahasa Indonesia Male", lang: "id-ID", default: false },
      ],
      "id-ID",
    );

    expect(voice?.lang).toBe("id-ID");
    expect(voice?.name).toContain("Male");
  });

  it("falls back to same-language default when no male-coded name exists", () => {
    const voice = pickPreferredBrowserVoice(
      [
        { name: "Google US English", lang: "en-US", default: true },
        { name: "Google Deutsch", lang: "de-DE", default: false },
      ],
      "en-US",
    );

    expect(voice?.name).toBe("Google US English");
  });

  it("returns null when no voice matches target language (avoid French for Dutch TTS)", () => {
    const voice = pickPreferredBrowserVoice(
      [
        { name: "Thomas", lang: "fr-FR", default: true },
        { name: "Amélie", lang: "fr-FR", default: false },
      ],
      "nl-NL",
    );

    expect(voice).toBeNull();
  });
});
