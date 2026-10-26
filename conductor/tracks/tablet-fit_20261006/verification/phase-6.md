# Phase 6 verification — QA matrix, device pass, docs, acceptance

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** 6 — QA matrix, device pass, docs, acceptance
- **Date:** 2026-10-26
- **Branch:** `track/tablet-fit`
- **Base:** `928b7a6` (Phase 5 checkpoint)
- **Head:** recorded with the phase commit
- **Result:** P6.T1, P6.T2 and P6.T4 complete; **P6.T3 (device pass) pending the owner's hardware**

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| check | `CI=true pnpm check` | 0 | Biome 143 files, `tsc --noEmit` clean |
| test | `CI=true pnpm test` | 0 | 916 tests (66 files) |
| qa (matrix) | `cd dev && node qa/qa-tablet.mjs` | 0 | **170 assertions, 51 shots, 0 failures** |
| qa (landscape) | `cd dev && PORT=5199 node qa/qa-landscape.mjs` | 0 | 39 assertions, `landscape QA passed` |
| qa (zero text) | `cd dev && node qa/qa-animals-zerotext.mjs http://localhost:4173` | 0 | splash / menu / pack / level all clean |
| qa (offline) | `cd dev && node qa/qa-offline.mjs http://localhost:4173/ pre-1` | 0 | 187/187 content, no gate, `pre-1` traces offline, stand-ins heal |
| qa (perf) | `cd dev && node qa/qa-perf.mjs http://localhost:4173/ pre-1` | 0 | 140–180 ms boot, 2.0–2.9 ms input-to-frame, p95 4.30 ms |
| budget | `pnpm build && pnpm budget` | 0 | 5,564,571 B / 10 entries (ceilings 6,000,000 B / 200) |

## P6.T1 — the canonical matrix

`dev/qa/qa-tablet.mjs` consolidates the phase evidence into one probe. Per tablet space (4:3 and
16:10, portrait and landscape) it sweeps splash, menu, pack page one and two, the sticker board,
a level, success, the badge, the parent zone, the install card and the name overlay, asserting
for each screen:

- **field fill** — the play field covers the viewport with a bar of at most 1 px (exact anchors
  leave none);
- **target floors** — every exposed target keeps half a toddler floor (45 units) from each edge
  and a full floor (90) from its neighbours;
- **target counts** — the menu exposes 8 (six packs + gate + skin switch), the parent zone 9, the
  level only the skin switch;
- **the name input font** — at least 16 px (iOS's no-zoom floor).

It also covers the two cases the per-phase probes could not:

- **nearest anchor** — a 1080×1920 (Android 3:2) viewport selects `slate-portrait`, the field is
  centered, the bars are symmetric and each is 96 px = 5 % per side of the 10 % area letterbox;
- **rotation reflow** — mid-menu and mid-trace, portrait → landscape → portrait, for both tablet
  families: the space re-selects, the menu survives, the level keeps its id, stroke index and
  proportional progress (±0.02), the rotated run completes, and the success screen survives the
  rotate back.

Run log: `dev/qa/out/tablet/run.log`; gallery `dev/qa/out/tablet/gallery.html`.

## P6.T2 — regression sweep, and one stale probe fixed

**`qa-landscape` was stale, not broken.** Its `assertFieldAndTargets` hard-coded the phone design
box (`860×430` / `430×860`) and asserted the field kept *that* aspect. Its own tablet case runs at
1180×820, which now resolves to `tablet-landscape` (1280×960), so the assertion — correct before
this track — became false against the feature. The probe now reads `window.__app.space()` and
asserts the field matches the **active** space's aspect with every target inside it, which is
stricter than the old fixed box (it would catch a space/aspect mismatch on any of the six
spaces). 39 assertions pass.

**The zero-text audit was stale in the same way.** `qa-animals-zerotext.mjs` assumed all six packs
sit on a fresh menu; the menu is progressive, so it now seeds the mixed six-pack save and waits
for each screen before auditing. splash / menu / pack / level are clean — no text nodes on any
child surface.

**Offline cold start is unchanged:** 187/187 content assets cached, a returning boot decided the
gate 97 ms after load with no gate shown, `pre-1` traced offline, and a level opened on drawn
stand-ins healed to real art when connectivity returned (content cache 187/187).

**Perf spot-check** (headless Edge on the production build, a smoke bound rather than a device
verdict): cold boot 140–180 ms across three runs, input-to-next-frame 2.0–2.9 ms, frame interval
during a real trace n = 1649–1749, mean 4.28 ms, p95 4.30 ms. The frame numbers match the
pre-track envelope; the boot figure is noisier than the 108 ms recorded in the offline-resilience
session on a different day and machine state, so it is reported as a range, not a regression.

**Budget:** 5,564,571 B of 6,000,000 and 10 of 200 precache entries — **+4,216 B of code over the
pre-track baseline**, no new asset, no new dependency.

## P6.T4 — docs

- `dev/README.md`: `qa-tablet` moved from *planned* to **canonical** with its coverage spelled out,
  and the status legend now names it as the tablet matrix with the per-area probes kept behind it.
- `conductor/tech-stack.md`: dated Phase 6 note with the matrix, the probe corrections, the
  regression numbers, the budget and the open device item.
- `spec.md` FR1 and `tech-stack.md` both corrected the Android 3:2 estimate from **≈6 % total** to
  the measured **96 px bars / 5 % per side / 10 % of the area** (the nearest-anchor rule itself is
  unchanged; only the authoring estimate was wrong).
- `product.md`'s dated note still reads *in progress*; it flips to the completed outcome in the
  track-closing docs sync, which needs the owner's approval.

## Acceptance criteria

| ID | Criterion | Evidence | Status |
| --- | --- | --- | --- |
| AC1 | Every screen fills the viewport on iPad 4:3 and Android 16:10, both orientations | matrix: 41 field-fill assertions (39 exact-anchor at ≤ 1 px bars plus the centered 3:2 case) | met |
| AC2 | Dead space on 1024×1366 drops from ~170 px per side to zero | field = viewport at the exact 4:3 anchor (0 px bars); 1024×1366 resolves to `tablet-portrait` | met |
| AC3 | All child screens in-bounds with target floors | matrix + `qa-tablet-surfaces` (77 shots) | met |
| AC4 | Rotating mid-trace loses no progress, no crash, instant reflow | matrix rotations: stroke index kept, progress ratio ±0.02, run completes, both families both directions | met |
| AC5 | Backdrops cover the field with the anchor held, per skin | `qa-tablet-backdrops` (122 assertions, 40 shots); the animals band filed as issue #22 | met (owner-accepted) |
| AC6 | Phones unchanged vs v1.7.0 | no phone rule changed: every new factor is neutral on both references and test-locked; both phone references ride every probe | met (screenshots in the galleries; pixel diff is the device pass) |
| AC7 | Parent zone, overlay and install panel usable; keyboard never covers the field | `qa-tablet-parent` (24 shots) + layout tests; the soft-keyboard lift needs hardware | **partial — device pass** |
| AC8 | `qa-tablet` green, `qa-landscape` green, zero-text, offline, budget | as above | met |
| AC9 | Coverage > 80 % on new logic, docs synced, review passed, device pass confirmed | coverage 82.12 / 83.30 / 93.70 / 81.79, `parentZone.ts` + `install.ts` 100 %; review and device pass still open | **partial** |

## Evidence paths

- `dev/qa/qa-tablet.mjs` — the canonical matrix (170 assertions, 51 shots, gallery).
- `dev/qa/out/tablet/` — shots, `run.log`, `gallery.html`.
- `dev/qa/out/landscape-run.log`, `qa/out/offline-run.log`, `qa/out/perf-run.log`,
  `qa/out/zerotext-run.log` — the regression sweep's captured output.
- Phase commit + note (recorded in `plan.md`).

## Deviations

- Two existing probes were corrected rather than left red: `qa-landscape` (reads the active space
  instead of the phone box) and `qa-animals-zerotext` (seeds the six-pack save and waits for each
  screen). Both were stale expectations from the two-space world, and both got stricter, not
  weaker.
- `spec.md` FR1 and `tech-stack.md` carry the corrected 3:2 letterbox measurement.

## Notes

- **P6.T3 is the remaining gate:** iPad + Android tablet fill acceptance, the soft-keyboard lift,
  and a phone portrait/landscape pass against the v1.7.0 baseline. None of it can be proven in
  headless Chromium.
