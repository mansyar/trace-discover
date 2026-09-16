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
- **Paths:** code-drawn Canvas trail engine (Path2D, paint-fill, magnetism); level schema v2 — ordered multi-stroke levels (v1 single-stroke content unchanged, engine extended with per-stroke frontiers)
- **Skins × packs:** content and presentation are orthogonal. `src/skins/` — four skins (dino, star, construction, animal), each carrying a character `.riv`, backdrop, accent, instrument preset, face icon; no levels. `src/packs/` — ordered packs (Pre-writing 12+3, circles unlocking at 4/8/12; Numbers 10; Letters 26 uppercase + 3 sequence bonuses, unlocking at 9/18/26); level ids `pre-1..12` / `pre-bonus-1..3` / `num-0..9` / `abc-a..z` / `abc-bonus-1..3`; the **name** mini-pack (`name-1`, composed at runtime from the letter glyphs) exists only while a parent-set name is saved; progress + rewards are pack-owned, the skin is cosmetic + persisted (`settings.skin`); replaces the fused `themes/` modules
- **Character contract:** every skin's `.riv` exposes the same state machine — autoplay idle + `celebrate` trigger; hop placement stays canvas-transform based — making new skins drop-in via the asset pipeline

## Backend

**None** — 100% client-side.

## Data & Persistence

**localStorage** — typed save schema v3: unified `completedLevels` (all packs), `badges` (per pack), `trophies` (legacy world badges, display-only), `settings` (incl. `skin`). Lossless v2→v3 migration (`dino-N`→`pre-N`, `construction-N`→`pre-(N+4)`, `animals-N`→`pre-(N+8)`, `*-bonus`→`pre-bonus-1..3` in theme order, `num-*` preserved; world badges→trophies); v1 saves continue to migrate through; hostile-input sanitizing preserved. The write-only `assistWidened` flag is dropped (widening is computed per level at runtime). **Durability (track `pwa-resilience_20260916`):** save writes are exception-proof — quota/denied storage becomes a silent no-op with the session continuing in memory; `navigator.storage.persist()` is requested best-effort at boot; storage-unavailable contexts boot into session-only play. **My Name (track `my-name_20260916`):** additive top-level `name?: string` — sanitized (uppercase A–Z, 2–7 letters; absent = no name; hostile values degrade to none), no schema version bump; reset-progress keeps it; never leaves localStorage.

## PWA & Hosting

- `manifest.json` (`display: standalone`) + service worker precaching the full app → **fully offline**
- **Update strategy (track `pwa-resilience_20260916`):** waiting service worker — updates download in the background but activate only after all instances close (next cold start); a running session is never taken over mid-play and there is no update UI (zero-text shell)
- **Cloudflare Pages** — static `dist/` deploy, free HTTPS

## Asset Pipeline (dev-time, $0)

- **Rive CLI 1.0.2** — agent-authored RML scenes; local `--once` builds; verify/inspect/screenshot loop
- **Cloudflare Workers AI** — flux-1-schnell (txt2img) + flux-2-klein-4b (img2img)
- **Dev workspace (`dev/`, never shipped):** `tools/` pipeline scripts (`gen` / `gen2` / `cutout` / `composite` / `gridshot` / `vignette` / `card` / `opt-*` / `make-icons` / `pre-sheet` / `gen-rewards` / `faces` / `findeyes`); `qa/` headless-Edge verification scripts; `harness/` dev pages (`play` / `screens` / `tune`); `characters/` Rive authoring workspaces (dino, star, excavator, lion); `art-src/` per-pack art intermediates — runbook in `dev/README.md`
- **Art-source policy:** `dev/art-src/<pack>/` tracks the approved cutout layer + derived composites; raw generations stay untracked
- **Asset batches:** per track — characters (`.riv`), backdrops, goal art, stickers, card art, icons; each asset lands via generate → cutout → optimize → composite → screenshot approval

## Dev Tooling & Testing

- **pnpm scripts:** `dev` / `build` / `preview` / `check` (Biome + tsc)
- **Verification:** headless Edge (playwright-core) scripts (`dev/qa/`) + Rive CLI screenshot QA (`dev/characters/`); dev pages in `dev/harness/`
- **LAN test server** for real devices (Android Chrome, iPad Safari)
- **Targets:** Android Chrome phones + iPads (Safari PWA); DPR-aware canvas + letterbox layout

## CI/CD

- **GitHub Actions** — repository `mansyar/trace-discover` (public; free-tier runners)
  - **CI** (`.github/workflows/ci.yml`): on PR → `master`, push → `master`, manual dispatch — `pnpm check` → tests + coverage (artifact, informational) → `pnpm build`
  - **CD** (`.github/workflows/release.yml`): on semver tags `v*.*.*` — fail-fast validation (strict semver + tag == `package.json#version`) → same quality gates → `wrangler pages deploy`
- **Deploy target:** Cloudflare Pages project `trace-discover` (direct upload; `trace-discover.pages.dev` production, `rc.trace-discover.pages.dev` prerelease); stable tags → branch `master` (production), prerelease tags → branch `rc` (preview)
- **Secrets (Actions):** `CLOUDFLARE_API_TOKEN` (Account · Cloudflare Pages · Edit) + `CLOUDFLARE_ACCOUNT_ID`
- **Releases:** semver tags are the release trigger; GitHub Release with auto-generated notes + "Deployed at &lt;url&gt;" line; release runbook lives in `workflow.md` (Deployment Workflow)
- **Toolchain parity:** CI = `ubuntu-latest` + Node 24 + pnpm 12.4.1 (from `packageManager`, frozen lockfile); `wrangler` pinned exactly (`npx wrangler@4.131.2`)

*2026-09-15 — Added (track `cicd-pipeline_20260915`): GitHub Actions CI + tag-driven CD to Cloudflare Pages, with GitHub Release notes. Documented before implementation per `workflow.md` (Tech Stack is Deliberate). Verified live same day: `v1.0.0-rc.1` → run 34920856339 deployed to the rc preview and created the prerelease; production untouched.*

*2026-09-15 — Updated (track `letters-numbers-pack_20260915`): level schema v2 — ordered multi-stroke levels (single-stroke v1 content unchanged, per-stroke frontiers in the trail engine); save schema v2 — additive `pack` section (numerals cleared, numeral stickers, pack badge) with lossless v1→v2 migration; dedicated zero-text "123" pack screen pattern (numerals as drawn art, cream shell). Implemented and acceptance-passed 2026-09-15 (Phase 6: numerals 0–9 + `star.riv` guide, dist 6.25 MB); merged via PR #2 and released as `v1.0.0` (production live). Documented before implementation per `workflow.md` (Tech Stack is Deliberate).*

*2026-09-15 — Updated (track `skins-and-packs_20260915`): content/theme decoupling — `skins/` (dino · star · construction · animal) × `packs/` (pre-writing, numbers) registries; save schema v3 with lossless v2→v3 migration; character contract (autoplay idle + `celebrate` trigger) documented for drop-in skins; per-skin instruments (marimba · bell · woodblock · kalimba); content-first menu + top-left skin switch button (tap-to-cycle, persisted). Documented before implementation per `workflow.md` (Tech Stack is Deliberate). Completed on branch `track/skins-and-packs` (2026-09-16): implemented + acceptance-passed (Android + iPad, toddler session); dist 7.77 MB / 91 precache entries; merged via PR #3 and released as `v1.1.0` (production live, 2026-09-16).*

*2026-09-16 — Updated (track `letters-pack_20260916`): Letters pack `abc` — 26 uppercase levels (`abc-a`..`abc-z`, school-style stroke order, multi-stroke where formation needs it) plus 3 sequence bonuses (`abc-bonus-1..3` = `ABC` / `MOM` / `ZOO`, unlocking at 9/18/26 cleared); two-page pack grid (4-per-row; A–L = 12 cards, M–Z = 14 with the centered Y–Z finale pair; per-page sticker shelf; zero-text prev/next pager + page dots; opens on the first unfinished letter's page) — refined from a single 7-row grid because 26 cards at ≥90 px already fill the field's height, leaving no room for the shelf; object-per-letter rewards (goal art + sticker); completion = per-stroke counted hops (one hop + one note per stroke, cap 4); the guide is the active skin's character (no content-owned guide — stale `product-guidelines.md` star-buddy wording fixed); save additive only — schema v3 unchanged, no migration. Documented before implementation per `workflow.md` (Tech Stack is Deliberate). Completed on branch `track/letters-pack` (2026-09-16): implemented + acceptance-passed (all 29 levels swept, Android + iPad offline check, toddler session); art batch 55 assets; dist 10.31 MB / 148 precache entries; save unchanged (v3).*

*2026-09-16 — Updated (track `repo-organization_20260916`): dev-time tooling consolidated from the catch-all `spike/` into a purpose-split `dev/` workspace — `tools/` (asset pipeline), `qa/` (headless-Edge verification), `harness/` (dev pages), `characters/` (Rive workspaces), `art-src/` (per-pack intermediates: cutouts + composites tracked, raw generations untracked); scripts anchored to `import.meta.url` so they run from any cwd; dead legacy art + raw generations pruned. Runbooks: root `README.md` + `dev/README.md`. Documented before implementation per `workflow.md` (Tech Stack is Deliberate). Completed on branch `track/repo-organization` (2026-09-16): restructure + prunes + reference sweep done; full gates green (320 tests, coverage 98.2% stmts); dist 7.77 → 6.71 MB / precache 91 → 76 entries; awaiting the merge/release decision.*

*2026-09-16 — Updated (track `pwa-resilience_20260916`): PWA update safety + save durability — waiting service worker semantics: no ungated `skipWaiting`; a downloaded update activates only once all app instances close (next cold start), and a running session can never be taken over mid-play; `clientsClaim` stays on for first-launch control; no update UI exists (zero-text shell). Save writes are exception-proof (quota/denied → silent no-op, in-memory continuation; later writes persist once storage works) and `navigator.storage.persist()` is requested best-effort at boot; storage-unavailable contexts boot into session-only play. Documented before implementation per `workflow.md` (Tech Stack is Deliberate). Implemented and verified on branch `track/pwa-resilience` (2026-09-16): `qa-update` 14/14 GREEN; suite 333/333; `qa-persistence` 13/13 (quota-denied, recovery, denied-storage boot); dist 6.71 MB / 76 precache entries (unchanged); device pass done (LAN scope — Android + iPad gameplay + persistence; SW/offline mechanics proven by desktop probes); awaiting the merge/release decision.*

*2026-09-17 — Updated (track `my-name_20260916`): My Name mini-pack — parent-set name (2–7 uppercase A–Z after sanitizing; additive top-level `name` save field, schema v3 unchanged) composed into a runtime trace level from the shipped letter-glyph geometry (`buildNameLevel`; path visuals thin proportionally for longer names, with a device-tuned length cap) and presented as a one-level pack (`name`, level `name-1`, badge `name-badge`) with a menu card + pack mini-paths drawn from geometry and two new pipeline assets (sticker + badge); name editing via a parent-zone overlay (first DOM input, behind the 2-finger gate). Documented before implementation per `workflow.md` (Tech Stack is Deliberate).*

## Constraints

$0 lane · characters ≤ ~500 KB · whole app offline-cacheable (target < ~10–15 MB)
