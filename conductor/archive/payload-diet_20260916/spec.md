# Payload Diet & Dino Rebuild

**Track ID:** `payload-diet_20260916` · **Type:** Chore · **Status:** new
**Branch:** `track/payload-diet` · **Created:** 2026-09-16

## Overview

The letters pack grew the offline bundle to **9.26 MB / 133 precache entries** (measured on the v1.2.0 build; earlier docs cited a larger ~10.31 MB / 148 figure the fresh build does not reproduce — see the track's `measurements.md`) — near the floor of the product's `< ~10–15 MB` constraint — while the raster art that dominates it (`public/art`: 115 PNG + 4 JPG = 6.39 MB) still ships in legacy formats. A fifth skin and any future pack land on top of that. This chore re-encodes all shipped raster art to WebP (same dimensions, quality tuned per class), fixes the asset pipeline so future batches emit WebP by default, rebuilds `dino.riv` to the cast's patch-technique standard (699 KB → target ~460 KB; closing the standing accepted deviation), and adds a `pnpm budget` guard + CI gate so the payload can't silently regress. **No child-visible behavior change** — formats, path literals, and guard wiring only.

## Design decisions (locked)

- **WebP via the existing browser-canvas pipeline** — zero new dependencies; PNG stays for icons/favicons (platform compatibility).
- **Format-only, quality-first** — identical pixel dimensions; per-class quality tuning (alpha cutouts vs backdrops); zero visual regression is the bar.
- **`dino.riv` size-only rebuild** — same look and animations (no blink redesign); ≤ 500 KB cast guideline.
- **Budget guard** — `pnpm budget` (dist total + precache entries vs ceilings) wired into CI as a failing step; ceilings from measured post-diet baselines with documented headroom.
- **Best tracked source per asset** — `dev/art-src` composite/cutout where equivalent, else the shipped file; originals removed only after approval.
- **Working agreement:** local branch — no push/PR/release.

## Functional Requirements

**FR1 — Art re-encode (shipped set).** All 119 raster files in `public/art/**` (bg 4 · face 4 · goal 54 · pack 6 · sticker 51) re-encoded to `.webp` at identical dimensions; quality tuned per class (start: cutouts q≈0.85 lossy-with-alpha, backdrops q≈0.8); side-by-side screenshot approval per class + device crispness check (Android + iPad).

**FR2 — Reference & build integration.** All art URL literals updated (`.png`/`.jpg` → `.webp`) across `src/{packs,app,skins}` and pinned tests; Workbox `globPatterns` gains `webp`; dev tooling that reads shipped art (e.g. `pre-sheet.mjs`) updated; offline probe re-verified so WebP ships precached.

**FR3 — Pipeline forward-fix.** Shipped-art emitters (`opt-art.mjs`, `opt-pre.mjs`, `card.mjs`, `gen-rewards.mjs`, `faces.mjs`, `vignette.mjs`/`letters-compose.mjs` as applicable) emit WebP by default with the tuned qualities; `dev/README.md` documents the format policy.

**FR4 — Art-reference test.** A Vitest check asserts every level/backdrop/face/card/badge art URL referenced by the app resolves to an existing file under `public/` with the expected extension — a dead reference fails tests, not the child.

**FR5 — `dino.riv` rebuild.** Rebuild from `dev/characters/dino4/` with the cast patch technique; same state machine (autoplay idle + `celebrate`); target ~460 KB (≤ 500 KB); path stays `public/rive/dino.riv`; verification: Rive screenshots (idle/jump/blink), in-app browser burst check, cast parity. **Fallback:** if parity can't hold within budget, revert and keep the deviation open with a dated note.

**FR6 — Budget guard.** `pnpm budget` reports dist total + precache entries with a breakdown and fails when a ceiling is exceeded; ceilings set from the measured post-diet build and recorded in `README.md` + `tech-stack.md`; wired into `ci.yml` after build; failure proven via a negative control (temporarily lowered ceiling) as evidence.

**FR7 — Docs.** `tech-stack.md` updated *before* implementation (workflow.md: Tech Stack is Deliberate): pipeline formats + size note; README/dev README budget & format policy.

## Non-Functional Requirements

- Zero visual regressions (per-class approvals + device pass) · dist ≤ 6.95 MB (≥25% below the measured 9.26 MB baseline; stretch ≤ ~6.4 MB) · offline cold-start probe green · cold boot within baseline (qa-perf spot-check) · suite green with only URL-literal edits · >80% coverage on new logic · `pnpm check` clean · no content/behavior change.

## Acceptance Criteria

1. dist ≤ 6.95 MB (≥25% below the measured v1.2.0 baseline of 9.26 MB / 133 precache entries; stretch ≤ ~6.4 MB); before/after recorded (see `measurements.md`).
2. No `.png`/`.jpg` under `public/art/**` (icons excluded); zero stale references (`git grep` + reference test).
3. Owner-approved side-by-sides per class; Android + iPad visual pass.
4. `dino.riv` ≤ 500 KB (target ~460 KB) with screenshots + in-app burst verified.
5. `pnpm budget` exists; ceilings documented; CI step fails when exceeded (negative-control evidence).
6. Offline probe + app/letters sweeps green; boot within baseline.
7. Full gates green: `pnpm check`, suite, build.
8. Docs synced; no child-visible change.

## Out of Scope

Other Rive assets (excavator/lion/star untouched) · dino blink/animation redesign · icon re-format · AVIF/new encoder deps · dimension changes · app/content/UI/PWA behavior · new packs/skins · push/PR/release.
