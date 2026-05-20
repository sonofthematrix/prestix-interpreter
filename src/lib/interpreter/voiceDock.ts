import type {
  BrowserMicrophonePermissionState,
  SpeechInputEngine,
} from './microphonePermission';

export type VoiceDockMode = 'assistant' | 'interpreter' | 'agent' | 'autonomous';

export type VoiceDockState = {
  mode: VoiceDockMode;
  speechInputEngine: SpeechInputEngine;
  browserMicrophonePermission: BrowserMicrophonePermissionState;
  recognitionRunning: boolean;
  isLocalRecording: boolean;
  isLocalTranscribing: boolean;
};

export function getVoiceDockCopy({
  mode,
  speechInputEngine,
  browserMicrophonePermission,
  recognitionRunning,
  isLocalRecording,
  isLocalTranscribing,
}: VoiceDockState): {
  ariaLabel: string;
  headline: string;
  supportingHint: string;
  placeholder: string;
  submitLabel: string;
  micButtonLabel: string;
} {
  const defaultMicButtonLabel = 'talk handsfree';

  let micButtonLabel = defaultMicButtonLabel;
  if (speechInputEngine === 'local-whisper') {
    if (isLocalTranscribing) {
      micButtonLabel = 'working...';
    } else if (isLocalRecording) {
      micButtonLabel = 'stop + send';
    }
  } else if (recognitionRunning) {
    micButtonLabel = 'mic live';
  } else if (
    browserMicrophonePermission === 'prompt' ||
    browserMicrophonePermission === 'unknown'
  ) {
    micButtonLabel = 'enable mic';
  } else if (browserMicrophonePermission === 'denied') {
    micButtonLabel = 'mic blocked';
  }

  return {
    ariaLabel: 'Prestix input',
    headline: 'Talk to Prestix',
    supportingHint: 'Tap the mic or type to start.',
    placeholder: 'Speak or type...',
    submitLabel: 'Send',
    micButtonLabel,
  };
}
