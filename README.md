# Trace & Discover!

A zero-text, offline-first tracing game for toddlers (~3–4) — building fine-motor
and pre-writing skills by tracing glowing paths with a finger.

Four characters (dino · star · excavator · lion cub) × three content packs
(pre-writing shapes · numerals 0–9 · uppercase letters A–Z), plus a personalized
**My Name** mini-pack — a parent sets the name once and the level is composed
from the letter glyphs. Stickers and badges as rewards; child surfaces are
zero-text and sound-first; no failure states. Installs as a PWA.

**Live:** https://trace-discover.pages.dev

## Quick start

Requirements: Node 24 LTS + pnpm.

```bash
pnpm install
pnpm dev        # Vite dev server
pnpm test       # unit tests (Vitest)
pnpm check      # Biome lint/format + tsc --noEmit
pnpm build      # production build → dist/
pnpm preview    # serve the build locally
pnpm serve      # LAN server for real-device testing (Android / iPad)
```

## Repository map

| Path | What's in it |
| --- | --- |
| `src/` | The app — vanilla TypeScript + Canvas 2D (trail engine) + Rive WASM (characters) + Web Audio (sounds) |
| `public/` | Shipped assets — Rive characters, art, icons, manifest |
| `dev/` | Dev-time tooling — asset pipeline, headless-Edge QA, dev harness pages, Rive authoring workspaces ([runbook](dev/README.md)) |
| `conductor/` | Product & tech docs, and the track-based planning process ([index](conductor/index.md)) |
| `.github/` | CI (`ci.yml`) + tag-driven release to Cloudflare Pages (`release.yml`) |

## Development workflow

Work is organized as **tracks** (features/chores) — each with a spec and a
phase-based plan under `conductor/tracks/`, registered in
[tracks.md](conductor/tracks.md). The rules of the road (TDD, coverage, phase
checkpoints, commit conventions) live in [workflow.md](conductor/workflow.md);
the stack is described in [tech-stack.md](conductor/tech-stack.md).
