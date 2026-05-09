export function getStoredTranslatorEnabled(rawValue: string | null): boolean {
  return rawValue === "true";
}

export function shouldQueueTranslation(translatorEnabled: boolean): boolean {
  return translatorEnabled;
}

export function getTranslatorButtonLabel(translatorEnabled: boolean): string {
  return translatorEnabled ? "translator on" : "translator off";
}
