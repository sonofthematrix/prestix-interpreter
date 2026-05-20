"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useSpeechDebug } from "../../hooks/interpreter/useSpeechDebug";
import { useAudioPlayback } from "../../hooks/interpreter/useAudioPlayback";
import { useInterpreterSession } from "../../hooks/interpreter/useInterpreterSession";
import {
  createSpeechOutputQueue,
  readInterpreterResponseMetadata,
  resolveWithTimeout,
} from "../../lib/interpreter/clientRuntime";
import { pickPreferredBrowserVoice } from "../../lib/interpreter/browserVoice";
import type { BrowserMicrophonePermissionState } from "../../lib/interpreter/microphonePermission";
import {
  getStoredMicrophoneArmed,
  shouldAutoArmBrowserSpeech,
  shouldPersistMicrophoneArmed,
} from "../../lib/interpreter/microphonePermission";
import {
  getAssistantGreeting,
  shouldQueueAssistantMicGreeting,
} from "../../lib/interpreter/assistantGreeting";
import {
  getTranslatorButtonLabel,
} from "../../lib/interpreter/translatorToggle";
import {
  PRODUCT_BRAND,
  PRODUCT_DISPLAY_NAME,
  PRODUCT_TAGLINE,
} from "../../lib/interpreter/branding";
import { getVoiceSurfaceIntro } from "../../lib/interpreter/uiEntry";
import { getVoicePresenceCopy } from "../../lib/interpreter/voicePresence";
import { getVoiceDockCopy } from "../../lib/interpreter/voiceDock";
import {
  getIdleOutputPlaceholder,
  getStandbySpeechOutputProvider,
  resolveSendNowAction,
} from "../../lib/interpreter/assistantUx";
import type { ConversationLogEntry, InterpreterMode, SessionMode, SuggestedLearning } from "../../lib/interpreter/types";
import { hasMarker, INDONESIAN_MARKERS, ENGLISH_MARKERS, DUTCH_MARKERS } from "../../lib/interpreter/languageMarkers";
import { isSessionMode } from "../../lib/interpreter/typeGuards";
import { PrestixBabylonBackdrop } from "../../components/interpreter/PrestixBabylonBackdrop";

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
type RecognitionLang = "id-ID" | "en-US" | "nl-NL";
type SourceLanguage = "id" | "en" | "nl" | "unknown";
type SpeakerId = "speaker_a" | "speaker_b" | "unknown";
type ConversationFilter = SpeakerId | "all";
type CaptureMode = "live" | "story";
type SpeechBufferStatus = "idle" | "collecting" | "flushing" | "queued";
type SpeechInputEngine = "browser" | "local-whisper";
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
  nl: string;
};
type VoicePreset = {
  id: string;
  label: string;
};
type VoicePresetBank = {
  en: VoicePreset[];
  id: VoicePreset[];
  nl: VoicePreset[];
};
type ElevenLabsVoiceOption = {
  id: string;
  label: string;
  gender?: string;
  accent?: string;
};
type SpeechOutputProvider = "pending" | "elevenlabs" | "browser" | "unsupported" | "error";
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

const liveBufferWindowMs = 650;
const storyBufferWindowMs = 3500;
const speechOutputTimeoutMs = 15000;
const translationRequestTimeoutMs = 30000;
const localTranscribeRequestTimeoutMs = 300000;
const conversationLogStorageKey = "prestix-interpreter-conversation-log";
const activeSpeakerStorageKey = "prestix-interpreter-active-speaker";
const voiceOverridesStorageKey = "prestix-interpreter-voice-overrides";
const voicePresetBankStorageKey = "prestix-interpreter-voice-preset-bank";
const speechInputEngineStorageKey = "prestix-interpreter-speech-input-engine";
const assistantRecognitionLangStorageKey = "prestix-interpreter-assistant-recognition-lang";
const microphoneArmedStorageKey = "prestix-interpreter-browser-microphone-armed";
const emptyVoicePresetBank: VoicePresetBank = {
  en: [
    { id: "", label: "" },
    { id: "", label: "" },
    { id: "", label: "" },
  ],
  id: [
    { id: "", label: "" },
    { id: "", label: "" },
    { id: "", label: "" },
  ],
  nl: [
    { id: "", label: "" },
    { id: "", label: "" },
    { id: "", label: "" },
  ],
};
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

/** Assistant mode: default translation route when source language is still ambiguous */
function assistantFallbackMode(last: SourceLanguage): InterpreterMode {
  if (last === "id") {
    return "id-en";
  }
  if (last === "nl") {
    return "nl-id";
  }
  return "en-id";
}

function detectSourceLanguage(
  text: string,
  currentRecognitionLang?: RecognitionLang,
  options?: {
    lastDetectedSourceLang?: SourceLanguage;
    sessionMode?: SessionMode;
  },
): SourceLanguage {
  const normalized = text.toLowerCase();
  if (hasMarker(normalized, INDONESIAN_MARKERS)) {
    return "id";
  }

  if (hasMarker(normalized, DUTCH_MARKERS)) {
    return "nl";
  }

  if (hasMarker(normalized, ENGLISH_MARKERS)) {
    return "en";
  }

  if (options?.sessionMode === "assistant") {
    if (
      options.lastDetectedSourceLang === "id" ||
      options.lastDetectedSourceLang === "en" ||
      options.lastDetectedSourceLang === "nl"
    ) {
      return options.lastDetectedSourceLang;
    }

    return "unknown";
  }

  if (currentRecognitionLang === "id-ID") {
    return "id";
  }

  if (currentRecognitionLang === "en-US") {
    return "en";
  }

  if (currentRecognitionLang === "nl-NL") {
    return "nl";
  }

  return "unknown";
}

function modeFromSourceLang(
  sourceLang: SourceLanguage,
  fallbackMode: InterpreterMode = "en-id",
): InterpreterMode {
  if (sourceLang === "unknown") {
    return fallbackMode;
  }

  if (sourceLang === "id") {
    return "id-en";
  }
  if (sourceLang === "nl") {
    return "nl-id";
  }
  return "en-id";
}

/**
 * After a finalized interpreter utterance, switch Web Speech to the *other* language
 * so the next speaker is recognized (NL ↔ ID / EN ↔ ID alternation).
 */
function recognitionLangAfterInterpreterTurn(
  sourceLang: SourceLanguage,
  segmentMode: InterpreterMode,
): RecognitionLang {
  if (sourceLang === "id") {
    // Indonesian heard → listen for European target of this segment
    return segmentMode === "id-nl" ? "nl-NL" : "en-US";
  }
  // English, Dutch, or any other non-ID source → expect Indonesian next
  return "id-ID";
}

function detectMode(text: string): InterpreterMode {
  return modeFromSourceLang(detectSourceLanguage(text, "en-US"));
}

function modeLabel(mode: InterpreterMode): string {
  switch (mode) {
    case "id-en":
      return "ID -> EN";
    case "en-id":
      return "EN -> ID";
    case "nl-id":
      return "NL -> ID";
    case "id-nl":
      return "ID -> NL";
    default:
      return mode;
  }
}

function sessionModeLabel(sessionMode: SessionMode): string {
  return sessionMode === "assistant" ? "prestix" : "force translate";
}

function sessionStatusLabel(status: ConversationStatus, sessionMode: SessionMode): string {
  if (sessionMode === "assistant") {
    if (status === "pending") {
      return "thinking";
    }
    if (status === "translating") {
      return "replying";
    }
    if (status === "translated") {
      return "replied";
    }
    return "error";
  }

  if (status === "pending") {
    return "queued";
  }
  if (status === "translating") {
    return "translating";
  }
  if (status === "translated") {
    return "translated";
  }
  return "error";
}

function conversationViewSubtitle(sessionMode: SessionMode): string {
  return sessionMode === "assistant"
    ? "prestix conversation and interpreter view"
    : "force translate transcript view";
}

function inputPanelLabel(sessionMode: SessionMode): string {
  return sessionMode === "assistant" ? "you said" : "source";
}

function outputPanelLabel(sessionMode: SessionMode): string {
  return sessionMode === "assistant" ? "prestix" : "translation";
}

function outputModeForSession(mode: InterpreterMode, sessionMode: SessionMode): InterpreterMode {
  if (sessionMode === "interpreter") {
    return mode;
  }

  return mode;
}

function outputLanguage(mode: InterpreterMode): string {
  switch (mode) {
    case "id-en":
      return "en-US";
    case "id-nl":
      return "nl-NL";
    case "nl-id":
    case "en-id":
      return "id-ID";
    default:
      return "nl-NL";
  }
}

function recognitionLangLabel(lang: RecognitionLang): string {
  if (lang === "id-ID") {
    return "bahasa";
  }
  if (lang === "nl-NL") {
    return "nederlands";
  }
  return "english";
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
    isSessionMode(entry.sessionMode) &&
    (entry.mode === "id-en" ||
      entry.mode === "en-id" ||
      entry.mode === "nl-id" ||
      entry.mode === "id-nl") &&
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
    (entry.mode !== "id-en" &&
      entry.mode !== "en-id" &&
      entry.mode !== "nl-id" &&
      entry.mode !== "id-nl") ||
    typeof entry.input !== "string"
  ) {
    return null;
  }

  return {
    id: entry.id,
    timestamp: entry.timestamp,
    speaker: entry.speaker,
    source: entry.source,
    sessionMode: isSessionMode(entry.sessionMode) ? entry.sessionMode : "interpreter",
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
    return { en: "", id: "", nl: "" };
  }

  const record = value as Record<string, unknown>;
  return {
    en: typeof record.en === "string" ? record.en : "",
    id: typeof record.id === "string" ? record.id : "",
    nl: typeof record.nl === "string" ? record.nl : "",
  };
}

function normalizeVoicePresetBank(value: unknown): VoicePresetBank {
  if (typeof value !== "object" || value === null) {
    return emptyVoicePresetBank;
  }

  const record = value as Record<string, unknown>;
  const normalizeSlots = (slots: unknown): VoicePreset[] => {
    if (!Array.isArray(slots)) {
      return emptyVoicePresetBank.en;
    }

    return [0, 1, 2].map((index) => {
      const slot = slots[index];
      if (typeof slot === "string") {
        return { id: slot, label: "" };
      }

      if (typeof slot === "object" && slot !== null) {
        const slotRecord = slot as Record<string, unknown>;
        return {
          id: typeof slotRecord.id === "string" ? slotRecord.id : "",
          label: typeof slotRecord.label === "string" ? slotRecord.label : "",
        };
      }

      return { id: "", label: "" };
    });
  };

  return {
    en: normalizeSlots(record.en),
    id: normalizeSlots(record.id),
    nl: normalizeSlots(record.nl),
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

function speakerShortLabel(speaker: SpeakerId): string {
  if (speaker === "speaker_a") {
    return "A";
  }

  if (speaker === "speaker_b") {
    return "B";
  }

  return "?";
}

function formatVoiceTag(value?: string): string {
  return value ? value.replace(/_/g, " ").trim() : "";
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
  const [recognitionLang, setRecognitionLang] = useState<RecognitionLang>("nl-NL");
  const [lastSpeechSwitchReason, setLastSpeechSwitchReason] = useState("initial");
  const [speechConfidence, setSpeechConfidence] = useState<number | null>(null);
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
  const [voiceOverrides, setVoiceOverrides] = useState<VoiceOverrides>({ en: "", id: "", nl: "" });
  const [voicePresetBank, setVoicePresetBank] = useState<VoicePresetBank>(emptyVoicePresetBank);
  const [voicePresetLabels, setVoicePresetLabels] = useState<VoiceOverrides>({
    en: "",
    id: "",
    nl: "",
  });
  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoiceOption[]>([]);
  const [speechOutputProvider, setSpeechOutputProvider] =
    useState<SpeechOutputProvider>("pending");
  const [speechInputEngine, setSpeechInputEngine] =
    useState<SpeechInputEngine>("local-whisper");
  const [assistantRecognitionLang, setAssistantRecognitionLang] =
    useState<RecognitionLang>("en-US");
  const [browserMicrophonePermission, setBrowserMicrophonePermission] =
    useState<BrowserMicrophonePermissionState>("unknown");
  const [isTranslatorRunning, setIsTranslatorRunning] = useState(false);
  const [bufferLength, setBufferLength] = useState(0);
  const [recognitionRunning, setRecognitionRunning] = useState(false);
  const [isLocalRecording, setIsLocalRecording] = useState(false);
  const [isLocalTranscribing, setIsLocalTranscribing] = useState(false);
  const [learningSuggestions, setLearningSuggestions] = useState<SuggestedLearning[]>([]);
  const [showLearningConfirm, setShowLearningConfirm] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const ambientStorageKey = 'prestix-ambient-listening-enabled';

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const recognitionRunningRef = useRef(false);
  const runtimeStateRef = useRef<RuntimeState>("idle");
  const shouldKeepListeningRef = useRef(false);
  const speakingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const recognitionLangRef = useRef<RecognitionLang>("nl-NL");
  const lastDetectedSourceLangRef = useRef<SourceLanguage>("unknown");
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);
  const restartFailuresRef = useRef(0);
  const hasAutoArmedBrowserSpeechRef = useRef(false);
  const hasSpokenAssistantMicGreetingRef = useRef(false);
  const speechFinalBufferRef = useRef<string[]>([]);
  const transcriptBufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechBufferFlushInProgressRef = useRef(false);
  const lastSpeechEventAtRef = useRef<number | null>(null);
  const captureModeRef = useRef<CaptureMode>("live");
  const sessionModeRef = useRef<SessionMode>("assistant");
  const activeSpeakerRef = useRef<SpeakerId>("unknown");
  const activeSpeakerLoadedRef = useRef(false);
  const unmountedRef = useRef(false);
  const conversationLogLoadedRef = useRef(false);
  const conversationLogRef = useRef<ConversationLogEntry[]>([]);
  const translationQueueRef = useRef<string[]>([]);
  const isTranslatorRunningRef = useRef(false);
  const processTranslationQueueRef = useRef<() => void>(() => {});
  const speakTextRef = useRef<
    (text: string, detectedMode: InterpreterMode, sessionMode: SessionMode) => Promise<void>
  >(async () => {});
  const speechOutputQueueRef = useRef(
    createSpeechOutputQueue<{ text: string; mode: InterpreterMode; sessionMode: SessionMode }>({
      speak: async (job) => {
        await speakTextRef.current(job.text, job.mode, job.sessionMode);
      },
    }),
  );
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedAudioChunksRef = useRef<Blob[]>([]);

  // Hook integrations (Phase 1 decomposition)
  const { speechDebugLog, addSpeechDebug, addSpeechDebugRef } = useSpeechDebug();
  const { audioPlaybackRef, audioObjectUrlRef, stopAudioPlayback } = useAudioPlayback();
  const sessionHook = useInterpreterSession();

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

  const stopLocalRecordingStream = useCallback(() => {
    if (mediaRecorderRef.current !== null) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.onerror = null;
      mediaRecorderRef.current = null;
    }

    if (mediaStreamRef.current !== null) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }

    recordedAudioChunksRef.current = [];
  }, []);

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
    speechOutputQueueRef.current.clear();
    hasSpokenAssistantMicGreetingRef.current = false;
    setQueueLength(0);
    setLastOutput("");
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

  const updateSessionMode = useCallback(
    (nextMode: SessionMode) => {
      sessionModeRef.current = nextMode;
      sessionHook.setSessionMode(nextMode);
      addSpeechDebug("session mode changed", sessionModeLabel(nextMode).toUpperCase());
    },
    [addSpeechDebug],
  );

  useEffect(() => {
    updateSessionMode(sessionHook.translatorEnabled ? "interpreter" : "assistant");
  }, [sessionHook.translatorEnabled, updateSessionMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const standbyProvider = getStandbySpeechOutputProvider(
      "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined",
    );

    setSpeechOutputProvider((current) => (current === "pending" ? standbyProvider : current));
  }, []);

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

  const scheduleRecognitionRestart = useCallback(
    (reason: string, delayMs = 400) => {
      clearRecognitionRestartTimer();
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        if (shouldKeepListeningRef.current && !unmountedRef.current) {
          safeStartRecognition(reason);
        }
      }, delayMs);
    },
    [clearRecognitionRestartTimer, safeStartRecognition],
  );

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
      scheduleRecognitionRestart(reason, 450);
    },
    [addSpeechDebug, safeStopRecognition, scheduleRecognitionRestart],
  );

  const applyAssistantRecognitionLang = useCallback(
    (nextLang: RecognitionLang, reason: string) => {
      setAssistantRecognitionLang(nextLang);
      setLastSpeechSwitchReason(reason);

      if (sessionModeRef.current !== "assistant") {
        return;
      }

      if (recognitionLangRef.current === nextLang) {
        return;
      }

      if (
        speechInputEngine === "browser" &&
        shouldKeepListeningRef.current &&
        (recognitionRunningRef.current || isStartingRef.current)
      ) {
        restartRecognitionWithLang(nextLang, reason);
        return;
      }

      recognitionLangRef.current = nextLang;
      setRecognitionLang(nextLang);
      setMicHint(`Assistant mic set to ${recognitionLangLabel(nextLang)}.`);
      addSpeechDebug("assistant mic language changed", recognitionLangLabel(nextLang));
    },
    [addSpeechDebug, restartRecognitionWithLang, speechInputEngine],
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

      const entrySessionMode: SessionMode = sessionHook.translatorEnabled ? "interpreter" : "assistant";
      const resolvedSourceLang =
        detectedSourceLang ??
        detectSourceLanguage(trimmed, recognitionLangRef.current, {
          sessionMode: entrySessionMode,
          lastDetectedSourceLang: lastDetectedSourceLangRef.current,
        });
      const fallbackMode =
        entrySessionMode === "assistant"
          ? assistantFallbackMode(lastDetectedSourceLangRef.current)
          : "en-id";
      const detectedMode = forcedMode ?? modeFromSourceLang(resolvedSourceLang, fallbackMode);

      if (resolvedSourceLang === "id" || resolvedSourceLang === "en" || resolvedSourceLang === "nl") {
        lastDetectedSourceLangRef.current = resolvedSourceLang;
      }

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
        sessionMode: entrySessionMode,
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
        `${entryId} ${source} ${sessionModeLabel(entrySessionMode)} ${modeLabel(detectedMode)}`,
      );

      setRuntimeState("queued", `${queuedReason}: ${entryId}`);
      enqueueTranslationEntry(entryId);

      if (
        source === "speech" &&
        resolvedSourceLang !== "unknown" &&
        speechInputEngine === "browser" &&
        entrySessionMode === "interpreter"
      ) {
        restartRecognitionWithLang(
          recognitionLangAfterInterpreterTurn(resolvedSourceLang, detectedMode),
          `next expected after ${resolvedSourceLang}`,
        );
      }

      return entryId;
    },
    [
      addSpeechDebug,
      enqueueTranslationEntry,
      restartRecognitionWithLang,
      speechInputEngine,
      setConversationLogSynced,
      setRuntimeState,
      sessionHook.translatorEnabled,
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

        const currentSessionMode = sessionModeRef.current;
        const detectedSourceLang = detectSourceLanguage(combinedText, recognitionLangRef.current, {
          sessionMode: currentSessionMode,
          lastDetectedSourceLang: lastDetectedSourceLangRef.current,
        });
        const entryId = createConversationSegment(
          combinedText,
          "speech",
          undefined,
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

  const scheduleSpeechBufferFlush = useCallback(
    (reason: string) => {
      if (speechFinalBufferRef.current.length === 0) {
        return;
      }

      clearSpeechBufferTimer();
      const now = Date.now();
      const bufferWindowMs = getBufferWindowMs(captureModeRef.current);
      const lastEventAt = lastSpeechEventAtRef.current ?? now;
      const remainingDelayMs = Math.max(0, bufferWindowMs - Math.max(0, now - lastEventAt));

      addSpeechDebug(
        captureModeRef.current === "live" ? "live flush scheduled" : "story flush scheduled",
        `${remainingDelayMs}ms (${reason})`,
      );
      transcriptBufferTimerRef.current = setTimeout(() => {
        transcriptBufferTimerRef.current = null;
        flushSpeechBuffer(reason);
      }, remainingDelayMs);
    },
    [addSpeechDebug, clearSpeechBufferTimer, flushSpeechBuffer],
  );

  const transcribeLocalWhisperBlob = useCallback(
    async (audioBlob: Blob) => {
      setIsLocalTranscribing(true);
      setSpeechBufferStatus("flushing");
      setRuntimeState("buffering", "local whisper transcribing");
      setLiveTranscript("Transcribing local clip...");
      addSpeechDebug("local whisper upload", `${Math.round(audioBlob.size / 1024)}kb`);

      const controller = new AbortController();
      const timeout = window.setTimeout(() => {
        controller.abort();
      }, localTranscribeRequestTimeoutMs);

      try {
        const formData = new FormData();
        formData.set("audio", audioBlob, "speech.webm");
        formData.set("recognitionLang", recognitionLangRef.current);

        const response = await fetch("/api/interpreter/transcribe", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        const data = (await response.json()) as {
          error?: string;
          language?: string;
          text?: string;
        };

        const transcript = typeof data.text === "string" ? data.text.trim() : "";
        const apiError = typeof data.error === "string" ? data.error : "";
        const currentSessionMode = sessionModeRef.current;
        const detectedSourceLang =
          data.language === "id" || data.language === "en" || data.language === "nl"
            ? data.language
            : detectSourceLanguage(transcript, recognitionLangRef.current, {
                sessionMode: currentSessionMode,
                lastDetectedSourceLang: lastDetectedSourceLangRef.current,
              });

        if (!response.ok || apiError || !transcript) {
          throw new Error(apiError || "Local whisper returned no transcript.");
        }

        setSpeechConfidence(null);
        setLiveTranscript(transcript);
        addSpeechDebug("local whisper transcript", transcript);

        createConversationSegment(transcript, "speech", undefined, detectedSourceLang, "local whisper");
        setSpeechBufferStatus("idle");
        setLiveTranscript("");
      } catch (transcribeError) {
        const message =
          transcribeError instanceof DOMException && transcribeError.name === "AbortError"
            ? "Local whisper request timed out."
            : getErrorMessage(transcribeError);
        setError(message);
        setSpeechBufferStatus("idle");
        setRuntimeState("error", `local whisper ${message}`);
        setLiveTranscript("");
        addSpeechDebug("local whisper error", message);
      } finally {
        window.clearTimeout(timeout);
        setIsLocalTranscribing(false);
      }
    },
    [addSpeechDebug, createConversationSegment, setRuntimeState],
  );

  const stopLocalWhisperRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      return;
    }

    setLiveTranscript("Uploading local clip...");
    setSpeechBufferStatus("flushing");
    addSpeechDebug("local whisper stop", "manual");

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [addSpeechDebug]);

  const startLocalWhisperRecording = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Local whisper recording is not supported in this browser.");
      setRuntimeState("error", "local whisper unsupported");
      return;
    }

    if (isLocalTranscribing) {
      return;
    }

    setError("");
    shouldKeepListeningRef.current = false;
    clearRecognitionRestartTimer();
    safeStopRecognition("switched to local whisper record");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredMimeTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ];
      const supportedMimeType =
        preferredMimeTypes.find(
          (mimeType) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(mimeType),
        ) || "";
      const recorder = supportedMimeType
        ? new MediaRecorder(stream, { mimeType: supportedMimeType })
        : new MediaRecorder(stream);

      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordedAudioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedAudioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        setIsLocalRecording(false);
        setSpeechBufferStatus("idle");
        setError("Local whisper recording failed.");
        setRuntimeState("error", "local whisper recorder error");
        stopLocalRecordingStream();
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(recordedAudioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        setIsLocalRecording(false);
        stopLocalRecordingStream();

        if (audioBlob.size === 0) {
          setSpeechBufferStatus("idle");
          setLiveTranscript("");
          setRuntimeState("idle", "local whisper empty clip");
          addSpeechDebug("local whisper empty", "0kb");
          return;
        }

        void transcribeLocalWhisperBlob(audioBlob);
      };

      recorder.start();
      setIsLocalRecording(true);
      setSpeechBufferStatus("collecting");
      setRuntimeState("buffering", "local whisper recording");
      setLiveTranscript("Recording local clip...");
      setMicHint("Local Whisper mode: click stop to transcribe the clip.");
      addSpeechDebug("local whisper start", supportedMimeType || "default");
    } catch (recordingError) {
      stopLocalRecordingStream();
      setIsLocalRecording(false);
      setSpeechBufferStatus("idle");
      setError(getErrorMessage(recordingError));
      setRuntimeState("error", "local whisper getUserMedia");
    }
  }, [
    addSpeechDebug,
    clearRecognitionRestartTimer,
    isLocalTranscribing,
    safeStopRecognition,
    setRuntimeState,
    stopLocalRecordingStream,
    transcribeLocalWhisperBlob,
  ]);

  const toggleLocalWhisperRecording = useCallback(() => {
    if (isLocalRecording) {
      stopLocalWhisperRecording();
      return;
    }

    void startLocalWhisperRecording();
  }, [isLocalRecording, startLocalWhisperRecording, stopLocalWhisperRecording]);

  const enableSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (speechInputEngine !== "browser") {
      setMicHint("Local Whisper mode uses push to talk.");
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
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            microphoneArmedStorageKey,
            String(shouldPersistMicrophoneArmed("browser", "granted")),
          );
        }
        setBrowserMicrophonePermission("granted");
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
          scheduleSpeechBufferFlush("recognition end");
          scheduleRecognitionRestart("onend restart with buffered speech");
          return;
        }

        if (shouldKeepListeningRef.current && !unmountedRef.current) {
          scheduleRecognitionRestart("onend restart");
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
            scheduleSpeechBufferFlush("no-speech");
          }

          scheduleRecognitionRestart("no-speech restart");
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
          if (typeof window !== "undefined") {
            window.localStorage.setItem(microphoneArmedStorageKey, "false");
          }
          hasAutoArmedBrowserSpeechRef.current = false;
          setBrowserMicrophonePermission("denied");
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
          addSpeechDebug(`${captureModeRef.current} final buffered`, transcript);
          addSpeechDebug("speech final buffered", transcript);
          scheduleSpeechBufferFlush("timer");
        }
      };

      recognitionRef.current = recognition;
    }

    if (
      shouldQueueAssistantMicGreeting({
        conversationCount: conversationLogRef.current.length,
        hasSpokenGreeting: hasSpokenAssistantMicGreetingRef.current,
        lastOutput,
        sessionMode: sessionModeRef.current,
        speechInputEngine,
      })
    ) {
      const greeting = getAssistantGreeting();
      hasSpokenAssistantMicGreetingRef.current = true;
      setLastOutput(greeting.text);
      setSpeechOutputProvider((current) =>
        current === "pending"
          ? getStandbySpeechOutputProvider(
              "speechSynthesis" in window && typeof SpeechSynthesisUtterance !== "undefined",
            )
          : current,
      );
      addSpeechDebug("assistant mic greeting", greeting.text);
      speechOutputQueueRef.current.enqueue({
        text: greeting.text,
        mode: greeting.mode,
        sessionMode: "assistant",
      });
      return;
    }

    safeStartRecognition("enable speech recognition");
  }, [
    addSpeechDebug,
    lastOutput,
    scheduleRecognitionRestart,
    scheduleSpeechBufferFlush,
    safeStartRecognition,
    speechInputEngine,
    setRuntimeState,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedMicrophoneArmed = getStoredMicrophoneArmed(
      window.localStorage.getItem(microphoneArmedStorageKey),
    );

    if (
      !shouldAutoArmBrowserSpeech({
        permissionState: browserMicrophonePermission,
        speechInputEngine,
        storedMicrophoneArmed,
      })
    ) {
      hasAutoArmedBrowserSpeechRef.current = false;
      return;
    }

    if (
      hasAutoArmedBrowserSpeechRef.current ||
      recognitionRunningRef.current ||
      isStartingRef.current ||
      shouldKeepListeningRef.current
    ) {
      return;
    }

    hasAutoArmedBrowserSpeechRef.current = true;
    enableSpeechRecognition();
  }, [browserMicrophonePermission, enableSpeechRecognition, speechInputEngine]);

  const armSpeechInput = useCallback(() => {
    if (speechInputEngine === "browser") {
      enableSpeechRecognition();
    }
  }, [enableSpeechRecognition, speechInputEngine]);

  const submitTypedInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    addSpeechDebug("typed submit received", trimmed);
    createConversationSegment(trimmed, "typed", undefined, undefined, "typed input");
    armSpeechInput();
  }, [addSpeechDebug, armSpeechInput, createConversationSegment, input]);

  const handleSendNow = useCallback(() => {
    if (resolveSendNowAction(input) === "submit-input") {
      submitTypedInput();
      return;
    }

    flushSpeechBuffer("manual");
  }, [flushSpeechBuffer, input, submitTypedInput]);

  const handleConfirmLearning = useCallback(async (suggestionId: string, accepted: boolean) => {
    try {
      const response = await fetch('/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: lastInput,
          mode,
          sessionMode: sessionHook.sessionMode,
          confirmLearning: { id: suggestionId, accepted },
        }),
      });
      await response.json();
      setLearningSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));
      if (learningSuggestions.length <= 1) setShowLearningConfirm(false);
    } catch {
      // silently fail learning confirmation
    }
  }, [lastInput, mode, sessionHook.sessionMode, learningSuggestions.length]);

  const playElevenLabsSpeech = useCallback(
    async (
      text: string,
      detectedMode: InterpreterMode,
      sessionMode: SessionMode,
    ): Promise<"ended" | "error" | "timeout" | "skipped"> => {
      stopAudioPlayback();

      const speechMode = outputModeForSession(detectedMode, sessionMode);

      let response: Response;

      try {
        response = await fetch("/api/interpreter/voice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mode: speechMode,
            text,
            voiceIdOverride:
              speechMode === "id-en"
                ? voiceOverrides.en
                : speechMode === "id-nl"
                  ? voiceOverrides.nl
                  : voiceOverrides.id,
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

      const playbackResult: "ended" | "error" | "timeout" = await resolveWithTimeout(
        playbackPromise,
        speechOutputTimeoutMs,
        "timeout" as const,
      );

      if (playbackResult !== "ended") {
        stopAudioPlayback();
      }

      return playbackResult;
    },
    [addSpeechDebug, stopAudioPlayback, voiceOverrides.en, voiceOverrides.id, voiceOverrides.nl],
  );

  const testVoice = useCallback(
    async (language: "en" | "id" | "nl") => {
      const sampleText =
        language === "en"
          ? "This is a Prestix voice test (Optimized Core)."
          : language === "id"
            ? "Ini adalah tes suara Prestix (Optimized Core)."
            : "Dit is een Prestix-stemtest (Optimized Core).";
      const sampleMode: InterpreterMode =
        language === "en" ? "id-en" : language === "id" ? "en-id" : "id-nl";

      await playElevenLabsSpeech(sampleText, sampleMode, "interpreter");
    },
    [playElevenLabsSpeech],
  );

  const speakText = useCallback(
    async (text: string, detectedMode: InterpreterMode, sessionMode: SessionMode) => {
      if (typeof window === "undefined") {
        return;
      }

      const speechMode = outputModeForSession(detectedMode, sessionMode);
      addSpeechDebug("speech output started", outputLanguage(speechMode));

      speakingRef.current = true;
      let result: "ended" | "error" | "timeout" | "skipped" = "timeout";
      const speechChunks = splitSpeechChunks(text);

      try {
        addSpeechDebug("speech chunk count", String(speechChunks.length || 1));

        for (const [chunkIndex, chunkText] of (speechChunks.length > 0 ? speechChunks : [text]).entries()) {
          addSpeechDebug("speech chunk start", `${chunkIndex + 1}/${speechChunks.length || 1}`);
          result = await playElevenLabsSpeech(chunkText, detectedMode, sessionMode);

          if (result === "skipped") {
            if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
              result = "error";
              setError("Speech synthesis is not supported in this browser.");
              setRuntimeState("error", "speech synthesis unsupported");
              setSpeechOutputProvider("unsupported");
              addSpeechDebug("speech output error", "speech synthesis unsupported");
              addSpeechDebug("speech output done", "unsupported");
              return;
            }

            window.speechSynthesis.cancel();
            setSpeechOutputProvider("browser");

            const utterance = new SpeechSynthesisUtterance(chunkText);
            utterance.lang = outputLanguage(speechMode);
            utterance.rate = 0.98;

            const browserVoices = window.speechSynthesis
              .getVoices()
              .map((voice) => ({
                default: voice.default,
                lang: voice.lang,
                name: voice.name,
                voice,
              }));
            const preferredVoice = pickPreferredBrowserVoice(
              browserVoices,
              utterance.lang,
            );
            if (preferredVoice?.voice) {
              utterance.voice = preferredVoice.voice;
              addSpeechDebug("speech output browser voice", preferredVoice.voice.name);
            }

            const speechPromise = new Promise<"ended" | "error">((resolve) => {
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
            setSpeechOutputProvider("elevenlabs");
            addSpeechDebug("speech output provider", "elevenlabs");
          }

          if (result !== "ended") {
            break;
          }
        }
      } catch (speechError) {
        result = "error";
        setSpeechOutputProvider("error");
        addSpeechDebug("speech output error", getErrorMessage(speechError));
      } finally {
        speakingRef.current = false;

        if (result === "timeout") {
          stopAudioPlayback();
          if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          addSpeechDebug("speech output error", "timeout 15000ms");
        } else if (result === "error") {
          setError("");
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
          scheduleRecognitionRestart(restartReason);
        }
      }
    },
    [
      addSpeechDebug,
      playElevenLabsSpeech,
      scheduleRecognitionRestart,
      stopAudioPlayback,
    ],
  );

  useEffect(() => {
    speakTextRef.current = speakText;
  }, [speakText]);

  const processTranslationQueue = useCallback(() => {
    if (isTranslatorRunningRef.current) {
      return;
    }

    isTranslatorRunningRef.current = true;
    setIsTranslatorRunning(true);
    addSpeechDebug("response queue started", String(translationQueueRef.current.length));

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

          // For assistant-mode entries, attach the recent translated assistant
          // turns from the log so the LLM has multi-turn context. Interpreter
          // entries stay stateless (one segment in, one translation out).
          const assistantHistoryTurns =
            entry.sessionMode === "assistant"
              ? conversationLogRef.current
                  .filter(
                    (item) =>
                      item.id !== entry.id &&
                      item.sessionMode === "assistant" &&
                      item.status === "translated" &&
                      item.input &&
                      item.output,
                  )
                  .slice(-8)
                  .flatMap<{ role: "user" | "assistant"; content: string }>((item) => [
                    { role: "user", content: item.input },
                    { role: "assistant", content: item.output ?? "" },
                  ])
              : [];

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
          addSpeechDebug("response started", entryId);
          addSpeechDebug("processing entry id", entryId);
          addSpeechDebug("processing", `${modeLabel(entry.mode)} ${entry.source}`);

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
                sessionMode: entry.sessionMode,
                pathname: window.location.pathname,
                ...(assistantHistoryTurns.length > 0
                  ? { history: assistantHistoryTurns }
                  : {}),
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
            addSpeechDebug("response success entry id", entryId);
            addSpeechDebug("response done", entryId);
            addSpeechDebug("response text", translatedText);
            // Check for conversation learning suggestions from the API response
            if (
              data &&
              typeof data === 'object' &&
              'learningSuggestions' in data &&
              Array.isArray(data.learningSuggestions) &&
              data.learningSuggestions.length > 0
            ) {
              setLearningSuggestions(data.learningSuggestions as SuggestedLearning[]);
              setShowLearningConfirm(true);
            }
            speechOutputQueueRef.current.enqueue({
              text: translatedText,
              mode: entry.mode,
              sessionMode: entry.sessionMode,
            });
            addSpeechDebug("speech queued", entryId);
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
            addSpeechDebug("response error entry id", entryId);
            addSpeechDebug("response error", message);
            addSpeechDebug("response done", `error ${entryId}`);
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
          shouldKeepListeningRef.current
        ) {
          setRuntimeState("listening", "queue finished");
          safeStartRecognition("queue finished");
        }
      }
    })();
  }, [addSpeechDebug, safeStartRecognition, setConversationLogSynced, setRuntimeState]);

  processTranslationQueueRef.current = processTranslationQueue;

  useLayoutEffect(() => {
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
      const storedActiveSpeaker = window.localStorage.getItem(activeSpeakerStorageKey);
      if (!storedActiveSpeaker || !isSpeakerId(storedActiveSpeaker)) {
        return;
      }

      activeSpeakerRef.current = storedActiveSpeaker;
      setActiveSpeaker(storedActiveSpeaker);
    } catch {
      activeSpeakerRef.current = "unknown";
      setActiveSpeaker("unknown");
    } finally {
      activeSpeakerLoadedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !activeSpeakerLoadedRef.current) {
      return;
    }

    window.localStorage.setItem(activeSpeakerStorageKey, activeSpeaker);
  }, [activeSpeaker]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedSpeechInputEngine = window.localStorage.getItem(speechInputEngineStorageKey);
      if (storedSpeechInputEngine === "local-whisper") {
        setSpeechInputEngine("local-whisper");
        return;
      }

      setSpeechInputEngine("local-whisper");
    } catch {
      setSpeechInputEngine("local-whisper");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(speechInputEngineStorageKey, speechInputEngine);
  }, [speechInputEngine]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const storedAssistantRecognitionLang = window.localStorage.getItem(
        assistantRecognitionLangStorageKey,
      );
      if (storedAssistantRecognitionLang === "id-ID" || storedAssistantRecognitionLang === "en-US") {
        setAssistantRecognitionLang(storedAssistantRecognitionLang);
        return;
      }

      setAssistantRecognitionLang("en-US");
    } catch {
      setAssistantRecognitionLang("en-US");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(assistantRecognitionLangStorageKey, assistantRecognitionLang);
  }, [assistantRecognitionLang]);

  useEffect(() => {
    if (sessionHook.sessionMode !== "assistant") {
      return;
    }

    if (recognitionLangRef.current === assistantRecognitionLang) {
      return;
    }

    if (
      speechInputEngine === "browser" &&
      shouldKeepListeningRef.current &&
      (recognitionRunningRef.current || isStartingRef.current)
    ) {
      restartRecognitionWithLang(
        assistantRecognitionLang,
        `assistant preferred ${recognitionLangLabel(assistantRecognitionLang)}`,
      );
      return;
    }

    recognitionLangRef.current = assistantRecognitionLang;
    setRecognitionLang(assistantRecognitionLang);
    setLastSpeechSwitchReason(`assistant preferred ${recognitionLangLabel(assistantRecognitionLang)}`);
  }, [assistantRecognitionLang, restartRecognitionWithLang, sessionHook.sessionMode, speechInputEngine]);

  useEffect(() => {
    if (typeof window === "undefined" || speechInputEngine !== "browser") {
      return;
    }

    let cancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const applyPermissionState = (nextState: BrowserMicrophonePermissionState) => {
      if (!cancelled) {
        setBrowserMicrophonePermission(nextState);
      }
    };

    if (!navigator.permissions?.query) {
      const storedMicrophoneArmed = getStoredMicrophoneArmed(
        window.localStorage.getItem(microphoneArmedStorageKey),
      );
      applyPermissionState(storedMicrophoneArmed ? "unknown" : "prompt");
      return;
    }

    void navigator.permissions
      .query({ name: "microphone" as PermissionName })
      .then((status) => {
        permissionStatus = status;

        const syncPermissionState = () => {
          const nextState =
            status.state === "granted" || status.state === "prompt" || status.state === "denied"
              ? status.state
              : "unknown";
          applyPermissionState(nextState);
        };

        syncPermissionState();
        status.onchange = syncPermissionState;
      })
      .catch(() => {
        const storedMicrophoneArmed = getStoredMicrophoneArmed(
          window.localStorage.getItem(microphoneArmedStorageKey),
        );
        applyPermissionState(storedMicrophoneArmed ? "unknown" : "prompt");
      });

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [speechInputEngine]);

  useEffect(() => {
    if (speechInputEngine === "browser") {
      if (browserMicrophonePermission === "granted") {
        setMicHint(
          recognitionRunning
            ? `Microphone enabled. Listening (${recognitionLangRef.current}).`
            : sessionHook.sessionMode === "assistant"
              ? `Assistant mic ready (${recognitionLangLabel(assistantRecognitionLang)}).`
              : "Microphone ready. Chrome permission granted — speech will auto-start.",
        );
      } else if (browserMicrophonePermission === "denied") {
        setMicHint("Microphone permission denied.");
      } else {
        setMicHint(
          sessionHook.sessionMode === "assistant"
            ? `Click once to allow microphone. Assistant mic is set to ${recognitionLangLabel(assistantRecognitionLang)}.`
            : "Click once to allow microphone. After that it stays armed.",
        );
      }
      return;
    }

    shouldKeepListeningRef.current = false;
    clearRecognitionRestartTimer();
    clearSpeechBufferTimer();
    safeStopRecognition("switched to local whisper");
    speechFinalBufferRef.current = [];
    setBufferLength(0);
    setSpeechBufferStatus(isLocalRecording ? "collecting" : isLocalTranscribing ? "flushing" : "idle");
    if (!isLocalRecording && !isLocalTranscribing) {
      setLiveTranscript("");
      setRuntimeState("idle", "local whisper armed");
    }
    setMicHint("Local Whisper mode: record a short clip, then transcribe.");
  }, [
    browserMicrophonePermission,
    clearRecognitionRestartTimer,
    clearSpeechBufferTimer,
    assistantRecognitionLang,
    isLocalRecording,
    isLocalTranscribing,
    recognitionRunning,
    safeStopRecognition,
    sessionHook.sessionMode,
    setRuntimeState,
    speechInputEngine,
  ]);

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
      setVoiceOverrides({ en: "", id: "", nl: "" });
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

    try {
      const storedVoicePresetBank = window.localStorage.getItem(voicePresetBankStorageKey);
      if (!storedVoicePresetBank) {
        return;
      }

      setVoicePresetBank(normalizeVoicePresetBank(JSON.parse(storedVoicePresetBank) as unknown));
    } catch {
      setVoicePresetBank(emptyVoicePresetBank);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(voicePresetBankStorageKey, JSON.stringify(voicePresetBank));
  }, [voicePresetBank]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    void (async () => {
      try {
        const response = await fetch("/api/interpreter/voice?action=voices");
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { voices?: ElevenLabsVoiceOption[] };
        const voices = Array.isArray(data.voices) ? data.voices : [];
        const favoriteVoiceIds = new Set(
          [...voicePresetBank.en, ...voicePresetBank.id, ...voicePresetBank.nl]
            .map((preset) => preset.id)
            .filter(Boolean),
        );
        setAvailableVoices(
          voices.slice().sort((a, b) => {
            const aFavorite = favoriteVoiceIds.has(a.id) ? 1 : 0;
            const bFavorite = favoriteVoiceIds.has(b.id) ? 1 : 0;
            if (aFavorite !== bFavorite) {
              return bFavorite - aFavorite;
            }

            return a.label.localeCompare(b.label);
          }),
        );
      } catch {
        setAvailableVoices([]);
      }
    })();
  }, [voicePresetBank]);

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
      speechOutputQueueRef.current.clear();
      safeStopRecognition("unmount");
      stopAudioPlayback();
      stopLocalRecordingStream();

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [safeStopRecognition, stopAudioPlayback, stopLocalRecordingStream]);

  // Restore ambient listening preference on mount
  useEffect(() => {
      if (typeof window === 'undefined') return;
      try {
          const stored = window.localStorage.getItem(ambientStorageKey);
          if (stored === 'true') {
              setAmbientEnabled(true);
           }
       } catch { /* ignore */ }
   }, []);

  // Sync ambient listener enabled state
  useEffect(() => {
      if (typeof window !== 'undefined') {
          window.localStorage.setItem(ambientStorageKey, String(ambientEnabled));
      }
  }, [ambientEnabled]);

  const displayStatus: InterpreterStatus =
    status === "READY" && isListening ? "LISTENING" : status;

  const animState = ((): 'idle' | 'listening' | 'speaking' | 'translating' | 'error' => {
    if (runtimeState === 'error') return 'error';
    if (runtimeState === 'speaking') return 'speaking';
    if (runtimeState === 'listening') return 'listening';
    if (runtimeState === 'translating') return 'translating';
    return 'idle';
  })();
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
  const voiceSurfaceIntro = getVoiceSurfaceIntro();
  const voicePresence = getVoicePresenceCopy(sessionHook.sessionMode);
  const voiceDockCopy = getVoiceDockCopy({
    mode: sessionHook.sessionMode,
    speechInputEngine,
    browserMicrophonePermission,
    recognitionRunning,
    isLocalRecording,
    isLocalTranscribing,
  });

   return (
    <main
      className="relative flex min-h-screen flex-col overflow-hidden bg-zinc-950 text-white selection:bg-white/20"
      onClick={armSpeechInput}
    >
      <PrestixBabylonBackdrop state={animState} className="prestix-jarvis-backdrop" />
      <div className="relative z-30 border-b border-sky-500/35 bg-slate-950/95 px-3 py-2.5 text-center text-[13px] leading-snug text-slate-200 shadow-lg shadow-black/40 backdrop-blur-md">
        <strong className="text-sky-200">{voiceSurfaceIntro.badge}</strong>
        <span className="text-slate-500"> · </span>
        <span className="text-slate-300">{voiceSurfaceIntro.hint}</span>
      </div>
      <section className="relative z-10 flex flex-1 overflow-hidden px-4 py-4 md:px-8 lg:px-10">
        <div className="grid min-h-0 w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2.2fr)_minmax(320px,0.8fr)] xl:grid-cols-[minmax(0,2.4fr)_minmax(360px,0.85fr)]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="order-2 shrink-0 rounded-[1rem] border border-white/10 bg-black/45 p-3 font-mono text-white/70 shadow-2xl shadow-black/35 ring-1 ring-white/5 backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.42em] text-white/45">
                    {PRODUCT_BRAND} · {PRODUCT_DISPLAY_NAME}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-cyan-200/80">
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1">
                      {voicePresence.label}
                    </span>
                    <span className="text-white/35">{voicePresence.hint}</span>
                    {ambientEnabled && (
                        <span className="ml-2 rounded-full border border-amber-300/20 bg-amber-300/5 px-2 text-[9px] uppercase tracking-[0.15em] text-amber-100/70">
                            ambient learning
                        </span>
                    )}
                  </div>
                  <div className="mt-1 max-w-xl text-[11px] font-normal normal-case tracking-normal text-white/50">
                    {PRODUCT_TAGLINE}
                  </div>
                  <div className="mt-1 text-xs text-white/45">{micHint}</div>
                </div>
                <div className="rounded-full border border-emerald-300/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-emerald-100/70">
                  {displayStatus}
                </div>
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
                    {sessionHook.translatorEnabled ? "latest output" : "latest reply"}
                  </div>
                  <div className="min-h-10 whitespace-pre-wrap text-sm font-semibold leading-snug text-emerald-50 md:text-base">
                    {lastOutput ||
                      getIdleOutputPlaceholder(speechOutputProvider)}
                  </div>
                </div>
              </div>

              {showLearningConfirm && learningSuggestions.length > 0 && (
                <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-300/5 p-3">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-emerald-200">
                    Did Prestix get this right?
                  </div>
                  {learningSuggestions.slice(0, 3).map((suggestion) => (
                    <div key={suggestion.id} className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="text-white/70 truncate">
                        {suggestion.sourceText}: {suggestion.suggestion}
                      </span>
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmLearning(suggestion.id, true)}
                          className="rounded-full border border-emerald-300/30 px-2 py-0.5 text-[10px] uppercase text-emerald-200"
                        >
                          yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleConfirmLearning(suggestion.id, false)}
                          className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase text-white/40"
                        >
                          no
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 hidden flex-wrap gap-2 text-[10px] uppercase tracking-[0.13em] text-white/42">
                {[
                  `runtime ${runtimeState}`,
                  `session ${sessionModeLabel(sessionHook.sessionMode)}`,
                  `direction ${modeLabel(mode)}`,
                  `stt ${speechInputEngine}`,
                  `speech ${recognitionLang}`,
                  `capture ${captureMode}`,
                  `buffer ${bufferLength}`,
                  `queue ${queueLength}`,
                  `recog ${recognitionRunning ? "yes" : "no"}`,
                  `local rec ${isLocalRecording ? "yes" : isLocalTranscribing ? "tx" : "no"}`,
                  `${sessionHook.translatorEnabled ? "translator" : "assistant"} ${isTranslatorRunning ? "running" : "idle"}`,
                  `buffering ${speechBufferStatus}`,
                  `voice ${speechOutputProvider}`,
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-3 hidden gap-3 xl:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
                    speech grouping
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["live", "story"] as CaptureMode[]).map((nextMode) => (
                      <button
                        key={nextMode}
                        type="button"
                        aria-pressed={captureMode === nextMode}
                        onClick={() => updateCaptureMode(nextMode)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                          captureMode === nextMode
                            ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                          }`}
                      >
                        {nextMode === "live" ? "short phrases" : "long story"}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={handleSendNow}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-white/45 transition hover:border-emerald-300/30 hover:text-emerald-100"
                    >
                      send now
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
                    active speaker
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(["unknown", "speaker_a", "speaker_b"] as SpeakerId[]).map((speaker) => (
                      <button
                        key={speaker}
                        type="button"
                        aria-pressed={activeSpeaker === speaker}
                        onClick={() => updateActiveSpeaker(speaker)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                          activeSpeaker === speaker
                            ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                        }`}
                      >
                        {speakerLabel(speaker)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/32">
                    Alt+1 Speaker A, Alt+2 Speaker B, Alt+0 Unknown
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
                    microphone
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      ["browser", "handsfree mic"],
                      ["local-whisper", "quality mic"],
                    ] as const).map(([engineValue, label]) => (
                      <button
                        key={engineValue}
                        type="button"
                        aria-pressed={speechInputEngine === engineValue}
                        onClick={() => setSpeechInputEngine(engineValue)}
                        className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                          speechInputEngine === engineValue
                            ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                            : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={toggleLocalWhisperRecording}
                      disabled={speechInputEngine !== "local-whisper" || isLocalTranscribing}
                      className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                        speechInputEngine !== "local-whisper" || isLocalTranscribing
                          ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-white/20"
                          : isLocalRecording
                            ? "border-amber-300/40 bg-amber-300/10 text-amber-100"
                            : "border-sky-300/35 bg-sky-300/10 text-sky-100 hover:border-sky-300/55"
                      }`}
                    >
                      {isLocalTranscribing
                        ? "working..."
                        : isLocalRecording
                          ? "stop + send"
                          : "record quality mic"}
                    </button>
                  </div>
                  {speechInputEngine === "browser" && sessionHook.sessionMode === "assistant" ? (
                    <>
                      <div className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/35">
                        I am speaking
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {([
                          ["nl-NL", "Nederlands"],
                          ["id-ID", "Bahasa"],
                          ["en-US", "English"],
                        ] as const).map(([langValue, label]) => (
                          <button
                            key={langValue}
                            type="button"
                            aria-pressed={assistantRecognitionLang === langValue}
                            onClick={() =>
                              applyAssistantRecognitionLang(
                                langValue,
                                `assistant manual ${recognitionLangLabel(langValue)}`,
                              )
                            }
                            className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                              assistantRecognitionLang === langValue
                                ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                                : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : null}
                  <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/32">
                    {speechInputEngine === "browser" && sessionHook.sessionMode === "assistant"
                      ? `handsfree listens continuously; quality mic records one clip; speaking ${recognitionLangLabel(assistantRecognitionLang)}`
                      : "handsfree listens continuously; quality mic records one clip"}
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 text-[10px] uppercase tracking-[0.24em] text-white/35">
                    mode
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sessionHook.setTranslatorEnabled((current) => !current)}
                      className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition ${
                        sessionHook.translatorEnabled
                          ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                          : "border-amber-300/40 bg-amber-300/10 text-amber-100"
                      }`}
                    >
                      {getTranslatorButtonLabel(sessionHook.translatorEnabled)}
                    </button>
                  </div>
                  <div className="mt-2 text-[10px] uppercase tracking-[0.14em] text-white/32">
                    assistant = talk with Prestix; interpreter = translate + speak
                  </div>
                </div>
              </div>

              <details className="hidden mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <summary className="cursor-pointer list-none text-[10px] uppercase tracking-[0.24em] text-white/45">
                  voice routing and overrides
                </summary>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                      voice EN
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {voicePresetBank.en.map((preset, index) => (
                        <button
                          key={`voice-en-preset-${index + 1}`}
                          type="button"
                          onClick={() =>
                            setVoiceOverrides((current) => ({
                              ...current,
                              en: preset.id,
                            }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition ${
                            preset.id
                              ? "border-white/10 bg-white/[0.03] text-white/65 hover:text-emerald-100"
                              : "border-white/5 bg-white/[0.02] text-white/20"
                          }`}
                        >
                          {preset.label || `P${index + 1}`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setVoicePresetBank((current) => ({
                            ...current,
                            en: [
                              ...current.en.slice(1),
                              {
                                id: voiceOverrides.en.trim(),
                                label: voicePresetLabels.en.trim(),
                              },
                            ],
                          }))
                        }
                        className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-300/50"
                      >
                        save current
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVoiceOverrides((current) => ({
                            ...current,
                            en: "",
                          }))
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45 transition hover:text-white/75"
                      >
                        clear
                      </button>
                      <button
                        type="button"
                        onClick={() => void testVoice("en")}
                        className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-300/50"
                      >
                        test voice
                      </button>
                    </div>
                    <input
                      type="text"
                      value={voicePresetLabels.en}
                      onChange={(event) =>
                        setVoicePresetLabels((current) => ({
                          ...current,
                          en: event.target.value,
                        }))
                      }
                      placeholder="preset label"
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                    />
                    <select
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) {
                          return;
                        }

                        setVoiceOverrides((current) => ({
                          ...current,
                          en: event.target.value,
                        }));
                      }}
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-emerald-300/40"
                    >
                      <option value="">Pick ElevenLabs voice</option>
                      {availableVoices.map((voice) => (
                        <option key={`en-${voice.id}`} value={voice.id}>
                          {voice.label}
                          {voice.gender ? ` · ${formatVoiceTag(voice.gender)}` : ""}
                          {voice.accent ? ` · ${formatVoiceTag(voice.accent)}` : ""}
                        </option>
                      ))}
                    </select>
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
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {voiceOverrides.en
                        ? availableVoices
                            .filter((voice) => voice.id === voiceOverrides.en)
                            .flatMap((voice) =>
                              [voice.gender, voice.accent]
                                .map((tag) => formatVoiceTag(tag))
                                .filter(Boolean)
                                .map((tag) => (
                                  <span
                                    key={`en-tag-${tag}`}
                                    className="rounded-full border border-white/10 px-2 py-1"
                                  >
                                    {tag}
                                  </span>
                                )),
                            )
                        : null}
                    </div>
                  </label>

                  <label className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                      voice ID
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {voicePresetBank.id.map((preset, index) => (
                        <button
                          key={`voice-id-preset-${index + 1}`}
                          type="button"
                          onClick={() =>
                            setVoiceOverrides((current) => ({
                              ...current,
                              id: preset.id,
                            }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition ${
                            preset.id
                              ? "border-white/10 bg-white/[0.03] text-white/65 hover:text-emerald-100"
                              : "border-white/5 bg-white/[0.02] text-white/20"
                          }`}
                        >
                          {preset.label || `P${index + 1}`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setVoicePresetBank((current) => ({
                            ...current,
                            id: [
                              ...current.id.slice(1),
                              {
                                id: voiceOverrides.id.trim(),
                                label: voicePresetLabels.id.trim(),
                              },
                            ],
                          }))
                        }
                        className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-300/50"
                      >
                        save current
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVoiceOverrides((current) => ({
                            ...current,
                            id: "",
                          }))
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45 transition hover:text-white/75"
                      >
                        clear
                      </button>
                      <button
                        type="button"
                        onClick={() => void testVoice("id")}
                        className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-300/50"
                      >
                        test voice
                      </button>
                    </div>
                    <input
                      type="text"
                      value={voicePresetLabels.id}
                      onChange={(event) =>
                        setVoicePresetLabels((current) => ({
                          ...current,
                          id: event.target.value,
                        }))
                      }
                      placeholder="preset label"
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                    />
                    <select
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) {
                          return;
                        }

                        setVoiceOverrides((current) => ({
                          ...current,
                          id: event.target.value,
                        }));
                      }}
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-emerald-300/40"
                    >
                      <option value="">Pick ElevenLabs voice</option>
                      {availableVoices.map((voice) => (
                        <option key={`id-${voice.id}`} value={voice.id}>
                          {voice.label}
                          {voice.gender ? ` · ${formatVoiceTag(voice.gender)}` : ""}
                          {voice.accent ? ` · ${formatVoiceTag(voice.accent)}` : ""}
                        </option>
                      ))}
                    </select>
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
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {voiceOverrides.id
                        ? availableVoices
                            .filter((voice) => voice.id === voiceOverrides.id)
                            .flatMap((voice) =>
                              [voice.gender, voice.accent]
                                .map((tag) => formatVoiceTag(tag))
                                .filter(Boolean)
                                .map((tag) => (
                                  <span
                                    key={`id-tag-${tag}`}
                                    className="rounded-full border border-white/10 px-2 py-1"
                                  >
                                    {tag}
                                  </span>
                                )),
                            )
                        : null}
                    </div>
                  </label>

                  <label className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <div className="mb-2 text-[10px] uppercase tracking-[0.3em] text-white/35">
                      voice NL
                    </div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      {voicePresetBank.nl.map((preset, index) => (
                        <button
                          key={`voice-nl-preset-${index + 1}`}
                          type="button"
                          onClick={() =>
                            setVoiceOverrides((current) => ({
                              ...current,
                              nl: preset.id,
                            }))
                          }
                          className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition ${
                            preset.id
                              ? "border-white/10 bg-white/[0.03] text-white/65 hover:text-emerald-100"
                              : "border-white/5 bg-white/[0.02] text-white/20"
                          }`}
                        >
                          {preset.label || `P${index + 1}`}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setVoicePresetBank((current) => ({
                            ...current,
                            nl: [
                              ...current.nl.slice(1),
                              {
                                id: voiceOverrides.nl.trim(),
                                label: voicePresetLabels.nl.trim(),
                              },
                            ],
                          }))
                        }
                        className="rounded-full border border-emerald-300/30 bg-emerald-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-emerald-100 transition hover:border-emerald-300/50"
                      >
                        save current
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVoiceOverrides((current) => ({
                            ...current,
                            nl: "",
                          }))
                        }
                        className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white/45 transition hover:text-white/75"
                      >
                        clear
                      </button>
                      <button
                        type="button"
                        onClick={() => void testVoice("nl")}
                        className="rounded-full border border-sky-300/30 bg-sky-300/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-sky-100 transition hover:border-sky-300/50"
                      >
                        test voice
                      </button>
                    </div>
                    <input
                      type="text"
                      value={voicePresetLabels.nl}
                      onChange={(event) =>
                        setVoicePresetLabels((current) => ({
                          ...current,
                          nl: event.target.value,
                        }))
                      }
                      placeholder="preset label"
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                    />
                    <select
                      value=""
                      onChange={(event) => {
                        if (!event.target.value) {
                          return;
                        }

                        setVoiceOverrides((current) => ({
                          ...current,
                          nl: event.target.value,
                        }));
                      }}
                      className="mb-2 w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none focus:border-emerald-300/40"
                    >
                      <option value="">Pick ElevenLabs voice</option>
                      {availableVoices.map((voice) => (
                        <option key={`nl-${voice.id}`} value={voice.id}>
                          {voice.label}
                          {voice.gender ? ` · ${formatVoiceTag(voice.gender)}` : ""}
                          {voice.accent ? ` · ${formatVoiceTag(voice.accent)}` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={voiceOverrides.nl}
                      onChange={(event) =>
                        setVoiceOverrides((current) => ({
                          ...current,
                          nl: event.target.value,
                        }))
                      }
                      placeholder="default env voice"
                      className="w-full rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 focus:border-emerald-300/40"
                    />
                    <div className="mt-2 text-[10px] uppercase tracking-[0.16em] text-white/35">
                      used for ID -&gt; NL output (assistent)
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-white/35">
                      {voiceOverrides.nl
                        ? availableVoices
                            .filter((voice) => voice.id === voiceOverrides.nl)
                            .flatMap((voice) =>
                              [voice.gender, voice.accent]
                                .map((tag) => formatVoiceTag(tag))
                                .filter(Boolean)
                                .map((tag) => (
                                  <span
                                    key={`nl-tag-${tag}`}
                                    className="rounded-full border border-white/10 px-2 py-1"
                                  >
                                    {tag}
                                  </span>
                                )),
                            )
                        : null}
                    </div>
                  </label>
                </div>
              </details>

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
                    {conversationViewSubtitle(sessionHook.sessionMode)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-emerald-100/75">
                    active {speakerLabel(activeSpeaker)}
                  </span>
                  <button
                    type="button"
                    onClick={clearConversationLog}
                    className="rounded-full border border-white/10 px-4 py-2 text-[10px] uppercase tracking-[0.16em] text-white/45 transition hover:border-red-300/30 hover:text-red-100"
                  >
                    clear
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                {(["all", "speaker_a", "speaker_b", "unknown"] as ConversationFilter[]).map(
                  (filter) => (
                    <button
                      key={filter}
                      type="button"
                      aria-pressed={conversationFilter === filter}
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
                            {sessionStatusLabel(entry.status, entry.sessionMode)}
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
                              {inputPanelLabel(entry.sessionMode)}
                            </span>
                            <div className="mt-2 whitespace-pre-wrap text-white/90">{entry.input}</div>
                          </div>
                          <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.06] p-4">
                            <span className="text-[10px] uppercase tracking-[0.32em] text-white/35">
                              {outputPanelLabel(entry.sessionMode)}
                            </span>
                            <div className="mt-2 whitespace-pre-wrap text-emerald-50">
                              {entry.status === "error"
                                ? entry.error ||
                                  (entry.sessionMode === "assistant"
                                    ? "Assistant reply failed."
                                    : "Translation failed.")
                                : entry.output ||
                                  (entry.sessionMode === "assistant"
                                    ? "waiting for reply..."
                                    : "waiting...")}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {(["speaker_a", "speaker_b", "unknown"] as SpeakerId[]).map(
                            (speaker) => (
                              <button
                                key={speaker}
                                type="button"
                                aria-pressed={entry.speaker === speaker}
                                onClick={() => updateConversationSpeaker(entry.id, speaker)}
                                className={`rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition ${
                                  entry.speaker === speaker
                                    ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                                    : "border-white/10 bg-black/20 text-white/40 hover:text-white/75"
                                }`}
                              >
                                {speakerShortLabel(speaker)} {speakerLabel(speaker)}
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

          <aside className="hidden" aria-hidden="true" />
        </div>
      </section>

      <form
        className="relative z-10 border-t border-white/20 bg-black/90 px-4 py-4 shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl md:px-12"
        onSubmit={(event) => {
          event.preventDefault();
          submitTypedInput();
        }}
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => sessionHook.setTranslatorEnabled((current) => !current)}
            className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
              sessionHook.translatorEnabled
                ? "border-emerald-300/50 bg-emerald-300/10 text-emerald-100"
                : "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
            }`}
          >
            {getTranslatorButtonLabel(sessionHook.translatorEnabled)}
          </button>
          <button
              type="button"
              onClick={() => setAmbientEnabled((current) => !current)}
              className={`rounded-full border px-4 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
                  ambientEnabled
                      ? 'border-amber-300/50 bg-amber-300/10 text-amber-100'
                      : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white/75'
              }`}
          >
              {ambientEnabled ? 'ambient on' : 'ambient off'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (speechInputEngine === "local-whisper") {
                void toggleLocalWhisperRecording();
                return;
              }
              armSpeechInput();
            }}
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-white/75 transition hover:border-cyan-300/30 hover:text-cyan-100"
          >
            {voiceDockCopy.micButtonLabel}
          </button>
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-white px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-black transition hover:bg-cyan-100"
          >
            {voiceDockCopy.submitLabel}
          </button>
        </div>
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
          onFocus={armSpeechInput}
          onClick={armSpeechInput}
          placeholder={voiceDockCopy.placeholder}
          className="h-20 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 font-mono text-2xl text-white outline-none transition placeholder:text-white/35 focus:border-white/35 focus:bg-white/[0.07] md:h-24 md:px-7 md:text-3xl"
          aria-label={voiceDockCopy.ariaLabel}
        />
      </form>
    </main>
  );
}
