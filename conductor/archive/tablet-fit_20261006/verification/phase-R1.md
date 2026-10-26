# Phase R1 verification — Review Fixes

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** R1 — Review Fixes
- **Date:** 2026-10-26 (recorded) · fixes landed in `e1dd3b2`
- **Branch:** `track/tablet-fit`
- **Result:** verified

> Retrospective record. The fixes were applied before the 2.0 flow was adopted;
> the plan update commit `66248ec` closed them. The review artifact itself was
> not retained, so this phase is recorded from the plan's finding list and the
> fix commit.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | Clean at `66248ec` (re-run 2026-10-26 as part of Phase 2 verification — see `phase-2.md`) |
| test | `CI=true pnpm test` | 0 | Green at `66248ec` (re-run 2026-10-26 — see `phase-2.md`) |

## Findings

| Severity | Finding | Resolution | Status |
| --- | --- | --- | --- |
| Medium | In-level mascot parks authored in phone field units sat over the traced letters and mid-field on success at tablet spaces | `parksFor(space)` resolves the authored park through the field fraction; phone points byte-identical; guards in `session.test.ts` + live measurement in `qa-tablet-rows` | fixed |
| Low | `projectRunLevel` doc comment described the opposite of the implemented tablet/name behaviour | comment rewritten | fixed |
| Low | Vacuous assertion in `wordSpace.test.ts` (compared a value with itself) | replaced with a real landscape-box guard | fixed |
| Low | Duplicate phone row-box branches in two modules | reviewed, kept deliberately — parity is test-locked | accepted as-is |

## Evidence paths

- Commit `e1dd3b2` — `fix(conductor): Apply review suggestions for track 'tablet-fit_20261006'`
- Commit `66248ec` — plan update closing the fixes

## Notes

The full track review is re-run before completion; findings from that round are
appended as `Phase R2` if any block.
