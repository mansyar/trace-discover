# Trex — Sixth Skin (Toy T-Rex)

**Track ID:** `trex-skin_20260917` · **Type:** Feature · **Status:** new
**Branch:** `track/trex-skin` · **Created:** 2026-09-17

## Overview

The skins × packs model promised new skins are *pipeline work, not code*. This is the second production proof (after `teddy`): a **sixth skin — `trex`** — built from a photo of the family's toy T-Rex (input only, never shipped). The pipeline generates an AI-stylized character master in the house art language, and **owner approval of that master is a hard gate before any downstream step**. The character then runs the established loop (cutout → pose set → Rive → screenshot verification) and registers like every other skin: `.riv` character, themed backdrop, accent, face icon, and a sixth instrument voice (theme-matched, approved by ear). Presentation-only — no levels, no progress, no schema, no mechanics.

## Design decisions (locked)

- **Identity:** id `trex`; signature features survive restyling — warm brown plush body + tan belly, golden-yellow eye with dark pupil, open-mouth grin (white zigzag teeth, pink inner mouth), stubby arms, thick tail; readable at level render scale. Review watch: clear separation from `dino` (the existing green cast character) — if they read too alike, lean harder on the toy's brown/tan plush scheme.
- **Approval gate:** owner approves the stylized master before cutout/pose/Rive work; screenshot approvals on Rive stills and in-app integration after.
- **Expression set:** cast standard — idle loop + tap → celebrate swap + blink (feathered-patch technique, teddy budget profile).
- **World:** backdrop matched to the toy's palette (warm prehistoric-sunset proposal; final at art review) via the standard backdrop pipeline; readable in menu/pack/level/success.
- **Voice:** new instrument id — theme-matched envelope proposal (e.g. a short, bright "toy squeak" character), same pentatonic language; chime/completion structure unchanged; approved by ear.
- **Cycle order:** appended after `teddy` — dino → star → construction → animal → teddy → trex (wrap).
- **Working agreement:** local branch — no push/PR/release; merge & release decisions stay with the owner.
- **Privacy/policy:** reference photo + raw generations stay local/untracked; only approved stylized art + build sources follow the art-source policy; `.riv` ships in `public/rive/`.

## Functional Requirements

- **FR1 — Stylized master + approval gate.** `gen2.mjs` (Workers AI img2img) restyles the toy photo into the house language (flat kawaii children's illustration, thick navy outlines, pastel, white highlights) while preserving identity; candidates tuned via strength/seed; **owner approves the master** before FR2. Raw reference + raws untracked.
- **FR2 — Character `.riv` (cast standard).** Workspace `dev/characters/trex/` (from the dino4 template): cutout base + celebrate (stomp/roar-jump proposal) + same-pose blink source → feathered eye patch; contract = autoplay idle + `celebrate` trigger + tap proxy; `rive --verify`/`inspect` clean; screenshots (rest/blink/celebrate) + headless browser test; ship `public/rive/trex.riv` ≤ ~500 KB.
- **FR3 — Skin registration.** `SKINS` appends `trex` — `{ character: 'trex', backdrop, face, instrument, accent }`; cycle, persistence, and parent-zone setter cover six skins; unknown-id fallback unchanged; skin tests extended to the six-skin cycle.
- **FR4 — Backdrop.** Theme world generated → optimized → `public/art/bg/trex.webp`; readability/contrast verified in menu/pack/level/success contexts; screenshot-approved.
- **FR5 — Face icon.** Trex head → `public/art/face/trex.webp`; crisp at button scale; screenshot-approved.
- **FR6 — Sixth voice.** `InstrumentId` gains one member; preset waveform/duration/gain approved by ear; chimes + completion resolve through it; counted toy-piano notes unchanged; unit-tested; speaker spot-check.
- **FR7 — Docs resync (before implementation).** `product.md` — sixth skin noted; out-of-scope line re-scoped (further skins remain pipeline work) + dated note; `tech-stack.md` — six skins, new instrument preset + dated note; `dev/README.md` — character workspace list updated.
- **FR8 — PWA/offline.** New assets covered by the existing Workbox glob; precache entries + dist delta recorded; zero runtime network; install/offline behavior unchanged.
- **FR9 — QA & evidence.** Trex spot-sweep — six-skin cycle reaches trex; one trex-skinned level traced to completion (hop + celebrate); screenshots across menu/pack/level/success; zero-text audit; offline probe covers new assets; evidence recorded in plan + git note.

## Non-Functional Requirements

- **Size:** `trex.riv` ≤ ~500 KB; `pnpm budget` stays green — the sixth skin is expected to press the 5.00 MB ceiling: either land under it (size discipline on `.riv`/face) or raise the ceiling deliberately with fresh measurements (documented in the budget tool).
- **Quality:** >80% coverage on new logic; existing suite green; `pnpm check` clean.
- **Look consistency:** reads as *the same toy* (owner-verified); sits in the cast's visual language; blink seam-free; crisp at level scale.
- **Zero-text** upheld; **no perf regression**; **offline** unchanged.
- **Privacy:** the photo never reaches git or `dist/`.

## Acceptance Criteria

1. Owner approved the stylized trex master before downstream work (hard gate; recorded).
2. Trex selectable anywhere skins work: six-skin cycle + wrap, persisted across relaunch, parent setter; unknown-id fallback intact.
3. Character behaves per contract: idle loops; tap → celebrate swap; blink patch seamless — rest/blink/celebrate screenshots approved.
4. Backdrop + face icon integrated and screenshot-approved; no contrast/overlap regressions (menu/pack/level/success).
5. Sixth voice on chimes + completion; counted notes unchanged; mute/volume respected; ear + speaker spot-check.
6. Zero-text audit passes.
7. Offline: precache covers trex assets; offline cold start plays a trex level (probe evidence).
8. Size: `.riv` ≤ ~500 KB; budget checked (or ceiling raised deliberately, recorded).
9. Checks + QA suite green; trex spot-sweep evidence recorded.
10. Docs synced (product/tech-stack/dev README); owner device pass (one trex level on Android/iPad) recorded.

## Out of Scope

Changes to existing skins or characters (incl. `dino`) · new packs/lowercase letters · save-schema changes · new mechanics or extra expression states beyond cast standard · accounts/voice/store/monetization · push/PR/release.
