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
/** Authored seal height as a share of the field (380/860, 170/430): the seal
 *  keeps its phone spot and rides the same share of a taller tablet field. */
const SEAL_Y_PORTRAIT_SHARE = SEAL_Y_PORTRAIT / 860;
const SEAL_Y_LANDSCAPE_SHARE = SEAL_Y_LANDSCAPE / 430;

/** Seal + home targets for the badge screen; portrait = shipped values. */
export function badgeLayout(fieldWidth: number, fieldHeight: number): BadgeLayout {
  const portrait = fieldWidth <= fieldHeight;
  return {
    home: { radius: HOME_RADIUS, x: fieldWidth / 2, y: fieldHeight - HOME_BOTTOM_OFFSET },
    seal: {
      radius: SEAL_RADIUS,
      x: fieldWidth / 2,
      y: portrait ? fieldHeight * SEAL_Y_PORTRAIT_SHARE : fieldHeight * SEAL_Y_LANDSCAPE_SHARE,
    },
  };
}
