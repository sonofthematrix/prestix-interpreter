import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:3000";
const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/assistant-mode";

const assistantReplies = {
  "hello there": "Hello! How can I help you today?",
  "halo apa kabar": "Halo, kabar baik. Kamu gimana?",
};

async function installMocks(page) {
  await page.route("**/api/interpreter", async (route) => {
    const body = route.request().postDataJSON() ?? {};
    const input = typeof body.input === "string" ? body.input.trim().toLowerCase() : "";
    const sessionMode = body.sessionMode === "assistant" ? "assistant" : "interpreter";
    const mode = body.mode === "id-en" ? "id-en" : "en-id";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        translatedText:
          sessionMode === "assistant"
            ? assistantReplies[input] ?? `assistant:${mode}:${input}`
            : `interpreter:${mode}:${input}`,
        provider: "mock-provider",
        model: sessionMode === "assistant" ? "mock-assistant" : "mock-interpreter",
        fallbackUsed: false,
        learningMatchesCount: 0,
        learningTypesUsed: [],
        fallbackChainTried: [`mock-provider hit (${sessionMode})`],
      }),
    });
  });

  await page.route("**/api/interpreter/voice**", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ voices: [] }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "audio/mpeg",
      body: "mock-audio",
    });
  });

  await page.addInitScript(() => {
    localStorage.clear();

    class MockSpeechSynthesisUtterance {
      constructor(text) {
        this.text = text;
        this.lang = "";
        this.rate = 1;
        this.onend = null;
        this.onerror = null;
      }
    }

    window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    window.speechSynthesis = {
      cancel() {},
      getVoices() {
        return [];
      },
      speak(utterance) {
        setTimeout(() => {
          utterance.onend?.();
        }, 25);
      },
    };

    class MockAudio {
      constructor() {
        this.onended = null;
        this.onerror = null;
        this.src = "";
      }

      play() {
        setTimeout(() => {
          this.onended?.();
        }, 25);

        return Promise.resolve();
      }

      pause() {}
    }

    window.Audio = MockAudio;

    window.__mockSpeech = {
      recognition: null,
      started: 0,
      startCalls: [],
      stopCalls: 0,
      emitFinal(transcript) {
        const recognition = this.recognition;
        if (!recognition?.onresult) {
          return;
        }

        recognition.onresult({
          resultIndex: 0,
          results: [
            {
              isFinal: true,
              0: {
                transcript,
                confidence: 0.92,
              },
            },
          ],
        });
      },
      emitNoSpeech() {
        this.recognition?.onerror?.({ error: "no-speech" });
      },
    };

    class MockSpeechRecognition {
      constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = "id-ID";
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
        this.onresult = null;
        window.__mockSpeech.recognition = this;
      }

      start() {
        window.__mockSpeech.started += 1;
        window.__mockSpeech.startCalls.push(this.lang);
        this.onstart?.();
      }

      stop() {
        window.__mockSpeech.stopCalls += 1;
        this.onend?.();
      }
    }

    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });
}

async function expectText(page, expected, timeout = 8000) {
  await page.waitForFunction(
    (needle) => document.body.innerText.toLowerCase().includes(String(needle).toLowerCase()),
    expected,
    { timeout },
  );
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await installMocks(page);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.getByLabel("Interpreter input").click();
    await page.waitForTimeout(300);

    await expectText(page, "assistant mode");
    await expectText(page, "awaiting assistant reply...");
    await page.getByRole("button", { name: /^english$/i }).click();
    await page.waitForTimeout(700);
    await expectText(page, "speech en-us");

    const startedAfterArm = await page.evaluate(() => window.__mockSpeech.started);
    if (startedAfterArm < 1) {
      throw new Error("ASSISTANT: browser mic did not arm after focus.");
    }

    await page.evaluate(() => {
      window.__mockSpeech.emitFinal("hello there");
    });

    await expectText(page, "hello there");
    await expectText(page, "hello! how can i help you today?");
    await expectText(page, "session assistant");
    await expectText(page, "assistant idle");
    await expectText(page, "en -> id");

    await page.evaluate(() => {
      window.__mockSpeech.emitNoSpeech();
    });

    await page.waitForTimeout(700);

    const recognitionState = await page.evaluate(() => ({
      started: window.__mockSpeech.started,
      startCalls: window.__mockSpeech.startCalls,
      stopCalls: window.__mockSpeech.stopCalls,
      bodyText: document.body.innerText,
    }));

    if (recognitionState.started < 3) {
      throw new Error("ASSISTANT: no-speech recovery did not restart recognition.");
    }

    if (!recognitionState.bodyText.toLowerCase().includes("assistant")) {
      throw new Error("ASSISTANT: session label not visible.");
    }

    if (!recognitionState.bodyText.includes("EN -> ID")) {
      throw new Error("ASSISTANT: English speech still resolved to the wrong mode.");
    }

    if (!recognitionState.startCalls.includes("en-US")) {
      throw new Error("ASSISTANT: assistant mic language control did not restart recognition in English.");
    }

    await page.screenshot({
      path: `${artifactRoot}/assistant-mode-browser-check.png`,
      fullPage: true,
    });

    console.log("ASSISTANT_MODE_BROWSER_CHECK_OK");
    console.log(JSON.stringify(recognitionState));
  } finally {
    await page.close();
    await browser.close();
  }
}

await main();
