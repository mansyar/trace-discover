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

## After — (to be filled in Phase 5)

| Metric | Baseline | After | Δ |
| --- | --- | --- | --- |
| dist total | 9,711,938 B (9.26 MB) | — | — |
| Precache entries | 133 | — | — |
| `art/` | 6,700,838 B (6.39 MB) | — | — |
| `rive/` | 1,872,706 B (1.79 MB) | — | — |
| `dino.riv` | 699,844 B | — | — |
