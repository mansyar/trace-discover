# Technology Stack: Trace & Discover!

## Architecture

**Client-only static SPA, built with Vite, shipped as an installable PWA** — no backend, no database, no accounts. Canvas rendering (paths, paint-fill, particles) + Rive WASM (characters) + Web Audio (sound) in vanilla TypeScript modules with a typed screen state machine. Build output = static `dist/` → Cloudflare Pages.

## Languages

- **TypeScript** (strict) — all app code
- **HTML + CSS** — single shell + small stylesheet, no framework
- **Node.js** — dev-time asset pipeline scripts (plain JS)
- *RML* — authoring format for Rive assets (not app code)

## Toolchain (latest verified, compatible with Node 24.16)

- **Node 24 LTS** (dev machine: v24.16.0)
- **pnpm** (12.4.1 at time of writing; lockfile committed)
- **Vite** 8.3.0 — dev server + HMR + production bundle
- **vite-plugin-pwa** 1.3.0 (Workbox 7.4.1) — auto-generated precache manifest
- **TypeScript** 7.0.2 — native compiler; `tsc --noEmit` for checks (Vite transpiles via esbuild). Fallback: pin latest 5.x/6.x if friction at scaffold time.
- **Biome** 2.5.13 — lint + format in one tool (`pnpm check` = Biome + `tsc --noEmit`)

## Frontend

- **No UI framework** — vanilla TS + Canvas 2D API; screens = full-canvas overlays managed by a typed state machine
- **Characters: Rive** — `@rive-app/canvas-lite` 2.42.1 (MIT, ~222 KB brotli) as an npm dependency; script-free `.riv` assets; host TS fires state-machine triggers
- **Audio: Web Audio API** — synthesized pentatonic sounds; unlocked on first touch
- **Paths:** code-drawn Canvas trail engine (Path2D, paint-fill, magnetism)

## Backend

**None** — 100% client-side.

## Data & Persistence

**localStorage** — typed save schema: cleared levels, stickers, auto-assist state, parent settings.

## PWA & Hosting

- `manifest.json` (`display: standalone`) + service worker precaching the full app → **fully offline**
- **Cloudflare Pages** — static `dist/` deploy, free HTTPS

## Asset Pipeline (dev-time, $0)

- **Rive CLI 1.0.2** — agent-authored RML scenes; local `--once` builds; verify/inspect/screenshot loop
- **Cloudflare Workers AI** — flux-1-schnell (txt2img) + flux-2-klein-4b (img2img)
- **Node tools** (in repo): `gen` / `gen2` / `cutout` / `composite` / `gridshot` / `serve` / `browsertest`

## Dev Tooling & Testing

- **pnpm scripts:** `dev` / `build` / `preview` / `check` (Biome + tsc)
- **Verification:** headless Edge (playwright-core) scripts + Rive CLI screenshot QA
- **LAN test server** for real devices (Android Chrome, iPad Safari)
- **Targets:** Android Chrome phones + iPads (Safari PWA); DPR-aware canvas + letterbox layout

## Constraints

$0 lane · characters ≤ ~500 KB · whole app offline-cacheable (target < ~10–15 MB)
