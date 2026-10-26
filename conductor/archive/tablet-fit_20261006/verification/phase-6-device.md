# Phase 6 verification — QA matrix, device pass, docs, acceptance

- **Track:** tablet-fit_20261006 — Tablet fit — fill the canvas on iPads and Android tablets
- **Phase:** 6 — QA matrix, device pass, docs, acceptance
- **Date:** 2026-10-26
- **Branch:** `track/tablet-fit`
- **Result:** verified (P6.T3 closed by the owner's device pass)

## P6.T3 — device pass (the one item headless Chromium cannot produce)

The branch was served on the LAN from the production build (`pnpm serve --port 4173`,
`http://192.168.0.101:4173/`, also reachable over the tailnet) and the owner ran it on an iPad and an
Android tablet on 2026-10-26 and confirmed:

| Item | What was checked | Outcome |
| --- | --- | --- |
| Fill | splash, menu, pack, level, success, badge, parent zone on the 4:3 iPad and the 16:10 tablet, both orientations — edge to edge, no cream bars | pass |
| Soft keyboard | parent zone → name: the panel lifts so the input and Save / Clear / Cancel stay above the keyboard, and touching the field does not zoom the page | pass |
| Parent zone at tablet size | all nine controls reachable with a thumb, Done at the bottom of the field, trophy caption under its row, install card readable | pass |
| Phone regression | portrait and landscape look exactly like v1.7.0 | pass |

The 3:2 case remains the only space allowed a letterbox bar (96 px, 5 % per side), as designed.

## Why this closes the phase

`qa-tablet.mjs` proves the geometry at four tablet spaces and `qa-landscape.mjs` proves the phone
references, but neither can drive a real soft keyboard, and no headless renderer can confirm a pixel
comparison against the shipped v1.7.0 build. The owner's pass is the acceptance evidence for both,
so every task in the phase is now backed by either an automated assertion or the owner's device run.
