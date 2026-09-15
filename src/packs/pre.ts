// The pre-writing pack: the canonical 12-slot stroke curriculum plus three
// bonus circles. Slot order preserves the shipped suite 1:1 for save
// migration — dino (1-4), construction (5-8), animals (9-12), bonuses in
// theme order — with geometry relabeled as-is; the small -> medium -> large
// re-ramp lands in the content phase.
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';

/** The twelve main pre-writing slots in play order. */
export const PRE_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 370, y: 430 },
    goalArt: '/art/goal/pre-1.png',
    id: 'pre-1',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 430 },
        { x: 215, y: 428 },
        { x: 370, y: 430 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 560 },
    goalArt: '/art/goal/pre-2.png',
    id: 'pre-2',
    stroke: 'wave',
    strokes: [
      [
        { x: 60, y: 560 },
        { x: 140, y: 470 },
        { x: 215, y: 560 },
        { x: 290, y: 470 },
        { x: 370, y: 560 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 605 },
    goalArt: '/art/goal/pre-3.png',
    id: 'pre-3',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 640 },
        { x: 150, y: 545 },
        { x: 270, y: 520 },
        { x: 370, y: 605 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 490 },
    goalArt: '/art/goal/pre-4.png',
    id: 'pre-4',
    stroke: 'zigzag',
    strokes: [
      [
        { x: 60, y: 440 },
        { x: 130, y: 520 },
        { x: 200, y: 440 },
        { x: 270, y: 520 },
        { x: 340, y: 440 },
        { x: 370, y: 490 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 400 },
    goalArt: '/art/goal/pre-5.png',
    id: 'pre-5',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 400 },
        { x: 215, y: 400 },
        { x: 370, y: 400 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 520 },
    goalArt: '/art/goal/pre-6.png',
    id: 'pre-6',
    stroke: 'wave',
    strokes: [
      [
        { x: 60, y: 520 },
        { x: 140, y: 440 },
        { x: 215, y: 520 },
        { x: 290, y: 440 },
        { x: 370, y: 520 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 560 },
    goalArt: '/art/goal/pre-7.png',
    id: 'pre-7',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 600 },
        { x: 140, y: 500 },
        { x: 260, y: 470 },
        { x: 370, y: 560 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 470 },
    goalArt: '/art/goal/pre-8.png',
    id: 'pre-8',
    stroke: 'zigzag',
    strokes: [
      [
        { x: 60, y: 420 },
        { x: 130, y: 500 },
        { x: 200, y: 420 },
        { x: 270, y: 500 },
        { x: 340, y: 420 },
        { x: 370, y: 470 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 460 },
    goalArt: '/art/goal/pre-9.png',
    id: 'pre-9',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 460 },
        { x: 215, y: 460 },
        { x: 370, y: 460 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 580 },
    goalArt: '/art/goal/pre-10.png',
    id: 'pre-10',
    stroke: 'wave',
    strokes: [
      [
        { x: 60, y: 580 },
        { x: 140, y: 500 },
        { x: 215, y: 580 },
        { x: 290, y: 500 },
        { x: 370, y: 580 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 600 },
    goalArt: '/art/goal/pre-11.png',
    id: 'pre-11',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 640 },
        { x: 150, y: 540 },
        { x: 270, y: 515 },
        { x: 370, y: 600 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 450 },
    goalArt: '/art/goal/pre-12.png',
    id: 'pre-12',
    stroke: 'zigzag',
    strokes: [
      [
        { x: 60, y: 400 },
        { x: 125, y: 480 },
        { x: 190, y: 400 },
        { x: 255, y: 480 },
        { x: 320, y: 400 },
        { x: 370, y: 450 },
      ],
    ],
  },
];

/** The three bonus circles, unlocked one per completed block (4/8/12). */
export const PRE_BONUS_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 215, y: 280 },
    goalArt: '/art/goal/pre-bonus-1.png',
    id: 'pre-bonus-1',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 280 },
        { x: 115, y: 410 },
        { x: 215, y: 540 },
        { x: 315, y: 410 },
        { x: 215, y: 280 },
      ],
    ],
  },
  {
    goal: { x: 215, y: 300 },
    goalArt: '/art/goal/pre-bonus-2.png',
    id: 'pre-bonus-2',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 300 },
        { x: 115, y: 430 },
        { x: 215, y: 560 },
        { x: 315, y: 430 },
        { x: 215, y: 300 },
      ],
    ],
  },
  {
    goal: { x: 215, y: 320 },
    goalArt: '/art/goal/pre-bonus-3.png',
    id: 'pre-bonus-3',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 320 },
        { x: 125, y: 440 },
        { x: 215, y: 560 },
        { x: 305, y: 440 },
        { x: 215, y: 320 },
      ],
    ],
  },
];

/** The pre-writing pack: twelve slots, three circles unlocking at 4/8/12. */
export const PRE_PACK: PackEntry = createPackEntry({
  badgeId: 'pre-badge',
  bonusUnlocks: [4, 8, 12],
  bonuses: PRE_BONUS_LEVELS,
  id: 'pre',
  levels: PRE_LEVELS,
  menuFill: '#8ecae6',
});
