import { PRODUCT_TAGLINE } from "./branding";

export type UiLocale = "en" | "nl";

export const UI_LOCALE_STORAGE_KEY = "prestix-interpreter-ui-locale";

export type ControlRoomStrings = {
  tagline: string;
  uiLanguage: string;
  localeEnShort: string;
  localeNlShort: string;
  ttsOn: string;
  ttsOff: string;
  voiceLegacy: string;
  tabInterpreter: string;
  tabAssistant: string;
  ariaModes: string;
  ariaLiveMetrics: string;
  ariaSessionState: string;
  metricSession: string;
  metricDirection: string;
  metricProvider: string;
  metricModel: string;
  metricLatency: string;
  sessionInterpreter: string;
  sessionAssistant: string;
  voicePillRec: string;
  voicePillSpeaking: string;
  voicePillNoTts: string;
  voicePillVoiceErr: string;
  voicePillReady: string;
  briefWorking: string;
  briefListening: string;
  briefError: string;
  briefReady: string;
  briefStatusMicOpen: string;
  briefStatusTalking: string;
  briefStatusIdle: string;
  briefSourceTarget: string;
  briefSourceTargetHint: string;
  briefVoiceOut: string;
  briefVoiceSpeaking: string;
  briefVoiceNoTts: string;
  briefVoiceError: string;
  briefVoiceElevenReady: string;
  briefVoiceMuted: string;
  briefVoiceOutHint: string;
  on: string;
  off: string;
  p01Eyebrow: string;
  p01Title: string;
  p02Eyebrow: string;
  p02Title: string;
  sourceText: string;
  placeholderSourceEn: string;
  placeholderSourceNl: string;
  placeholderSourceId: string;
  clear: string;
  translate: string;
  translating: string;
  outputAwaiting: string;
  replay: string;
  stop: string;
  speakingBtn: string;
  tagError: string;
  tagOk: string;
  tagIdle: string;
  tagAttention: string;
  tagClearState: string;
  p03Eyebrow: string;
  p03Title: string;
  lblStatus: string;
  lblActiveTab: string;
  lblBusy: string;
  lblRecording: string;
  yes: string;
  no: string;
  p04Eyebrow: string;
  p04Title: string;
  lblSource: string;
  lblTarget: string;
  lblRoute: string;
  p05Eyebrow: string;
  p05Title: string;
  p06Eyebrow: string;
  p06Title: string;
  lblFallbackUsed: string;
  lblChainTried: string;
  lblTokenizinSkip: string;
  p07Eyebrow: string;
  p07Title: string;
  lblMatches: string;
  lblTypes: string;
  p08Eyebrow: string;
  p08Title: string;
  lblTtsEnabled: string;
  lblVoiceStatus: string;
  lblReplayAvailable: string;
  p09Eyebrow: string;
  p09Title: string;
  lblSpeechRecognition: string;
  lblMode: string;
  lblTargetTab: string;
  micChecking: string;
  micAvailable: string;
  micNotAvailable: string;
  holdToTalk: string;
  tabNameInterpreter: string;
  tabNameAssistant: string;
  idle: string;
  p10Eyebrow: string;
  p10Title: string;
  lblInputChars: string;
  lblOutputChars: string;
  lblLastAnswerChars: string;
  lblLatency: string;
  p11Eyebrow: string;
  p11Title: string;
  lblApiTimeout: string;
  lblHistoryCap: string;
  lblVoiceFallback: string;
  voiceFallbackPolicy: string;
  p12Eyebrow: string;
  p12Title: string;
  lblInterpreterError: string;
  lblAssistantError: string;
  lblMicError: string;
  none: string;
  a01Eyebrow: string;
  a01Title: string;
  assistantBadgeDutchOnly: string;
  resetChat: string;
  chatEmpty: string;
  thinking: string;
  assistantPlaceholder: string;
  sending: string;
  send: string;
  a02Eyebrow: string;
  a02Title: string;
  historySentEyebrow: string;
  historySentBefore: string;
  historySentAfterTurns: string;
  historySentAfterCode: string;
  p05ChatEyebrow: string;
  p05ChatTitle: string;
  lblTotalTurns: string;
  lblSentAsHistory: string;
  lblLastSpeaker: string;
  lblUserLanguage: string;
  lblAssistantReplies: string;
  metaNoCallYet: string;
  metaProvider: string;
  metaModel: string;
  metaFallbackUsed: string;
  metaLearningMatches: string;
  metaLearningTypes: string;
  metaLatency: string;
  micNa: string;
  micNoSrTitle: string;
  micListeningRelease: string;
  micHoldToTalk: string;
  ariaReleaseToSend: string;
  ariaHoldToTalk: string;
  langEnglish: string;
  langDutch: string;
  langIndonesian: string;
  /** Vertaalrichting (knoppen + tags), in UI-taal — niet alleen "NL → ID". */
  modeRouteNlId: string;
  modeRouteIdNl: string;
  modeRouteEnId: string;
  modeRouteIdEn: string;
  micErrNoSr: string;
  micErrPrefix: string;
  micErrStartGeneric: string;
  turnsUnit: string;
  roleUser: string;
  roleAssistant: string;
};

export const CONTROL_ROOM_STRINGS: Record<UiLocale, ControlRoomStrings> = {
  en: {
    tagline: PRODUCT_TAGLINE,
    uiLanguage: "UI",
    localeEnShort: "EN",
    localeNlShort: "NL",
    ttsOn: "TTS on",
    ttsOff: "TTS off",
    voiceLegacy: "Voice (legacy)",
    tabInterpreter: "Interpreter",
    tabAssistant: "Assistant",
    ariaModes: "Modes",
    ariaLiveMetrics: "Live metrics",
    ariaSessionState: "Session state",
    metricSession: "Session",
    metricDirection: "Direction",
    metricProvider: "Provider",
    metricModel: "Model",
    metricLatency: "Last latency",
    sessionInterpreter: "INTERPRETER",
    sessionAssistant: "ASSISTANT",
    voicePillRec: "REC",
    voicePillSpeaking: "Speaking",
    voicePillNoTts: "No TTS",
    voicePillVoiceErr: "Voice err",
    voicePillReady: "Ready",
    briefWorking: "Working",
    briefListening: "Listening",
    briefError: "Error",
    briefReady: "Ready",
    briefStatusMicOpen: "Microphone is open — release the button to send.",
    briefStatusTalking: "Talking to the model. Hold tight.",
    briefStatusIdle: "Idle. Type or hold the mic to begin.",
    briefSourceTarget: "Source → Target",
    briefSourceTargetHint:
      "Flip direction depending on who is speaking—you or someone local (Dutch vs Bahasa Indonesia).",
    briefVoiceOut: "Voice out",
    briefVoiceSpeaking: "Speaking…",
    briefVoiceNoTts: "TTS not configured",
    briefVoiceError: "Voice error",
    briefVoiceElevenReady: "ElevenLabs ready",
    briefVoiceMuted: "Muted",
    briefVoiceOutHint: "Toggle “TTS on/off” in the topbar to mute or enable spoken replies.",
    on: "ON",
    off: "OFF",
    p01Eyebrow: "01 · Source Control",
    p01Title: "What you or a local says (Dutch ↔ Indonesian)",
    p02Eyebrow: "02 · Translation",
    p02Title: "What the other person hears (translated)",
    sourceText: "Source text",
    placeholderSourceEn: "Type or speak English…",
    placeholderSourceNl: "Type or speak Dutch…",
    placeholderSourceId: "Ketik atau ucapkan Bahasa Indonesia…",
    clear: "Clear",
    translate: "Translate",
    translating: "Translating…",
    outputAwaiting: "Awaiting translation…",
    replay: "Replay",
    stop: "Stop",
    speakingBtn: "Speaking…",
    tagError: "error",
    tagOk: "ok",
    tagIdle: "idle",
    tagAttention: "attention",
    tagClearState: "clear",
    p03Eyebrow: "03 · Session",
    p03Title: "Current state",
    lblStatus: "Status",
    lblActiveTab: "Active tab",
    lblBusy: "Busy",
    lblRecording: "Recording",
    yes: "yes",
    no: "no",
    p04Eyebrow: "04 · Direction",
    p04Title: "Language route",
    lblSource: "Source",
    lblTarget: "Target",
    lblRoute: "Route",
    p05Eyebrow: "05 · Provider",
    p05Title: "Call telemetry",
    p06Eyebrow: "06 · Fallbacks",
    p06Title: "Routing path",
    lblFallbackUsed: "Fallback used",
    lblChainTried: "Chain tried",
    lblTokenizinSkip: "Tokenizin skip",
    p07Eyebrow: "07 · Learning",
    p07Title: "Prompt memory",
    lblMatches: "Matches",
    lblTypes: "Types",
    p08Eyebrow: "08 · Voice",
    p08Title: "TTS runtime",
    lblTtsEnabled: "TTS enabled",
    lblVoiceStatus: "Voice status",
    lblReplayAvailable: "Replay available",
    p09Eyebrow: "09 · Mic",
    p09Title: "Capture status",
    lblSpeechRecognition: "SpeechRecognition",
    lblMode: "Mode",
    lblTargetTab: "Target tab",
    micChecking: "checking...",
    micAvailable: "available",
    micNotAvailable: "not available",
    holdToTalk: "Hold-to-talk",
    tabNameInterpreter: "Interpreter",
    tabNameAssistant: "Assistant",
    idle: "Idle",
    p10Eyebrow: "10 · Payload",
    p10Title: "Input/output stats",
    lblInputChars: "Input chars",
    lblOutputChars: "Output chars",
    lblLastAnswerChars: "Last answer chars",
    lblLatency: "Latency",
    p11Eyebrow: "11 · Runtime",
    p11Title: "Guards",
    lblApiTimeout: "API timeout",
    lblHistoryCap: "History cap",
    lblVoiceFallback: "Voice fallback",
    voiceFallbackPolicy: "Browser TTS when needed",
    p12Eyebrow: "12 · Alerts",
    p12Title: "Error watch",
    lblInterpreterError: "Interpreter error",
    lblAssistantError: "Assistant error",
    lblMicError: "Mic error",
    none: "none",
    a01Eyebrow: "01 · Conversation",
    a01Title: "Assistant chat",
    assistantBadgeDutchOnly: "Dutch only",
    resetChat: "Reset chat",
    chatEmpty: "No messages yet. Type or hold the mic to start the conversation.",
    thinking: "Thinking…",
    assistantPlaceholder:
      "Type a message, or hold mic to talk. Enter to send, Shift+Enter for new line.",
    sending: "Sending…",
    send: "Send",
    a02Eyebrow: "02 · Provider",
    a02Title: "Call telemetry",
    historySentEyebrow: "History sent",
    historySentBefore: "Last ",
    historySentAfterTurns: " turn(s) of this thread are sent as ",
    historySentAfterCode: " on the next request. Reset to clear.",
    p05ChatEyebrow: "05 · Chat Thread",
    p05ChatTitle: "Turn counters",
    lblTotalTurns: "Total turns",
    lblSentAsHistory: "Sent as history",
    lblLastSpeaker: "Last speaker",
    lblUserLanguage: "User language",
    lblAssistantReplies: "Assistant replies",
    metaNoCallYet: "No call yet.",
    metaProvider: "Provider",
    metaModel: "Model",
    metaFallbackUsed: "Fallback used",
    metaLearningMatches: "Learning matches",
    metaLearningTypes: "Learning types",
    metaLatency: "Latency",
    micNa: "Mic n/a",
    micNoSrTitle: "Browser has no SpeechRecognition",
    micListeningRelease: "● Listening — release",
    micHoldToTalk: "● Hold to talk",
    ariaReleaseToSend: "Release to send",
    ariaHoldToTalk: "Hold to talk",
    langEnglish: "English",
    langDutch: "Dutch",
    langIndonesian: "Bahasa Indonesia",
    modeRouteNlId: "Dutch → Indonesian",
    modeRouteIdNl: "Indonesian → Dutch",
    modeRouteEnId: "English → Indonesian",
    modeRouteIdEn: "Indonesian → English",
    micErrNoSr: "This browser has no SpeechRecognition support.",
    micErrPrefix: "Microphone error: ",
    micErrStartGeneric: "Could not start microphone.",
    turnsUnit: "turns",
    roleUser: "user",
    roleAssistant: "assistant",
  },
  nl: {
    tagline:
      "Helpt je beter met de lokale bevolking te communiceren: live Nederlands ↔ Bahasa Indonesia, typen of inspreken.",
    uiLanguage: "Taal",
    localeEnShort: "EN",
    localeNlShort: "NL",
    ttsOn: "TTS aan",
    ttsOff: "TTS uit",
    voiceLegacy: "Stem (legacy)",
    tabInterpreter: "Vertaler",
    tabAssistant: "Assistent",
    ariaModes: "Modi",
    ariaLiveMetrics: "Live metriek",
    ariaSessionState: "Sessiestatus",
    metricSession: "Sessie",
    metricDirection: "Richting",
    metricProvider: "Provider",
    metricModel: "Model",
    metricLatency: "Laatste latentie",
    sessionInterpreter: "VERTALER",
    sessionAssistant: "ASSISTENT",
    voicePillRec: "REC",
    voicePillSpeaking: "Spreekt",
    voicePillNoTts: "Geen TTS",
    voicePillVoiceErr: "Stemfout",
    voicePillReady: "Gereed",
    briefWorking: "Bezig",
    briefListening: "Luistert",
    briefError: "Fout",
    briefReady: "Gereed",
    briefStatusMicOpen: "Microfoon staat aan — laat de knop los om te verzenden.",
    briefStatusTalking: "Bezig met het model. Even geduld.",
    briefStatusIdle: "Rust. Typ of houd de microfoon ingedrukt om te beginnen.",
    briefSourceTarget: "Bron → Doel",
    briefSourceTargetHint:
      "Wissel richting: ben jij aan het woord of iemand ter plaatse (Nederlands vs Bahasa Indonesia).",
    briefVoiceOut: "Stem uit",
    briefVoiceSpeaking: "Spreekt…",
    briefVoiceNoTts: "TTS niet geconfigureerd",
    briefVoiceError: "Stemfout",
    briefVoiceElevenReady: "ElevenLabs gereed",
    briefVoiceMuted: "Gedempt",
    briefVoiceOutHint: "Zet “TTS aan/uit” in de balk om gesproken antwoorden te dempen of in te schakelen.",
    on: "AAN",
    off: "UIT",
    p01Eyebrow: "01 · Bronbediening",
    p01Title: "Wat jij of een local zegt (Nederlands ↔ Indonesisch)",
    p02Eyebrow: "02 · Vertaling",
    p02Title: "Wat de andere kant hoort (vertaald)",
    sourceText: "Brontekst",
    placeholderSourceEn: "Typ of spreek Engels…",
    placeholderSourceNl: "Typ of spreek Nederlands…",
    placeholderSourceId: "Ketik atau ucapkan Bahasa Indonesia…",
    clear: "Wissen",
    translate: "Vertaal",
    translating: "Bezig met vertalen…",
    outputAwaiting: "Wacht op vertaling…",
    replay: "Opnieuw afspelen",
    stop: "Stop",
    speakingBtn: "Spreekt…",
    tagError: "fout",
    tagOk: "ok",
    tagIdle: "rust",
    tagAttention: "let op",
    tagClearState: "geen issues",
    p03Eyebrow: "03 · Sessie",
    p03Title: "Huidige status",
    lblStatus: "Status",
    lblActiveTab: "Actief tabblad",
    lblBusy: "Bezig",
    lblRecording: "Opname",
    yes: "ja",
    no: "nee",
    p04Eyebrow: "04 · Richting",
    p04Title: "Taalroute",
    lblSource: "Bron",
    lblTarget: "Doel",
    lblRoute: "Route",
    p05Eyebrow: "05 · Provider",
    p05Title: "Oproep-telemetrie",
    p06Eyebrow: "06 · Fallbacks",
    p06Title: "Routering",
    lblFallbackUsed: "Fallback gebruikt",
    lblChainTried: "Keten geprobeerd",
    lblTokenizinSkip: "Tokenizin overgeslagen",
    p07Eyebrow: "07 · Learning",
    p07Title: "Promptgeheugen",
    lblMatches: "Treffers",
    lblTypes: "Types",
    p08Eyebrow: "08 · Stem",
    p08Title: "TTS-runtime",
    lblTtsEnabled: "TTS ingeschakeld",
    lblVoiceStatus: "Stemstatus",
    lblReplayAvailable: "Replay beschikbaar",
    p09Eyebrow: "09 · Mic",
    p09Title: "Opnamestatus",
    lblSpeechRecognition: "SpeechRecognition",
    lblMode: "Modus",
    lblTargetTab: "Doeltab",
    micChecking: "controleren...",
    micAvailable: "beschikbaar",
    micNotAvailable: "niet beschikbaar",
    holdToTalk: "Ingedrukt houden",
    tabNameInterpreter: "Vertaler",
    tabNameAssistant: "Assistent",
    idle: "Rust",
    p10Eyebrow: "10 · Payload",
    p10Title: "Invoer/uitvoer",
    lblInputChars: "Tekens invoer",
    lblOutputChars: "Tekens uitvoer",
    lblLastAnswerChars: "Tekens laatste antwoord",
    lblLatency: "Latentie",
    p11Eyebrow: "11 · Runtime",
    p11Title: "Beveiliging",
    lblApiTimeout: "API-time-out",
    lblHistoryCap: "History-limiet",
    lblVoiceFallback: "Stemfallback",
    voiceFallbackPolicy: "Browser-TTS indien nodig",
    p12Eyebrow: "12 · Meldingen",
    p12Title: "Foutenmonitor",
    lblInterpreterError: "Vertaalfout",
    lblAssistantError: "Assistentfout",
    lblMicError: "Microfoonfout",
    none: "geen",
    a01Eyebrow: "01 · Gesprek",
    a01Title: "Assistentchat",
    assistantBadgeDutchOnly: "Alleen Nederlands",
    resetChat: "Chat resetten",
    chatEmpty: "Nog geen berichten. Typ of houd de microfoon ingedrukt om te starten.",
    thinking: "Bezig…",
    assistantPlaceholder:
      "Typ een bericht of houd de microfoon ingedrukt. Enter verzendt, Shift+Enter nieuwe regel.",
    sending: "Verzenden…",
    send: "Verzend",
    a02Eyebrow: "02 · Provider",
    a02Title: "Oproep-telemetrie",
    historySentEyebrow: "History meegestuurd",
    historySentBefore: "Laatste ",
    historySentAfterTurns: " beurt(en) van dit gesprek worden als ",
    historySentAfterCode: " meegestuurd bij de volgende aanvraag. Reset wist dit.",
    p05ChatEyebrow: "05 · Chatthread",
    p05ChatTitle: "Beurt-telling",
    lblTotalTurns: "Totaal beurten",
    lblSentAsHistory: "Als history mee",
    lblLastSpeaker: "Laatste spreker",
    lblUserLanguage: "Taal gebruiker",
    lblAssistantReplies: "Antwoorden assistent",
    metaNoCallYet: "Nog geen oproep.",
    metaProvider: "Provider",
    metaModel: "Model",
    metaFallbackUsed: "Fallback gebruikt",
    metaLearningMatches: "Learning-treffers",
    metaLearningTypes: "Learning-types",
    metaLatency: "Latentie",
    micNa: "Mic n.v.t.",
    micNoSrTitle: "Geen SpeechRecognition in deze browser",
    micListeningRelease: "● Luistert — laat los",
    micHoldToTalk: "● Houd ingedrukt om te praten",
    ariaReleaseToSend: "Laat los om te verzenden",
    ariaHoldToTalk: "Houd ingedrukt om te praten",
    langEnglish: "Engels",
    langDutch: "Nederlands",
    langIndonesian: "Bahasa Indonesia",
    modeRouteNlId: "Nederlands → Indonesisch",
    modeRouteIdNl: "Indonesisch → Nederlands",
    modeRouteEnId: "Engels → Indonesisch",
    modeRouteIdEn: "Indonesisch → Engels",
    micErrNoSr: "Deze browser ondersteunt geen SpeechRecognition.",
    micErrPrefix: "Microfoonfout: ",
    micErrStartGeneric: "Kan microfoon niet starten.",
    turnsUnit: "beurten",
    roleUser: "gebruiker",
    roleAssistant: "assistent",
  },
};
