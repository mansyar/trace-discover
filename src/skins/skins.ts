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

/** Cycle order for the skin switch button: dino -> star -> construction -> animal. */
export const SKINS: readonly SkinDef[] = [
  {
    accent: '#8ecae6',
    backdrop: '/art/bg/dino.jpg',
    character: 'dino',
    face: '/art/face/dino.png',
    id: 'dino',
    instrument: 'marimba',
  },
  {
    accent: '#f3c969',
    backdrop: '/art/bg/star.jpg',
    character: 'star',
    face: '/art/face/star.png',
    id: 'star',
    instrument: 'bell',
  },
  {
    accent: '#ffd166',
    backdrop: '/art/bg/construction.jpg',
    character: 'excavator',
    face: '/art/face/construction.png',
    id: 'construction',
    instrument: 'woodblock',
  },
  {
    accent: '#90be6d',
    backdrop: '/art/bg/animals.jpg',
    character: 'lion',
    face: '/art/face/animal.png',
    id: 'animal',
    instrument: 'kalimba',
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
