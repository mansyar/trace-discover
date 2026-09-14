import type { LevelDef, ThemeDef } from './level';

export const DINO_THEME: ThemeDef = {
  character: 'dino',
  id: 'dino',
  name: 'Dinosaur Trail',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag -> bonus circle.
export const DINO_LEVELS: readonly LevelDef[] = [
  {
    controlPoints: [
      { x: 60, y: 430 },
      { x: 215, y: 428 },
      { x: 370, y: 430 },
    ],
    goal: { x: 370, y: 430 },
    id: 'dino-1',
    stroke: 'line',
    theme: 'dino',
  },
  {
    controlPoints: [
      { x: 60, y: 560 },
      { x: 140, y: 470 },
      { x: 215, y: 560 },
      { x: 290, y: 470 },
      { x: 370, y: 560 },
    ],
    goal: { x: 370, y: 560 },
    id: 'dino-2',
    stroke: 'wave',
    theme: 'dino',
  },
  {
    controlPoints: [
      { x: 60, y: 640 },
      { x: 150, y: 545 },
      { x: 270, y: 520 },
      { x: 370, y: 605 },
    ],
    goal: { x: 370, y: 605 },
    id: 'dino-3',
    stroke: 'arc',
    theme: 'dino',
  },
  {
    controlPoints: [
      { x: 60, y: 440 },
      { x: 130, y: 520 },
      { x: 200, y: 440 },
      { x: 270, y: 520 },
      { x: 340, y: 440 },
      { x: 370, y: 490 },
    ],
    goal: { x: 370, y: 490 },
    id: 'dino-4',
    stroke: 'zigzag',
    theme: 'dino',
  },
  {
    controlPoints: [
      { x: 215, y: 280 },
      { x: 115, y: 410 },
      { x: 215, y: 540 },
      { x: 315, y: 410 },
      { x: 215, y: 280 },
    ],
    goal: { x: 215, y: 280 },
    id: 'dino-bonus',
    stroke: 'circle',
    theme: 'dino',
  },
];
