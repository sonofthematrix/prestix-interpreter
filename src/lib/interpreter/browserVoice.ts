const maleNameMarkers = [
  "male",
  "man",
  "david",
  "daniel",
  "roger",
  "george",
  "brian",
  "eric",
  "liam",
  "adam",
  "charlie",
  "callum",
  "will",
  "harry",
  "chris",
];

type BrowserVoiceLike = {
  default?: boolean;
  lang?: string;
  name?: string;
};

function normalize(value: string | undefined): string {
  return (value || "").trim().toLowerCase();
}

function isLanguageMatch(voiceLang: string, targetLang: string): boolean {
  if (!voiceLang || !targetLang) {
    return false;
  }

  const [voiceBase] = voiceLang.split("-");
  const [targetBase] = targetLang.split("-");
  return voiceLang === targetLang || voiceBase === targetBase;
}

function hasMaleMarker(name: string): boolean {
  return maleNameMarkers.some((marker) =>
    new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(name),
  );
}

export function pickPreferredBrowserVoice<T extends BrowserVoiceLike>(
  voices: T[],
  targetLang: string,
): T | null {
  const normalizedTargetLang = normalize(targetLang);
  const normalizedVoices = voices.map((voice) => ({
    original: voice,
    lang: normalize(voice.lang),
    name: normalize(voice.name),
  }));

  const sameLanguage = normalizedVoices.filter((voice) =>
    isLanguageMatch(voice.lang, normalizedTargetLang),
  );

  const maleSameLanguage = sameLanguage.find((voice) => hasMaleMarker(voice.name));
  if (maleSameLanguage) {
    return maleSameLanguage.original;
  }

  const defaultSameLanguage = sameLanguage.find((voice) => voice.original.default);
  if (defaultSameLanguage) {
    return defaultSameLanguage.original;
  }

  if (sameLanguage.length > 0) {
    return sameLanguage[0].original;
  }

  const maleAnyLanguage = normalizedVoices.find((voice) => hasMaleMarker(voice.name));
  if (maleAnyLanguage) {
    return maleAnyLanguage.original;
  }

  return voices[0] || null;
}
