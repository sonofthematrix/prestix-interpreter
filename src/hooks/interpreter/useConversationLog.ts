'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ConversationLogEntry } from '@/lib/interpreter/types';

type SpeakerId = "speaker_a" | "speaker_b" | "unknown";
type ConversationFilter = SpeakerId | "all";

const conversationLogStorageKey = "prestix-interpreter-conversation-log";
const activeSpeakerStorageKey = "prestix-interpreter-active-speaker";

function isSpeakerId(value: unknown): value is SpeakerId {
  return value === "speaker_a" || value === "speaker_b" || value === "unknown";
}

/**
 * Manages conversation log state, localStorage persistence,
 * speaker assignment, and log filtering.
 * Extracted from voice/page.tsx.
 */
export function useConversationLog() {
  const [conversationLog, setConversationLog] = useState<ConversationLogEntry[]>([]);
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>("all");
  const [activeSpeaker, setActiveSpeaker] = useState<SpeakerId>("unknown");
  const [lastInput, setLastInput] = useState("");
  const [lastOutput, setLastOutput] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [activeSpeakerLoaded, setActiveSpeakerLoaded] = useState(false);

  // Restore from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const storedLog = window.localStorage.getItem(conversationLogStorageKey);
      if (storedLog) {
        const parsedLog: unknown = JSON.parse(storedLog);
        if (Array.isArray(parsedLog)) {
          setConversationLog(parsedLog.slice(-100));
        }
      }
    } catch {
      setConversationLog([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === "undefined" || !loaded) return;
    try {
      window.localStorage.setItem(
        conversationLogStorageKey,
        JSON.stringify(conversationLog.slice(-100)),
      );
    } catch {
      // localStorage full — oldest entries already trimmed
    }
  }, [conversationLog, loaded]);

  // Restore active speaker
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(activeSpeakerStorageKey);
      if (stored && isSpeakerId(stored)) {
        setActiveSpeaker(stored);
      }
    } catch {
      setActiveSpeaker("unknown");
    } finally {
      setActiveSpeakerLoaded(true);
    }
  }, []);

  // Persist active speaker
  useEffect(() => {
    if (typeof window === "undefined" || !activeSpeakerLoaded) return;
    window.localStorage.setItem(activeSpeakerStorageKey, activeSpeaker);
  }, [activeSpeaker, activeSpeakerLoaded]);

  const updateConversationSpeaker = useCallback((entryId: string, speaker: SpeakerId) => {
    setConversationLog((currentLog) =>
      currentLog.map((entry) =>
        entry.id === entryId ? { ...entry, speaker } : entry,
      ),
    );
  }, []);

  const clearConversationLog = useCallback(() => {
    setConversationLog([]);
    setLastOutput("");
  }, []);

  const appendConversationEntry = useCallback((entry: ConversationLogEntry) => {
    setConversationLog((prev) => [entry, ...prev].slice(0, 100));
  }, []);

  const updateConversationEntry = useCallback((entryId: string, updates: Partial<ConversationLogEntry>) => {
    setConversationLog((prev) =>
      prev.map((entry) => (entry.id === entryId ? { ...entry, ...updates } : entry)),
    );
  }, []);

  return {
    conversationLog,
    setConversationLog,
    conversationFilter,
    setConversationFilter,
    activeSpeaker,
    setActiveSpeaker,
    lastInput,
    setLastInput,
    lastOutput,
    setLastOutput,
    updateConversationSpeaker,
    clearConversationLog,
    appendConversationEntry,
    updateConversationEntry,
  };
}
