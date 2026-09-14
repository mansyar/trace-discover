// Pentatonic synth math kept pure for testing; the Web Audio player is a thin
// adapter (createWebAudioPlayer) added when the first playable wires sound.

/** One tone instruction, delay counted in seconds from "now". */
export interface ToneSpec {
  readonly delay: number;
  readonly duration: number;
  readonly frequency: number;
  readonly gain: number;
  readonly type?: 'sine' | 'triangle';
}

export interface TonePlayer {
  play(spec: ToneSpec): void;
}

export const ATTACK_SECONDS = 0.006;
const DECAY_TAU = 0.35;

const PENTATONIC_OFFSETS = [0, 2, 4, 7, 9] as const;
const BASE_MIDI = 72; // C5

/** Checkpoint index -> MIDI note, ascending C-major pentatonic across octaves. */
export function checkpointMidi(index: number): number {
  const octave = Math.floor(index / PENTATONIC_OFFSETS.length);
  const offset = PENTATONIC_OFFSETS[index % PENTATONIC_OFFSETS.length] ?? 0;
  return BASE_MIDI + octave * 12 + offset;
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Marimba-ish envelope: quick linear attack, exponential decay after. */
export function envelopeGain(seconds: number): number {
  if (seconds <= 0) {
    return 0;
  }
  if (seconds < ATTACK_SECONDS) {
    return seconds / ATTACK_SECONDS;
  }
  return Math.exp(-(seconds - ATTACK_SECONDS) / DECAY_TAU);
}

const CHIME_DURATION = 0.8;
const CHIME_GAIN = 0.5;

/** Ascending chime for one cleared checkpoint. */
export function playCheckpointChime(player: TonePlayer, checkpointIndex: number): void {
  player.play({
    delay: 0,
    duration: CHIME_DURATION,
    frequency: midiToFrequency(checkpointMidi(checkpointIndex)),
    gain: CHIME_GAIN,
    type: 'triangle',
  });
}

const COMPLETION_CHORD = [72, 76, 79]; // C5 E5 G5
const SPARKLE_ARPEGGIO = [84, 86, 88, 91]; // C6 D6 E6 G6
const ARPEGGIO_START = 0.2;
const ARPEGGIO_STEP = 0.07;

/** Warm chord resolve plus a rising sparkle arpeggio for level completion. */
export function playCompletion(player: TonePlayer): void {
  for (const midi of COMPLETION_CHORD) {
    player.play({
      delay: 0,
      duration: 1.3,
      frequency: midiToFrequency(midi),
      gain: 0.28,
      type: 'triangle',
    });
  }
  SPARKLE_ARPEGGIO.forEach((midi, index) => {
    player.play({
      delay: ARPEGGIO_START + index * ARPEGGIO_STEP,
      duration: 0.5,
      frequency: midiToFrequency(midi),
      gain: 0.32,
      type: 'sine',
    });
  });
}

export interface UnlockGate {
  readonly unlocked: boolean;
  unlock(): void;
}

/** Tracks the iOS "audio starts after first touch" requirement. */
export function createUnlockGate(): UnlockGate {
  let unlocked = false;
  return {
    get unlocked(): boolean {
      return unlocked;
    },
    unlock: (): void => {
      unlocked = true;
    },
  };
}
