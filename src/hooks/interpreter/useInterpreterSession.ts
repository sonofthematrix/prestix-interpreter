"use client";

import { useCallback, useEffect, useState } from "react";
import type { InterpreterMode, SessionMode } from "@/lib/interpreter/types";
import { isSessionMode } from "@/lib/interpreter/typeGuards";

const translatorEnabledStorageKey = "prestix-interpreter-translator-enabled";

/**
 * Manages session-level state for Prestix assistant.
 * 
 * sessionMode: tracks current behavior — 'assistant' is the default Prestix mode,
 *              'interpreter' is force-translate override (every input = pure translation).
 * translatorEnabled: when true, forces interpreter/translation mode for every input.
 *                    When false, assistant handles context naturally.
 */
export function useInterpreterSession() {
  const [sessionMode, setSessionMode] = useState<SessionMode>("assistant");
  const [mode, setMode] = useState<InterpreterMode>("en-id");
  const [translatorEnabled, setTranslatorEnabled] = useState(false);

  // Restore translator preference on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(translatorEnabledStorageKey);
      if (stored !== null) {
        setTranslatorEnabled(stored === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist translator preference
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(translatorEnabledStorageKey, String(translatorEnabled));
  }, [translatorEnabled]);

  const sessionModeLabel = useCallback((sm: SessionMode): string => {
    return sm === "interpreter" ? "force translate" : "prestix";
  }, []);

  const modeLabel = useCallback((m: InterpreterMode): string => {
    const labels: Record<InterpreterMode, string> = {
      "nl-id": "NL→ID",
      "id-nl": "ID→NL",
      "en-id": "EN→ID",
      "id-en": "ID→EN",
    };
    return labels[m] || m;
  }, []);

  return {
    sessionMode,
    setSessionMode,
    mode,
    setMode,
    translatorEnabled,
    setTranslatorEnabled,
    sessionModeLabel,
    modeLabel,
  };
}
