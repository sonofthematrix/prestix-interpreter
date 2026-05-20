import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "../../../../lib/rate-limit";

const execFileAsync = promisify(execFile);
const transcribeTimeoutMs = 300000;
const maxAudioFileSizeBytes = 25 * 1024 * 1024; // 25 MB
const scriptPath = join(process.cwd(), "scripts", "faster_whisper_transcribe.py");
const pythonExecutable = process.env.FASTER_WHISPER_PYTHON || "python3";

type TranscribeResponse = {
  text?: unknown;
  language?: unknown;
};

export const dynamic = "force-dynamic";

function normalizeLanguageHint(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "";
  }

  if (value === "id-ID") {
    return "id";
  }

  if (value === "en-US") {
    return "en";
  }

  if (value === "nl-NL") {
    return "nl";
  }

  return "";
}

function errorResponse(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rateLimit = checkRateLimit(ip, 10, 60000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many transcription requests." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)) } },
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return errorResponse("Invalid multipart form data.");
  }

  const audioFile = formData.get("audio");
  const languageHint = normalizeLanguageHint(formData.get("recognitionLang"));

  if (!(audioFile instanceof File)) {
    return errorResponse("Audio file is required.");
  }

  if (audioFile.size === 0) {
    return errorResponse("Audio file is empty.");
  }

  if (audioFile.size > maxAudioFileSizeBytes) {
    return errorResponse(`Audio file exceeds ${maxAudioFileSizeBytes / (1024 * 1024)} MB limit.`);
  }

  const tempDir = await mkdtemp(join(tmpdir(), "prestix-whisper-"));
  const tempAudioPath = join(tempDir, audioFile.name || "speech.webm");

  try {
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    await writeFile(tempAudioPath, audioBuffer);

    const args = [scriptPath, tempAudioPath];
    if (languageHint) {
      args.push("--language", languageHint);
    }

    const { stdout, stderr } = await execFileAsync(pythonExecutable, args, {
      timeout: transcribeTimeoutMs,
      maxBuffer: 1024 * 1024 * 4,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    const parsed = JSON.parse(stdout.trim()) as TranscribeResponse;
    const text = typeof parsed.text === "string" ? parsed.text.trim() : "";
    const language = typeof parsed.language === "string" ? parsed.language.trim() : "unknown";

    if (!text) {
      const detail = stderr.trim();
      return errorResponse(detail || "No transcript returned.", 502);
    }

    return NextResponse.json({
      text,
      language,
    });
  } catch (error) {
    const message =
      error instanceof Error && "stderr" in error && typeof error.stderr === "string"
        ? error.stderr.trim() || error.message
        : error instanceof Error
          ? error.message
          : "Local transcription failed.";

    return errorResponse(message, 502);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
