import { afterEach, describe, expect, it, vi } from "vitest";
import { requestTranslation } from "./providerRouter";
import { resetLocalGpu } from "./localGpuProvider";
import type { ChatMessage } from "./types";

const originalEnv = { ...process.env };

function restoreEnv() {
  process.env = { ...originalEnv };
  resetLocalGpu();
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
    delete process.env.OPENAI_API_KEY;
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
      fallbackUsed: false,
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

  it("prefers local-gpu when PRESTIX_SANDBOX_TEXT_PROVIDER is set", async () => {
    restoreEnv();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.TOKENIZIN_API_KEY;
    delete process.env.TOKENIZIN_BASE_URL;
    process.env.PRESTIX_SANDBOX_TEXT_PROVIDER = "local-gpu";
    process.env.PRESTIX_ASSISTANT_MODEL = "Hermes 3B";

    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: "They don't understand.",
              },
            },
          ],
          model: "Hermes 3B",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestTranslation(messages);

    expect(result).toMatchObject({
      fallbackUsed: false,
      failedStatus: null,
      model: "Hermes 3B",
      provider: "local-gpu",
      translatedText: "They don't understand.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1/chat/completions");
  });

  it("discovers the loaded LM Studio model when no explicit model is set", async () => {
    restoreEnv();
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.TOKENIZIN_API_KEY;
    delete process.env.TOKENIZIN_BASE_URL;
    delete process.env.PRESTIX_ASSISTANT_MODEL;
    delete process.env.LM_STUDIO_MODEL;
    delete process.env.LMSTUDIO_MODEL;
    delete process.env.LOCAL_GPU_MODEL;
    process.env.PRESTIX_SANDBOX_TEXT_PROVIDER = "local-gpu";
    process.env.LM_STUDIO_BASE_URL = "http://127.0.0.1:1234/v1";

    const fetchMock = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/v1/models")) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: "prestix-hermes-3b",
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.endsWith("/v1/chat/completions")) {
        return new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: "They don't understand.",
                },
              },
            ],
            model: "prestix-hermes-3b",
          }),
          { status: 200 },
        );
      }

      throw new Error(`Unexpected fetch call: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await requestTranslation(messages);

    expect(result).toMatchObject({
      fallbackUsed: false,
      failedStatus: null,
      model: "prestix-hermes-3b",
      provider: "local-gpu",
      translatedText: "They don't understand.",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("/v1/models");
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain("/v1/chat/completions");
  });
});
