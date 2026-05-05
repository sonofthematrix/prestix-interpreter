import { useCallback, useState } from "react";

interface UseLMNTVoiceOptions {
  voice?: string;
  speed?: number;
  language?: string;
  format?: "mp3" | "wav";
}

interface UseLMNTVoiceReturn {
  speakText: (text: string, options?: UseLMNTVoiceOptions) => Promise<void>;
  isPlaying: boolean;
  isSpeaking: boolean;
  error: string | null;
  clearError: () => void;
  stopSpeaking: () => void;
}

/**
 * Custom hook for LMNT voice synthesis using the backend proxy
 * Handles audio playback, error states, and cleanup automatically
 */
export function useLMNTVoice(
  defaultOptions: UseLMNTVoiceOptions = {}
): UseLMNTVoiceReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setIsSpeaking(false);
    }
  }, [currentAudio]);

  const speakText = useCallback(
    async (text: string, options: UseLMNTVoiceOptions = {}) => {
      if (!text.trim()) {
        setError("Text cannot be empty");
        return;
      }

      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
      }

      setIsSpeaking(true);
      setIsPlaying(false);
      setError(null);

      try {
        console.log("🎤 LMNT: Requesting speech synthesis via proxy...");

        // Use backend proxy endpoint
        const response = await fetch("/api/voice/lmnt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            text,
            type: "accessibility",
            options: {
              voiceId: options.voice || defaultOptions.voice || "lily",
              voice: options.voice || defaultOptions.voice || "lily",
              format: options.format || defaultOptions.format || "mp3",
              sampleRate: 24000,
              sample_rate: 24000,
              speed: options.speed || defaultOptions.speed || 1.0,
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown error", success: false }));

          if (response.status === 503) {
            throw new Error(
              errorData.message || "Voice service not configured. Please contact support."
            );
          }

          if (response.status === 401) {
            throw new Error("Authentication required. Please log in.");
          }

          throw new Error(
            errorData.message || errorData.error || `Server error: ${response.status}`
          );
        }

        // Parse JSON response with base64 chunks
        const data = await response.json();
        
        if (!data.success || !data.audioChunks || data.audioChunks.length === 0) {
          throw new Error(data.message || data.error || "No audio data received");
        }

        // Reconstruct binary from base64 chunks
        const parts: Uint8Array[] = [];
        for (const base64Chunk of data.audioChunks) {
          const binaryString = atob(base64Chunk);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          parts.push(bytes);
        }

        // Combine all chunks into a single Uint8Array
        const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const part of parts) {
          combined.set(part, offset);
          offset += part.length;
        }

        // Create blob from combined audio data
        const audioBlob = new Blob([combined], { type: `audio/${data.format || 'mp3'}` });

        console.log(`✅ LMNT: Generated ${audioBlob.size} bytes of audio`);

        // Create and play audio
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        setCurrentAudio(audio);
        setIsSpeaking(false);
        setIsPlaying(true);

        // Set up event listeners
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
          setCurrentAudio(null);
        });

        audio.addEventListener("error", (e) => {
          console.error("Audio playback error:", e);
          setError("Failed to play audio");
          setIsPlaying(false);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          setCurrentAudio(null);
        });

        // Start playback
        await audio.play();
      } catch (error: any) {
        console.error("LMNT voice synthesis error:", error);

        let errorMessage = "Failed to generate speech";

        if (error.message.includes("wss")) {
          errorMessage =
            "WebSocket connection failed. Voice service temporarily unavailable.";
        } else if (error.message.includes("LMNT service not configured")) {
          errorMessage =
            "Voice service not configured. Please contact support.";
        } else if (error.message.includes("Authentication required")) {
          errorMessage = "Please log in to use voice features.";
        } else if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your connection.";
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        setIsSpeaking(false);
        setIsPlaying(false);
        setCurrentAudio(null);
      }
    },
    [defaultOptions, currentAudio]
  );

  return {
    speakText,
    isPlaying,
    isSpeaking,
    error,
    clearError,
    stopSpeaking,
  };
}
