# Spec: Pack pipeline completion — Numbers & Letters as validated JSON data

**Track ID:** `pack-pipeline-2_20260917`
**Type:** Refactor
**Branch:** `track/pack-pipeline-2`
**Created:** 2026-09-17

## Overview

The declarative pack pipeline (track `pack-pipeline_20260917`) made pack content data-first: one JSON file per pack in `src/packs/data/`, one strict shared parser (`parsePackJson`), the `pnpm pack:check` CLI validator, and a dev preview harness — proven by porting Pre-writing (`pre.json`) byte-for-byte. That track explicitly deferred Numbers and Letters to "follow-up tracks on the same pipeline."

This track completes the deferral: **Numbers (10 numerals) and Letters (26 uppercase + 3 sequence bonuses) become validated JSON data** with byte-identical geometry and zero child-visible change. My Name remains runtime-composed from letter glyph geometry by design (generated per save, not static content). After this track, every static pack ships as data — adding content is authoring + `pnpm pack:check`, not code.

## Locked design decisions

- **File name equals pack id** (`pre.json` precedent): `numbers.json` (`id: "numbers"`), `abc.json` (`id: "abc"`) — keeps `?pack=<id>` preview selection working.
- **Byte parity is the hard constraint:** no geometry, id, goalArt, stroke, order, badge, menuFill, or unlock changes. If a coordinate would move, it does not move in this track.
- **Letters JSON carries explicit `goal` + `goalArt`** per level, expanded exactly as the current `letterLevel` helper derives them (goal = last control point of the last stroke; goalArt = `/art/goal/<id>.webp`).
- **My Name stays code:** `letterGlyph()` keeps deriving from `LETTER_LEVELS`; the composed name level must remain byte-identical (existing tests cover it).
- **No tooling changes planned:** `pack:check` and the preview harness already scan `src/packs/data/*.json`. Minimal fixes only if verification finds a real gap.
- **Working agreement:** all work stays local on `track/pack-pipeline-2`; no push/PR/release — merge and release decisions stay with the owner.

## Functional Requirements

### FR1 — Numbers pack as JSON
- `src/packs/data/numbers.json` becomes the source of truth for the numbers pack: `id: "numbers"`, `badgeId: "numbers-badge"`, `menuFill: "#f3c969"`, no bonuses, 10 levels `num-0`…`num-9`.
- `src/packs/numbers.ts` becomes a thin loader over `parsePackJson` (Pre-writing pattern), preserving exports `NUMERAL_LEVELS` / `NUMBERS_PACK`.
- Geometry (control points, goals, goalArt, stroke patterns) byte-identical to the current TypeScript authoring.

### FR2 — Letters pack as JSON
- `src/packs/data/abc.json`: `id: "abc"`, `badgeId: "abc-badge"`, `menuFill: "#90be6d"`, `bonusUnlocks: [9, 18, 26]`, 26 main levels `abc-a`…`abc-z` + 3 sequence bonuses `abc-bonus-1..3`.
- `src/packs/letters.ts` becomes a thin loader preserving `LETTER_LEVELS`, `LETTER_BONUS_LEVELS`, `LETTERS_PACK`; helper exports `letterLevel`, `letterGlyph`, `bonusRunLevel` keep their current behavior and source from the JSON-derived levels.
- Every derived `goal`/`goalArt` matches the current helper output exactly (explicit in JSON; asserted by parity test).

### FR3 — Frozen parity fixtures + tests
- Before any port edit, pre-port snapshots of the current TypeScript exports are captured and committed as fixtures (`src/packs/fixtures/numbers-parity.json`, `src/packs/fixtures/letters-parity.json`), with the capture source commit recorded in the git note.
- New `numbers-parity.test.ts` and `letters-parity.test.ts` (mirroring `pre-parity.test.ts`) assert: deep byte-equality of every level (id, goal, goalArt, stroke, control points, order) against the frozen fixtures; pack identity/unlock rules; and labeled load-time errors when the JSON is malformed (module-mock fixture).
- All existing tests pass unmodified — any needed change to an unrelated test is a defect, not a task.

### FR4 — Tooling coverage (verify, don't rebuild)
- `pnpm pack:check` validates all three packs; failures are per-file/per-level labeled.
- Dev preview harness renders `?pack=numbers` and `?pack=abc` levels at 430×860 with correct markers.

### FR5 — Documentation resync
- `src/packs/data/README.md`: production pack list updated (pre/numbers/abc; Name explained as runtime-composed).
- `conductor/tech-stack.md`: dated note — all static packs are declarative JSON; file-name-equals-id convention; Name boundary; bundle impact recorded.
- `conductor/product.md`: dated note — content authoring is pipeline work for every static pack (Name still composed).
- `dev/README.md`: preview-harness runbook notes the available packs.

### FR6 — QA + acceptance evidence
- Canonical QA sweeps green against a fresh build: `qa-app`, `qa-numerals`, `qa-pack-app`, `qa-letters-sweep`, `qa-pack-preview --all`, `qa-offline` spot; screenshots for both packs reviewed.
- `pnpm build` + `pnpm budget` green; dist + precache entries/size deltas vs the pre-track master recorded in plan + git note.

## Non-Functional Requirements

- Zero gameplay/visual regression; no consumer module edits expected (imports unchanged by design).
- >80% coverage on new code; `CI=true pnpm check`, `CI=true pnpm test`, `pnpm pack:check` green.
- No new runtime dependency; JSON bundled at build time (never fetched); offline behavior and precache unchanged beyond the content delta.
- No device pass required (child-invisible refactor; evidence is automated + QA sweeps). Owner may request one before closing.

## Acceptance Criteria

1. `CI=true pnpm check && CI=true pnpm test && pnpm pack:check && pnpm build && pnpm budget` all green; no pre-existing test modified.
2. All 10 numeral levels byte-identical to the frozen pre-port fixture. (FR1, FR3)
3. All 29 letter levels (26 + 3 bonuses) byte-identical to the frozen pre-port fixture, including derived goals/goalArts. (FR2, FR3)
4. Pack identities equal: numbers {`numbers` / `numbers-badge` / `#f3c969`, no bonuses}; abc {`abc` / `abc-badge` / `#90be6d`, unlocks [9,18,26]}. (FR1, FR2)
5. Malformed `numbers.json` / `abc.json` fixtures throw labeled load-time errors (tests). (FR3)
6. `pnpm pack:check` passes over the 3-pack directory; preview harness full sweeps for numbers + abc render correctly. (FR4)
7. QA sweeps + screenshots green; My Name flow (existing tests + `qa-name` spot) unchanged. (FR6)
8. Dist/precache delta recorded; docs notes present (data README, tech-stack, product, dev README). (FR5, FR6)

## Out of Scope

- Porting the My Name mini-pack (runtime-composed by design; `letterGlyph` chain must stay byte-identical).
- Any content/geometry/style "improvement" — parity forbids it.
- New packs; save-schema changes; trail engine/presentation changes.
- New tooling features (validator/harness are already generic; only minimal fixes if verification finds a real gap).
- Owner device pass and push/PR/release decisions (the owner's, kept out of the track).
