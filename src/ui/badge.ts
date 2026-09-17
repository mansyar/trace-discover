// Badge screen layout math (pure). Portrait keeps the shipped seal + home
// positions; the wide landscape field re-centers both on the short axis.
export interface BadgeTarget {
  readonly radius: number;
  readonly x: number;
  readonly y: number;
}

export interface BadgeLayout {
  readonly home: BadgeTarget;
  readonly seal: BadgeTarget;
}

const HOME_RADIUS = 48;
const SEAL_RADIUS = 110;
const HOME_BOTTOM_OFFSET = 90;
const SEAL_Y_PORTRAIT = 380;
const SEAL_Y_LANDSCAPE = 170;

/** Seal + home targets for the badge screen; portrait = shipped values. */
export function badgeLayout(fieldWidth: number, fieldHeight: number): BadgeLayout {
  const portrait = fieldWidth <= fieldHeight;
  return {
    home: { radius: HOME_RADIUS, x: fieldWidth / 2, y: fieldHeight - HOME_BOTTOM_OFFSET },
    seal: {
      radius: SEAL_RADIUS,
      x: fieldWidth / 2,
      y: portrait ? SEAL_Y_PORTRAIT : SEAL_Y_LANDSCAPE,
    },
  };
}
