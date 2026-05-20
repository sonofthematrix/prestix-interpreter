export type TtsFallbackProvider = "elevenlabs" | "openai" | "none";

export function resolveTtsFallbackProvider({
  elevenLabsBlocked,
  openAiApiKeyPresent,
}: {
  elevenLabsBlocked: boolean;
  openAiApiKeyPresent: boolean;
}): TtsFallbackProvider {
  if (!elevenLabsBlocked) {
    return "elevenlabs";
  }

  return openAiApiKeyPresent ? "openai" : "none";
}
