// Letters: the alphabet pack — 26 uppercase levels traced in alphabet-song
// order plus three sequence bonuses (ABC / MOM / ZOO) unlocking at 9/18/26
// cleared. Final school-style glyph geometry (track letters-pack_20260916,
// Phase 2): coordinates follow the formation table in the track's
// content.md — keep the two in sync.
import type { Point, StrokePattern } from '../engine/types';
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';

/** Compact point helper for the geometry tables. */
function p(x: number, y: number): Point {
  return { x, y };
}

/** Builds a level whose goal is the final control point of its last stroke. */
function letterLevel(
  id: string,
  stroke: StrokePattern,
  strokes: readonly (readonly Point[])[],
): LevelDef {
  const lastStroke = strokes[strokes.length - 1];
  const goal = lastStroke ? lastStroke[lastStroke.length - 1] : undefined;
  if (!goal) {
    throw new Error(`letter level ${id} needs at least one control point`);
  }
  return { goal, goalArt: `/art/goal/${id}.png`, id, stroke, strokes };
}

/** The twenty-six uppercase letters in play order (A → Z). */
export const LETTER_LEVELS: readonly LevelDef[] = [
  letterLevel('abc-a', 'line', [
    [p(215, 300), p(150, 640)],
    [p(215, 300), p(280, 640)],
    [p(168, 545), p(262, 545)],
  ]),
  letterLevel('abc-b', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 300), p(230, 310), p(252, 380), p(230, 450), p(165, 470)],
    [p(165, 470), p(235, 480), p(257, 555), p(232, 625), p(165, 640)],
  ]),
  letterLevel('abc-c', 'arc', [
    [p(258, 330), p(212, 300), p(168, 340), p(160, 470), p(170, 580), p(215, 640), p(262, 620)],
  ]),
  letterLevel('abc-d', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 300), p(240, 315), p(268, 420), p(268, 520), p(240, 625), p(165, 640)],
  ]),
  letterLevel('abc-e', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 300), p(280, 300)],
    [p(165, 468), p(252, 468)],
    [p(165, 640), p(280, 640)],
  ]),
  letterLevel('abc-f', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 300), p(280, 300)],
    [p(165, 468), p(250, 468)],
  ]),
  letterLevel('abc-g', 'arc', [
    [
      p(258, 330),
      p(212, 300),
      p(168, 340),
      p(160, 470),
      p(170, 580),
      p(215, 640),
      p(260, 615),
      p(262, 540),
      p(218, 540),
    ],
  ]),
  letterLevel('abc-h', 'line', [
    [p(165, 300), p(165, 640)],
    [p(265, 300), p(265, 640)],
    [p(165, 468), p(265, 468)],
  ]),
  letterLevel('abc-i', 'line', [
    [p(175, 300), p(255, 300)],
    [p(215, 300), p(215, 640)],
    [p(175, 640), p(255, 640)],
  ]),
  letterLevel('abc-j', 'arc', [
    [p(215, 300), p(215, 540), p(202, 610), p(170, 630), p(152, 596)],
    [p(180, 300), p(250, 300)],
  ]),
  letterLevel('abc-k', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 470), p(255, 300)],
    [p(165, 470), p(262, 640)],
  ]),
  letterLevel('abc-l', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 640), p(280, 640)],
  ]),
  letterLevel('abc-m', 'line', [[p(150, 300), p(150, 640), p(215, 300), p(280, 640), p(280, 300)]]),
  letterLevel('abc-n', 'line', [[p(150, 300), p(150, 640), p(280, 300), p(280, 640)]]),
  letterLevel('abc-o', 'circle', [
    [
      p(215, 300),
      p(163, 320),
      p(148, 400),
      p(146, 470),
      p(152, 545),
      p(178, 610),
      p(215, 635),
      p(252, 610),
      p(278, 545),
      p(284, 470),
      p(282, 400),
      p(267, 320),
      p(215, 300),
    ],
  ]),
  letterLevel('abc-p', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 300), p(240, 312), p(258, 380), p(238, 440), p(165, 468)],
  ]),
  letterLevel('abc-q', 'circle', [
    [
      p(215, 300),
      p(163, 320),
      p(148, 400),
      p(146, 470),
      p(152, 545),
      p(178, 610),
      p(215, 635),
      p(252, 610),
      p(278, 545),
      p(284, 470),
      p(282, 400),
      p(267, 320),
      p(215, 300),
    ],
    [p(252, 610), p(288, 650)],
  ]),
  letterLevel('abc-r', 'line', [
    [p(165, 300), p(165, 640)],
    [p(165, 300), p(240, 312), p(258, 380), p(238, 440), p(165, 468)],
    [p(165, 468), p(268, 640)],
  ]),
  letterLevel('abc-s', 'arc', [
    [
      p(255, 335),
      p(210, 302),
      p(170, 330),
      p(162, 395),
      p(200, 460),
      p(252, 505),
      p(262, 570),
      p(230, 625),
      p(185, 640),
      p(152, 610),
    ],
  ]),
  letterLevel('abc-t', 'line', [
    [p(150, 300), p(280, 300)],
    [p(215, 300), p(215, 640)],
  ]),
  letterLevel('abc-u', 'arc', [
    [p(165, 300), p(165, 540), p(185, 615), p(230, 640), p(262, 610), p(272, 540), p(272, 300)],
  ]),
  letterLevel('abc-v', 'line', [[p(150, 300), p(215, 640), p(280, 300)]]),
  letterLevel('abc-w', 'line', [[p(140, 300), p(172, 640), p(215, 470), p(258, 640), p(290, 300)]]),
  letterLevel('abc-x', 'line', [
    [p(150, 300), p(280, 640)],
    [p(280, 300), p(150, 640)],
  ]),
  letterLevel('abc-y', 'line', [
    [p(150, 300), p(215, 468)],
    [p(280, 300), p(215, 468)],
    [p(215, 468), p(215, 640)],
  ]),
  letterLevel('abc-z', 'line', [[p(150, 300), p(280, 300), p(150, 640), p(280, 640)]]),
];

/** The three sequence bonuses — ABC / MOM / ZOO — unlocking at 9/18/26. */
export const LETTER_BONUS_LEVELS: readonly LevelDef[] = [
  letterLevel('abc-bonus-1', 'line', [
    // A
    [p(55, 620), p(95, 380), p(135, 620)],
    // B
    [p(175, 380), p(175, 620)],
    [p(175, 380), p(245, 410), p(250, 480), p(175, 510), p(255, 545), p(255, 600), p(175, 620)],
    // C
    [
      p(340, 410),
      p(315, 385),
      p(290, 390),
      p(275, 450),
      p(275, 560),
      p(295, 610),
      p(330, 615),
      p(345, 590),
    ],
  ]),
  letterLevel('abc-bonus-2', 'line', [
    // M
    [p(60, 620), p(60, 380), p(95, 480), p(130, 380), p(130, 620)],
    // O
    [
      p(215, 380),
      p(180, 400),
      p(165, 470),
      p(170, 540),
      p(195, 605),
      p(215, 620),
      p(235, 605),
      p(260, 540),
      p(265, 470),
      p(250, 400),
      p(215, 380),
    ],
    // M
    [p(300, 620), p(300, 380), p(335, 480), p(370, 380), p(370, 620)],
  ]),
  letterLevel('abc-bonus-3', 'line', [
    // Z
    [p(55, 380), p(135, 380), p(55, 620), p(135, 620)],
    // O
    [
      p(215, 380),
      p(180, 400),
      p(165, 470),
      p(170, 540),
      p(195, 605),
      p(215, 620),
      p(235, 605),
      p(260, 540),
      p(265, 470),
      p(250, 400),
      p(215, 380),
    ],
    // O
    [
      p(335, 380),
      p(300, 400),
      p(285, 470),
      p(290, 540),
      p(315, 605),
      p(335, 620),
      p(355, 605),
      p(380, 540),
      p(385, 470),
      p(370, 400),
      p(335, 380),
    ],
  ]),
];

/** The letters pack: twenty-six uppercase letters plus three sequence bonuses. */
export const LETTERS_PACK: PackEntry = createPackEntry({
  badgeId: 'abc-badge',
  bonusUnlocks: [9, 18, 26],
  bonuses: LETTER_BONUS_LEVELS,
  id: 'abc',
  levels: LETTER_LEVELS,
  menuFill: '#90be6d',
});
