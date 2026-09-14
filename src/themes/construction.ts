import type { LevelDef, ThemeDef } from './level';

export const CONSTRUCTION_THEME: ThemeDef = {
  character: 'excavator',
  id: 'construction',
  name: 'Construction Site',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag -> bonus circle.
export const CONSTRUCTION_LEVELS: readonly LevelDef[] = [
  {
    controlPoints: [
      { x: 60, y: 400 },
      { x: 215, y: 400 },
      { x: 370, y: 400 },
    ],
    goal: { x: 370, y: 400 },
    id: 'construction-1',
    stroke: 'line',
    theme: 'construction',
  },
  {
    controlPoints: [
      { x: 60, y: 520 },
      { x: 140, y: 440 },
      { x: 215, y: 520 },
      { x: 290, y: 440 },
      { x: 370, y: 520 },
    ],
    goal: { x: 370, y: 520 },
    id: 'construction-2',
    stroke: 'wave',
    theme: 'construction',
  },
  {
    controlPoints: [
      { x: 60, y: 600 },
      { x: 140, y: 500 },
      { x: 260, y: 470 },
      { x: 370, y: 560 },
    ],
    goal: { x: 370, y: 560 },
    id: 'construction-3',
    stroke: 'arc',
    theme: 'construction',
  },
  {
    controlPoints: [
      { x: 60, y: 420 },
      { x: 130, y: 500 },
      { x: 200, y: 420 },
      { x: 270, y: 500 },
      { x: 340, y: 420 },
      { x: 370, y: 470 },
    ],
    goal: { x: 370, y: 470 },
    id: 'construction-4',
    stroke: 'zigzag',
    theme: 'construction',
  },
  {
    controlPoints: [
      { x: 215, y: 300 },
      { x: 115, y: 430 },
      { x: 215, y: 560 },
      { x: 315, y: 430 },
      { x: 215, y: 300 },
    ],
    goal: { x: 215, y: 300 },
    id: 'construction-bonus',
    stroke: 'circle',
    theme: 'construction',
  },
];
