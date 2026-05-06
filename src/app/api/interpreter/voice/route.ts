import { NextRequest, NextResponse } from "next/server";

type InterpreterMode = "id-en" | "en-id";

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

function isInterpreterMode(value: unknown): value is InterpreterMode {
  return value === "id-en" || value === "en-id";
}

function resolveVoiceId(mode: InterpreterMode): string {
  if (mode === "id-en") {
    return process.env.ELEVENLABS_VOICE_ID_EN || process.env.ELEVENLABS_VOICE_ID || "";
  }

  return process.env.ELEVENLABS_VOICE_ID_ID || process.env.ELEVENLABS_VOICE_ID || "";
}

function resolveLanguageCode(mode: InterpreterMode): string {
  return mode === "id-en" ? "en" : "id";
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
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
    return errorResponse("Mode must be id-en or en-id.");
  }

  const apiKey = process.env.ELEVENLABS_API_KEY || "";
  const voiceId = voiceIdOverride || resolveVoiceId(mode);

  if (!apiKey || !voiceId) {
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
