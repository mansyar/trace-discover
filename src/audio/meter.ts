import type { TonePlayer, ToneSpec } from './synth';

export interface VolumeSettings {
  readonly muted: boolean;
  readonly volume: number;
}

/**
 * Volume/mute-aware TonePlayer decorator. Scales every tone's gain by the
 * live volume and drops tones entirely while muted, so parent-zone changes
 * apply instantly without rebuilding the audio graph.
 */
export function withVolume(inner: TonePlayer, readSettings: () => VolumeSettings): TonePlayer {
  return {
    play: (spec: ToneSpec): void => {
      const settings = readSettings();
      if (settings.muted || settings.volume <= 0) {
        return;
      }
      inner.play({ ...spec, gain: spec.gain * settings.volume });
    },
  };
}
