const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/phase2-flow";

await page.route("**/api/interpreter", async (route) => {
  const body = route.request().postDataJSON() ?? {};
  const input = typeof body.input === "string" ? body.input.trim() : "";
  const mode = body.mode === "id-en" ? "id-en" : "en-id";

  const translations = {
    "Mereka tidak mengerti": "They don't understand.",
    "Saya mau pesan kamar untuk malam ini karena saya datang terlambat dan teman saya belum sampai":
      "I want to book a room for tonight because I arrived late and my friend has not arrived yet.",
    "Kalau dia ikut, nanti ribet banget": "If he joins, it'll get really complicated.",
    "Can you ask him if the room is ready?": "Bisa tanya dia apakah kamarnya sudah siap?",
  };

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

await page.reload({ waitUntil: "networkidle" });
await page.getByLabel("Interpreter input").click();
await page.waitForTimeout(200);
await page.screenshot({
  path: `${artifactRoot}/setup-ready.png`,
  fullPage: true,
});

console.log("SETUP_OK");
