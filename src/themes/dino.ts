import type { LevelDef, ThemeDef } from './level';

export const DINO_THEME: ThemeDef = {
  backdrop: '/art/bg/dino.jpg',
  character: 'dino',
  id: 'dino',
  name: 'Dinosaur Trail',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag -> bonus circle.
export const DINO_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 370, y: 430 },
    goalArt: '/art/goal/dino-1.png',
    id: 'dino-1',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 430 },
        { x: 215, y: 428 },
        { x: 370, y: 430 },
      ],
    ],
    theme: 'dino',
  },
  {
    goal: { x: 370, y: 560 },
    goalArt: '/art/goal/dino-2.png',
    id: 'dino-2',
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
    theme: 'dino',
  },
  {
    goal: { x: 370, y: 605 },
    goalArt: '/art/goal/dino-3.png',
    id: 'dino-3',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 640 },
        { x: 150, y: 545 },
        { x: 270, y: 520 },
        { x: 370, y: 605 },
      ],
    ],
    theme: 'dino',
  },
  {
    goal: { x: 370, y: 490 },
    goalArt: '/art/goal/dino-4.png',
    id: 'dino-4',
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
    theme: 'dino',
  },
  {
    goal: { x: 215, y: 280 },
    goalArt: '/art/goal/dino-bonus.png',
    id: 'dino-bonus',
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
    theme: 'dino',
  },
];
