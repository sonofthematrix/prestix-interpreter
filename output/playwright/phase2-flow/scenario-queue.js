const artifactRoot =
  "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/output/playwright/phase2-flow";
const firstInput = "Kalau dia ikut, nanti ribet banget";
const firstOutput = "If he joins, it'll get really complicated.";
const secondInput = "Can you ask him if the room is ready?";
const secondOutput = "Bisa tanya dia apakah kamarnya sudah siap?";

await page.reload({ waitUntil: "networkidle" });
await page.getByRole("button", { name: /^live$/i }).click();
await page.getByLabel("Interpreter input").click();

await page.evaluate((input) => {
  window.__mockSpeech.emitResult([
    {
      isFinal: true,
      transcript: input,
    },
  ]);
}, firstInput);

await page.waitForTimeout(900);

await page.evaluate((input) => {
  window.__mockSpeech.emitResult([
    {
      isFinal: true,
      transcript: input,
    },
  ]);
}, secondInput);

await page.waitForTimeout(900);

const midText = await page.locator("body").innerText();

if (!midText.includes(firstInput) || !midText.includes(secondInput)) {
  throw new Error("QUEUE scenario failed: one of the inputs did not reach the log.");
}

if (!midText.includes("pending") && !midText.includes("translating")) {
  throw new Error("QUEUE scenario failed: no queued or translating state was visible.");
}

await page.waitForFunction(
  ([expectedA, expectedB]) =>
    document.body.innerText.includes(expectedA) &&
    document.body.innerText.includes(expectedB),
  [firstOutput, secondOutput],
);

const finalText = await page.locator("body").innerText();

if (!finalText.includes(firstOutput) || !finalText.includes(secondOutput)) {
  throw new Error("QUEUE scenario failed: translated outputs missing.");
}

await page.screenshot({
  path: `${artifactRoot}/scenario-queue.png`,
  fullPage: true,
});

console.log("SCENARIO_QUEUE_OK");
