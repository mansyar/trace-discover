import type { LevelDef, ThemeDef } from './level';

export const DINO_THEME: ThemeDef = {
  character: 'dino',
  id: 'dino',
  name: 'Dinosaur Trail',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag (L3/L4 arrive in Phase 5).
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
];
