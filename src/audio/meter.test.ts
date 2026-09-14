import { describe, expect, it } from 'vitest';
import { withVolume } from './meter';
import type { TonePlayer, ToneSpec } from './synth';

const SPEC: ToneSpec = { delay: 0, duration: 0.3, frequency: 523.25, gain: 0.4, type: 'triangle' };

function recordingPlayer(): TonePlayer & { specs: ToneSpec[] } {
  const specs: ToneSpec[] = [];
  return { play: (spec: ToneSpec): void => void specs.push(spec), specs };
}

describe('withVolume', () => {
  it('passes tones through unchanged at full volume', () => {
    const inner = recordingPlayer();
    withVolume(inner, () => ({ muted: false, volume: 1 })).play(SPEC);
    expect(inner.specs).toEqual([SPEC]);
  });

  it('scales gain by the live volume', () => {
    const inner = recordingPlayer();
    let volume = 0.5;
    const player = withVolume(inner, () => ({ muted: false, volume }));
    player.play(SPEC);
    volume = 0.25;
    player.play(SPEC);
    expect(inner.specs.map((spec) => spec.gain)).toEqual([0.2, 0.1]);
  });

  it('silences tones while muted or at zero volume', () => {
    const inner = recordingPlayer();
    let settings = { muted: true, volume: 1 };
    const player = withVolume(inner, () => settings);
    player.play(SPEC);
    settings = { muted: false, volume: 0 };
    player.play(SPEC);
    expect(inner.specs).toEqual([]);
  });
});
