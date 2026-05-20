import { NextRequest, NextResponse } from "next/server";
import { shouldSkipElevenLabsError } from "@/lib/interpreter/elevenlabsError";
import { resolveTtsFallbackProvider } from "@/lib/interpreter/voiceFallback";
import { isInterpreterMode } from "@/lib/interpreter/typeGuards";
import type { InterpreterMode } from "@/lib/interpreter/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

type RequestBody = {
  mode?: unknown;
  text?: unknown;
  voiceIdOverride?: unknown;
};

export const dynamic = "force-dynamic";

const elevenLabsTimeoutMs = 20000;
const defaultVoiceSettings = {
  similarity_boost: 0.75,
  stability: 0.45,
  style: 0.2,
  use_speaker_boost: true,
};

function resolveOpenAiVoice(mode: InterpreterMode): string {
  if (mode === "id-nl") {
    return process.env.OPENAI_TTS_VOICE_NL || process.env.OPENAI_TTS_VOICE || "alloy";
  }
  if (mode === "id-en") {
    return process.env.OPENAI_TTS_VOICE_EN || process.env.OPENAI_TTS_VOICE || "alloy";
  }
  return process.env.OPENAI_TTS_VOICE_ID || process.env.OPENAI_TTS_VOICE || "alloy";
}

async function requestOpenAiSpeech(text: string, mode: InterpreterMode): Promise<NextResponse> {
  const apiKey = process.env.OPENAI_API_KEY || "";
  if (!apiKey) {
    return new NextResponse(null, { status: 204 });
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: resolveOpenAiVoice(mode),
      input: text,
      format: "mp3",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return errorResponse(
      errorText || `OpenAI TTS request failed with status ${response.status}.`,
      response.status,
    );
  }

  const audioBuffer = await response.arrayBuffer();
  if (audioBuffer.byteLength === 0) {
    return errorResponse("OpenAI TTS returned empty audio.", 502);
  }

  return new NextResponse(audioBuffer, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "audio/mpeg",
    },
  });
}

/** Target language for TTS: id-nl/id-en → European voice; nl-id/en-id → Indonesian voice */
function resolveVoiceId(mode: InterpreterMode): string {
  if (mode === "id-nl") {
    // Dutch output only: prefer explicit NL voice; avoid EN fallback (wrong timbre) and accidental multilingual "default" voices.
    return (
      process.env.ELEVENLABS_VOICE_ID_NL?.trim() ||
      process.env.ELEVENLABS_VOICE_ID?.trim() ||
      ""
    );
  }
  if (mode === "id-en") {
    return process.env.ELEVENLABS_VOICE_ID_EN || process.env.ELEVENLABS_VOICE_ID || "";
  }
  return process.env.ELEVENLABS_VOICE_ID_ID || process.env.ELEVENLABS_VOICE_ID || "";
}

function resolveLanguageCode(mode: InterpreterMode): string {
  if (mode === "id-en") return "en";
  if (mode === "id-nl") return "nl";
  return "id";
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function listVoices() {
  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json({ voices: [] }, { status: 200 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, elevenLabsTimeoutMs);

  try {
    const response = await fetch("https://api.elevenlabs.io/v1/voices", {
      headers: {
        "xi-api-key": apiKey,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return NextResponse.json({ voices: [] }, { status: 200 });
    }

    const data = (await response.json()) as {
      voices?: Array<{ voice_id?: string; name?: string; labels?: Record<string, string> }>;
    };

    const voices = Array.isArray(data.voices)
      ? data.voices
          .map((voice) => ({
            id: typeof voice.voice_id === "string" ? voice.voice_id : "",
            label: typeof voice.name === "string" ? voice.name : "",
            gender: typeof voice.labels?.gender === "string" ? voice.labels.gender : "",
            accent: typeof voice.labels?.accent === "string" ? voice.labels.accent : "",
          }))
          .filter((voice) => voice.id && voice.label)
      : [];

    return NextResponse.json({
      voices,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("action") === "voices") {
    return listVoices();
  }

  return NextResponse.json({ ok: true });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, 10, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many TTS requests.", retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  let body: RequestBody;

  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return errorResponse("Invalid JSON body.");
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const mode = isInterpreterMode(body.mode) ? body.mode : null;
  const voiceIdOverride =
    typeof body.voiceIdOverride === "string" ? body.voiceIdOverride.trim() : "";

  if (!text) {
    return errorResponse("Text is required.");
  }

  if (!mode) {
    return errorResponse("Mode must be nl-id, id-nl, en-id, or id-en.");
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  const voiceId = voiceIdOverride || resolveVoiceId(mode);
  const openAiApiKeyPresent = Boolean(process.env.OPENAI_API_KEY);

  if (!apiKey || !voiceId) {
    if (openAiApiKeyPresent) {
      return requestOpenAiSpeech(text, mode);
    }
    return new NextResponse(null, { status: 204 });
  }

  const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2";
  const outputFormat = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, elevenLabsTimeoutMs);

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=${encodeURIComponent(outputFormat)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          model_id: modelId,
          language_code: resolveLanguageCode(mode),
          text,
          voice_settings: defaultVoiceSettings,
        }),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      const fallbackProvider = resolveTtsFallbackProvider({
        elevenLabsBlocked: shouldSkipElevenLabsError(errorText),
        openAiApiKeyPresent,
      });
      if (fallbackProvider === "openai") {
        return requestOpenAiSpeech(text, mode);
      }
      if (fallbackProvider === "none") {
        return new NextResponse(null, { status: 204 });
      }
      return errorResponse(
        errorText || `ElevenLabs request failed with status ${response.status}.`,
        response.status,
      );
    }

    const audioBuffer = await response.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return errorResponse("ElevenLabs returned empty audio.", 502);
    }

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse(`ElevenLabs request timed out after ${elevenLabsTimeoutMs}ms.`, 504);
    }

    return errorResponse(
      error instanceof Error ? error.message : "ElevenLabs request failed.",
      502,
    );
  } finally {
    clearTimeout(timeout);
  }
}
