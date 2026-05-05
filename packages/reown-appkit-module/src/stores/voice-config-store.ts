// ============================================================================
// VOICE CONFIGURATION STORE
// ============================================================================
// Manages LMNT voice settings with localStorage persistence
// Used across voice-generator, blog posts, and documentation pages

// import type { VoiceConfig } from '../componentsvoice/EnhancedVoiceConfigDialog'; 
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// const DEFAULT_CONFIG: LMNTVoiceConfig = {
//   voice: "lily",
//   speed: 1.0,
//   volume: 1.0,
//   language: "en",
//   format: "mp3",
//   sampleRate: 24000,
//   enableConversation: false,
//   enableContextMemory: false,
//   autoRead: false,
// };

// interface VoiceConfigState {
//   // State
//   config: LMNTVoiceConfig;
  
//   // Actions
//   setConfig: (config: LMNTVoiceConfig) => void;
//   updateConfig: (updates: Partial<LMNTVoiceConfig>) => void;
//   resetConfig: () => void;
  
//   // Getters
//   getConfig: () => LMNTVoiceConfig;
// }

export const useVoiceConfigStore = create<any>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        config: {},

        // Actions
        setConfig: (config) => set((state) => {
          state.config = config;
        }),

        updateConfig: (updates) => set((state) => {
          state.config = { ...state.config, ...updates };
        }),

        resetConfig: () => set((state) => {
          state.config = {};
        }),

        // Getters
        getConfig: () => get().config,
      })),
      {
        name: 'lmnt_voice_config',
        version: 1,
      }
    ),
    { name: 'VoiceConfigStore' }
  )
);

