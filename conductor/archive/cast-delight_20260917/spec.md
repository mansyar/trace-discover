# Specification: Cast Delight — character presence pass

**Track ID:** `cast-delight_20260917`
**Type:** Feature
**Status:** new
**Branch:** `track/cast-delight`
**Created:** 2026-09-17

## Overview

The five casts (dino · star · excavator · lion · teddy) are the app's heart,
yet each one currently exposes a single state-machine trigger (`celebrate`),
one idle loop, and a dormant tap affordance. This track is a character-presence
pass: level-start entrances, dedicated per-cast **giggle** tap reactions,
per-cast signature celebrations, and blink parity plus a light idle beat. It is
entirely child-facing and zero-text, and stays in the $0 lane: RML authoring in
the five `dev/characters` workspaces plus app wiring. No save, engine, pack, or
layout changes; star's blink patch is the only new art.

## Functional Requirements

### FR1 — Level-start entrance

- Every level open (fresh, replay via success "replay", next-level via "next")
  shows the active cast hop in from the level's near edge and settle into its
  waiting position, in the existing hop feel (arc + squash), driven by canvas
  transforms — no new Rive assets.
- The entrance is short (~600–900 ms; final value tuned and recorded) and never
  gates input: tracing accepts input from the first frame. If the child starts
  tracing before the hop completes, the entrance resolves immediately and the
  cast settles.
- A soft landing pop may reuse the existing soft-pop palette; it ships silent
  if tuning finds it distracting.
- No entrance on menu/pack/success/badge/parent/splash screens.

### FR2 — Mascot tap reactions ("giggle")

- On menu and pack screens, a tap on the parked mascot fires `giggle`: the
  cast's new short reaction animation, one soft note on the active skin's
  instrument, and a small sparkle burst.
- The tap target is a generous region around the parked mascot (whole sprite
  plus toddler slop; ≈ the field-space mirror of the parked position and
  scale). It never overlaps the parent-gate corner or pack cards/sticker slots;
  existing hits win at any boundary.
- Repeat taps re-fire cleanly with a short note-cooldown so sounds do not
  stack; the animation restarts and always returns to idle.
- No mascot reactions during active levels; the success/badge choreography is
  untouched.
- The dormant RML click listener ("Tap \<Name\>") is redirected to `giggle` for
  coherence; the app-side hit-test is the operative path (the character canvas
  is `pointer-events: none`).

### FR3 — Per-cast signature celebrations

- Each cast's completion celebration becomes its own signature flourish
  authored in RML: distinct motion, same celebratory energy, returning to rest.
- Flourishes fit the existing ~2 s celebrate stage of the choreography timeline
  (glow → hop → celebrate → confetti → sticker → done); confetti/sticker beats
  and completion audio are unchanged.
- The `celebrate` trigger remains the firing contract (session keeps firing
  `celebrate`); the flourish replaces the previous celebrate clip per cast.
- Fallback per cast (documented at tuning): if a flourish is rejected in owner
  review, that cast ships a shared second variant or keeps its current
  celebrate.

### FR4 — Blink parity + idle life

- Star gains a blink using the established blinkpatch technique
  (opacity-animated overlay art), matching the other four casts.
- Every cast's idle loop gains a subtle recurring beat (gentle
  breathe/settle/micro-bob) so resting casts never read frozen. Small
  amplitude, non-startling, seamless loops, cleanly interrupted by
  celebrate/giggle.
- Applies wherever idle plays: the menu/pack mascot and the level waiting spot.

### FR5 — Wiring and integration

- `giggle` fires through the existing `Character.fire` contract (stays
  mockable); the per-cast state-machine contract becomes: autoplay idle +
  `celebrate` + `giggle` triggers.
- The entrance uses the existing hop/transform machinery (code-side).
- Untouched: trace engine, assists, tolerance, level input semantics, screens
  flow, saves/settings, packs data, and the parent gate/zone (in-flight
  parent-zone track — its files and QA probes are avoided).

### FR6 — Docs, persistence, zero-text

- Docs-first per the workflow: `tech-stack.md` (character contract, blinkpatch
  parity, entrance/giggle/celebration semantics, QA additions), `product.md`
  (dated note + character-presence wording), `product-guidelines.md` where
  motion wording requires.
- No save-schema change; nothing persists (reactions are transient); existing
  saves untouched.
- Child surfaces remain zero-text.

### FR7 — QA and tooling

- New probe: entrance settle, mascot tap → giggle, star blink, per-cast
  flourish, throttling, and no-interference with existing hits (cards, skin
  button, gate).
- `dev/screens.ts` preview gains giggle/entrance trigger controls for tuning.
- Affected probes updated with approved baselines; unit tests for the new pure
  helpers (hit region, throttle, entrance timeline) and trigger wiring (mocked
  character).
- Owner screenshot gates per cast.

## Non-Functional Requirements

- Performance: no regression to boot (~137 ms) or input latency (~2.1 ms)
  baselines; every cast ≤ ~500 KB; `pnpm budget` green within the unchanged
  5.00 MB / 150-entry ceilings.
- `pnpm check && pnpm test` green; >80% coverage on new logic; existing flows
  regression-free.
- Tone: lively, never startling; no louder sounds; all motion returns to calm.
- Zero network; no new dependencies.

## Acceptance Criteria

1. Opening any level shows the cast hop in and settle; tracing works
   immediately; early input resolves the entrance gracefully.
2. Mascot tap on menu + pack fires giggle + one instrument note + sparkles;
   repeats are throttled; card/sticker/skin-button/gate hits are unaffected;
   nothing fires during levels.
3. Each cast completes with a distinct flourish fitting the ~2 s stage;
   confetti/sticker timing and completion audio unchanged.
4. Star blinks; all five casts show a light idle beat; celebrations interrupt
   idles cleanly and return to calm.
5. Zero-text audit passes; no save/settings/schema changes; no engine or
   tracing-input changes.
6. Docs updated before implementation (character contract + dated product
   notes).
7. New and updated QA probes green; unit suite + coverage green; budget green
   (cast ≤ ~500 KB).
8. Owner visual sign-off per cast (giggle/entrance/flourish screenshots) +
   Android/iPad device pass.

## Out of Scope

- New casts/skins/packs/content.
- Tracing engine, assists, tolerance, speed, level input handling.
- Save schema/settings.
- Sound palette expansion; spoken audio.
- Success/badge choreography redesign.
- Menu/pack layout changes beyond the mascot hit region.
- Parent zone/gate (in-flight parent-zone track).
- i18n; accounts/cloud/analytics; store shipping/monetization.

## Decisions & Fallbacks

- `giggle` is added as a second trigger per cast; `celebrate` is retained for
  completion; the flourish is a replace-in-place of each cast's celebrate clip.
- The tap hit-test is app-side (consistent with all existing input; the char
  canvas stays `pointer-events: none`).
- Flourishes fit the existing ~2 s stage; a rejected flourish falls back per
  cast (shared second variant or keep current celebrate) and is documented.
- The entrance is non-blocking; early input settles it immediately; the
  landing pop is optional (tune or ship silent).
- The idle beat stays subtle; a distracting cast falls back to blink-parity
  only.
- Star blink art is composed from existing star art with the shipped tools
  (blinkpatch technique).
- Coordination: the parent-zone track owns the gate/zone files; cast-delight
  avoids them and sequences QA probe edits to minimize conflicts.
