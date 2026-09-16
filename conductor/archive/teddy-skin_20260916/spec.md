# Teddy — Fifth Skin (Family Plush)

**Track ID:** `teddy-skin_20260916` · **Type:** Feature · **Status:** new
**Branch:** `track/teddy-skin` · **Created:** 2026-09-16

## Overview

The skins × packs model promised that new skins are *pipeline work, not code*. This track is the first production proof: a **fifth skin — `teddy`** — built from a photo of the owner's son's favorite plush. The photo is **input only** (never shipped): the pipeline generates an AI-stylized character master in the house art language, and **owner approval of that master is a hard gate before any downstream step**. The character then runs the established loop (cutout → pose set → Rive → screenshot verification) and registers like every other skin: `.riv` character, cozy-bedroom backdrop, accent, face icon, and a fifth instrument voice (music box). Presentation-only — no levels, no progress, no schema, no mechanics.

## Design decisions (locked)

- **Identity:** id `teddy`; signature features survive restyling — gray fur, round ears, stitched smile muzzle, blue/white striped romper with red heart — readable at level render scale.
- **Approval gate:** owner approves the stylized master before cutout/pose/Rive work; standard screenshot approvals apply to Rive stills and in-app integration after.
- **Expression set:** cast standard — idle loop + tap → jump/celebrate swap + blink (feathered-patch technique, excavator/lion budget profile).
- **World:** cozy bedroom (soft warm light, pastels, gentle depth) via the standard backdrop pipeline.
- **Voice:** `musicbox` — new soft sine preset (long decay ~1.5 s); pentatonic language, chime/completion structure unchanged.
- **Accent:** proposal `#e07a5f` (soft heart coral); final value confirmed at art approval.
- **Cycle order:** appended after `animal` — dino → star → construction → animal → teddy (wrap).
- **Working agreement:** local branch — no push/PR/release; merge & release decisions stay with the owner afterward.
- **Privacy/policy:** reference photo and raw generations stay local/untracked; only the approved stylized art + build sources follow the art-source policy; `.riv` ships in `public/rive/`.

## Functional Requirements

**FR1 — Stylized master + approval gate.** `gen2.mjs` (Workers AI img2img) restyles the reference photo into the house language (flat kawaii children's illustration, thick navy outlines, pastel, white highlights) while preserving identity; candidates tuned via strength/seed; **owner approves the master** before FR2. Raw reference + raw generations untracked.

**FR2 — Character `.riv` (cast standard).** Workspace `dev/characters/teddy/` (from the dino4 template): cutout base + celebrate (arm-raised jump) + same-box blink source → feathered eye patch; contract = autoplay idle + `celebrate` trigger + tap proxy; `rive --verify`/`inspect` clean (problems empty); screenshots (rest/blink/celebrate) + headless browser test; ship `public/rive/teddy.riv` ≤ ~500 KB.

**FR3 — Skin registration.** `SKINS` appends `teddy` — `{ character: 'teddy', backdrop: '/art/bg/teddy.jpg', face: '/art/face/teddy.png', instrument: 'musicbox', accent }`; cycle, persistence, and parent-zone setter cover five skins; unknown-id fallback unchanged; existing skin tests extended to the five-skin cycle.

**FR4 — Backdrop.** Cozy bedroom generated → optimized → `public/art/bg/teddy.jpg`; readability/contrast verified in menu/pack/level/success contexts; screenshot-approved.

**FR5 — Face icon.** Teddy head → `public/art/face/teddy.png`; crisp at button scale; screenshot-approved.

**FR6 — Music-box voice.** `InstrumentId` gains `'musicbox'`; preset = soft sine, long decay (~1.5 s), gentle gain; chimes + completion resolve through it; counted toy-piano notes unchanged; unit-tested; device-speaker spot-check.

**FR7 — Docs resync (before implementation).** `product.md` — fifth skin noted, out-of-scope line re-scoped (further skins remain pipeline work per the contract) + dated note; `tech-stack.md` — five skins, `musicbox` preset + dated note; `dev/README.md` — character workspace list updated.

**FR8 — PWA/offline.** New assets covered by the existing Workbox glob; precache entries + dist delta recorded; zero runtime network; install/offline behavior unchanged.

**FR9 — QA & evidence.** Teddy spot-sweep on the existing suite — skin cycle reaches teddy; one teddy-skinned level traced to completion (hop + celebrate); screenshots across menu/pack/level/success; offline probe covers new assets; evidence recorded in plan + git note.

## Non-Functional Requirements

- **Size:** `teddy.riv` ≤ ~500 KB; dist within <~10–15 MB budget (baseline 6.71 MB post repo-organization) — delta recorded.
- **Quality:** >80% coverage on new logic; existing suite green; `pnpm check` clean (Biome + tsc strict).
- **Look consistency:** teddy reads as *the same plush* (owner-verified) and sits in the cast's visual language; blink seam-free; crisp at level scale.
- **Zero-text** upheld; **no perf regression** (cold boot / fps spot-checks); **offline** unchanged.
- **Privacy:** the personal photo never reaches git or `dist/`.

## Acceptance Criteria

1. Owner approved the stylized teddy master before downstream work (hard gate; recorded).
2. Teddy selectable anywhere skins work: five-skin cycle + wrap, persisted across relaunch, parent setter; unknown-id fallback intact.
3. Character behaves per contract: idle loops; tap → celebrate swap; blink patch seamless — rest/blink/celebrate screenshots approved.
4. Bedroom backdrop + face icon integrated and screenshot-approved; no contrast/overlap regressions (menu/pack/level/success).
5. Music box on chimes + completion; counted notes unchanged; mute/volume respected; speaker spot-check.
6. Zero-text audit passes.
7. Offline: precache covers teddy assets; offline cold start plays a teddy level (probe evidence).
8. Size: `.riv` ≤ ~500 KB; dist delta recorded within budget.
9. Checks + QA suite green; teddy spot-sweep evidence recorded.
10. Owner device pass (one teddy level on Android/iPad) + docs synced (product/tech-stack/dev README).

## Out of Scope

- New packs / lowercase letters (letters-pack track continues separately) · changes to existing skins or characters · save-schema changes · new mechanics or extra expression states beyond cast standard · `dino.riv` rebuild (standing accepted deviation) · accounts/voice/store/monetization · push/PR/release.
