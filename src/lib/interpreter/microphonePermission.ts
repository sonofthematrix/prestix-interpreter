export type SpeechInputEngine = "browser" | "local-whisper";

export type BrowserMicrophonePermissionState =
  | "granted"
  | "prompt"
  | "denied"
  | "unknown";

export function getStoredMicrophoneArmed(rawValue: string | null): boolean {
  return rawValue === "true";
}

export function shouldPersistMicrophoneArmed(
  speechInputEngine: SpeechInputEngine,
  permissionState: BrowserMicrophonePermissionState,
): boolean {
  return speechInputEngine === "browser" && permissionState === "granted";
}

export function shouldAutoArmBrowserSpeech({
  permissionState,
  speechInputEngine,
  storedMicrophoneArmed,
}: {
  permissionState: BrowserMicrophonePermissionState;
  speechInputEngine: SpeechInputEngine;
  storedMicrophoneArmed: boolean;
}): boolean {
  return (
    speechInputEngine === "browser" &&
    (permissionState === "granted" ||
      (permissionState === "unknown" && storedMicrophoneArmed))
  );
}
