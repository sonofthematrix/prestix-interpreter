"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface VoiceEvent {
  type:
    | "win"
    | "bonus"
    | "jackpot"
    | "level_up"
    | "achievement"
    | "warning"
    | "info";
  amount?: number;
  level?: number;
  achievement?: string;
  priority: "low" | "normal" | "high";
  context?: any;
}

interface VoiceOptions {
  voiceId?: string;
  speed?: number;
  volume?: number;
  format?: "mp3" | "wav" | "ogg";
  sampleRate?: number;
  priority?: "low" | "normal" | "high";
  interrupt?: boolean;
}

interface VoiceState {
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
  currentAudio: HTMLAudioElement | null;
  queue: Array<{ audio: HTMLAudioElement; onEnd?: () => void }>;
}

interface VoiceServiceHook {
  // State
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;

  // Gaming announcements
  announceWin: (amount: number, options?: VoiceOptions) => Promise<void>;
  announceBonus: (options?: VoiceOptions) => Promise<void>;
  announceJackpot: (amount: number, options?: VoiceOptions) => Promise<void>;
  announceLevelUp: (level: number, options?: VoiceOptions) => Promise<void>;
  announceAchievement: (
    achievement: string,
    options?: VoiceOptions
  ) => Promise<void>;
  announceGameEvent: (
    event: VoiceEvent,
    options?: VoiceOptions
  ) => Promise<void>;

  // Accessibility
  readAloud: (text: string, options?: VoiceOptions) => Promise<void>;

  // Support
  provideSupportResponse: (
    query: string,
    options?: VoiceOptions
  ) => Promise<{ response: string }>;

  // Commentary
  provideGameCommentary: (
    gameState: any,
    options?: VoiceOptions
  ) => Promise<void>;

  // Controls
  stop: () => void;
  clearQueue: () => void;
  setVolume: (volume: number) => void;

  // Utility
  getAvailableVoices: () => Promise<Record<string, string>>;
  healthCheck: () => Promise<{ status: "healthy" | "unhealthy"; details: any }>;
}

export function useVoiceService(): VoiceServiceHook {
  const [state, setState] = useState<VoiceState>({
    isPlaying: false,
    isLoading: false,
    error: null,
    sessionId: null,
    currentAudio: null,
    queue: [],
  });

  const audioContext = useRef<AudioContext | null>(null);
  const volumeNode = useRef<GainNode | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== "undefined" && "AudioContext" in window) {
      audioContext.current = new AudioContext();
      volumeNode.current = audioContext.current.createGain();
      volumeNode.current.connect(audioContext.current.destination);
    }
  }, []);

  const updateState = useCallback((updates: Partial<VoiceState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  const createAudioFromBase64Chunks = useCallback(
    (audioChunks: string[], format: string = "mp3"): HTMLAudioElement => {
      // Concatenate all base64 chunks
      const combinedBase64 = audioChunks.join("");

      // Convert to blob
      const audioData = atob(combinedBase64);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }

      const blob = new Blob([audioArray], { type: `audio/${format}` });
      const audioUrl = URL.createObjectURL(blob);

      const audio = new Audio(audioUrl);
      audio.preload = "auto";

      return audio;
    },
    []
  );

  const playAudio = useCallback(
    (audio: HTMLAudioElement, onEnd?: () => void): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (state.currentAudio) {
          state.currentAudio.pause();
          state.currentAudio.currentTime = 0;
        }

        updateState({
          currentAudio: audio,
          isPlaying: true,
          error: null,
        });

        audio.onended = () => {
          updateState({
            isPlaying: false,
            currentAudio: null,
          });

          // Clean up the blob URL
          URL.revokeObjectURL(audio.src);

          if (onEnd) onEnd();
          resolve();
        };

        audio.onerror = (error) => {
          updateState({
            isPlaying: false,
            currentAudio: null,
            error: "Audio playback failed",
          });
          reject(new Error("Audio playback failed"));
        };

        // Resume audio context if suspended
        if (audioContext.current?.state === "suspended") {
          audioContext.current.resume();
        }

        audio.play().catch(reject);
      });
    },
    [state.currentAudio, updateState]
  );

  const makeVoiceRequest = useCallback(
    async (
      type: "game_event" | "support" | "accessibility" | "commentary",
      params: any,
      options: VoiceOptions = {}
    ): Promise<{
      audioChunks: string[];
      sessionId: string;
      response?: string;
      format: string;
    }> => {
      updateState({ isLoading: true, error: null });

      try {
        const response = await fetch("/api/voice/lmnt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            type,
            sessionId: state.sessionId,
            options,
            ...params,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Voice request failed");
        }

        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Voice generation failed");
        }

        updateState({ sessionId: data.sessionId });

        return {
          audioChunks: data.audioChunks,
          sessionId: data.sessionId,
          response: data.response,
          format: data.format,
        };
      } catch (error) {
        updateState({
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      } finally {
        updateState({ isLoading: false });
      }
    },
    [state.sessionId, updateState]
  );

  // Gaming announcement functions
  const announceWin = useCallback(
    async (amount: number, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "game_event",
        {
          event: {
            type: "win",
            amount,
            priority: amount > 1000 ? "high" : "normal",
          },
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  const announceBonus = useCallback(
    async (options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "game_event",
        {
          event: {
            type: "bonus",
            priority: "high",
          },
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  const announceJackpot = useCallback(
    async (amount: number, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "game_event",
        {
          event: {
            type: "jackpot",
            amount,
            priority: "high",
          },
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  const announceLevelUp = useCallback(
    async (level: number, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "game_event",
        {
          event: {
            type: "level_up",
            level,
            priority: "normal",
          },
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  const announceAchievement = useCallback(
    async (achievement: string, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "game_event",
        {
          event: {
            type: "achievement",
            achievement,
            priority: "normal",
          },
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  const announceGameEvent = useCallback(
    async (event: VoiceEvent, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "game_event",
        {
          event,
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  // Accessibility function
  const readAloud = useCallback(
    async (text: string, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "accessibility",
        {
          text,
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  // Support function
  const provideSupportResponse = useCallback(
    async (
      query: string,
      options?: VoiceOptions
    ): Promise<{ response: string }> => {
      const { audioChunks, format, response } = await makeVoiceRequest(
        "support",
        {
          text: query,
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);

      return { response: response || "" };
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  // Commentary function
  const provideGameCommentary = useCallback(
    async (gameState: any, options?: VoiceOptions) => {
      const { audioChunks, format } = await makeVoiceRequest(
        "commentary",
        {
          gameState,
        },
        options
      );

      const audio = createAudioFromBase64Chunks(audioChunks, format);
      await playAudio(audio);
    },
    [makeVoiceRequest, createAudioFromBase64Chunks, playAudio]
  );

  // Control functions
  const stop = useCallback(() => {
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
      URL.revokeObjectURL(state.currentAudio.src);
    }
    updateState({
      isPlaying: false,
      currentAudio: null,
    });
  }, [state.currentAudio, updateState]);

  const clearQueue = useCallback(() => {
    state.queue.forEach(({ audio }) => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    });
    updateState({ queue: [] });
  }, [state.queue, updateState]);

  const setVolume = useCallback(
    (volume: number) => {
      if (volumeNode.current) {
        volumeNode.current.gain.value = Math.max(0, Math.min(1, volume));
      }
      if (state.currentAudio) {
        state.currentAudio.volume = Math.max(0, Math.min(1, volume));
      }
    },
    [state.currentAudio]
  );

  // Utility functions
  const getAvailableVoices = useCallback(async (): Promise<
    Record<string, string>
  > => {
    try {
      const response = await fetch("/api/voice/lmnt?action=voices", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch voices");
      }

      const data = await response.json();
      return data.voices || {};
    } catch (error) {
      console.error("Error fetching voices:", error);
      return {};
    }
  }, []);

  const healthCheck = useCallback(async (): Promise<{
    status: "healthy" | "unhealthy";
    details: any;
  }> => {
    try {
      const response = await fetch("/api/voice/lmnt?action=health", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Health check failed");
      }

      return await response.json();
    } catch (error) {
      return {
        status: "unhealthy",
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      };
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
      clearQueue();
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [stop, clearQueue]);

  return {
    // State
    isPlaying: state.isPlaying,
    isLoading: state.isLoading,
    error: state.error,
    sessionId: state.sessionId,

    // Gaming announcements
    announceWin,
    announceBonus,
    announceJackpot,
    announceLevelUp,
    announceAchievement,
    announceGameEvent,

    // Accessibility
    readAloud,

    // Support
    provideSupportResponse,

    // Commentary
    provideGameCommentary,

    // Controls
    stop,
    clearQueue,
    setVolume,

    // Utility
    getAvailableVoices,
    healthCheck,
  };
}
