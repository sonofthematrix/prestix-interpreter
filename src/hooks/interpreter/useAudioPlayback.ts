"use client";

import { useCallback, useRef } from "react";

/**
 * Manages HTMLAudioElement lifecycle: play, pause, stop, and cleanup.
 * Extracted from voice/page.tsx.
 */
export function useAudioPlayback() {
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const audioObjectUrlRef = useRef<string | null>(null);

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

  return { audioPlaybackRef, audioObjectUrlRef, stopAudioPlayback };
}
