const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/phase2-flow";
const storyInput =
  "Saya mau pesan kamar untuk malam ini karena saya datang terlambat dan teman saya belum sampai";
const storyOutput =
  "I want to book a room for tonight because I arrived late and my friend has not arrived yet.";

await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: /^story$/i }).click();
await page.getByLabel("Interpreter input").click();

await page.evaluate((input) => {
  window.__mockSpeech.emitResult([
    {
      isFinal: true,
      transcript: input,
    },
  ]);
  window.__mockSpeech.emitEnd();
}, storyInput);

await page.waitForTimeout(900);

const earlyText = await page.locator("body").innerText();

if (!earlyText.includes(storyInput)) {
  throw new Error("STORY scenario failed: buffered text disappeared after recognition end.");
}

if (earlyText.includes(storyOutput)) {
  throw new Error("STORY scenario failed: segment flushed too early.");
}

await page.waitForFunction(
  (expectedOutput) => document.body.innerText.includes(expectedOutput),
  storyOutput,
);

const finalText = await page.locator("body").innerText();

if (!finalText.includes(storyInput) || !finalText.includes(storyOutput)) {
  throw new Error("STORY scenario failed: final segment or translation missing.");
}

await page.screenshot({
  path: `${artifactRoot}/scenario-story.png`,
  fullPage: true,
});

console.log("SCENARIO_STORY_OK");
