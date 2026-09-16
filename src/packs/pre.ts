// The pre-writing pack: the canonical 12-slot stroke curriculum plus three
// bonus circles, organized as a real small -> medium -> large ramp. Slots 1-4
// are small (span 140), 5-8 medium (span 230), 9-12 large (span 310); every
// block repeats line, wave, arc, zigzag. Bonus circles unlock at 4/8/12 and
// grow with their block. The exact geometry table lives in the track's
// content.md - keep the two in sync.
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';

/** The twelve main pre-writing slots in play order. */
export const PRE_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 285, y: 430 },
    goalArt: '/art/goal/pre-1.webp',
    id: 'pre-1',
    stroke: 'line',
    strokes: [
      [
        { x: 145, y: 430 },
        { x: 215, y: 430 },
        { x: 285, y: 430 },
      ],
    ],
  },
  {
    goal: { x: 285, y: 455 },
    goalArt: '/art/goal/pre-2.webp',
    id: 'pre-2',
    stroke: 'wave',
    strokes: [
      [
        { x: 145, y: 455 },
        { x: 180, y: 430 },
        { x: 215, y: 455 },
        { x: 250, y: 430 },
        { x: 285, y: 455 },
      ],
    ],
  },
  {
    goal: { x: 285, y: 460 },
    goalArt: '/art/goal/pre-3.webp',
    id: 'pre-3',
    stroke: 'arc',
    strokes: [
      [
        { x: 145, y: 460 },
        { x: 215, y: 390 },
        { x: 285, y: 460 },
      ],
    ],
  },
  {
    goal: { x: 285, y: 410 },
    goalArt: '/art/goal/pre-4.webp',
    id: 'pre-4',
    stroke: 'zigzag',
    strokes: [
      [
        { x: 145, y: 410 },
        { x: 180, y: 455 },
        { x: 215, y: 410 },
        { x: 250, y: 455 },
        { x: 285, y: 410 },
      ],
    ],
  },
  {
    goal: { x: 330, y: 460 },
    goalArt: '/art/goal/pre-5.webp',
    id: 'pre-5',
    stroke: 'line',
    strokes: [
      [
        { x: 100, y: 460 },
        { x: 215, y: 460 },
        { x: 330, y: 460 },
      ],
    ],
  },
  {
    goal: { x: 330, y: 515 },
    goalArt: '/art/goal/pre-6.webp',
    id: 'pre-6',
    stroke: 'wave',
    strokes: [
      [
        { x: 100, y: 515 },
        { x: 157, y: 460 },
        { x: 215, y: 515 },
        { x: 272, y: 460 },
        { x: 330, y: 515 },
      ],
    ],
  },
  {
    goal: { x: 330, y: 515 },
    goalArt: '/art/goal/pre-7.webp',
    id: 'pre-7',
    stroke: 'arc',
    strokes: [
      [
        { x: 100, y: 515 },
        { x: 215, y: 405 },
        { x: 330, y: 515 },
      ],
    ],
  },
  {
    goal: { x: 330, y: 435 },
    goalArt: '/art/goal/pre-8.webp',
    id: 'pre-8',
    stroke: 'zigzag',
    strokes: [
      [
        { x: 100, y: 435 },
        { x: 138, y: 485 },
        { x: 177, y: 435 },
        { x: 215, y: 485 },
        { x: 253, y: 435 },
        { x: 292, y: 485 },
        { x: 330, y: 435 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 560 },
    goalArt: '/art/goal/pre-9.webp',
    id: 'pre-9',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 560 },
        { x: 215, y: 560 },
        { x: 370, y: 560 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 560 },
    goalArt: '/art/goal/pre-10.webp',
    id: 'pre-10',
    stroke: 'wave',
    strokes: [
      [
        { x: 60, y: 560 },
        { x: 137, y: 475 },
        { x: 215, y: 560 },
        { x: 292, y: 475 },
        { x: 370, y: 560 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 605 },
    goalArt: '/art/goal/pre-11.webp',
    id: 'pre-11',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 605 },
        { x: 215, y: 445 },
        { x: 370, y: 605 },
      ],
    ],
  },
  {
    goal: { x: 370, y: 430 },
    goalArt: '/art/goal/pre-12.webp',
    id: 'pre-12',
    stroke: 'zigzag',
    strokes: [
      [
        { x: 60, y: 430 },
        { x: 99, y: 485 },
        { x: 138, y: 430 },
        { x: 176, y: 485 },
        { x: 215, y: 430 },
        { x: 254, y: 485 },
        { x: 293, y: 430 },
        { x: 331, y: 485 },
        { x: 370, y: 430 },
      ],
    ],
  },
];

/** The three bonus circles, unlocked one per completed block (4/8/12). */
export const PRE_BONUS_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 215, y: 355 },
    goalArt: '/art/goal/pre-bonus-1.webp',
    id: 'pre-bonus-1',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 355 },
        { x: 140, y: 430 },
        { x: 215, y: 505 },
        { x: 290, y: 430 },
        { x: 215, y: 355 },
      ],
    ],
  },
  {
    goal: { x: 215, y: 360 },
    goalArt: '/art/goal/pre-bonus-2.webp',
    id: 'pre-bonus-2',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 360 },
        { x: 115, y: 460 },
        { x: 215, y: 560 },
        { x: 315, y: 460 },
        { x: 215, y: 360 },
      ],
    ],
  },
  {
    goal: { x: 215, y: 300 },
    goalArt: '/art/goal/pre-bonus-3.webp',
    id: 'pre-bonus-3',
    stroke: 'circle',
    strokes: [
      [
        { x: 215, y: 300 },
        { x: 85, y: 430 },
        { x: 215, y: 560 },
        { x: 345, y: 430 },
        { x: 215, y: 300 },
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
