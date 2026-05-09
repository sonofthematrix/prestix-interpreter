import { describe, expect, it } from "vitest";
import {
  getStoredTranslatorEnabled,
  getTranslatorButtonLabel,
  shouldQueueTranslation,
} from "./translatorToggle";

describe("translator toggle helpers", () => {
  it("defaults translator to off unless explicitly enabled", () => {
    expect(getStoredTranslatorEnabled(null)).toBe(false);
    expect(getStoredTranslatorEnabled("false")).toBe(false);
    expect(getStoredTranslatorEnabled("true")).toBe(true);
    expect(getStoredTranslatorEnabled("junk")).toBe(false);
  });

  it("only queues translation when translator is enabled", () => {
    expect(shouldQueueTranslation(true)).toBe(true);
    expect(shouldQueueTranslation(false)).toBe(false);
  });

  it("returns a clear button label", () => {
    expect(getTranslatorButtonLabel(true)).toBe("translator on");
    expect(getTranslatorButtonLabel(false)).toBe("translator off");
  });
});
