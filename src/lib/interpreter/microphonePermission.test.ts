import { describe, expect, it } from "vitest";
import {
  getStoredMicrophoneArmed,
  shouldAutoArmBrowserSpeech,
  shouldPersistMicrophoneArmed,
  type BrowserMicrophonePermissionState,
} from "./microphonePermission";

describe("microphone permission helpers", () => {
  it("auto-arms browser speech when microphone permission is already granted or a prior arm flag exists", () => {
    expect(
      shouldAutoArmBrowserSpeech({
        permissionState: "granted",
        speechInputEngine: "browser",
        storedMicrophoneArmed: false,
      }),
    ).toBe(true);

    expect(
      shouldAutoArmBrowserSpeech({
        permissionState: "unknown",
        speechInputEngine: "browser",
        storedMicrophoneArmed: true,
      }),
    ).toBe(true);

    expect(
      shouldAutoArmBrowserSpeech({
        permissionState: "prompt",
        speechInputEngine: "browser",
        storedMicrophoneArmed: true,
      }),
    ).toBe(false);

    expect(
      shouldAutoArmBrowserSpeech({
        permissionState: "granted",
        speechInputEngine: "local-whisper",
        storedMicrophoneArmed: true,
      }),
    ).toBe(false);
  });

  it("persists the once-armed flag only for browser speech with granted permission", () => {
    const granted: BrowserMicrophonePermissionState = "granted";
    const denied: BrowserMicrophonePermissionState = "denied";

    expect(shouldPersistMicrophoneArmed("browser", granted)).toBe(true);
    expect(shouldPersistMicrophoneArmed("browser", denied)).toBe(false);
    expect(shouldPersistMicrophoneArmed("local-whisper", granted)).toBe(false);
  });

  it("reads the stored once-armed flag defensively", () => {
    expect(getStoredMicrophoneArmed("true")).toBe(true);
    expect(getStoredMicrophoneArmed("false")).toBe(false);
    expect(getStoredMicrophoneArmed(null)).toBe(false);
    expect(getStoredMicrophoneArmed("junk")).toBe(false);
  });
});
