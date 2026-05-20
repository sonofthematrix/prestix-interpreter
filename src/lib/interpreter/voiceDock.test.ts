import { describe, expect, it } from "vitest";
import { getVoiceDockCopy } from "./voiceDock";

describe("voice dock copy", () => {
  it("returns unified Prestix labels regardless of mode", () => {
    expect(
      getVoiceDockCopy({
        mode: "assistant",
        speechInputEngine: "browser",
        browserMicrophonePermission: "granted",
        recognitionRunning: false,
        isLocalRecording: false,
        isLocalTranscribing: false,
      }),
    ).toEqual({
      ariaLabel: "Prestix input",
      headline: "Talk to Prestix",
      supportingHint: "Tap the mic or type to start.",
      placeholder: "Speak or type...",
      submitLabel: "Send",
      micButtonLabel: "talk handsfree",
    });
  });

  it("returns same unified labels for interpreter mode too", () => {
    expect(
      getVoiceDockCopy({
        mode: "interpreter",
        speechInputEngine: "browser",
        browserMicrophonePermission: "granted",
        recognitionRunning: false,
        isLocalRecording: false,
        isLocalTranscribing: false,
      }),
    ).toEqual({
      ariaLabel: "Prestix input",
      headline: "Talk to Prestix",
      supportingHint: "Tap the mic or type to start.",
      placeholder: "Speak or type...",
      submitLabel: "Send",
      micButtonLabel: "talk handsfree",
    });
  });

  it("surfaces clear browser mic states", () => {
    expect(
      getVoiceDockCopy({
        mode: "assistant",
        speechInputEngine: "browser",
        browserMicrophonePermission: "prompt",
        recognitionRunning: false,
        isLocalRecording: false,
        isLocalTranscribing: false,
      }).micButtonLabel,
    ).toBe("enable mic");

    expect(
      getVoiceDockCopy({
        mode: "assistant",
        speechInputEngine: "browser",
        browserMicrophonePermission: "granted",
        recognitionRunning: true,
        isLocalRecording: false,
        isLocalTranscribing: false,
      }).micButtonLabel,
    ).toBe("mic live");
  });

  it("keeps local whisper labels honest while recording or transcribing", () => {
    expect(
      getVoiceDockCopy({
        mode: "assistant",
        speechInputEngine: "local-whisper",
        browserMicrophonePermission: "unknown",
        recognitionRunning: false,
        isLocalRecording: true,
        isLocalTranscribing: false,
      }).micButtonLabel,
    ).toBe("stop + send");

    expect(
      getVoiceDockCopy({
        mode: "assistant",
        speechInputEngine: "local-whisper",
        browserMicrophonePermission: "unknown",
        recognitionRunning: false,
        isLocalRecording: false,
        isLocalTranscribing: true,
      }).micButtonLabel,
    ).toBe("working...");
  });
});
