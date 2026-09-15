// Parent-zone screen layout math (pure; text labels render in shell
// wiring — parent copy is the one place text is allowed). Big circular
// targets: volume row, easier + skin setter, reset + install guide, done;
// a display-only row of legacy trophies sits between reset and done.
import type { Point } from '../engine/types';

export type ParentZoneAction =
  | 'volume-down'
  | 'volume-up'
  | 'mute'
  | 'easier'
  | 'skin'
  | 'reset'
  | 'install'
  | 'done';

export interface ZoneButton {
  readonly action: ParentZoneAction;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

/** Display-only legacy trophy spot (never hit-tested). */
export interface TrophySlot {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface ParentZoneLayout {
  readonly volumeDown: ZoneButton;
  readonly volumeUp: ZoneButton;
  readonly mute: ZoneButton;
  readonly easier: ZoneButton;
  readonly skin: ZoneButton;
  readonly reset: ZoneButton;
  readonly install: ZoneButton;
  readonly done: ZoneButton;
  readonly trophies: readonly TrophySlot[];
}

const SMALL_RADIUS = 46; // 92px: above the 90px toddler target minimum
const BIG_RADIUS = 56;
const TROPHY_RADIUS = 26;
const TROPHY_Y = 688;
const TROPHY_SPACING = 120;

function button(action: ParentZoneAction, x: number, y: number, radius: number): ZoneButton {
  return { action, radius, x, y };
}

/** Eight big targets in rows plus the display-only trophy row. */
export function parentZoneLayout(fieldWidth: number, fieldHeight: number): ParentZoneLayout {
  const centerX = fieldWidth / 2;
  return {
    volumeDown: button('volume-down', centerX - 130, 250, SMALL_RADIUS),
    volumeUp: button('volume-up', centerX + 130, 250, SMALL_RADIUS),
    mute: button('mute', centerX, 250, SMALL_RADIUS),
    easier: button('easier', centerX, 400, BIG_RADIUS),
    skin: button('skin', centerX + 130, 400, SMALL_RADIUS),
    reset: button('reset', centerX - 110, 555, SMALL_RADIUS),
    install: button('install', centerX + 110, 555, SMALL_RADIUS),
    done: button('done', centerX, Math.min(770, fieldHeight - 90), BIG_RADIUS),
    trophies: [
      { radius: TROPHY_RADIUS, x: centerX - TROPHY_SPACING, y: TROPHY_Y },
      { radius: TROPHY_RADIUS, x: centerX, y: TROPHY_Y },
      { radius: TROPHY_RADIUS, x: centerX + TROPHY_SPACING, y: TROPHY_Y },
    ],
  };
}

/** Nearest button whose target contains the point, else null. */
export function hitParentZone(layout: ParentZoneLayout, point: Point): ParentZoneAction | null {
  let best: ZoneButton | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const buttons: readonly ZoneButton[] = [
    layout.volumeDown,
    layout.volumeUp,
    layout.mute,
    layout.easier,
    layout.skin,
    layout.reset,
    layout.install,
    layout.done,
  ];
  for (const candidate of buttons) {
    const distance = Math.hypot(point.x - candidate.x, point.y - candidate.y);
    if (distance <= candidate.radius && distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best?.action ?? null;
}
