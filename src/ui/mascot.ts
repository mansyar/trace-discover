// Mascot tap zone: the field-space circle a tap must land on to make the
// parked character giggle (menu + pack). Mirrors the shell's canvas math:
// size = FIELD_WIDTH * scale and CHARACTER_OFFSET_Y (0.38) place the sprite
// square; the zone is that square's inscribed circle, so every tap reaching
// the sprite reaches the zone and the zone never extends past the sprite.
import type { Point } from '../engine/types';
import { FIELD_WIDTH } from '../field';

/** Mirrors the shell's CHARACTER_OFFSET_Y (sprite center sits below the park). */
const MASCOT_OFFSET_Y = 0.38;
/** Hit radius as a fraction of the mirrored sprite size (inscribed circle). */
const MASCOT_HIT_RATIO = 0.5;

export interface MascotZone {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

/** Field-space tap zone for the mascot parked at `park` (see positionCharacter). */
export function mascotZone(park: Point, scale: number): MascotZone {
  const size = FIELD_WIDTH * scale;
  return { x: park.x, y: park.y + size * MASCOT_OFFSET_Y, radius: size * MASCOT_HIT_RATIO };
}

/** True when a field-space point lands on the parked mascot. */
export function hitMascot(zone: MascotZone, point: Point): boolean {
  return Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.radius;
}
