let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (audioContext) return audioContext;
  const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  audioContext = AudioContextConstructor ? new AudioContextConstructor() : null;
  return audioContext;
};

export const useWorkoutAudio = () => {
  const unlock = async () => {
    const context = getAudioContext();
    if (!context) return;
    try {
      if (context.state === 'suspended') {
        await context.resume();
      }
    } catch {
      // Browsers may reject audio unlock outside a user gesture. Keep workout flow silent.
    }
  };

  const signalTimedStepComplete = async () => {
    try {
      navigator.vibrate?.([180, 80, 180]);
      const context = getAudioContext();
      if (!context) return;
      if (context.state === 'suspended') {
        await context.resume();
      }
      const now = context.currentTime;
      playTone(context, now, 0.14, 880);
      playTone(context, now + 0.2, 0.14, 660);
    } catch {
      // Audio/vibration are optional device capabilities.
    }
  };

  return {
    unlock,
    signalTimedStepComplete,
  };
};

const playTone = (context: AudioContext, startAt: number, duration: number, frequency: number) => {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.18, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
};
