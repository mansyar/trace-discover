# Integrated verification — 20261026-budget-entry-guard

- **Track:** 20261026-budget-entry-guard — The payload budget's entry ceiling no longer measures anything
- **Branch:** `fix/20261026-budget-entry-guard`
- **Base:** `5e37a98` (origin/master) → phase checkpoint `e71495a` → state `a4a7359`
- **Date:** 2026-10-26
- **Result:** verified

The track has one implementation phase, so the integrated run is the configured
strategy executed end to end on the branch after the phase was accepted — not a
repeat of a single layer.

## Commands

| Layer | Command | Exit | Summary |
| --- | --- | --- | --- |
| static | `CI=true pnpm check` | 0 | Biome clean on 143 files; `tsc --noEmit` clean |
| data | `pnpm pack:check` | 0 | Every pack JSON validates |
| unit + coverage | `CI=true pnpm test --coverage` | 0 | 67 files / 928 tests; 82.12 / 83.33 / 93.7 / 81.79 against 72 / 76 / 88 / 72 |
| build | `pnpm build` | 0 | PWA generates `sw.js` + `workbox-e4022e15.js`, 10 precache entries (1144.72 KiB) |
| budget | `pnpm budget` | 0 | `entries 197 / 200 - PASS`, total 5,564,592 / 6,000,000 B, precache 10 informational |
| behavior | `node dev/tools/dist-budget.mjs --entries 196` | 1 | `FAIL entries 197 > 196 shipped files` — the guard bites on the real tree |

## Summary

- The guard's own behavior is proven in both directions on the real build
  (197/200 passes, 196 fails) and on fixtures inside the unit suite.
- The shipped output is byte-identical in total to the pre-track build
  (5,564,592 B), so the tool change cannot have altered the app.
- No new dependency; `pnpm-lock.yaml` and `dev/pnpm-lock.yaml` are untouched.
- Coverage is unmoved because `dev/tools/**` is excluded from the coverage
  boundary; the new suite still runs inside the gate (67 files, up from 66).

## Notes

- `qa-smoke` is part of CI but not of `verify_phase`; this track changes no app
  code, and the built bundle is byte-identical in total, so no browser probe was
  re-run for it.
- The phase executor and the verifying agent were the same (no code-editing
  subagent in this host); see `phase-1.md` for the disclosure.
