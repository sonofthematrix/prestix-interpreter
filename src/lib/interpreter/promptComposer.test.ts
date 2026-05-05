import { describe, expect, it } from "vitest";
import {
  cleanInterpreterOutput,
  composeInterpreterPrompt,
  outputLooksTooLiteral,
  outputLooksWrongLanguage,
} from "./promptComposer";

describe("interpreter prompt composer", () => {
  it("does not reject a natural English output just because it preserves the name Wali", () => {
    expect(outputLooksWrongLanguage("So if I invite Wali, we're screwed.", "id-en")).toBe(false);
  });

  it("still rejects Indonesian output for id-en mode", () => {
    expect(outputLooksWrongLanguage("Jadi kalau gua ajak Wali mampus nih.", "id-en")).toBe(true);
  });

  it("detects too-literal output with high token overlap", () => {
    expect(
      outputLooksTooLiteral(
        "Saya mau pesan kamar untuk malam ini",
        "Saya mau pesan kamar untuk malam ini",
      ),
    ).toBe(true);
  });

  it("cleans common quote and markdown wrappers from provider output", () => {
    expect(cleanInterpreterOutput('"They do not understand."')).toBe("They do not understand.");
    expect(cleanInterpreterOutput("```text\nSaya mau pesan kamar untuk malam ini.\n```")).toBe(
      "Saya mau pesan kamar untuk malam ini.",
    );
  });

  it("puts learning context between the base rule and current input", () => {
    const messages = composeInterpreterPrompt({
      input: "Gua mau pesan kamar buat malam ini",
      learningEntries: "Glossary memory:\n1. gua = I/me, informal Indonesian slang.",
      mode: "id-en",
    });

    expect(messages.map((message) => message.role)).toEqual(["system", "system", "user"]);
    expect(messages[0]?.content).toContain("Output English only.");
    expect(messages[1]?.content).toContain("Glossary memory");
    expect(messages[2]?.content).toContain("Gua mau pesan kamar buat malam ini");
  });
});
