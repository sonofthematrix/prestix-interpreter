import { afterEach, describe, expect, it, vi } from "vitest";
import { requestTranslation } from "./providerRouter";
import type { ChatMessage } from "./types";

const originalEnv = { ...process.env };

function restoreEnv() {
  process.env = { ...originalEnv };
}

const messages: ChatMessage[] = [
  {
    role: "system",
    content: "Output English only.",
  },
  {
    role: "user",
    content: "Mereka tidak mengerti",
  },
];

describe("provider router", () => {
  afterEach(() => {
    restoreEnv();
    vi.unstubAllGlobals();
  });

  it("uses Gemini before DeepSeek when Tokenizin is not configured", async () => {
    restoreEnv();
    delete process.env.TOKENIZIN_API_KEY;
    delete process.env.TOKENIZIN_BASE_URL;
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL_FAST = "gemini-2.0-flash";
    process.env.DEEPSEEK_API_KEY = "test-deepseek-key";

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "They don't understand." }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestTranslation(messages);

    expect(result).toMatchObject({
      fallbackUsed: true,
      failedStatus: null,
      model: "gemini-2.0-flash",
      provider: "gemini",
      translatedText: "They don't understand.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const firstCall = fetchMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(String(firstCall?.[0])).toContain("generativelanguage.googleapis.com");
  });
});
