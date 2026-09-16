// Skins are presentation only: character, backdrop, accent, instrument, face.
// Content (levels, progress, rewards) is pack-owned — see `src/packs/`.

/** Instrument voice id; the audio presets live in `audio/synth.ts`. */
import type { InstrumentId } from '../audio/synth';

export interface SkinDef {
  readonly accent: string;
  readonly backdrop: string;
  readonly character: string;
  readonly face: string;
  readonly id: string;
  readonly instrument: InstrumentId;
}

/** Cycle order for the skin switch button: dino -> star -> construction -> animal -> teddy. */
export const SKINS: readonly SkinDef[] = [
  {
    accent: '#8ecae6',
    backdrop: '/art/bg/dino.webp',
    character: 'dino',
    face: '/art/face/dino.webp',
    id: 'dino',
    instrument: 'marimba',
  },
  {
    accent: '#f3c969',
    backdrop: '/art/bg/star.webp',
    character: 'star',
    face: '/art/face/star.webp',
    id: 'star',
    instrument: 'bell',
  },
  {
    accent: '#ffd166',
    backdrop: '/art/bg/construction.webp',
    character: 'excavator',
    face: '/art/face/construction.webp',
    id: 'construction',
    instrument: 'woodblock',
  },
  {
    accent: '#90be6d',
    backdrop: '/art/bg/animals.webp',
    character: 'lion',
    face: '/art/face/animal.webp',
    id: 'animal',
    instrument: 'kalimba',
  },
  {
    accent: '#e07a5f',
    backdrop: '/art/bg/teddy.webp',
    character: 'teddy',
    face: '/art/face/teddy.webp',
    id: 'teddy',
    instrument: 'musicbox',
  },
];

/** Presentation skin for the given id, or undefined when unknown. */
export function skinById(id: string): SkinDef | undefined {
  return SKINS.find((skin) => skin.id === id);
}

/** Next skin in cycle order (wraps); unknown ids restart the cycle at dino. */
export function nextSkinId(currentId: string): string {
  const index = SKINS.findIndex((skin) => skin.id === currentId);
  return SKINS[(index + 1) % SKINS.length]?.id ?? SKINS[0]?.id ?? 'dino';
}
