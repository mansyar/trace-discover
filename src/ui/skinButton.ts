// Tap-to-cycle skin switch: a top-left toddler-sized button shown on every
// child screen (menu, pack, level, success, badge). The shell hit-tests and
// debounces taps; the cycle itself lands in the app state machine.
import type { Point } from '../engine/types';

/** Debounce window so a fluttering finger cannot skip past two skins. */
export const SKIN_BUTTON_DEBOUNCE_MS = 400;

export interface SkinButtonZone {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

/** Top-left 96 px circle, mirroring the parent gate on the right. */
export function skinButtonLayout(): SkinButtonZone {
  return { radius: 48, x: 56, y: 56 };
}

/** True when a field-space point lands on the skin button. */
export function hitSkinButton(zone: SkinButtonZone, point: Point): boolean {
  return Math.hypot(point.x - zone.x, point.y - zone.y) <= zone.radius;
}

/** Tap gate: the first tap always passes; later taps wait out the debounce. */
export function canCycleSkin(nowMs: number, lastTapMs: number | null): boolean {
  return lastTapMs === null || nowMs - lastTapMs >= SKIN_BUTTON_DEBOUNCE_MS;
}
