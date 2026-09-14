import type { Point } from '../engine/types';

export type SuccessAction = 'replay' | 'next' | 'home';

export interface SuccessButton {
  readonly action: SuccessAction;
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface SuccessLayout {
  readonly buttons: readonly SuccessButton[];
}

const BUTTON_RADIUS = 48; // 96px diameter: above the 90px toddler target minimum
const SPACING = 130;
const BOTTOM_MARGIN = 120;

/** Three big icon targets in a bottom row: replay, next, home. */
export function successLayout(fieldWidth: number, fieldHeight: number): SuccessLayout {
  const actions = ['replay', 'next', 'home'] as const;
  const centerX = fieldWidth / 2;
  const y = fieldHeight - BOTTOM_MARGIN;
  return {
    buttons: actions.map((action, index) => ({
      action,
      radius: BUTTON_RADIUS,
      x: centerX + (index - 1) * SPACING,
      y,
    })),
  };
}

/** Nearest button whose target contains the point, else null. */
export function hitSuccessButton(layout: SuccessLayout, point: Point): SuccessAction | null {
  let best: SuccessButton | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const button of layout.buttons) {
    const distance = Math.hypot(point.x - button.x, point.y - button.y);
    if (distance <= button.radius && distance < bestDistance) {
      best = button;
      bestDistance = distance;
    }
  }
  return best?.action ?? null;
}
