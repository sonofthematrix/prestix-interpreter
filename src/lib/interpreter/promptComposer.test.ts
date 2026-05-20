import { describe, expect, it } from "vitest";
import {
  ASSISTANT_HISTORY_MAX_CONTENT_CHARS,
  ASSISTANT_HISTORY_MAX_TURNS,
  cleanInterpreterOutput,
  composeAssistantPrompt,
  composeInterpreterPrompt,
  normalizeAssistantHistory,
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

describe("assistant prompt composer with multi-turn history", () => {
  it("builds an english-facing assistant prompt for indonesian input", () => {
    const messages = composeAssistantPrompt({
      input: "Saya mau beli air minum",
      learningEntries: "",
      mode: "id-en",
    });

    expect(messages.map((m) => m.role)).toEqual(["system", "user"]);
    expect(messages[0]?.content).toContain("Prestix");
    expect(messages[0]?.content).toContain("Reply in natural spoken English only");
    expect(messages[0]?.content).toContain("never stiff or corporate");
    expect(messages[0]?.content).toContain("Do the obvious helpful thing first");
    expect(messages[1]?.content).toBe("Saya mau beli air minum");
  });

  it("inserts prior turns between learning context and current input", () => {
    const messages = composeAssistantPrompt({
      input: "Hoe laat is het in Jakarta?",
      learningEntries: "Style memory:\n1. Keep it casual.",
      mode: "id-nl",
      history: [
        { role: "user", content: "Hoe laat is het in Londen?" },
        { role: "assistant", content: "Rond zes uur." },
      ],
    });

    expect(messages.map((m) => m.role)).toEqual([
      "system",
      "system",
      "user",
      "assistant",
      "user",
    ]);
    expect(messages[1]?.content).toContain("Style memory");
    expect(messages[2]?.content).toBe("Hoe laat is het in Londen?");
    expect(messages[3]?.content).toBe("Rond zes uur.");
    expect(messages[4]?.content).toBe("Hoe laat is het in Jakarta?");
  });

  it("normalizeAssistantHistory caps at the latest N turns", () => {
    const turns = Array.from({ length: ASSISTANT_HISTORY_MAX_TURNS + 4 }, (_, index) => ({
      role: index % 2 === 0 ? "user" : ("assistant" as const),
      content: `turn ${index}`,
    }));

    const result = normalizeAssistantHistory(turns);
    expect(result).toHaveLength(ASSISTANT_HISTORY_MAX_TURNS);
    expect(result[result.length - 1]?.content).toBe(`turn ${turns.length - 1}`);
  });

  it("normalizeAssistantHistory rejects malformed entries and trims content", () => {
    const oversized = "x".repeat(ASSISTANT_HISTORY_MAX_CONTENT_CHARS + 200);

    const result = normalizeAssistantHistory([
      null,
      "not an object",
      { role: "system", content: "should be ignored" },
      { role: "user", content: "  " },
      { role: "assistant", content: 123 },
      { role: "user", content: "  hello  " },
      { role: "assistant", content: oversized },
    ]);

    expect(result.map((turn) => turn.role)).toEqual(["user", "assistant"]);
    expect(result[0]?.content).toBe("hello");
    expect(result[1]?.content.length).toBe(ASSISTANT_HISTORY_MAX_CONTENT_CHARS);
    expect(result[1]?.content.endsWith("…[truncated]")).toBe(true);
  });

  it("ignores history when normalize is given non-array input", () => {
    expect(normalizeAssistantHistory(undefined)).toEqual([]);
    expect(normalizeAssistantHistory(null)).toEqual([]);
    expect(normalizeAssistantHistory("nope")).toEqual([]);
  });
});
