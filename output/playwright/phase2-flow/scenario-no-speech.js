const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/phase2-flow";
const recoveryInput = "Mereka tidak mengerti";
const recoveryOutput = "They don't understand.";

await page.reload({ waitUntil: "networkidle" });
await page.getByLabel("Interpreter input").click();

await page.evaluate(() => {
  window.__mockSpeech.emitError("no-speech");
});

await page.waitForTimeout(700);

const afterErrorText = await page.locator("body").innerText();

if (afterErrorText.includes("ERROR:")) {
  throw new Error("NO_SPEECH scenario failed: fatal error banner was shown.");
}

if (!afterErrorText.includes("no-speech ignored")) {
  throw new Error("NO_SPEECH scenario failed: flow log did not record ignored no-speech.");
}

await page.evaluate((input) => {
  window.__mockSpeech.emitResult([
    {
      isFinal: true,
      transcript: input,
    },
  ]);
}, recoveryInput);

await page.waitForFunction(
  (expectedOutput) => document.body.innerText.includes(expectedOutput),
  recoveryOutput,
);

await page.screenshot({
  path: `${artifactRoot}/scenario-no-speech.png`,
  fullPage: true,
});

console.log("SCENARIO_NO_SPEECH_OK");
