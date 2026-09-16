# Payload Diet — Measurements

**Track:** `payload-diet_20260916` · **Branch:** `track/payload-diet`

## Baseline — v1.2.0 (measured 2026-09-16, pre-diet)

Method: `pnpm build` on a clean checkout of `origin/master` (`6e4e05d`, v1.2.0), then byte accounting over `dist/` plus a precache-manifest count from `dist/sw.js` — cross-checked against the vite-plugin-pwa report (133 entries / 9,459.34 KiB).

| Metric | Value |
| --- | --- |
| dist total | 9,711,938 B = **9.26 MB** (135 files) |
| Precache manifest | **133 entries / 9,459.34 KiB** (vite-plugin-pwa report) |
| `art/` | 6,700,838 B = 6.39 MB (119 files) |
| `rive/` | 1,872,706 B = 1.79 MB (4 files) |
| other (js / wasm / css / html / icons / manifest / sw) | 1,138,394 B = 1.09 MB |

### Art breakdown (`dist/art` == `public/art`)

| Dir | Files | Bytes | MB |
| --- | --- | --- | --- |
| bg | 4 | 195,555 | 0.19 |
| face | 4 | 393,493 | 0.38 |
| goal | 54 | 3,781,494 | 3.61 |
| pack | 6 | 816,581 | 0.78 |
| sticker | 51 | 1,513,715 | 1.44 |

### Rive cast

| File | Bytes |
| --- | --- |
| dino.riv | 699,844 |
| excavator.riv | 454,122 |
| lion.riv | 457,734 |
| star.riv | 261,006 |

### Discrepancy note (docs vs build)

Conductor docs (letters close-out note, tech-stack `2026-09-16` letters note, product.md letters note) cited **~10.31 MB / 148 precache entries** (product.md: "~10.3 MB"). The fresh v1.2.0 build measures **9.26 MB / 133 entries** — identical to the shipped figure recorded in PR #6 ("133 precache entries / 9459 KiB"). The **measured value is this track's baseline**:

- Targets re-anchored (spec/tech-stack updated 2026-09-16 by the Phase 1 baseline task): **≤ 6.95 MB (≥25% below measured 9.26 MB)**; stretch **≤ ~6.4 MB (~−31%)**.
- Stale doc references to correct at close-out: `conductor/product.md` ("~10.3 MB"). The letters tech-stack note is historical and left as written (superseded by the payload-diet note, which cites the measured value).

## dino.riv rebuild — Phase 3 (2026-09-17)

Method: masters re-cut 600 → 480 px (pure center-anchored HighQualityBicubic resize via System.Drawing — no re-framing, so composition is identical by construction); blink rebuilt with the cast patch technique: the full blink master was reconstructed from the shipped feathered patch (blend at patch center `(332.5, 289)` in 600-space), then `dev/tools/composite.mjs` (rect `128,183,404,280` @480, feather 12, margin 12) produced a 300×121 patch. `scene.rml`: node scales `0.71 → 0.8875` (= 0.71 · 600/480), blink node `x="10.1" y="-11.5"`; animations untouched (same state machine, hold-key blink kept).

| Asset | Before (600 px) | After (480 px) |
| --- | --- | --- |
| dino.png | 280,528 B | 186,204 B |
| jump.png | 315,846 B | 206,952 B |
| blink (full → patch) | 100,960 B | 59,535 B (300×121) |
| **dino4.riv** | **699,844 B** | **455,201 B** (−35.0%) |

Verification: `rive --verify` + `inspect` clean (0 errors / 0 warnings / 0 problems); screenshot parity rest / blink@113 / celebrate@20 vs before — visually identical; actual saving −244,643 B matches the accepted-deviation note's ~240 KB prediction. The `trace-v1` accepted deviation (dino.riv over the ~500 KB cast guideline) is now resolved.

## After — post-diet build (2026-09-17)

Fresh gates run on the final tree: `CI=true pnpm check` (88 files, clean) · `CI=true pnpm test --coverage` **383/383** (38 files) · `pnpm build` · `pnpm budget` PASS.

| Metric | Baseline | After | Δ |
| --- | --- | --- | --- |
| dist total | 9,711,938 B (9.26 MB) | **4,161,522 B (4.16 MB)** | **−5,550,416 B (−57.2%)** |
| Precache entries | 133 | 133 (unchanged — same file set, smaller bytes) | — |
| `art/` | 6,700,838 B (6.39 MB) | **1,394,906 B (1.39 MB)** | −5,305,932 B (−79.2%) |
| `rive/` | 1,872,706 B (1.79 MB) | **1,628,063 B (1.63 MB)** | −244,643 B (−13.1%) |
| `dino.riv` | 699,844 B | **455,201 B** | −244,643 B (−35.0%) |
| Coverage (All files) | — | 98.3% stmts · 91.2% branch · 100% funcs · 98.23% lines | gate: >80% ✓ |

Targets: spec NFR **≤ 6.95 MB (≥25% below baseline)** ✓ met with large margin (−57.2%); stretch **≤ ~6.4 MB** also exceeded. `pnpm budget` ceilings (4.50 MB / 150 entries) pass with documented headroom.

## Acceptance evidence (AC 1–8)

Evidence gathered 2026-09-17 on the final tree (`track/payload-diet`); gates re-run for the record in `dcbc731`.

| # | Criterion (spec) | Evidence |
| --- | --- | --- |
| 1 | dist ≤ 6.95 MB (≥25% below measured 9.26 MB baseline; stretch ≤ ~6.4 MB) | dist **4,161,522 B (4.16 MB) — −57.2%**; precache 133 entries / 4,038.89 KiB; After table above |
| 2 | No `.png`/`.jpg` under `public/art/**` (icons excluded); zero stale references | 0 legacy rasters on disk (119 WebP only); `git grep` for raster literals in `src` clean; `src/artRefs.test.ts` green (producer enumeration + positive + hostile control) |
| 3 | Owner-approved side-by-sides per class; Android + iPad visual pass | Per-class sheets + worst-diff 1:1 focus sheet reviewed/approved pre-migration (edge-antialias jitter only). Device pass: Android + iPad — **owner confirmed all good (2026-09-17)** |
| 4 | `dino.riv` ≤ 500 KB (target ~460 KB); screenshots; in-app burst | **455,201 B (−35.0%)**; `rive --verify`/`inspect` clean; CLI screenshot parity (rest/blink/celebrate, no seam); 32-frame in-app burst (f06 mid-blink, 0 page errors) |
| 5 | `pnpm budget` guard; ceilings documented; CI step; negative control | Pass exit 0 + `--total 3000000` / `--entries 100` controls exit 1 (`aa7ebae`); ceilings **4.50 MB / 150** in root README, dev/README, tech-stack; `ci.yml` step after build (`d65e8f6`). CI red/green proof lands with first push |
| 6 | Offline probe + app/letters sweeps green; boot within baseline | `qa-app`: splash→menu→pack, pre-1..12 + bonuses traced, badge + save v3, 0 errors; `qa-letters-pack`: 2 pages/pager/abc-a, 0 errors; `qa-offline`: cold start + trace SUCCESS; `qa-perf`: boot 137 ms, input 2.1 ms, frames p95 4.30 ms (skins-era 93 ms / 2.7 ms / 4.3 ms) |
| 7 | Full gates green | check 88 clean · test --coverage 383/383 (98.3/91.2/100/98.23) · build · budget PASS |
| 8 | Docs synced; no child-visible change | product.md dated note + stale ~10.3 MB corrected; tech-stack note finalized; dev/README budget section; README quick start. No `src` behavior change (URL literals only; suite untouched-green); qa screenshots confirm pixel parity |
