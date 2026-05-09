import { describe, expect, it } from "vitest";
import { shouldSkipElevenLabsError } from "./elevenlabsError";

describe("elevenlabs error classifier", () => {
  it("skips unusual activity free-tier blocks so browser voice can take over", () => {
    expect(
      shouldSkipElevenLabsError(
        '{"detail":{"status":"detected_unusual_activity","message":"Free Tier usage disabled."}}',
      ),
    ).toBe(true);
  });

  it("does not skip ordinary auth/config errors", () => {
    expect(shouldSkipElevenLabsError('{"detail":{"status":"invalid_api_key"}}')).toBe(false);
    expect(shouldSkipElevenLabsError('plain text error')).toBe(false);
  });
});
