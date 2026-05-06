"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  readInterpreterResponseMetadata,
  resolveWithTimeout,
} from "../lib/interpreter/clientRuntime";

type InterpreterMode = "id-en" | "en-id";
type InterpreterStatus = "READY" | "LISTENING" | "TRANSLATING" | "SPEAKING" | "ERROR";
type RuntimeState =
  | "idle"
  | "listening"
  | "buffering"
  | "queued"
  | "translating"
  | "speaking"
  | "error";
type InputSource = "typed" | "speech" | "none";
type RecognitionLang = "id-ID" | "en-US";
type SourceLanguage = "id" | "en" | "unknown";
type SpeakerId = "speaker_a" | "speaker_b" | "unknown";
type ConversationFilter = SpeakerId | "all";
type CaptureMode = "live" | "story";
type SpeechBufferStatus = "idle" | "collecting" | "flushing" | "queued";
type ConversationStatus = "pending" | "translating" | "translated" | "error";
type ProviderInfo = {
  fallbackUsed: string;
  learningContext: string;
  model: string;
  provider: string;
};
type VoiceOverrides = {
  en: string;
  id: string;
};
type ConversationLogEntry = {
  id: string;
  timestamp: string;
  speaker: SpeakerId;
  source: "typed" | "speech";
  mode: InterpreterMode;
  input: string;
  output?: string;
  status: ConversationStatus;
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
  learningMatchesCount?: number;
  learningTypesUsed?: string[];
  error?: string;
};

type SpeechRecognitionErrorLike = {
  error: string;
};

type SpeechRecognitionAlternativeLike = {
  confidence?: number;
  transcript: string;
};

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
};

type SpeechRecognitionResultsLike = {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultsLike;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

const INDONESIAN_MARKERS = [
  "gua",
  "gue",
  "gw",
  "lu",
  "lo",
  "nih",
  "dong",
  "aja",
  "kalau",
  "jadi",
  "mampus",
  "ajak",
  "wali",
  "saya",
  "kamu",
  "mereka",
  "tidak",
  "mau",
  "kamar",
  "malam",
  "terima",
  "kasih",
  "apa",
  "kenapa",
  "bisa",
  "boleh",
  "ini",
  "itu",
  "dengan",
  "untuk",
  "ke",
  "dari",
];

const ENGLISH_MARKERS = [
  "i",
  "you",
  "we",
  "they",
  "he",
  "she",
  "want",
  "book",
  "room",
  "tonight",
  "understand",
  "thanks",
  "please",
  "where",
  "what",
  "why",
  "how",
  "can",
  "need",
  "would",
  "could",
];

const liveBufferWindowMs = 650;
const storyBufferWindowMs = 3500;
const speechOutputTimeoutMs = 15000;
const translationRequestTimeoutMs = 30000;
const conversationLogStorageKey = "prestix-interpreter-conversation-log";
const voiceOverridesStorageKey = "prestix-interpreter-voice-overrides";
const runtimeStatusMap: Record<RuntimeState, InterpreterStatus> = {
  idle: "READY",
  listening: "LISTENING",
  buffering: "LISTENING",
  queued: "READY",
  translating: "TRANSLATING",
  speaking: "SPEAKING",
  error: "ERROR",
};

function transitionLooksConsistent(previous: RuntimeState, next: RuntimeState): boolean {
  if (previous === next || next === "error") {
    return true;
  }

  switch (previous) {
    case "idle":
      return next === "listening" || next === "queued";
    case "listening":
      return next === "buffering" || next === "queued" || next === "translating" || next === "idle";
    case "buffering":
      return next === "queued" || next === "listening";
    case "queued":
      return next === "translating" || next === "listening" || next === "queued";
    case "translating":
      return next === "speaking" || next === "queued" || next === "listening" || next === "translating";
    case "speaking":
      return next === "listening" || next === "idle";
    case "error":
      return next === "listening" || next === "idle" || next === "queued" || next === "translating";
    default:
      return false;
  }
}

function hasMarker(text: string, markers: string[]): boolean {
  return markers.some((marker) =>
    new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text),
  );
}

function detectSourceLanguage(
  text: string,
  currentRecognitionLang?: RecognitionLang,
): SourceLanguage {
  const normalized = text.toLowerCase();
  if (hasMarker(normalized, INDONESIAN_MARKERS)) {
    return "id";
  }

  if (hasMarker(normalized, ENGLISH_MARKERS)) {
    return "en";
  }

  if (currentRecognitionLang === "id-ID") {
    return "id";
  }

  if (currentRecognitionLang === "en-US") {
    return "en";
  }

  return "unknown";
}

function modeFromSourceLang(sourceLang: SourceLanguage): InterpreterMode {
  return sourceLang === "id" ? "id-en" : "en-id";
}

function recognitionLangForSource(sourceLang: SourceLanguage): RecognitionLang {
  return sourceLang === "id" ? "en-US" : "id-ID";
}

function flipRecognitionLang(lang: RecognitionLang): RecognitionLang {
  return lang === "id-ID" ? "en-US" : "id-ID";
}

function detectMode(text: string): InterpreterMode {
  return modeFromSourceLang(detectSourceLanguage(text, "en-US"));
}

function modeLabel(mode: InterpreterMode): string {
  return mode === "id-en" ? "ID -> EN" : "EN -> ID";
}

function outputLanguage(mode: InterpreterMode): string {
  return mode === "id-en" ? "en-US" : "id-ID";
}

function splitSpeechChunks(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const sentenceChunks = normalized
    .split(/(?<=[.!?])\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (sentenceChunks.length === 0) {
    return [normalized];
  }

  const chunks: string[] = [];

  for (const sentence of sentenceChunks) {
    if (sentence.length <= 220) {
      chunks.push(sentence);
      continue;
    }

    const clauseChunks = sentence
      .split(/(?<=[,;:])\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (clauseChunks.length === 0) {
      chunks.push(sentence);
      continue;
    }

    let currentChunk = "";

    for (const clause of clauseChunks) {
      const nextChunk = currentChunk ? `${currentChunk} ${clause}` : clause;

      if (nextChunk.length > 220 && currentChunk) {
        chunks.push(currentChunk);
        currentChunk = clause;
        continue;
      }

      currentChunk = nextChunk;
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }
  }

  return chunks;
}

function getBufferWindowMs(captureMode: CaptureMode): number {
  return captureMode === "live" ? liveBufferWindowMs : storyBufferWindowMs;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Translation failed.";
}

function isInvalidStateError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "InvalidStateError") ||
    getErrorMessage(error).toLowerCase().includes("invalidstate")
  );
}

function readResponseString(data: unknown, field: string): string {
  if (typeof data !== "object" || data === null || !(field in data)) {
    return "";
  }

  const value = (data as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function readResponseStringArray(data: unknown, field: string): string[] {
  if (typeof data !== "object" || data === null || !(field in data)) {
    return [];
  }

  const value = (data as Record<string, unknown>)[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

async function readInterpreterJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body.trim()) {
    return {};
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return {
      error: `Interpreter returned non-JSON response with status ${response.status}.`,
    };
  }
}

function createConversationEntryId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isSpeakerId(value: unknown): value is SpeakerId {
  return value === "speaker_a" || value === "speaker_b" || value === "unknown";
}

function isConversationLogEntry(value: unknown): value is ConversationLogEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.timestamp === "string" &&
    isSpeakerId(entry.speaker) &&
    (entry.source === "typed" || entry.source === "speech") &&
    (entry.mode === "id-en" || entry.mode === "en-id") &&
    typeof entry.input === "string" &&
    (entry.output === undefined || typeof entry.output === "string") &&
    (entry.status === "pending" ||
      entry.status === "translating" ||
      entry.status === "translated" ||
      entry.status === "error") &&
    (entry.provider === undefined || typeof entry.provider === "string") &&
    (entry.model === undefined || typeof entry.model === "string") &&
    (entry.fallbackUsed === undefined || typeof entry.fallbackUsed === "boolean") &&
    (entry.learningMatchesCount === undefined ||
      typeof entry.learningMatchesCount === "number") &&
    (entry.learningTypesUsed === undefined ||
      (Array.isArray(entry.learningTypesUsed) &&
        entry.learningTypesUsed.every((type) => typeof type === "string"))) &&
    (entry.error === undefined || typeof entry.error === "string")
  );
}

function normalizeConversationLogEntry(value: unknown): ConversationLogEntry | null {
  if (isConversationLogEntry(value)) {
    return value;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const entry = value as Record<string, unknown>;
  if (
    typeof entry.id !== "string" ||
    typeof entry.timestamp !== "string" ||
    !isSpeakerId(entry.speaker) ||
    (entry.source !== "typed" && entry.source !== "speech") ||
    (entry.mode !== "id-en" && entry.mode !== "en-id") ||
    typeof entry.input !== "string"
  ) {
    return null;
  }

  return {
    id: entry.id,
    timestamp: entry.timestamp,
    speaker: entry.speaker,
    source: entry.source,
    mode: entry.mode,
    input: entry.input,
    output: typeof entry.output === "string" ? entry.output : undefined,
    status: typeof entry.output === "string" ? "translated" : "pending",
    provider: typeof entry.provider === "string" ? entry.provider : undefined,
    model: typeof entry.model === "string" ? entry.model : undefined,
    fallbackUsed: typeof entry.fallbackUsed === "boolean" ? entry.fallbackUsed : undefined,
    learningMatchesCount:
      typeof entry.learningMatchesCount === "number" ? entry.learningMatchesCount : undefined,
    learningTypesUsed: Array.isArray(entry.learningTypesUsed)
      ? entry.learningTypesUsed.filter((type): type is string => typeof type === "string")
      : undefined,
  };
}

function normalizeVoiceOverrides(value: unknown): VoiceOverrides {
  if (typeof value !== "object" || value === null) {
    return { en: "", id: "" };
  }

  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : "",
    id: typeof record.id === "string" ? record.id : "",
  };
}

function speakerLabel(speaker: SpeakerId): string {
  if (speaker === "speaker_a") {
    return "Speaker A";
  }

  if (speaker === "speaker_b") {
    return "Speaker B";
  }

  return "Unknown";
}

export default function InterpreterPage() {
  const [input, setInput] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [lastInput, setLastInput] = useState("");
  const [lastOutput, setLastOutput] = useState("");
  const [status, setStatus] = useState<InterpreterStatus>("READY");
  const [runtimeState, setRuntimeStateValue] = useState<RuntimeState>("idle");
  const [mode, setMode] = useState<InterpreterMode>("en-id");
  const [lastInputSource, setLastInputSource] = useState<InputSource>("none");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState("");
  const [micHint, setMicHint] = useState("Click anywhere to enable microphone.");
  const [recognitionLang, setRecognitionLang] = useState<RecognitionLang>("id-ID");
  const [lastSpeechSwitchReason, setLastSpeechSwitchReason] = useState("initial");
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
  const [speechDebugLog, setSpeechDebugLog] = useState<string[]>([]);
  const [providerInfo, setProviderInfo] = useState<ProviderInfo>({
    fallbackUsed: "unknown",
    learningContext: "unknown",
    model: "unknown",
    provider: "pending",
  });
  const [queueLength, setQueueLength] = useState(0);
  const [conversationLog, setConversationLog] = useState<ConversationLogEntry[]>([]);
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const [captureMode, setCaptureMode] = useState<CaptureMode>("live");
  const [speechBufferStatus, setSpeechBufferStatus] = useState<SpeechBufferStatus>("idle");
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerId>("unknown");
  const [voiceOverrides, setVoiceOverrides] = useState<VoiceOverrides>({ en: "", id: "" });
  const [isTranslatorRunning, setIsTranslatorRunning] = useState(false);
  const [bufferLength, setBufferLength] = useState(0);
  const [recognitionRunning, setRecognitionRunning] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionRunningRef = useRef(false);
  const runtimeStateRef = useRef<RuntimeState>("idle");
  const shouldKeepListeningRef = useRef(false);
  const speakingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const recognitionLangRef = useRef<RecognitionLang>("id-ID");
  const lastDetectedSourceLangRef = useRef<SourceLanguage>("unknown");
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartFailuresRef = useRef(0);
  const speechFinalBufferRef = useRef<string[]>([]);
  const transcriptBufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechBufferFlushInProgressRef = useRef(false);
  const lastSpeechEventAtRef = useRef<number | null>(null);
  const captureModeRef = useRef<CaptureMode>("live");
  const activeSpeakerRef = useRef<SpeakerId>("unknown");
  const unmountedRef = useRef(false);
  const conversationLogLoadedRef = useRef(false);
  const conversationLogRef = useRef<ConversationLogEntry[]>([]);
  const translationQueueRef = useRef<string[]>([]);
  const isTranslatorRunningRef = useRef(false);
  const processTranslationQueueRef = useRef<() => void>(() => {});
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

  const clearRecognitionRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearSpeechBufferTimer = useCallback(() => {
    if (transcriptBufferTimerRef.current !== null) {
      clearTimeout(transcriptBufferTimerRef.current);
      transcriptBufferTimerRef.current = null;
    }
  }, []);

  const stopAudioPlayback = useCallback(() => {
    if (audioPlaybackRef.current !== null) {
      audioPlaybackRef.current.pause();
      audioPlaybackRef.current.src = "";
      audioPlaybackRef.current = null;
    }

    if (audioObjectUrlRef.current !== null) {
      URL.revokeObjectURL(audioObjectUrlRef.current);
      audioObjectUrlRef.current = null;
    }
  }, []);

  const addSpeechDebug = useCallback(
    (eventName: string, details = "") => {
      const time = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const trimmedDetails = details.replace(/\s+/g, " ").trim();
      const clippedDetails =
        trimmedDetails.length > 120 ? `${trimmedDetails.slice(0, 117)}...` : trimmedDetails;
      const line = `${time} ${eventName} [${recognitionLangRef.current}/${status}]${
        clippedDetails ? ` ${clippedDetails}` : ""
      }`;

      setSpeechDebugLog((previousLog) => [...previousLog, line].slice(-40));
    },
    [status],
  );
  const addSpeechDebugRef = useRef(addSpeechDebug);
  addSpeechDebugRef.current = addSpeechDebug;

  const setRuntimeState = useCallback((next: RuntimeState, reason: string) => {
    const previous = runtimeStateRef.current;
    const consistencyNote = transitionLooksConsistent(previous, next) ? "" : " unexpected";

    runtimeStateRef.current = next;
    setRuntimeStateValue(next);
    setStatus(runtimeStatusMap[next]);
    addSpeechDebugRef.current(`[state] ${previous} -> ${next}${consistencyNote}`, reason);
  }, []);

  const setConversationLogSynced = useCallback(
    (updater: (currentLog: ConversationLogEntry[]) => ConversationLogEntry[]) => {
      const nextLog = updater(conversationLogRef.current).slice(-100);
      conversationLogRef.current = nextLog;
      setConversationLog(nextLog);
    },
    [],
  );

  const updateConversationSpeaker = useCallback((entryId: string, speaker: SpeakerId) => {
    setConversationLogSynced((currentLog) =>
      currentLog.map((entry) =>
        entry.id === entryId
          ? {
              ...entry,
              speaker,
            }
          : entry,
      ),
    );
  }, [setConversationLogSynced]);

  const clearConversationLog = useCallback(() => {
    translationQueueRef.current = [];
    setQueueLength(0);
    setConversationLogSynced(() => []);
  }, [setConversationLogSynced]);

  const updateActiveSpeaker = useCallback(
    (speaker: SpeakerId) => {
      activeSpeakerRef.current = speaker;
      setActiveSpeaker(speaker);
      addSpeechDebug("active speaker changed", speakerLabel(speaker));
    },
    [addSpeechDebug],
  );

  const updateCaptureMode = useCallback(
    (nextMode: CaptureMode) => {
      captureModeRef.current = nextMode;
      setCaptureMode(nextMode);
      addSpeechDebug("capture mode changed", nextMode.toUpperCase());
    },
    [addSpeechDebug],
  );

  const enqueueTranslationEntry = useCallback(
    (entryId: string) => {
      translationQueueRef.current.push(entryId);
      setQueueLength(translationQueueRef.current.length);
      addSpeechDebug("entry queued", entryId);
      addSpeechDebug("queued entry id", entryId);
      processTranslationQueueRef.current();
    },
    [addSpeechDebug],
  );

  const safeStartRecognition = useCallback((reason: string) => {
    const recognition = recognitionRef.current;

    if (
      !recognition ||
      !shouldKeepListeningRef.current ||
      speakingRef.current ||
      recognitionRunningRef.current ||
      isStartingRef.current
    ) {
      return;
    }

    try {
      clearRecognitionRestartTimer();
      isStartingRef.current = true;
      recognition.lang = recognitionLangRef.current;
      recognition.start();
      recognitionRunningRef.current = true;
      isListeningRef.current = true;
      setRecognitionRunning(true);
      setIsListening(true);
      addSpeechDebug("recognition start", reason);
    } catch (startError) {
      isStartingRef.current = false;
      if (isInvalidStateError(startError)) {
        recognitionRunningRef.current = true;
        isListeningRef.current = true;
        setRecognitionRunning(true);
        setIsListening(true);
        setRuntimeState("listening", `recognition start ignored: ${reason}`);
        addSpeechDebug("recognition start ignored", reason);
        return;
      }

      setError(`Speech recognition error: ${getErrorMessage(startError)}`);
      setRuntimeState("error", `recognition start failed: ${reason}`);
    }
  }, [addSpeechDebug, clearRecognitionRestartTimer, setRuntimeState]);

  const safeStopRecognition = useCallback((reason: string) => {
    const recognition = recognitionRef.current;
    recognitionRunningRef.current = false;
    isStartingRef.current = false;
    isListeningRef.current = false;
    setRecognitionRunning(false);
    setIsListening(false);
    addSpeechDebugRef.current("recognition stop", reason);

    if (!recognition) {
      return;
    }

    try {
      recognition.stop();
    } catch {
      // Stopping an already-stopped recognizer is expected during rapid restarts.
    }
  }, []);

  const restartRecognitionWithLang = useCallback(
    (lang: RecognitionLang, reason: string) => {
      const recognition = recognitionRef.current;
      recognitionLangRef.current = lang;
      setRecognitionLang(lang);
      setLastSpeechSwitchReason(reason);
      setMicHint(`Listening (${lang})... speak clearly or type below.`);
      addSpeechDebug("restart recognition", reason);

      if (!recognition) {
        return;
      }

      recognition.lang = lang;
      safeStopRecognition(reason);
      clearRecognitionRestartTimer();
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (shouldKeepListeningRef.current && !speakingRef.current && !unmountedRef.current) {
          recognition.lang = recognitionLangRef.current;
          safeStartRecognition(reason);
        }
      }, 450);
    },
    [addSpeechDebug, clearRecognitionRestartTimer, safeStartRecognition, safeStopRecognition],
  );

  const createConversationSegment = useCallback(
    (
      text: string,
      source: Exclude<InputSource, "none">,
      forcedMode?: InterpreterMode,
      detectedSourceLang?: SourceLanguage,
      queuedReason = source === "typed" ? "typed input" : "buffer flushed",
    ) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return null;
      }

      const detectedMode = forcedMode ?? detectMode(trimmed);
      const entryId = createConversationEntryId();
      const entry: ConversationLogEntry = {
        id: entryId,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        speaker: activeSpeakerRef.current,
        source,
        mode: detectedMode,
        input: trimmed,
        status: "pending",
      };

      setInput("");
      setLastInput(trimmed);
      setLastInputSource(source);
      setMode(detectedMode);
      setError("");
      setConversationLogSynced((currentLog) => [...currentLog, entry]);
      addSpeechDebug(
        "conversation entry created",
        `${entryId} ${source} ${modeLabel(detectedMode)}`,
      );
      setRuntimeState("queued", `${queuedReason}: ${entryId}`);
      enqueueTranslationEntry(entryId);

      if (source === "speech" && detectedSourceLang) {
        restartRecognitionWithLang(
          recognitionLangForSource(detectedSourceLang),
          `next expected after ${detectedSourceLang}`,
        );
      }

      return entryId;
    },
    [
      addSpeechDebug,
      enqueueTranslationEntry,
      restartRecognitionWithLang,
      setConversationLogSynced,
      setRuntimeState,
    ],
  );

  const flushSpeechBuffer = useCallback(
    (reason: string) => {
      if (speechBufferFlushInProgressRef.current) {
        addSpeechDebug("buffer flush skipped", `already flushing: ${reason}`);
        return;
      }

      speechBufferFlushInProgressRef.current = true;
      clearSpeechBufferTimer();

      try {
        const activeCaptureMode = captureModeRef.current;
        const bufferWindowMs = getBufferWindowMs(activeCaptureMode);
        const combinedText = speechFinalBufferRef.current
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();

        if (!combinedText) {
          speechFinalBufferRef.current = [];
          setBufferLength(0);
          setLiveTranscript("");
          setSpeechBufferStatus("idle");
          if (shouldKeepListeningRef.current) {
            setRuntimeState("listening", `empty buffer flush: ${reason}`);
          }
          return;
        }

        setSpeechBufferStatus("flushing");
        addSpeechDebug(
          `${activeCaptureMode} buffer flushed after ${bufferWindowMs}ms`,
          `${reason}: ${combinedText}`,
        );
        addSpeechDebug("buffer flushed", `${reason}: ${combinedText}`);

        const detectedSourceLang = detectSourceLanguage(
          combinedText,
          recognitionLangRef.current,
        );
        const detectedMode = modeFromSourceLang(detectedSourceLang);

        lastDetectedSourceLangRef.current = detectedSourceLang;
        const entryId = createConversationSegment(
          combinedText,
          "speech",
          detectedMode,
          detectedSourceLang,
          "buffer flushed",
        );

        speechFinalBufferRef.current = [];
        setBufferLength(0);
        setLiveTranscript("");
        setSpeechBufferStatus(entryId ? "queued" : "idle");
        addSpeechDebug("buffer cleared after enqueue", entryId ?? "no entry");
        addSpeechDebug("buffer empty ready for next", activeCaptureMode);

        if (entryId) {
          setSpeechBufferStatus("idle");
        }
      } finally {
        speechBufferFlushInProgressRef.current = false;
      }
    },
    [
      addSpeechDebug,
      clearSpeechBufferTimer,
      createConversationSegment,
      setRuntimeState,
    ],
  );

  const enableSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in this browser.");
      setRuntimeState("error", "speech recognition unsupported");
      setMicHint("Speech recognition is not supported in this browser.");
      return;
    }

    shouldKeepListeningRef.current = true;
    setMicHint(`Microphone enabled. Listening (${recognitionLangRef.current}).`);
    addSpeechDebug("mic enabled", recognitionLangRef.current);

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLangRef.current;

      recognition.onstart = () => {
        isStartingRef.current = false;
        recognitionRunningRef.current = true;
        isListeningRef.current = true;
        restartFailuresRef.current = 0;
        setRecognitionRunning(true);
        setIsListening(true);
        setRuntimeState("listening", "recognition onstart");
        addSpeechDebug("recognition start", recognitionLangRef.current);
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        recognitionRunningRef.current = false;
        isListeningRef.current = false;
        setRecognitionRunning(false);
        setIsListening(false);
        addSpeechDebug("recognition end", "");

        if (speechFinalBufferRef.current.length > 0) {
          clearSpeechBufferTimer();
          transcriptBufferTimerRef.current = setTimeout(() => {
            transcriptBufferTimerRef.current = null;
            flushSpeechBuffer("recognition end");

            if (
              shouldKeepListeningRef.current &&
              !speakingRef.current &&
              !unmountedRef.current
            ) {
              clearRecognitionRestartTimer();
              restartTimerRef.current = window.setTimeout(() => {
                restartTimerRef.current = null;
                safeStartRecognition("onend restart after buffer");
              }, 400);
            }
          }, getBufferWindowMs(captureModeRef.current));
          return;
        }

        if (
          shouldKeepListeningRef.current &&
          !speakingRef.current &&
          !unmountedRef.current
        ) {
          clearRecognitionRestartTimer();
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null;
            if (shouldKeepListeningRef.current && !speakingRef.current) {
              safeStartRecognition("onend restart");
            }
          }, 400);
        }
      };

      recognition.onerror = (event) => {
        isStartingRef.current = false;
        recognitionRunningRef.current = false;
        isListeningRef.current = false;
        setRecognitionRunning(false);
        setIsListening(false);

        if (event.error === "no-speech") {
          setError("");
          setRuntimeState("listening", "no-speech");
          setMicHint("Listening... speak clearly or type below.");
          addSpeechDebug("no-speech ignored", "non-fatal");

          if (speechFinalBufferRef.current.length > 0) {
            clearSpeechBufferTimer();
            transcriptBufferTimerRef.current = setTimeout(() => {
              transcriptBufferTimerRef.current = null;
              flushSpeechBuffer("no-speech");
            }, getBufferWindowMs(captureModeRef.current));
          }

          clearRecognitionRestartTimer();
          restartTimerRef.current = window.setTimeout(() => {
            restartTimerRef.current = null;
            safeStartRecognition("no-speech restart");
          }, 400);
          return;
        }

        if (event.error === "audio-capture") {
          shouldKeepListeningRef.current = false;
          setError("Microphone not available or blocked.");
          setRuntimeState("error", "audio-capture");
          setMicHint("Microphone not available or blocked.");
          return;
        }

        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          shouldKeepListeningRef.current = false;
          setError("Microphone permission denied.");
          setRuntimeState("error", event.error);
          setMicHint("Microphone permission denied.");
          return;
        }

        restartFailuresRef.current += 1;
        setError(`Speech recognition error: ${event.error}`);
        setRuntimeState("error", `speech recognition ${event.error}`);

        if (restartFailuresRef.current >= 3) {
          shouldKeepListeningRef.current = false;
        }
      };

      recognition.onresult = (event) => {
        let interimText = "";
        let finalText = "";
        let finalConfidence: number | null = null;

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const alternative = result[0];
          const transcript = alternative?.transcript ?? "";

          if (result.isFinal) {
            finalText = [finalText, transcript].filter(Boolean).join(" ");
            finalConfidence =
              typeof alternative?.confidence === "number" ? alternative.confidence : finalConfidence;
          } else {
            interimText = [interimText, transcript].filter(Boolean).join(" ");
          }
        }

        const bufferedText = speechFinalBufferRef.current
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        const trimmedInterim = interimText.trim();

        if (trimmedInterim) {
          setRuntimeState("buffering", "speech interim");
          setSpeechBufferStatus("collecting");
          setLiveTranscript(
            [bufferedText, trimmedInterim].filter(Boolean).join(" "),
          );
          addSpeechDebug("interim", trimmedInterim);
          addSpeechDebug("buffer collecting", captureModeRef.current.toUpperCase());
        } else if (bufferedText) {
          setLiveTranscript(bufferedText);
        } else {
          setLiveTranscript("");
        }

        const transcript = finalText.trim();
        if (transcript) {
          setRuntimeState("buffering", "speech final");
          setSpeechConfidence(finalConfidence);
          lastSpeechEventAtRef.current = Date.now();
          speechFinalBufferRef.current.push(transcript);
          setBufferLength(speechFinalBufferRef.current.length);
          setSpeechBufferStatus("collecting");
          const nextBufferedText = speechFinalBufferRef.current
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

          setLiveTranscript(
            [nextBufferedText, trimmedInterim].filter(Boolean).join(" "),
          );
          const bufferWindowMs = getBufferWindowMs(captureModeRef.current);
          addSpeechDebug(`${captureModeRef.current} final buffered`, transcript);
          addSpeechDebug("speech final buffered", transcript);

          clearSpeechBufferTimer();
          addSpeechDebug(
            captureModeRef.current === "live" ? "live flush scheduled" : "story flush scheduled",
            `${bufferWindowMs}ms`,
          );
          transcriptBufferTimerRef.current = setTimeout(() => {
            transcriptBufferTimerRef.current = null;
            flushSpeechBuffer("timer");
          }, bufferWindowMs);
        }
      };

      recognitionRef.current = recognition;
    }

    safeStartRecognition("enable speech recognition");
  }, [
    addSpeechDebug,
    clearRecognitionRestartTimer,
    clearSpeechBufferTimer,
    flushSpeechBuffer,
    restartRecognitionWithLang,
    safeStartRecognition,
    setRuntimeState,
  ]);

  const submitTypedInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    addSpeechDebug("typed submit received", trimmed);
    createConversationSegment(trimmed, "typed", undefined, undefined, "typed input");
    enableSpeechRecognition();
  }, [addSpeechDebug, createConversationSegment, enableSpeechRecognition, input]);

  const playElevenLabsSpeech = useCallback(
    async (
      text: string,
      detectedMode: InterpreterMode,
    ): Promise<"ended" | "error" | "timeout" | "skipped"> => {
      stopAudioPlayback();

      let response: Response;

      try {
        response = await fetch("/api/interpreter/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: detectedMode,
            text,
            voiceIdOverride: detectedMode === "id-en" ? voiceOverrides.en : voiceOverrides.id,
          }),
        });
      } catch (requestError) {
        addSpeechDebug("elevenlabs error", getErrorMessage(requestError));
        return "error";
      }

      if (response.status === 204) {
        addSpeechDebug("elevenlabs skipped", "not configured");
        return "skipped";
      }

      if (!response.ok) {
        const errorData = await readInterpreterJson(response);
        const message =
          readResponseString(errorData, "error") ||
          `ElevenLabs request failed with status ${response.status}.`;
        addSpeechDebug("elevenlabs error", message);
        return "error";
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        addSpeechDebug("elevenlabs error", "empty audio response");
        return "error";
      }

      const objectUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(objectUrl);
      audioObjectUrlRef.current = objectUrl;
      audioPlaybackRef.current = audio;

      const playbackPromise = new Promise<"ended" | "error">((resolve) => {
        audio.onended = () => {
          resolve("ended");
        };

        audio.onerror = () => {
          resolve("error");
        };

        void audio.play().catch(() => {
          resolve("error");
        });
      });

      const playbackResult = await resolveWithTimeout(
        playbackPromise,
        speechOutputTimeoutMs,
        "timeout",
      );

      if (playbackResult !== "ended") {
        stopAudioPlayback();
      }

      return playbackResult;
    },
    [addSpeechDebug, stopAudioPlayback, voiceOverrides.en, voiceOverrides.id],
  );

  const speakText = useCallback(
    async (text: string, detectedMode: InterpreterMode) => {
      if (typeof window === "undefined") {
        return;
      }

      addSpeechDebug("speech output started", outputLanguage(detectedMode));

      speakingRef.current = true;
      let result: "ended" | "error" | "timeout" = "timeout";
      const speechChunks = splitSpeechChunks(text);

      try {
        if (recognitionRunningRef.current || isListeningRef.current || isStartingRef.current) {
          addSpeechDebug("recognition pause", "speech output");
          safeStopRecognition("pause during speech output");
        }

        setRuntimeState("speaking", "translated");
        addSpeechDebug("speech chunk count", String(speechChunks.length || 1));

        for (const [chunkIndex, chunkText] of (speechChunks.length > 0 ? speechChunks : [text]).entries()) {
          addSpeechDebug("speech chunk start", `${chunkIndex + 1}/${speechChunks.length || 1}`);
          result = await playElevenLabsSpeech(chunkText, detectedMode);

          if (result === "skipped") {
            if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
              setError("Speech synthesis is not supported in this browser.");
              setRuntimeState("error", "speech synthesis unsupported");
              addSpeechDebug("speech output error", "speech synthesis unsupported");
              addSpeechDebug("speech output done", "unsupported");
              return;
            }

            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(chunkText);
            utterance.lang = outputLanguage(detectedMode);
            utterance.rate = 0.98;

            const speechPromise = new Promise<"ended" | "error">((resolve) => {
              utterance.onstart = () => {
                setRuntimeState("speaking", "speech output onstart");
              };

              utterance.onend = () => {
                resolve("ended");
              };

              utterance.onerror = () => {
                addSpeechDebug("speech output error", "speech synthesis error");
                resolve("error");
              };

              window.speechSynthesis.speak(utterance);
            });

            result = await resolveWithTimeout(speechPromise, speechOutputTimeoutMs, "timeout");
          } else {
            addSpeechDebug("speech output provider", "elevenlabs");
          }

          if (result !== "ended") {
            break;
          }
        }
      } catch (speechError) {
        result = "error";
        addSpeechDebug("speech output error", getErrorMessage(speechError));
      } finally {
        speakingRef.current = false;

        if (result === "timeout") {
          stopAudioPlayback();
          window.speechSynthesis.cancel();
          setRuntimeState(
            shouldKeepListeningRef.current ? "listening" : "idle",
            "speech timeout",
          );
          addSpeechDebug("speech output error", "timeout 15000ms");
        } else if (result === "error") {
          setError("");
          setRuntimeState(
            shouldKeepListeningRef.current ? "listening" : "idle",
            "speech output error",
          );
        } else {
          setRuntimeState(
            shouldKeepListeningRef.current ? "listening" : "idle",
            "speech done",
          );
        }

        addSpeechDebug(
          "restart after speech",
          result === "ended" ? "output ended" : `output ${result}`,
        );
        addSpeechDebug("speech output done", result);

        if (shouldKeepListeningRef.current) {
          const restartReason =
            result === "timeout"
              ? "after speech output timeout"
              : result === "error"
                ? "after speech output error"
                : "after speech output";
          clearRecognitionRestartTimer();
          await new Promise<void>((resolve) => {
            restartTimerRef.current = window.setTimeout(() => {
              restartTimerRef.current = null;
              safeStartRecognition(restartReason);
              resolve();
            }, 400);
          });
        }
      }
    },
    [
      addSpeechDebug,
      clearRecognitionRestartTimer,
      playElevenLabsSpeech,
      safeStartRecognition,
      safeStopRecognition,
      setRuntimeState,
      stopAudioPlayback,
    ],
  );

  const processTranslationQueue = useCallback(() => {
    if (isTranslatorRunningRef.current) {
      return;
    }

    isTranslatorRunningRef.current = true;
    setIsTranslatorRunning(true);
    addSpeechDebug("translator queue started", String(translationQueueRef.current.length));

    void (async () => {
      try {
        while (translationQueueRef.current.length > 0) {
          const entryId = translationQueueRef.current.shift();
          setQueueLength(translationQueueRef.current.length);

          if (!entryId) {
            continue;
          }

          const entry = conversationLogRef.current.find((item) => item.id === entryId);
          if (!entry) {
            addSpeechDebug("queue warning", `missing entry ${entryId}`);
            continue;
          }

          if (entry.status !== "pending") {
            addSpeechDebug("queue skipped", `${entry.status} ${entry.source}`);
            continue;
          }

          setConversationLogSynced((currentLog) =>
            currentLog.map((item) =>
              item.id === entryId
                ? {
                    ...item,
                    status: "translating",
                    error: undefined,
                  }
                : item,
            ),
          );
          setRuntimeState("translating", `entry ${entryId}`);
          addSpeechDebug("translation started", entryId);
          addSpeechDebug("translating entry id", entryId);
          addSpeechDebug("translating", `${modeLabel(entry.mode)} ${entry.source}`);

          let translationTimeout: number | null = null;

          try {
            addSpeechDebug("provider resolution started", entryId);
            const controller = new AbortController();
            translationTimeout = window.setTimeout(() => {
              controller.abort();
            }, translationRequestTimeoutMs);

            const response = await fetch("/api/interpreter", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              signal: controller.signal,
              body: JSON.stringify({
                input: entry.input,
                mode: entry.mode,
                pathname: window.location.pathname,
              }),
            });
            const data = await readInterpreterJson(response);
            window.clearTimeout(translationTimeout);
            translationTimeout = null;
            const fallbackChainTried = readResponseStringArray(data, "fallbackChainTried");
            const tokenizinSkippedReason = readResponseString(data, "tokenizinSkippedReason");

            for (const providerEvent of fallbackChainTried) {
              addSpeechDebug(providerEvent);
            }

            if (tokenizinSkippedReason) {
              addSpeechDebug("provider skipped: tokenizin safety", tokenizinSkippedReason);
            }

            const translatedText =
              typeof data === "object" &&
              data !== null &&
              "translatedText" in data &&
              typeof data.translatedText === "string"
                ? data.translatedText
                : "";
            const apiError =
              typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof data.error === "string"
                ? data.error
                : "";
            const {
              conversationFallbackUsed,
              fallbackUsed,
              learningContext,
              learningMatchesCount,
              learningTypesUsed,
              model,
              provider,
            } = readInterpreterResponseMetadata(data);

            if (apiError || !response.ok || !translatedText) {
              throw new Error(apiError || "Interpreter returned no translation.");
            }

            setProviderInfo({
              fallbackUsed,
              learningContext,
              model,
              provider,
            });
            setConversationLogSynced((currentLog) =>
              currentLog.map((item) =>
                item.id === entryId
                  ? {
                      ...item,
                      output: translatedText,
                      provider,
                      model,
                      fallbackUsed: conversationFallbackUsed,
                      learningMatchesCount,
                      learningTypesUsed,
                      status: "translated",
                      error: undefined,
                    }
                  : item,
              ),
            );
            setLastOutput(translatedText);
            addSpeechDebug("provider result", `${provider} / ${model} / fallback ${fallbackUsed}`);
            addSpeechDebug("translation success entry id", entryId);
            addSpeechDebug("translation done", entryId);
            addSpeechDebug("translated", translatedText);
            await speakText(translatedText, entry.mode);
          } catch (translateError) {
            const message =
              translateError instanceof DOMException && translateError.name === "AbortError"
                ? "Translation request timed out."
                : getErrorMessage(translateError);
            setConversationLogSynced((currentLog) =>
              currentLog.map((item) =>
                item.id === entryId
                  ? {
                      ...item,
                      status: "error",
                      error: message,
                    }
                  : item,
              ),
            );
            setError(message);
            setRuntimeState("error", `entry ${entryId}: ${message}`);
            addSpeechDebug("translation error entry id", entryId);
            addSpeechDebug("translation error", message);
            addSpeechDebug("translation done", `error ${entryId}`);
            addSpeechDebug("entry error", entryId);
          } finally {
            if (translationTimeout !== null) {
              window.clearTimeout(translationTimeout);
            }
            addSpeechDebug("queue continued", `${translationQueueRef.current.length} remaining`);
          }
        }
      } finally {
        isTranslatorRunningRef.current = false;
        setIsTranslatorRunning(false);
        setQueueLength(translationQueueRef.current.length);

        if (translationQueueRef.current.length > 0) {
          processTranslationQueueRef.current();
        } else {
          addSpeechDebug("queue finished", "0");
        }

        if (
          translationQueueRef.current.length === 0 &&
          shouldKeepListeningRef.current &&
          !speakingRef.current
        ) {
          setRuntimeState("listening", "queue finished");
          safeStartRecognition("queue finished");
        }
      }
    })();
  }, [addSpeechDebug, safeStartRecognition, setConversationLogSynced, setRuntimeState, speakText]);

  processTranslationQueueRef.current = processTranslationQueue;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedLog = window.localStorage.getItem(conversationLogStorageKey);
      if (storedLog) {
        const parsedLog: unknown = JSON.parse(storedLog);
        if (Array.isArray(parsedLog)) {
          setConversationLogSynced(() =>
            parsedLog
              .map(normalizeConversationLogEntry)
              .filter((entry): entry is ConversationLogEntry => entry !== null)
              .slice(-100),
          );
        }
      }
    } catch {
      setConversationLogSynced(() => []);
    } finally {
      conversationLogLoadedRef.current = true;
    }
  }, [setConversationLogSynced]);

  useEffect(() => {
    if (typeof window === "undefined" || !conversationLogLoadedRef.current) {
      return;
    }

    window.localStorage.setItem(
      conversationLogStorageKey,
      JSON.stringify(conversationLog.slice(-100)),
    );
  }, [conversationLog]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedVoiceOverrides = window.localStorage.getItem(voiceOverridesStorageKey);
      if (!storedVoiceOverrides) {
        return;
      }

      setVoiceOverrides(normalizeVoiceOverrides(JSON.parse(storedVoiceOverrides) as unknown));
    } catch {
      setVoiceOverrides({ en: "", id: "" });
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(voiceOverridesStorageKey, JSON.stringify(voiceOverrides));
  }, [voiceOverrides]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleManualFlush = (event: KeyboardEvent) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        flushSpeechBuffer("manual");
        return;
      }

      if (!event.altKey) {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        updateActiveSpeaker("speaker_a");
      } else if (event.key === "2") {
        event.preventDefault();
        updateActiveSpeaker("speaker_b");
      } else if (event.key === "0") {
        event.preventDefault();
        updateActiveSpeaker("unknown");
      }
    };

    window.addEventListener("keydown", handleManualFlush);
    return () => {
      window.removeEventListener("keydown", handleManualFlush);
    };
  }, [flushSpeechBuffer, updateActiveSpeaker]);

  useEffect(() => {
    unmountedRef.current = false;

    return () => {
      unmountedRef.current = true;
      shouldKeepListeningRef.current = false;
      if (restartTimerRef.current !== null) {
        window.clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (transcriptBufferTimerRef.current !== null) {
        clearTimeout(transcriptBufferTimerRef.current);
        transcriptBufferTimerRef.current = null;
      }
      translationQueueRef.current = [];
      safeStopRecognition("unmount");
      stopAudioPlayback();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [safeStopRecognition, stopAudioPlayback]);

  const displayStatus: InterpreterStatus =
    status === "READY" && isListening ? "LISTENING" : status;
  const visibleInput = liveTranscript || lastInput || "Speak or type...";
  const bufferStatusDetail =
    speechBufferStatus === "collecting"
      ? captureMode === "story"
        ? "waiting for story delay or manual flush"
        : "waiting for live silence window"
      : speechBufferStatus === "flushing"
        ? "creating conversation entry"
        : "idle";
  const visibleConversationLog =
    conversationFilter === "all"
      ? conversationLog
      : conversationLog.filter((entry) => entry.speaker === conversationFilter);

  return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 text-white selection:bg-white/20"
      onClick={enableSpeechRecognition}
    >
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full scale-105 object-cover opacity-85"
        aria-hidden
      >
        <source src="/video/hero.webm" type="video/webm" />
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.16),transparent_28%),linear-gradient(115deg,rgba(0,0,0,0.94),rgba(0,0,0,0.74)_48%,rgba(0,0,0,0.9))]"
        aria-hidden
      />

      <section className="relative z-10 flex flex-1 overflow-hidden px-4 py-4 md:px-8 lg:px-10">
        <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(320px,0.8fr)] xl:grid-cols-[minmax(0,2.4fr)_minmax(360px,0.85fr)]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="order-2 shrink-0 rounded-[1rem] border border-white/10 bg-black/45 p-3 font-mono text-white/70 shadow-2xl shadow-black/35 ring-1 ring-white/5 backdrop-blur-xl">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.42em] text-white/45">
                    PRESTIX INTERPRETER
                  </div>
                  <div className="mt-1 text-xs text-white/45">{micHint}</div>
                </div>
                <div className="rounded-full border border-emerald-300/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100/70">
                  {displayStatus}
                </div>
              </div>

              <div className="grid gap-2 text-[10px] uppercase tracking-[0.16em] text-white/55 sm:grid-cols-2 xl:grid-cols-9">
                <span>RUNTIME {runtimeState.toUpperCase()}</span>
                <span>MODE {modeLabel(mode)}</span>
                <span>SPEECH {recognitionLang}</span>
                <span>CAPTURE {captureMode.toUpperCase()}</span>
                <span>BUFFER {bufferLength}</span>
                <span>QUEUE {queueLength}</span>
                <span>RECOG {recognitionRunning ? "YES" : "NO"}</span>
                <span>TRANSLATOR {isTranslatorRunning ? "RUNNING" : "IDLE"}</span>
                <span>BUFFERING {speechBufferStatus.toUpperCase()}</span>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)]">
                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/50">
                  <span>capture</span>
                  {(["live", "story"] as CaptureMode[]).map((nextMode) => (
                    <button
                      key={nextMode}
                      type="button"
                      onClick={() => updateCaptureMode(nextMode)}
                      className={`rounded-full border px-3 py-1.5 transition ${
                        captureMode === nextMode
                          ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                      }`}
                    >
                      {nextMode}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => flushSpeechBuffer("manual")}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-white/45 transition hover:border-emerald-300/30 hover:text-emerald-100"
                  >
                    Flush buffer now
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/50">
                  <span>active</span>
                  {(["unknown", "speaker_a", "speaker_b"] as SpeakerId[]).map((speaker) => (
                    <button
                      key={speaker}
                      type="button"
                      onClick={() => updateActiveSpeaker(speaker)}
                      className={`rounded-full border px-3 py-1.5 transition ${
                        activeSpeaker === speaker
                          ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                      }`}
                    >
                      {speakerLabel(speaker)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                    voice EN
                  </div>
                  <input
                    type="text"
                    value={voiceOverrides.en}
                    onChange={(event) =>
                      setVoiceOverrides((current) => ({
                        ...current,
                        en: event.target.value,
                      }))
                    }
                    placeholder="default env voice"
                    className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                  />
                  <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
                    used for ID -&gt; EN output
                  </div>
                </label>

                <label className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                    voice ID
                  </div>
                  <input
                    type="text"
                    value={voiceOverrides.id}
                    onChange={(event) =>
                      setVoiceOverrides((current) => ({
                        ...current,
                        id: event.target.value,
                      }))
                    }
                    placeholder="default env voice"
                    className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                  />
                  <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
                    used for EN -&gt; ID output
                  </div>
                </label>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                    live input
                  </div>
                  <div className="min-h-10 whitespace-pre-wrap text-sm leading-snug text-white md:text-base">
                    {visibleInput}
                  </div>
                  {liveTranscript ? (
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-emerald-100/55">
                      buffer {bufferStatusDetail}
                    </div>
                  ) : null}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.06] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                    latest output
                  </div>
                  <div className="min-h-10 whitespace-pre-wrap text-sm font-semibold leading-snug text-emerald-50 md:text-base">
                    {lastOutput || "Awaiting translation..."}
                  </div>
                </div>
              </div>

              {error ? (
                <div className="mt-3 rounded-2xl border border-red-400/40 bg-red-950/50 p-3 text-sm text-red-100">
                  ERROR: {error}
                </div>
              ) : null}
            </div>

            <div className="order-1 flex min-h-0 flex-1 flex-col rounded-[1.75rem] border border-white/15 bg-black/60 p-4 font-mono shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl md:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.42em] text-emerald-200/80">
                    conversation log
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">
                    primary transcript and interpretation view
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearConversationLog}
                  className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/45 transition hover:border-red-300/30 hover:text-red-100"
                >
                  clear
                </button>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(["all", "speaker_a", "speaker_b", "unknown"] as ConversationFilter[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setConversationFilter(filter)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                        conversationFilter === filter
                          ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                          : "border-white/10 bg-white/[0.03] text-white/42 hover:text-white/70"
                      }`}
                    >
                      {filter === "all" ? "Show all" : speakerLabel(filter)}
                    </button>
                  ),
                )}
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
                {visibleConversationLog.length > 0 ? (
                  visibleConversationLog
                    .slice()
                    .reverse()
                    .map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-[1.5rem] border border-white/10 bg-white/[0.055] p-4 text-white/75 shadow-lg shadow-black/20 md:p-5"
                      >
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42">
                          <span>{entry.timestamp}</span>
                          <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2.5 py-1 text-emerald-100/80">
                            {speakerLabel(entry.speaker)}
                          </span>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-white/65">
                            {entry.status}
                          </span>
                          <span>{entry.source}</span>
                          <span>{modeLabel(entry.mode)}</span>
                          {entry.provider ? <span>{entry.provider}</span> : null}
                          {entry.model ? <span>{entry.model}</span> : null}
                          {typeof entry.fallbackUsed === "boolean" ? (
                            <span>fallback {String(entry.fallbackUsed)}</span>
                          ) : null}
                          {typeof entry.learningMatchesCount === "number" ? (
                            <span>learning {entry.learningMatchesCount}</span>
                          ) : null}
                          {entry.learningTypesUsed?.length ? (
                            <span>{entry.learningTypesUsed.join(", ")}</span>
                          ) : null}
                        </div>

                        <div className="grid gap-4 text-sm leading-relaxed md:grid-cols-2 md:text-base">
                          <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                            <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                              IN
                            </span>
                            <div className="mt-2 whitespace-pre-wrap text-white/90">{entry.input}</div>
                          </div>
                          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
                            <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                              OUT
                            </span>
                            <div className="mt-2 whitespace-pre-wrap text-emerald-50">
                              {entry.status === "error"
                                ? entry.error || "Translation failed."
                                : entry.output || "waiting..."}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(["speaker_a", "speaker_b", "unknown"] as SpeakerId[]).map(
                            (speaker) => (
                              <button
                                key={speaker}
                                type="button"
                                onClick={() => updateConversationSpeaker(entry.id, speaker)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
                                  entry.speaker === speaker
                                    ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                                    : "border-white/10 bg-black/20 text-white/40 hover:text-white/75"
                                }`}
                              >
                                {speakerLabel(speaker)}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-white/40">
                    no conversation entries yet
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col rounded-[1.75rem] border border-emerald-300/15 bg-black/60 p-4 font-mono text-[10px] text-emerald-50/65 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-xl lg:sticky lg:top-4 lg:max-h-[calc(100vh-9rem)]">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.38em] text-emerald-200/80">
                  flow log
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/35">
                  last 40 technical events
                </div>
              </div>
              <div className="rounded-full border border-emerald-300/20 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-emerald-200/70">
                {displayStatus}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.13em] text-white/42">
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                runtime {runtimeState}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                queue {queueLength}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                translator {isTranslatorRunning ? "running" : "idle"}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                buffer {bufferLength}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                recog {recognitionRunning ? "yes" : "no"}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                buffer state {speechBufferStatus}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                capture {captureMode}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                delay {getBufferWindowMs(captureMode)}ms
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                speaker {speakerLabel(activeSpeaker)}
              </span>
              <span className="rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2">
                provider {providerInfo.provider}
              </span>
            </div>

            <div className="min-h-48 flex-1 space-y-1.5 overflow-y-auto pr-1">
              {speechDebugLog.length > 0 ? (
                speechDebugLog.slice(-40).map((entry, index) => (
                  <div
                    key={`${entry}-${index}`}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 leading-relaxed text-white/58"
                  >
                    {entry}
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-white/40">
                  waiting for technical events
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      <form
        className="relative z-10 border-t border-white/20 bg-black/90 px-4 py-4 shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:px-12"
        onSubmit={(event) => {
          event.preventDefault();
          submitTypedInput();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              event.stopPropagation();
              flushSpeechBuffer("manual");
            }
          }}
          onFocus={enableSpeechRecognition}
          onClick={enableSpeechRecognition}
          placeholder="Type here or speak..."
          className="h-20 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 font-mono text-2xl text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.07] md:h-24 md:px-7 md:text-3xl"
          aria-label="Interpreter input"
        />
      </form>
    </main>
  );
}
