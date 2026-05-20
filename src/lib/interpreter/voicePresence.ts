export type VoicePresenceMode = 'assistant' | 'interpreter' | 'agent' | 'autonomous';

export function getVoicePresenceCopy(_mode: VoicePresenceMode): {
  label: string;
  hint: string;
} {
  // Unified Prestix identity — mode parameter kept for API compatibility only
  return {
    label: 'prestix core',
    hint: 'voice-first assistant online',
  };
}
