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
| `harness/` | Dev pages: `play.html` (single level) · `screens.html` (screen gallery) · `tune.html` (feel tuning) — served by the Vite dev server |
| `characters/` | Rive authoring workspaces — `dino4` (canonical dino; earlier `dino`/`dino2`/`dino3` iterations removed 2026-09-16) · `star` · `excavator` · `lion`; each is a `rive` CLI project (`rive . --verify`); shipped `.riv` binaries are tracked in `public/rive/` |
| `art-src/` | Per-pack art intermediates — `<pack>/` keeps the approved cutout layer + derived composites |

`package.json` carries the `playwright-core` dependency for the QA scripts —
run `pnpm install` inside `dev/` once.

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
4. `node tools/opt-art.mjs` · `opt-pre.mjs` — downscale + compress into `public/art/…`
5. `composite` · `vignette` · `card` · `pre-sheet` · `gen-rewards` — compose final art; **screenshot and look at it**
6. Characters: author in `characters/<name>/` with the rive CLI
   (RML → `rive . --verify` → `rive . --once` → screenshots)

Exact flags: read the header comment of each script (every script documents
its usage).

## QA scripts (headless Edge)

Start the right server first, then run the script (most accept a URL argument).

| Server | Command | Typical consumers |
| --- | --- | --- |
| Production preview `:4173` | `pnpm preview` (LAN: `pnpm serve`) | `qa-app`, `qa-pack-app`, `qa-offline`, `qa-perf` |
| Dev server `:5199` | `pnpm exec vite --port 5199 --strictPort` | `qa-harness`, `qa-pre-pack`, `qa-menu-pack`, `qa-persistence`, `qa-pack-badge` |

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
| `qa-letters-parity.mjs` | Four-skin smoke — boots + opens a letter per skin | dev `:5199` | one-off |
| `qa-menu-dots.mjs` | Menu dot-wrap check with a seeded 5/26 save | dev `:5199` | one-off |
| `qa-perf-pack.mjs` | Pack-screen frame sampling with a seeded clear save | preview `:4173` | utility |
| `qa-viewport.mjs` | Viewport-matrix screenshots | dev | one-off |
| `qa-blink.mjs` · `qa-blinkshot.mjs` | Rive blink-frame screenshots (`play.html`) | dev `:5176` | one-off |
| `qa-crop.mjs` · `qa-midshot.mjs` · `qa-sheet.mjs` | Screenshot utilities — cropping, mid-trace shots, contact sheets | any | utility |
| `qa-diag-pre3.mjs` · `qa-probe.mjs` | Retired debugging probes | — | stale |
| `browsertest.mjs` · `serve.mjs` | Old spike-page driver + static server (its page no longer exists) | — | stale |

*Status legend: **canonical** = kept and referenced · **one-off** = kept for
reference · **utility** = reusable helper · **stale** = superseded, candidates
for removal. Statuses confirmed in `repo-organization_20260916` (Phases 2–4,
2026-09-16).*

> First-run note: `qa-harness.mjs` can exceed its 30 s `window.__qa` wait on a
> cold Vite optimize right after the dev server starts — warm the server (load
> `/dev/harness/play.html` once) or simply re-run; warm runs are green.

## Art-source policy

- `art-src/<pack>/` tracks the **approved cutout layer + derived composites**
  (what the shipped art was built from)
- Raw generations (flux originals) stay **untracked** — regenerate with
  `tools/gen.mjs` when needed
- `art-src/nums/`: `clean-*` cutouts + `vig-*`/card composites are kept; the
  raw `goal-*` / `sticker-*` / `numeral-*` / `obj-*` / `badge-*` layers were
  removed 2026-09-16 (nothing consumes them — `card.mjs` and `vignette.mjs`
  read `clean-*` only)
- Characters: shipped `.riv` binaries live in `public/rive/`; authoring sources
  live in `characters/<name>/`
