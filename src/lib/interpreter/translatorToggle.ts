/**
 * Tolk skill toggle state. When active, every input is treated as text
 * to be translated (force translate override). When inactive, the default
 * Prestix assistant handles both conversation and translation naturally.
 */
export function getStoredTranslatorEnabled(rawValue: string | null): boolean {
  return rawValue === "true";
}

export function shouldQueueTranslation(translatorEnabled: boolean): boolean {
  return translatorEnabled;
}

export function getTranslatorButtonLabel(translatorEnabled: boolean): string {
  return translatorEnabled ? 'force translate' : 'prestix';
}
