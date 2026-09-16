# Product Definition: Trace & Discover!

## Description

A mobile-first, installable PWA where toddlers (~3–4 years) build fine-motor control and pre-writing skills by tracing generous, guided paths. Content ships in **packs** — Pre-writing (12 levels + 3 bonus circles), Numbers (0–9), and Letters (uppercase A–Z + `ABC`/`MOM`/`ZOO` word bonuses) — and the child chooses **who comes along** with a one-tap skin switch (🦖 Dino · ⭐ Star · 🚜 Construction · 🦁 Animal Friends): character, backdrop, accent, and instrument change; progress never does. Each level pairs a code-drawn path with an AI-generated, Rive-animated character: the child drags a glowing tip along the trail (paint-fill reveals progress, a pentatonic chime per checkpoint), the character hops to its goal and celebrates, and a content-neutral sticker flies into the pack's collection. Zero-text, zero-network, zero-failure-state: fully offline, sounds-only, tuned for little fingers on Android phones and iPads — built at $0 with an agent-driven asset pipeline.

## Vision

Give a 3.5-year-old a joyful first taste of "writing" — no text, no timers, no failure states. Every stroke she completes turns into music, motion, and a sticker.

Long-term direction: the architecture — skins × packs + path engine + Rive characters + sticker loop — is designed so new content and new skins are *pipeline work, not code*. Numbers 0–9 and uppercase A–Z already shipped on this foundation; further packs and skins slot into the same pipeline.

*2026-09-15 — Numbers pack, Part 1 (numerals 0–9) merged via PR #2 and released as `v1.0.0` — production live at `trace-discover.pages.dev`. Letters A–Z remain the planned follow-up. Completed on branch `track/skins-and-packs` (2026-09-16): packs × skins, save v3, content-first menu, per-skin audio, re-ramped pre-writing, full reward art — six phases verified incl. device + toddler acceptance; awaiting the merge/release decision.*

*2026-09-16 — Letters pack, Part 2 (uppercase A–Z + `ABC`/`MOM`/`ZOO` sequence bonuses) completed on branch `track/letters-pack`: school-style multi-stroke glyphs, two-page 26-card pack screen, per-stroke celebration hops, object-per-letter reward art (55 assets; offline bundle ~10.3 MB); save remains additive (v3 unchanged). Verified via headless QA suites, four-skin parity, and owner device checks — awaiting the merge/release decision.*

## Target Audience

- **Primary — toddlers ~3–4 years old** (starting at ~3.5): one-hand touch, short attention spans, no reading. Need instant feedback, generous tolerance, zero dead-ends.
- **Secondary — parents/caregivers**: safe, offline, no ads/accounts; settings behind a 2-finger gate; easy home-screen install.

## Core Features

- **Packs × skins architecture** — content and presentation are independent: the child picks *what to trace*; *who comes along* is a tap away
  - **Packs:** Pre-writing (12 levels re-ramped small → medium → large; circles unlock at 4/8/12) · Numbers (0–9, toy-piano counted reward) · Letters (uppercase A–Z in two pages, per-stroke counted reward; `ABC`/`MOM`/`ZOO` bonuses at 9/18/26)
  - **Skins:** 🦖 Dino · ⭐ Star · 🚜 Construction · 🦁 Animal Friends — character, backdrop, accent, instrument; switchable anytime via the top-left button; persisted
- Continuous trail-tip engine: forgiving start zone, capped speed (no skip-swipe), ~12% tolerance, paint-fill feedback
- No-fail assists: lift keeps progress · star nudge at 2s · hand-hint at 4s · gentle auto-assist + parent toggle
- Pentatonic audio per skin (marimba · bell · woodblock · kalimba): chime per checkpoint, chord resolve + fanfare on completion
- Reward loop: content-neutral sticker per level, badge per pack; legacy world badges shown as display-only trophies
- Zero-text, content-first UI: pack cards → level cards + sticker slots → 3-icon success screen; idle mascot on menu + pack screens
- Parent zone (2-finger hold): volume, easier tracing, skin setter, trophies, reset progress, install guide
- PWA: installable, standalone, fully offline after first load

## Success Criteria

- **Independent play** — she can start and finish levels mostly unaided within a session or two of first contact; tolerance, hints, and assists do their job.

## Out of Scope

Lowercase letters & phonics · additional skins beyond the four (contract + pipeline documented) · accounts/cloud sync · spoken voice/localization · store shipping/monetization · parent dashboards.

## Technical Constraints

- **$0 lane**: no paid services; local pipeline only
- All art via the agent pipeline (Rive CLI + Workers AI)
- Each character ≤ ~500 KB; the whole app must cache for offline play
