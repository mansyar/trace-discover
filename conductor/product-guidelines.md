# Product Guidelines: Trace & Discover!

## Branding

- **Name:** "Trace & Discover!" — child surfaces show the logo *as art* (star on a trace path), never as text
- **Mascot:** the chibi triceratops — sticker style: thick navy outlines, pastel fills, soft gradients
- **Guide character:** always the active skin's buddy (dino · star · construction · animal · teddy) — the star is the app-icon gold star come to life (navy outline, dot eyes, calm bob); joy comes from its entrance hop, tap giggle, and signature celebrate flourish
- **Icon:** happy star finishing a dotted trace path on cream
- **Personality:** cheerful & bouncy — the app behaves like a playmate, not a teacher

## Voice & Tone

- **Children's surfaces: no text at all** — communicate via icons, color, motion, and sound
- **Parent-facing text: warm & plain** — short friendly sentences, no jargon, never patronizing
- **Never urgent** — no countdowns, no "hurry", no red-alert states. Everything can wait.

## UX Principles

1. **Zero failure states** — nothing can be lost, broken, or permanently stuck
2. **Generous touch** — 90px+ targets, ~12% path tolerance, forgiving start zones
3. **Instant feedback** — every touch responds in <100ms (paint-fill, pop, sparkle)
4. **One visible choice at a time** on child screens; parents get the hold-to-open gate
5. **The child always knows what to do** — pulsing start star, replaying hand hint, star nudges
6. **Offline-first always** — no network, no spinners, no ads, no errors
7. **Interruptions are safe** — closing mid-level loses nothing; progress persists locally

## Visual Principles

- Per-theme pastel worlds unified by thick navy outlines, cream UI shell, generous spacing
- High contrast where it teaches: paths, paint-fill, start/goal markers
- Sticker-style art: flat fills, soft gradients, rounded shapes, blush & sparkles
- Characters carry the personality; backgrounds stay calm

## Motion Principles

- Lively, never startling: squash & stretch, hops, confetti — no flashing or jarring cuts
- Motion is the reward: the completion choreography is the most animated moment in the app
- Every animation returns to a calm resting state
- The cast is present even at rest: it hops in at every level start (never blocking the first trace), giggles when tapped, celebrates as itself, and breathes/blinks when idle — subtle, seamless, never in the way

## Audio Principles

- Sounds only — no voice, no words
- Pentatonic (C D E G A): a chime per checkpoint; warm chord resolve + sparkle arpeggio on completion
- Per-theme presets (marimba / kalimba / soft plucks) share one musical language
- Soft UI pops (a single soft instrument note per tap giggle, throttled so notes never stack); nothing loud or sudden; audio unlocks on first touch (iOS)
- No ambient loops required — silence is fine

---

## Amendments

*2026-09-24 — Amended (track `offline-resilience_20260924`, owner-approved 2026-09-24): one drawn readiness wait at first run.* Prior wording — UX Principle 6 (offline-first always: no network, no spinners, no errors) and the Voice & Tone rule that nothing is ever urgent — is narrowed here, not discarded. The app still needs no network to play, still shows no error states, and still counts down nothing. On a first run whose content cache is incomplete, the boot screen may hold with a code-drawn mascot and a traced-path progress indication until the shipped content inventory is cached, because a child who closes the app mid-warm-up otherwise owns a half-offline install. The wait is confined to that path: no text and no numbers, skipped entirely when the cache is complete, skipped when the device is offline, and released after bounded retries when assets keep failing — so every exit is reachable and the wait can never become a dead end. Recorded before implementation per `workflow.md` (Tech Stack is Deliberate).

*2026-09-26 — Outcome (track `offline-resilience_20260924`): the amendment shipped inside its limits and there is nothing further to relax. The gate has only ever been observed on a first run with an incomplete cache while online: a complete cache skips it entirely (a returning user decides in 29–71 ms and sees the plain splash), an offline device plays immediately whatever the cache holds, and exhausted retries release it with the failures named for dev QA. It draws no text and no numbers, shows no failure state, and has not become a dead end — probes hold the closed gate, fill it monotonically, and leave it in one tap, and the owner's Android + iPad pass found nothing child-facing that signals waiting or failure. UX Principle 6 and the never-urgent rule remain narrowed for this one first-run path only; nothing else about offline-first play or tone changed.*
