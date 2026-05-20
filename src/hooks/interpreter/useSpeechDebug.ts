"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Lightweight debug log for speech recognition, translation queue,
 * and audio playback. Holds the last 40 log lines in state.
 * 
 * Extracted from voice/page.tsx to reduce monolith surface area.
 */
export function useSpeechDebug() {
  const [speechDebugLog, setSpeechDebugLog] = useState<string[]>([]);

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
      const line = `${time} ${eventName}${clippedDetails ? ` ${clippedDetails}` : ""}`;

      setSpeechDebugLog((previousLog) => [...previousLog, line].slice(-40));
    },
    [],
  );

  // Ref pattern so callbacks that use addSpeechDebug don't need it in deps arrays
  const addSpeechDebugRef = useRef(addSpeechDebug);
  addSpeechDebugRef.current = addSpeechDebug;

  return { speechDebugLog, addSpeechDebug, addSpeechDebugRef };
}
