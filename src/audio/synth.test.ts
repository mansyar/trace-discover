import { describe, expect, it } from 'vitest';
import { hopTimeline } from '../character/hops';
import {
  checkpointMidi,
  countedNoteSpecs,
  createUnlockGate,
  envelopeGain,
  MARIMBA_PRESET,
  midiToFrequency,
  playCheckpointChime,
  playCompletion,
  playCountedNotes,
  presetForInstrument,
  TOY_PIANO_PRESET,
  type ToneSpec,
} from './synth';

function recordingPlayer() {
  const played: ToneSpec[] = [];
  return {
    play: (spec: ToneSpec): void => {
      played.push(spec);
    },
    played,
  };
}

describe('pentatonic mapping', () => {
  it('walks C-major pentatonic upward across octaves', () => {
    expect(checkpointMidi(0)).toBe(72);
    expect(checkpointMidi(1)).toBe(74);
    expect(checkpointMidi(2)).toBe(76);
    expect(checkpointMidi(3)).toBe(79);
    expect(checkpointMidi(4)).toBe(81);
    expect(checkpointMidi(5)).toBe(84);
  });

  it('is strictly ascending for at least 12 checkpoints', () => {
    let previous = 0;
    for (let index = 0; index < 12; index += 1) {
      const midi = checkpointMidi(index);
      expect(midi).toBeGreaterThan(previous);
      previous = midi;
    }
  });
});

describe('midiToFrequency', () => {
  it('anchors A4 at 440 Hz', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 6);
    expect(midiToFrequency(81)).toBeCloseTo(880, 6);
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3);
  });
});

describe('envelopeGain', () => {
  it('ramps in, then decays toward silence', () => {
    expect(envelopeGain(0)).toBe(0);
    expect(envelopeGain(0.006)).toBeCloseTo(1, 2);
    const mid = envelopeGain(0.2);
    expect(mid).toBeLessThan(1);
    expect(mid).toBeGreaterThan(envelopeGain(0.5));
    expect(envelopeGain(2)).toBeLessThan(0.01);
  });
});

describe('playCheckpointChime', () => {
  it('plays one tone at the mapped pitch', () => {
    const player = recordingPlayer();
    playCheckpointChime(player, 2);
    expect(player.played).toHaveLength(1);
    const spec = player.played[0];
    if (!spec) {
      throw new Error('missing spec');
    }
    expect(spec.frequency).toBeCloseTo(midiToFrequency(76), 6);
    expect(spec.duration).toBeGreaterThan(0.3);
    expect(spec.duration).toBeLessThan(1.5);
    expect(spec.gain).toBeGreaterThan(0);
    expect(spec.delay).toBe(0);
  });
});

describe('playCompletion', () => {
  it('plays a chord plus a rising sparkle arpeggio', () => {
    const player = recordingPlayer();
    playCompletion(player);
    expect(player.played.length).toBeGreaterThanOrEqual(4);
    const delays = player.played.map((spec) => spec.delay);
    for (let index = 1; index < delays.length; index += 1) {
      const previous = delays[index - 1];
      const current = delays[index];
      if (previous === undefined || current === undefined) {
        throw new Error('missing delay');
      }
      expect(current).toBeGreaterThanOrEqual(previous);
    }
    const frequencies = player.played.map((spec) => spec.frequency);
    expect(Math.max(...frequencies)).toBeGreaterThan(Math.min(...frequencies));
    for (const spec of player.played) {
      expect(spec.duration).toBeGreaterThan(0.2);
    }
  });
});

describe('unlock gate', () => {
  it('starts locked and unlocks once', () => {
    const gate = createUnlockGate();
    expect(gate.unlocked).toBe(false);
    gate.unlock();
    expect(gate.unlocked).toBe(true);
    gate.unlock();
    expect(gate.unlocked).toBe(true);
  });
});

describe('toy piano counted notes', () => {
  it('keeps the counted run in the pentatonic mapping with the preset voice', () => {
    const timeline = hopTimeline(3);
    const specs = countedNoteSpecs(timeline);
    expect(specs).toHaveLength(3);
    specs.forEach((spec, index) => {
      expect(spec.frequency).toBeCloseTo(midiToFrequency(checkpointMidi(index)), 6);
      expect(spec.duration).toBe(TOY_PIANO_PRESET.duration);
      expect(spec.gain).toBe(TOY_PIANO_PRESET.gain);
      expect(spec.type).toBe(TOY_PIANO_PRESET.type);
      const hop = timeline.hops[index];
      if (!hop) {
        throw new Error('missing hop');
      }
      expect(spec.delay).toBeCloseTo(hop.endMs / 1000, 9);
    });
  });

  it('plays one note per hop through the player', () => {
    const player = recordingPlayer();
    playCountedNotes(player, hopTimeline(9));
    expect(player.played).toHaveLength(9);
    for (let index = 1; index < player.played.length; index += 1) {
      const previous = player.played[index - 1];
      const current = player.played[index];
      if (!previous || !current) {
        throw new Error('missing spec');
      }
      expect(current.frequency).toBeGreaterThan(previous.frequency);
      expect(current.delay).toBeGreaterThan(previous.delay);
    }
  });

  it('gives 0 a single note halfway through the ring move', () => {
    const player = recordingPlayer();
    playCountedNotes(player, hopTimeline(0));
    expect(player.played).toHaveLength(1);
    const spec = player.played[0];
    if (!spec) {
      throw new Error('missing spec');
    }
    expect(spec.delay).toBeCloseTo(0.45, 9);
    expect(spec.frequency).toBeCloseTo(midiToFrequency(checkpointMidi(0)), 6);
  });

  it('leaves the world voice untouched by default and swaps on request', () => {
    const chime = recordingPlayer();
    playCheckpointChime(chime, 0);
    const world = chime.played[0];
    if (!world) {
      throw new Error('missing spec');
    }
    expect(world.duration).toBe(MARIMBA_PRESET.duration);
    expect(world.gain).toBe(MARIMBA_PRESET.gain);
    const toy = recordingPlayer();
    playCheckpointChime(toy, 0, TOY_PIANO_PRESET);
    const swap = toy.played[0];
    if (!swap) {
      throw new Error('missing spec');
    }
    expect(swap.duration).toBe(TOY_PIANO_PRESET.duration);
    expect(swap.gain).toBe(TOY_PIANO_PRESET.gain);
  });
});

describe('instrument preset registry', () => {
  const IDS = ['marimba', 'bell', 'woodblock', 'kalimba'] as const;

  it('maps every instrument id to a usable preset', () => {
    for (const id of IDS) {
      const preset = presetForInstrument(id);
      expect(preset.duration).toBeGreaterThan(0);
      expect(preset.gain).toBeGreaterThan(0);
      expect(['sine', 'triangle']).toContain(preset.type);
    }
  });

  it('keeps the marimba voice identical to the original world preset', () => {
    expect(presetForInstrument('marimba')).toEqual(MARIMBA_PRESET);
  });

  it('gives each instrument its own character', () => {
    expect(presetForInstrument('woodblock').duration).toBeLessThan(
      presetForInstrument('marimba').duration,
    );
    expect(presetForInstrument('bell').type).toBe('sine');
    expect(presetForInstrument('kalimba').type).toBe('sine');
  });

  it('colors the completion chord with the preset timbre and keeps the sparkle', () => {
    const player = recordingPlayer();
    playCompletion(player, presetForInstrument('bell'));
    const chord = player.played.slice(0, 3);
    expect(chord).toHaveLength(3);
    for (const spec of chord) {
      expect(spec.type).toBe('sine');
      expect(spec.duration).toBe(1.3);
    }
    expect(player.played.length).toBeGreaterThan(3);
    for (const spec of player.played.slice(3)) {
      expect(spec.type).toBe('sine');
    }
  });

  it('plays checkpoint chimes with the given preset voice', () => {
    const player = recordingPlayer();
    const woodblock = presetForInstrument('woodblock');
    playCheckpointChime(player, 0, woodblock);
    const spec = player.played[0];
    if (!spec) {
      throw new Error('missing spec');
    }
    expect(spec.duration).toBe(woodblock.duration);
    expect(spec.gain).toBe(woodblock.gain);
    expect(spec.type).toBe(woodblock.type);
  });
});
