import type { LevelDef, ThemeDef } from './level';

export const ANIMALS_THEME: ThemeDef = {
  character: 'lion',
  id: 'animals',
  name: 'Animal Friends',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag -> bonus circle.
export const ANIMAL_LEVELS: readonly LevelDef[] = [
  {
    controlPoints: [
      { x: 60, y: 460 },
      { x: 215, y: 460 },
      { x: 370, y: 460 },
    ],
    goal: { x: 370, y: 460 },
    id: 'animals-1',
    stroke: 'line',
    theme: 'animals',
  },
  {
    controlPoints: [
      { x: 60, y: 580 },
      { x: 140, y: 500 },
      { x: 215, y: 580 },
      { x: 290, y: 500 },
      { x: 370, y: 580 },
    ],
    goal: { x: 370, y: 580 },
    id: 'animals-2',
    stroke: 'wave',
    theme: 'animals',
  },
  {
    controlPoints: [
      { x: 60, y: 640 },
      { x: 150, y: 540 },
      { x: 270, y: 515 },
      { x: 370, y: 600 },
    ],
    goal: { x: 370, y: 600 },
    id: 'animals-3',
    stroke: 'arc',
    theme: 'animals',
  },
  {
    controlPoints: [
      { x: 60, y: 400 },
      { x: 125, y: 480 },
      { x: 190, y: 400 },
      { x: 255, y: 480 },
      { x: 320, y: 400 },
      { x: 370, y: 450 },
    ],
    goal: { x: 370, y: 450 },
    id: 'animals-4',
    stroke: 'zigzag',
    theme: 'animals',
  },
  {
    controlPoints: [
      { x: 215, y: 320 },
      { x: 125, y: 440 },
      { x: 215, y: 560 },
      { x: 305, y: 440 },
      { x: 215, y: 320 },
    ],
    goal: { x: 215, y: 320 },
    id: 'animals-bonus',
    stroke: 'circle',
    theme: 'animals',
  },
];
