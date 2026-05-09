const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/phase2-flow";

await page.reload({ waitUntil: "networkidle" });
await page.getByLabel("Interpreter input").click();

await page.evaluate(() => {
  window.__mockSpeech.emitResult([
    {
      isFinal: true,
      transcript: "Mereka tidak mengerti",
    },
  ]);
});

await page.waitForFunction(() =>
  document.body.innerText.includes("They don't understand."),
);

const bodyText = await page.locator("body").innerText();

if (!bodyText.includes("Mereka tidak mengerti")) {
  throw new Error("LIVE scenario failed: source text missing from conversation log.");
}

if (!bodyText.includes("They don't understand.")) {
  throw new Error("LIVE scenario failed: translated output missing.");
}

await page.screenshot({
  path: `${artifactRoot}/scenario-live.png`,
  fullPage: true,
});

console.log("SCENARIO_LIVE_OK");
