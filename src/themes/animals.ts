import type { LevelDef, ThemeDef } from './level';

export const ANIMALS_THEME: ThemeDef = {
  backdrop: '/art/bg/animals.jpg',
  character: 'lion',
  id: 'animals',
  name: 'Animal Friends',
};

// Stroke curriculum ramp: L1 line -> L2 wave -> L3 arc -> L4 zigzag -> bonus circle.
export const ANIMAL_LEVELS: readonly LevelDef[] = [
  {
    goal: { x: 370, y: 460 },
    goalArt: '/art/goal/animals-1.png',
    id: 'animals-1',
    stroke: 'line',
    strokes: [
      [
        { x: 60, y: 460 },
        { x: 215, y: 460 },
        { x: 370, y: 460 },
      ],
    ],
    theme: 'animals',
  },
  {
    goal: { x: 370, y: 580 },
    goalArt: '/art/goal/animals-2.png',
    id: 'animals-2',
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
    theme: 'animals',
  },
  {
    goal: { x: 370, y: 600 },
    goalArt: '/art/goal/animals-3.png',
    id: 'animals-3',
    stroke: 'arc',
    strokes: [
      [
        { x: 60, y: 640 },
        { x: 150, y: 540 },
        { x: 270, y: 515 },
        { x: 370, y: 600 },
      ],
    ],
    theme: 'animals',
  },
  {
    goal: { x: 370, y: 450 },
    goalArt: '/art/goal/animals-4.png',
    id: 'animals-4',
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
    theme: 'animals',
  },
  {
    goal: { x: 215, y: 320 },
    goalArt: '/art/goal/animals-bonus.png',
    id: 'animals-bonus',
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
    theme: 'animals',
  },
];
