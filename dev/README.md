# dev/ — Development Workspace

Everything in here is **dev-time only** — never shipped in the app bundle
(`pnpm build` reads only `index.html`, `src/`, `public/`). This folder was
renamed from `spike/` in track `repo-organization_20260916` and split by
purpose.

## Layout

| Path | What's in it |
| --- | --- |
| `tools/` | $0 asset pipeline — Workers AI generation, cutout/optimize/composite, batch composers |
| `qa/` | Headless-Edge (playwright-core) verification scripts + probes; outputs in `qa/out/` (git-ignored) |
| `harness/` | Dev pages: `play.html` (single level) · `screens.html` (screen gallery) · `tune.html` (feel tuning) · `pack.html` (pack JSON preview: `?pack=pre&level=pre-7`) — served by the Vite dev server |
| `characters/` | Rive authoring workspaces — `dino4` (canonical dino; earlier `dino`/`dino2`/`dino3` iterations removed 2026-09-16) · `star` · `excavator` · `lion` · `teddy`; each is a `rive` CLI project (`rive . --verify`); shipped `.riv` binaries are tracked in `public/rive/` |
| `art-src/` | Per-pack art intermediates — `<pack>/` keeps the approved cutout layer + derived composites |

`package.json` carries the `playwright-core` dependency for the QA scripts —
run `pnpm install` inside `dev/` once. The `dev/pnpm-lock.yaml` lockfile is
tracked (since `ci-qa-hardening_20260917`) so CI installs it with
`--frozen-lockfile`; regenerate it with `pnpm install` when dependencies change.

> `.cf_token` (untracked Workers AI token, needed by `tools/gen.mjs` /
> `gen2.mjs`) lives at `dev/.cf_token`. If you had one at `spike/.cf_token`,
> move it here after switching to the restructured branch — git does not move
> untracked files.

## Asset pipeline (generate → approve)

Flow per asset batch: **generate → cutout → optimize → composite → screenshot
approval** — every asset is *looked at* before it ships.

1. `node tools/gen.mjs --prompt "…" --out gen/x.png` — Workers AI
   flux-1-schnell txt2img (reads `.cf_token`, kept untracked)
2. `node tools/gen2.mjs …` — flux-2-klein-4b img2img for regenerations/variants
3. `node tools/cutout.mjs …` — background removal / component selection
4. `node tools/opt-art.mjs` · `opt-pre.mjs` — downscale + encode into `public/art/…` (WebP; backdrops ≈q0.8, cutouts ≈q0.85)
5. `composite` · `vignette` · `card` · `pre-sheet` · `gen-rewards` — compose final art; **screenshot and look at it**
6. Characters: author in `characters/<name>/` with the rive CLI
   (RML → `rive . --verify` → `rive . --once` → screenshots)

Exact flags: read the header comment of each script (every script documents
its usage).

## QA scripts (headless Edge)

Start the right server first, then run the script (most accept a URL argument).

| Server | Command | Typical consumers |
| --- | --- | --- |
| Production preview `:4173` | `pnpm preview` (LAN: `pnpm serve`) | `qa-app`, `qa-name`, `qa-pack-app`, `qa-offline`, `qa-perf`, `qa-cast` |
| Dev server `:5199` | `pnpm exec vite --port 5199 --strictPort` | `qa-harness`, `qa-pre-pack`, `qa-menu-pack`, `qa-persistence`, `qa-pack-badge`, `qa-name-hostile`, `qa-name-art` |

| Script | Purpose | Needs | Status |
| --- | --- | --- | --- |
| `qa-app.mjs` | Full app loop: splash → pack badge → bonus circles; traces each pre level | preview | canonical |
| `qa-harness.mjs` | Harness probes; traces `pre-2` / `pre-bonus-1` with synthetic pointer paths | dev `:5199` | canonical |
| `qa-levels.mjs` | Traces each pre level end-to-end | dev `:5199` | canonical |
| `qa-screens.mjs` | Screen-gallery screenshots | dev `:5199` | canonical |
| `qa-pre-pack.mjs` | Menu → pack → level journey (taps via `window.__app.targets()`) | dev `:5199` | canonical |
| `qa-menu-pack.mjs` | Menu pack-card states (fresh / in-progress / badge) | dev `:5199` | one-off |
| `qa-persistence.mjs` | v1 save migration + relaunch persistence + storage resilience probes (quota-denied writes, denied-storage boot) | dev `:5199` | canonical |
| `qa-numerals.mjs` | Numerals pack trace QA | dev `:5199` | canonical |
| `qa-pack-app.mjs` | Numbers pack full app flow | preview | canonical |
| `qa-pack-badge.mjs` | Numbers badge chain (10 numerals → celebration → collection) | dev `:5199` | canonical |
| `qa-offline.mjs` | SW install → fully-offline cold-start probe | preview `:4173` | canonical |
| `qa-update.mjs` | Update lifecycle: waiting SW proven on a sandboxed `dist/` copy (run `pnpm build` first) | none — self-served `:4185` | canonical |
| `qa-perf.mjs` | Perf sampling (cold boot / input latency / frame times) | preview | canonical |
| `qa-letters-pack.mjs` | Letters pack journey: two pages + pager, level A, harness trace | dev `:5199` | canonical |
| `qa-letters-glyphs.mjs` | Per-glyph harness screenshots — A–Z + `ABC`/`MOM`/`ZOO` | dev `:5199` | utility |
| `qa-letters-rewards.mjs` | Letters reward chain: 25 cleared → z → badge → bonus | dev `:5199` | canonical |
| `qa-letters-sweep.mjs` | Traces all 29 letters levels end-to-end in one chain | dev `:5199` | canonical |
| `qa-name.mjs` | My Name journey: gate → name overlay → 4-card menu → trace → sticker/badge → reload persistence → clear | preview `:4173` | canonical |
| `qa-name-hostile.mjs` | Hostile stored-name fixtures: boot + first-save sanitize rewrite | preview (URL arg) | canonical |
| `qa-name-art.mjs` | Name reward art screenshots (menu/pack/level/success/badge) on a seeded `AVA` save | dev `:5199` | one-off |
| `qa-cast.mjs` | Cast presence journey: mascot tap → giggle (+ throttle), entrance settle, star blink series, per-cast flourish shots, no-interference (cards / skin button / gate) | preview (URL arg) | canonical |
| `qa-parent-zone.mjs` | Parent zone end-to-end: one-time hint → one-finger hold (ring + burst shots) → sound tour with storage asserts (auto-unmute, pips, volume) → zone cards → restart confirm → install variants (android/ios/generic/installed) → hostile-settings boot (folded in the former `qa-gate-ring` + `qa-install-variants` one-offs) | dev `:5199` | canonical |
| `qa-letters-parity.mjs` | Four-skin smoke — boots + opens a letter per skin | dev `:5199` | one-off |
| `qa-menu-dots.mjs` | Menu dot-wrap check with a seeded 5/26 save | dev `:5199` | one-off |
| `qa-sticker-play.mjs` | Sticker play: first-open pulse → board → tap notes (oscillator-frequency captured) → reload/fresh-save semantics → 29-slot letters fit | dev `:5199` | canonical |
| `qa-perf-pack.mjs` | Pack-screen frame sampling with a seeded clear save | preview `:4173` | utility |
| `qa-landscape.mjs` | Canonical portrait + landscape matrix: per-screen sweeps, rotation reflow with progress kept, field/target assertions, screenshots (landscape-layout_20260917) | dev | canonical |
| `qa-pack-preview.mjs` | Pack preview harness smoke over every JSON pack: spot-checks first/middle/last level + first bonus per pack (or `--all` for every level), checkpoint counts, default-url fallback (pack-pipeline_20260917; all packs since pack-pipeline-2_20260917) | dev `:5199` | canonical |
| `qa-blink.mjs` · `qa-blinkshot.mjs` | Rive blink-frame screenshots (`play.html`) | dev `:5176` | one-off |
| `qa-dino-blink.mjs` | Dino rebuild blink burst — 32 frames for mid-blink parity (`play.html`) | dev `:5199` | one-off |
| `qa-teddy.mjs` | Teddy character smoke — `play.html?char=teddy`: trace + celebrate + page errors | dev `:5199` | one-off |
| `qa-teddy-screens.mjs` | Teddy real-app screens (menu/pack/level/success/parent) with the skin seeded | dev (URL arg; default `:5200`) | one-off |
| `qa-crop.mjs` · `qa-midshot.mjs` · `qa-sheet.mjs` · `qa-zoom.mjs` | Screenshot utilities — cropping, mid-trace shots, contact sheets, magnified crops | any | utility |
| `qa-smoke.mjs` | Canonical smoke — boots the production build, traces `pre-1` to success with step assertions + a zero-page-error gate (runs in every CI verify job) | preview `:4173` | canonical |
*Status legend: **canonical** = kept and referenced · **one-off** = kept for
reference · **utility** = reusable helper. Statuses confirmed in
`repo-organization_20260916` (Phases 2–4, 2026-09-16); `qa-parent-zone` added
in `parent-zone_20260917` (2026-09-17); `qa-pack-preview` added in
`pack-pipeline_20260917` (2026-09-17) and extended to every JSON pack in
`pack-pipeline-2_20260917` (2026-09-17); the stale category is now empty — its
four members (`qa-diag-pre3`, `qa-probe`, `browsertest`, `serve`) were removed
in `ci-qa-hardening_20260917` (2026-09-17), which also added `qa-smoke`
(canonical, runs in CI).*

> Smoke usage (two terminals): 1) `pnpm preview` (production build on `:4173`;
> `pnpm serve` for LAN devices) — 2) `node dev/qa/qa-smoke.mjs`. CI runs the
> same pair after `pnpm build`; artifacts land in `dev/qa/out/qa-smoke/`.

> First-run note: `qa-harness.mjs` can exceed its 30 s `window.__qa` wait on a
> cold Vite optimize right after the dev server starts — warm the server (load
> `/dev/harness/play.html` once) or simply re-run; warm runs are green.

## Pack preview harness (`harness/pack.html`)

Visual authoring loop for declarative packs (`src/packs/data/*.json`, see
`src/packs/data/README.md` for the format): open
`http://localhost:5199/dev/harness/pack.html?pack=pre&level=pre-7` on the dev
server. It renders the level exactly as authored — field gutters at the 24 pt
margin, each stroke as its own color over the engine-resampled path, numbered
control points, the start star, the goal flag, and the six
equal-arc-length checkpoint circles. `?pack=` defaults to the first pack
alphabetically (currently `abc`), `?level=` to its first level; click the
canvas to read field coordinates from the browser console. Reloading picks up
JSON edits without an app rebuild. `node dev/qa/qa-pack-preview.mjs [baseUrl]
[--all]` spot-checks the first/middle/last level plus first bonus of every
pack — `--all` sweeps every level of every JSON pack (54: 15 pre + 10 numbers
+ 29 letters) — and writes shots to `dev/qa/out/`.

## Art-source policy

- `art-src/<pack>/` tracks the **approved cutout layer + derived composites**
  (what the shipped art was built from)
- Shipped format: `public/art/**` is **WebP** (browser-canvas encode; per-class
  quality — backdrops ≈0.8, cutouts ≈0.85). `art-src/` stays lossless PNG;
  icons/favicons remain PNG. Composers (`opt-art`/`opt-pre`/`card`/`vignette`/
  `letters-compose`/`name-rewards`/`faces`) write the shipped WebP directly.
- Raw generations (flux originals) stay **untracked** — regenerate with
  `tools/gen.mjs` when needed
- `art-src/nums/`: `clean-*` cutouts + `vig-*`/card composites are kept; the
  raw `goal-*` / `sticker-*` / `numeral-*` / `obj-*` / `badge-*` layers were
  removed 2026-09-16 (nothing consumes them — `card.mjs` and `vignette.mjs`
  read `clean-*` only)
- Characters: shipped `.riv` binaries live in `public/rive/`; authoring sources
  live in `characters/<name>/`

## Payload budget

`pnpm budget` (`tools/dist-budget.mjs`) checks the built `dist/` against the
payload ceilings — **5.00 MB total / 150 precache entries**, re-anchored from
the post-diet build (4,161,522 B / 133 entries) to the merged build that
includes the fifth skin (2026-09-17, PR #7 teddy: 4,641,746 B / 136 entries;
history + rationale live in the tool). Run it after `pnpm build`; CI runs it
after the build step too. A re-introduced lossless art batch trips it
instantly — raise the ceilings only deliberately, with fresh measurements
(`conductor/archive/payload-diet_20260916/measurements.md`).
