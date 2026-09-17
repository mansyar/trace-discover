# Spec: Declarative pack pipeline — validated JSON level data + authoring tooling

## Overview

Pack content is currently hand-authored TypeScript (`src/packs/pre.ts`, `numbers.ts`,
`letters.ts`). Adding or editing content means editing code. This track makes the content
declaration data-first: **one JSON format per pack, one shared strict parser used at both
author-time and load-time, a CLI validator, and a dev harness for visual iteration** —
proven by porting the Pre-writing pack byte-for-byte with zero gameplay change.

This is a Refactor track with a thin tooling (CLI) feature component.

## Functional Requirements

### FR1 — Declarative pack format
- A pack is one JSON file: `{ id, badgeId, menuFill, levels[], bonuses[], bonusUnlocks[] }`.
- A level is one JSON object: `{ id, goal: {x, y}, goalArt, stroke, strokes: [[{x,y}, ...], ...] }`.
- `stroke` is one of the `StrokePattern` values: `'line' | 'wave' | 'arc' | 'zigzag' | 'circle'`.
- Unlock rule detail (refined during Phase 1 self-check): the final `bonusUnlocks`
  threshold must equal the number of main levels (all bonuses unlock by pack completion).
- The schema is documented with a fully worked example in `src/packs/data/README.md`.
- Coordinates are authored in the 430×860 portrait field space (levels are
  orientation-agnostic; the runtime reflows as today).

### FR2 — Strict shared parser (`src/packs/json.ts`)
- Exposes `parsePackJson(raw: unknown): PackEntry`.
- Since JSON carries no types, the parser shape-checks fields before narrowing; it must
  **reject unknown keys** (catches typos like `goals` for `goal`), invalid `stroke`
  values, and missing/empty ids.
- Geometry checks reuse `validateLevel` (margin 24, ≥2 control points per stroke,
  finite coordinates, no duplicate consecutive control points, goal + art present).
- Pack rules reuse `createPackEntry` (non-empty levels, one unlock threshold per bonus).
- `goalArt` must be a safe bundle path referencing `public/art/goal/` (no traversal).
- Returns human-readable problems; at load time it throws a clear, labeled error.

### FR3 — Pre-writing pack ported to JSON
- `src/packs/data/pre.json` becomes the source of truth for the pack definition
  (levels + 3 bonus circles + badge + menu fill).
- `src/packs/pre.ts` becomes a thin loader over the parser (keeps `PRE_PACK`,
  `PRE_LEVELS` export names and shapes).
- Geometry must be **byte-identical** to the current TypeScript authoring — enforced by a
  parity test against the known coordinate table.
- `tsconfig.json` gains `resolveJsonModule` (with `moduleResolution: bundler`).
- No other pack is ported in this track (Numbers, Letters, Name stay as-is).

### FR4 — Dev CLI validator
- `dev/tools/pack-validate.mjs`: validates every `src/packs/data/*.json`, prints
  per-file/per-level problems, exits non-zero on any problem.
- Wired as `pnpm pack:check` and invoked by CI alongside the existing checks.

### FR5 — Visual authoring harness
- The `dev/` harness gains a pack preview that renders a chosen JSON pack's level with
  field coordinates, margin gutters, and start/goal markers, for quick iteration on
  new level data without touching the app.
- A runbook entry in `dev/README.md` documents how to use it.

### FR6 — Documentation & project notes
- Dated notes in `tech-stack.md` (new authoring pattern + tooling) and `product.md`
  (content is now pipeline work, not code).
- `dev/README.md` runbook entry.

## Non-Functional Requirements

- Zero gameplay or visual regression: all existing tests stay green; pre-pack QA
  harness flows behave identically.
- No new runtime dependency; no network; offline-first behavior unaffected
  (JSON is bundled at build time).
- New code coverage >80%; `pnpm check`, `pnpm test`, and `pnpm budget` stay green.

## Acceptance Criteria

1. `pnpm test` and `pnpm check` pass; existing pre-pack and app QA harness flows are unchanged.
2. `pnpm pack:check` passes on `pre.json` and fails loudly with a readable path when fed a malformed JSON.
3. `pre.json` produces a pack identical to the previous `PRE_PACK` — parity test over all
   15 levels' control points and goals, in order.
4. The dev harness renders each pre level from JSON with correct markers at 430×860.
5. Unit tests cover malformed input: unknown key, missing goal, invalid stroke value,
   non-finite point, margin violation, bonus/unlock mismatch, unsafe `goalArt` path.

## Out of Scope

- Porting Numbers, Letters, or the Name mini-pack (follow-up tracks on the same pipeline).
- Runtime loading of JSON from `public/` or over the network; authoring editors or generators.
- Changes to the trail engine, presentation systems, or the save schema.
