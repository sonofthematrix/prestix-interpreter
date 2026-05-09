import { chromium } from "playwright";

const baseUrl = "http://127.0.0.1:3000";
const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/phase2-flow";
let translationCallCount = 0;

const translations = {
  "Mereka tidak mengerti": "They don't understand.",
  "Saya mau pesan kamar untuk malam ini karena saya datang terlambat dan teman saya belum sampai":
    "I want to book a room for tonight because I arrived late and my friend has not arrived yet.",
  "Kalau dia ikut, nanti ribet banget": "If he joins, it'll get really complicated.",
  "Can you ask him if the room is ready?": "Bisa tanya dia apakah kamarnya sudah siap?",
};

async function installMocks(page) {
  await page.route("**/api/interpreter", async (route) => {
    translationCallCount += 1;
    const body = route.request().postDataJSON() ?? {};
    const input = typeof body.input === "string" ? body.input.trim() : "";
    const mode = body.mode === "id-en" ? "id-en" : "en-id";
    const delayMs = input === "Kalau dia ikut, nanti ribet banget" ? 2500 : 150;

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        translatedText: translations[input] ?? `${mode}: ${input}`,
        provider: "mock-provider",
        model: delayMs > 1000 ? "mock-slow" : "mock-fast",
        fallbackUsed: false,
        learningMatchesCount: 0,
        learningTypesUsed: [],
        fallbackChainTried: ["mock-provider hit"],
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
      status: 204,
      body: "",
    });
  });

  await page.addInitScript(() => {
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
      speak(utterance) {
        setTimeout(() => {
          if (typeof utterance.onend === "function") {
            utterance.onend();
          }
        }, 25);
      },
    };

    window.__mockSpeech = {
      recognition: null,
      started: 0,
      emitResult(chunks) {
        const recognition = this.recognition;
        if (!recognition || typeof recognition.onresult !== "function") {
          return;
        }

        const results = chunks.map((chunk) => ({
          isFinal: Boolean(chunk.isFinal),
          0: {
            transcript: chunk.transcript,
            confidence: chunk.confidence ?? 0.92,
          },
        }));

        recognition.onresult({
          resultIndex: 0,
          results,
        });
      },
      emitError(error) {
        const recognition = this.recognition;
        recognition?.onerror?.({ error });
      },
      emitEnd() {
        const recognition = this.recognition;
        recognition?.onend?.();
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
        this.onstart?.();
      }

      stop() {
        this.onend?.();
      }
    }

    window.SpeechRecognition = MockSpeechRecognition;
    window.webkitSpeechRecognition = MockSpeechRecognition;
  });
}

async function resetPage(page, { preserveStorage = false } = {}) {
  if (!preserveStorage) {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());
  }

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Interpreter input").click();
  await page.waitForTimeout(200);
}

async function bodyText(page) {
  return page.locator("body").innerText();
}

async function scenarioLive(page) {
  translationCallCount = 0;
  await resetPage(page);

  await page.evaluate(() => {
    window.__mockSpeech.emitResult([
      { isFinal: true, transcript: "Mereka tidak mengerti" },
    ]);
  });

  await page.waitForFunction(() =>
    document.body.innerText.includes("They don't understand."),
  );

  const text = await bodyText(page);
  if (!text.includes("Mereka tidak mengerti")) {
    throw new Error("LIVE: source text missing.");
  }
  if (!text.includes("They don't understand.")) {
    throw new Error("LIVE: translation missing.");
  }

  await page.screenshot({
    path: `${artifactRoot}/scenario-live.png`,
    fullPage: true,
  });
}

async function scenarioStory(page) {
  const storyInput =
    "Saya mau pesan kamar untuk malam ini karena saya datang terlambat dan teman saya belum sampai";
  const storyOutput =
    "I want to book a room for tonight because I arrived late and my friend has not arrived yet.";

  translationCallCount = 0;
  await resetPage(page);
  await page.getByRole("button", { name: /^story$/i }).click();

  await page.evaluate((input) => {
    window.__mockSpeech.emitResult([{ isFinal: true, transcript: input }]);
    window.__mockSpeech.emitEnd();
  }, storyInput);

  await page.waitForTimeout(900);

  const earlyText = await bodyText(page);
  if (!earlyText.includes(storyInput)) {
    throw new Error("STORY: buffered text disappeared after recognition end.");
  }
  if (earlyText.includes(storyOutput)) {
    throw new Error("STORY: segment flushed too early.");
  }

  await page.waitForFunction(
    (expectedOutput) => document.body.innerText.includes(expectedOutput),
    storyOutput,
    { timeout: 8000 },
  );

  const finalText = await bodyText(page);
  if (!finalText.includes(storyInput) || !finalText.includes(storyOutput)) {
    throw new Error("STORY: final segment or translation missing.");
  }

  await page.screenshot({
    path: `${artifactRoot}/scenario-story.png`,
    fullPage: true,
  });
}

async function scenarioQueue(page) {
  const firstInput = "Kalau dia ikut, nanti ribet banget";
  const firstOutput = "If he joins, it'll get really complicated.";
  const secondInput = "Can you ask him if the room is ready?";
  const secondOutput = "Bisa tanya dia apakah kamarnya sudah siap?";

  translationCallCount = 0;
  await resetPage(page);
  await page.getByRole("button", { name: /^live$/i }).click();

  await page.evaluate((input) => {
    window.__mockSpeech.emitResult([{ isFinal: true, transcript: input }]);
  }, firstInput);

  await page.waitForTimeout(900);

  await page.evaluate((input) => {
    window.__mockSpeech.emitResult([{ isFinal: true, transcript: input }]);
  }, secondInput);

  await page.waitForTimeout(900);

  const midText = await bodyText(page);
  if (!midText.includes(firstInput) || !midText.includes(secondInput)) {
    throw new Error("QUEUE: one of the inputs did not reach the log.");
  }
  if (!midText.includes("pending") && !midText.includes("translating")) {
    throw new Error("QUEUE: no queued or translating state was visible.");
  }

  await page.waitForFunction(
    ([expectedA, expectedB]) =>
      document.body.innerText.includes(expectedA) &&
      document.body.innerText.includes(expectedB),
    [firstOutput, secondOutput],
    { timeout: 8000 },
  );

  const finalText = await bodyText(page);
  if (!finalText.includes(firstOutput) || !finalText.includes(secondOutput)) {
    throw new Error("QUEUE: translated outputs missing.");
  }

  await page.screenshot({
    path: `${artifactRoot}/scenario-queue.png`,
    fullPage: true,
  });
}

async function scenarioNoSpeech(page) {
  const recoveryInput = "Mereka tidak mengerti";
  const recoveryOutput = "They don't understand.";

  translationCallCount = 0;
  await resetPage(page);

  await page.evaluate(() => {
    window.__mockSpeech.emitError("no-speech");
  });

  await page.waitForTimeout(700);

  const afterErrorText = await bodyText(page);
  if (afterErrorText.includes("ERROR:")) {
    throw new Error("NO_SPEECH: fatal error banner was shown.");
  }
  if (!afterErrorText.includes("no-speech ignored")) {
    throw new Error("NO_SPEECH: flow log did not record ignored no-speech.");
  }

  await page.evaluate((input) => {
    window.__mockSpeech.emitResult([{ isFinal: true, transcript: input }]);
  }, recoveryInput);

  await page.waitForFunction(
    (expectedOutput) => document.body.innerText.includes(expectedOutput),
    recoveryOutput,
    { timeout: 5000 },
  );

  await page.screenshot({
    path: `${artifactRoot}/scenario-no-speech.png`,
    fullPage: true,
  });
}

async function scenarioSpeakerLabeling(page) {
  translationCallCount = 0;
  await resetPage(page);

  await page.getByRole("button", { name: /^speaker b$/i }).first().click();
  await page.waitForTimeout(150);
  await page.reload({ waitUntil: "networkidle" });

  const persistedActiveSpeaker = await page.evaluate(() =>
    localStorage.getItem("prestix-interpreter-active-speaker"),
  );
  const activeSpeakerButtonPressed = await page
    .getByRole("button", { name: /^speaker b$/i })
    .first()
    .getAttribute("aria-pressed");
  if (persistedActiveSpeaker !== "speaker_b" || activeSpeakerButtonPressed !== "true") {
    const persistedHeader = await bodyText(page);
    throw new Error(
      `SPEAKER: active speaker did not persist after reload. storage=${persistedActiveSpeaker} pressed=${activeSpeakerButtonPressed} text=${persistedHeader.slice(0, 400)}`,
    );
  }

  await page.getByLabel("Interpreter input").click();
  await page.evaluate(() => {
    window.__mockSpeech.emitResult([
      { isFinal: true, transcript: "Mereka tidak mengerti" },
    ]);
  });

  await page.waitForFunction(() =>
    document.body.innerText.includes("They don't understand."),
  );

  const beforeRelabelCalls = translationCallCount;
  await page.getByRole("button", { name: /show all/i }).click();
  await page.getByRole("button", { name: /\? unknown/i }).first().click();
  await page.waitForTimeout(400);

  if (translationCallCount !== beforeRelabelCalls) {
    throw new Error("SPEAKER: relabeling triggered a new translation request.");
  }

  const relabeledText = await bodyText(page);
  if (!relabeledText.includes("They don't understand.")) {
    throw new Error("SPEAKER: translated output changed after relabel.");
  }

  await page.reload({ waitUntil: "networkidle" });
  const persistedEntryText = await bodyText(page);
  if (!persistedEntryText.includes("Unknown")) {
    throw new Error("SPEAKER: relabeled entry did not persist after reload.");
  }

  await page.screenshot({
    path: `${artifactRoot}/scenario-speaker-labeling.png`,
    fullPage: true,
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1200 },
});
const page = await context.newPage();

try {
  await installMocks(page);
  await resetPage(page);
  await page.screenshot({
    path: `${artifactRoot}/setup-ready.png`,
    fullPage: true,
  });

  await scenarioLive(page);
  await scenarioStory(page);
  await scenarioQueue(page);
  await scenarioNoSpeech(page);
  await scenarioSpeakerLabeling(page);

  console.log("PHASE2_BROWSER_CHECKS_OK");
} finally {
  await context.close();
  await browser.close();
}
