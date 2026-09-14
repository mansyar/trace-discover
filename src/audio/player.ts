import { ATTACK_SECONDS, type TonePlayer, type ToneSpec } from './synth';

/** Real TonePlayer backed by a shared AudioContext (wiring-only, device-verified). */
export function createTonePlayer(context: BaseAudioContext): TonePlayer {
  return {
    play: (spec: ToneSpec): void => {
      const start = context.currentTime + spec.delay;
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const attack = Math.max(ATTACK_SECONDS, 0.002);
      const end = start + Math.max(spec.duration, attack + 0.05);
      oscillator.type = spec.type ?? 'triangle';
      oscillator.frequency.setValueAtTime(spec.frequency, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(spec.gain, start + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.05);
    },
  };
}
