const unusualActivityMarkers = [
  "detected_unusual_activity",
  "free tier usage disabled",
  "purchase any paid subscription",
];

export function shouldSkipElevenLabsError(errorText: string): boolean {
  const normalized = errorText.trim().toLowerCase();
  return unusualActivityMarkers.some((marker) => normalized.includes(marker));
}
