import { Platform, Vibration } from 'react-native';

// Professional Panchayat Bell & Emergency Alert Chime Synthesizer
let audioCtx: any = null;

function getAudioContext() {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContextClass();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      return audioCtx;
    }
  }
  return null;
}

/**
 * Plays a realistic dual-tone village emergency bell / chime
 * Tone 1: High alert chime (880Hz)
 * Tone 2: Harmonious resonance (1320Hz / 1760Hz)
 */
export async function playEmergencyAlertSound(): Promise<void> {
  try {
    // 1. Trigger strong haptic vibration pattern on mobile devices
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 300, 150, 450, 150, 600]);
    }

    // 2. Synthesize authentic bell chime on Web / browser
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;

      // Bell Strike 1 (High Alert)
      playBellStrike(ctx, now, 880, 0.45, 0.7);
      // Bell Strike 2 (Resonance)
      playBellStrike(ctx, now + 0.18, 1174.66, 0.55, 0.8);
      // Bell Strike 3 (Alert Peak)
      playBellStrike(ctx, now + 0.42, 1760, 0.65, 0.9);
      // Bell Strike 4 (Deep harmonic sustain)
      playBellStrike(ctx, now + 0.65, 1046.5, 0.5, 1.2);
    }
  } catch (err) {
    console.log('Emergency sound alert error:', err);
  }
}

function playBellStrike(
  ctx: any,
  startTime: number,
  freq: number,
  gainLevel: number,
  duration: number
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Attack -> Quick exponential decay (acoustic bell envelope)
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch (e) {
    console.log('Error creating oscillator node:', e);
  }
}
