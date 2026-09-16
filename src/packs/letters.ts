// Letters: the alphabet pack — 26 uppercase levels traced in alphabet-song
// order plus three sequence bonuses (ABC / MOM / ZOO) unlocking at 9/18/26
// cleared. PROVISIONAL SKELETON GEOMETRY for Phase 1 of track
// letters-pack_20260916: rough blocky letterforms that unblock navigation,
// gating, and screens. The final school-style glyphs are authored in Phase 2
// and the geometry table then lives in the track's content.md — keep the two
// in sync.
import type { Point, StrokePattern } from '../engine/types';
import type { LevelDef } from './level';
import { createPackEntry, type PackEntry } from './pack';

/** Compact point helper for the provisional geometry tables. */
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
    [p(140, 660), p(215, 290)],
    [p(215, 290), p(290, 660)],
    [p(170, 530), p(260, 530)],
  ]),
  letterLevel('abc-b', 'line', [
    [p(150, 280), p(150, 660)],
    [p(150, 280), p(255, 300), p(275, 370), p(255, 440), p(150, 455)],
    [p(150, 455), p(265, 480), p(285, 550), p(255, 620), p(150, 660)],
  ]),
  letterLevel('abc-c', 'arc', [
    [
      p(285, 330),
      p(245, 292),
      p(190, 290),
      p(150, 330),
      p(140, 470),
      p(150, 590),
      p(195, 645),
      p(255, 652),
      p(287, 625),
    ],
  ]),
  letterLevel('abc-d', 'line', [
    [p(150, 280), p(150, 660)],
    [p(150, 280), p(250, 300), p(280, 400), p(280, 540), p(250, 635), p(150, 660)],
  ]),
  letterLevel('abc-e', 'line', [
    [p(150, 280), p(150, 660)],
    [p(150, 280), p(290, 280)],
    [p(150, 470), p(265, 470)],
    [p(150, 660), p(290, 660)],
  ]),
  letterLevel('abc-f', 'line', [
    [p(160, 280), p(160, 660)],
    [p(160, 280), p(290, 280)],
    [p(160, 465), p(265, 465)],
  ]),
  letterLevel('abc-g', 'arc', [
    [
      p(285, 330),
      p(245, 292),
      p(190, 290),
      p(150, 330),
      p(140, 470),
      p(152, 590),
      p(200, 645),
      p(258, 650),
      p(285, 620),
      p(285, 540),
      p(225, 540),
    ],
  ]),
  letterLevel('abc-h', 'line', [
    [p(150, 280), p(150, 660)],
    [p(290, 280), p(290, 660)],
    [p(150, 470), p(290, 470)],
  ]),
  letterLevel('abc-i', 'line', [
    [p(150, 280), p(290, 280)],
    [p(215, 280), p(215, 660)],
    [p(150, 660), p(290, 660)],
  ]),
  letterLevel('abc-j', 'arc', [
    [p(240, 280), p(240, 565), p(215, 635), p(160, 645), p(140, 595)],
    [p(170, 280), p(285, 280)],
  ]),
  letterLevel('abc-k', 'line', [
    [p(150, 280), p(150, 660)],
    [p(285, 280), p(150, 470)],
    [p(150, 470), p(290, 660)],
  ]),
  letterLevel('abc-l', 'line', [
    [p(150, 280), p(150, 660)],
    [p(150, 660), p(290, 660)],
  ]),
  letterLevel('abc-m', 'line', [[p(140, 660), p(140, 280), p(215, 470), p(290, 280), p(290, 660)]]),
  letterLevel('abc-n', 'line', [[p(150, 660), p(150, 290), p(285, 660), p(285, 290)]]),
  letterLevel('abc-o', 'circle', [
    [
      p(215, 280),
      p(163, 302),
      p(142, 380),
      p(140, 470),
      p(148, 560),
      p(178, 632),
      p(215, 660),
      p(252, 632),
      p(282, 560),
      p(290, 470),
      p(288, 380),
      p(267, 302),
      p(215, 280),
    ],
  ]),
  letterLevel('abc-p', 'line', [
    [p(150, 280), p(150, 660)],
    [p(150, 280), p(255, 300), p(282, 365), p(252, 435), p(150, 455)],
  ]),
  letterLevel('abc-q', 'circle', [
    [
      p(215, 280),
      p(163, 302),
      p(142, 380),
      p(140, 470),
      p(148, 560),
      p(178, 632),
      p(215, 660),
      p(252, 632),
      p(282, 560),
      p(290, 470),
      p(288, 380),
      p(267, 302),
      p(215, 280),
    ],
    [p(268, 575), p(300, 645)],
  ]),
  letterLevel('abc-r', 'line', [
    [p(150, 280), p(150, 660)],
    [p(150, 280), p(255, 300), p(272, 370), p(240, 425), p(150, 445)],
    [p(150, 445), p(290, 660)],
  ]),
  letterLevel('abc-s', 'arc', [
    [
      p(282, 322),
      p(240, 287),
      p(185, 292),
      p(152, 332),
      p(158, 405),
      p(215, 458),
      p(268, 505),
      p(282, 565),
      p(252, 628),
      p(198, 652),
      p(150, 630),
    ],
  ]),
  letterLevel('abc-t', 'line', [
    [p(140, 280), p(290, 280)],
    [p(215, 280), p(215, 660)],
  ]),
  letterLevel('abc-u', 'arc', [
    [p(150, 280), p(150, 555), p(175, 630), p(228, 652), p(270, 620), p(288, 550), p(288, 280)],
  ]),
  letterLevel('abc-v', 'line', [[p(140, 280), p(215, 660), p(290, 280)]]),
  letterLevel('abc-w', 'line', [[p(130, 280), p(170, 660), p(215, 470), p(260, 660), p(300, 280)]]),
  letterLevel('abc-x', 'line', [
    [p(140, 280), p(290, 660)],
    [p(290, 280), p(140, 660)],
  ]),
  letterLevel('abc-y', 'line', [
    [p(140, 280), p(215, 465)],
    [p(290, 280), p(215, 465)],
    [p(215, 465), p(215, 660)],
  ]),
  letterLevel('abc-z', 'line', [[p(140, 280), p(290, 280), p(140, 660), p(290, 660)]]),
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
