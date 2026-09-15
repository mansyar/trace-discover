import type { LevelDef, ThemeDef } from './level';

export const CONSTRUCTION_THEME: ThemeDef = {
  backdrop: '/art/bg/construction.jpg',
  character: 'excavator',
  id: 'construction',
  name: 'Construction Site',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag -> bonus circle.
export const CONSTRUCTION_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 370, y: 400 },
    goalArt: '/art/goal/construction-1.png',
    id: 'construction-1',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 400 },
        { x: 215, y: 400 },
        { x: 370, y: 400 },
      ],
    ],
    theme: 'construction',
  },
  {
    goal: { x: 370, y: 520 },
    goalArt: '/art/goal/construction-2.png',
    id: 'construction-2',
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
    theme: 'construction',
  },
  {
    goal: { x: 370, y: 560 },
    goalArt: '/art/goal/construction-3.png',
    id: 'construction-3',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 600 },
        { x: 140, y: 500 },
        { x: 260, y: 470 },
        { x: 370, y: 560 },
      ],
    ],
    theme: 'construction',
  },
  {
    goal: { x: 370, y: 470 },
    goalArt: '/art/goal/construction-4.png',
    id: 'construction-4',
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
    theme: 'construction',
  },
  {
    goal: { x: 215, y: 300 },
    goalArt: '/art/goal/construction-bonus.png',
    id: 'construction-bonus',
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
    theme: 'construction',
  },
];
