export type IdleSpeechOutputProvider =
  | "pending"
  | "elevenlabs"
  | "browser"
  | "unsupported"
  | "error";

export function resolveSendNowAction(input: string): "submit-input" | "flush-buffer" {
  return input.trim() ? "submit-input" : "flush-buffer";
}

export function getStandbySpeechOutputProvider(hasBrowserSpeechSynthesis: boolean): IdleSpeechOutputProvider {
  return hasBrowserSpeechSynthesis ? "browser" : "pending";
}

export function shouldUseBrowserTtsFallback(
  status: number,
  hasBrowserSpeechSynthesis: boolean,
): boolean {
  return hasBrowserSpeechSynthesis && (status === 204 || status >= 500);
}

// Assistant-first unified placeholder — sessionMode is no longer surfaced in idle copy.
export function getIdleOutputPlaceholder(speechOutputProvider: IdleSpeechOutputProvider): string {
  if (speechOutputProvider === "unsupported") {
    return "Voice output unsupported in this browser.";
  }

  if (speechOutputProvider === "browser" || speechOutputProvider === "elevenlabs") {
    return "Tap handsfree mic and start talking.";
  }

  return "Prestix is ready.";
}
