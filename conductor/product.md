# Product Definition: Trace & Discover!

## Description

A mobile-first, installable PWA where toddlers (~3–4 years) build fine-motor control and pre-writing skills by tracing generous, guided paths. Content ships in **packs** — Pre-writing (12 levels + 3 bonus circles), Numbers (0–9), and Letters (uppercase A–Z + `ABC`/`MOM`/`ZOO` word bonuses), plus a personalized **My Name** mini-pack (composed at runtime from the letter glyphs; parent-set, on-device only) — and the child chooses **who comes along** with a one-tap skin switch (🦖 Dino · ⭐ Star · 🚜 Construction · 🦁 Animal Friends · 🐻 Teddy): character, backdrop, accent, and instrument change; progress never does. Each level pairs a code-drawn path with an AI-generated, Rive-animated character: the child drags a glowing tip along the trail (paint-fill reveals progress, a pentatonic chime per checkpoint), the character hops to its goal and celebrates, and a content-neutral sticker flies into the pack's collection. Zero-text, zero-network, zero-failure-state: fully offline, sounds-only, tuned for little fingers on Android phones and iPads — built at $0 with an agent-driven asset pipeline.

## Vision

Give a 3.5-year-old a joyful first taste of "writing" — no text, no timers, no failure states. Every stroke she completes turns into music, motion, and a sticker.

Long-term direction: the architecture — skins × packs + path engine + Rive characters + sticker loop — is designed so new content and new skins are *pipeline work, not code*. Numbers 0–9 and uppercase A–Z already shipped on this foundation, and **My Name** composes personalized levels from the same glyphs; further packs and skins slot into the same pipeline.

*2026-09-15 — Numbers pack, Part 1 (numerals 0–9) merged via PR #2 and released as `v1.0.0` — production live at `trace-discover.pages.dev`. Letters A–Z remain the planned follow-up. Completed on branch `track/skins-and-packs` (2026-09-16): packs × skins, save v3, content-first menu, per-skin audio, re-ramped pre-writing, full reward art — six phases verified incl. device + toddler acceptance; awaiting the merge/release decision.*

*2026-09-16 — Letters pack, Part 2 (uppercase A–Z + `ABC`/`MOM`/`ZOO` sequence bonuses) completed on branch `track/letters-pack`: school-style multi-stroke glyphs, two-page 26-card pack screen, per-stroke celebration hops, object-per-letter reward art (55 assets; offline bundle 9.26 MB / 133 precache entries as measured on the v1.2.0 build — an earlier ~10.3 MB / 148 claim was not reproduced); save remains additive (v3 unchanged). Verified via headless QA suites, four-skin parity, and owner device checks — awaiting the merge/release decision.*

*2026-09-16 — Repo-organization chore (track `repo-organization_20260916`) completed on branch `track/repo-organization`: dev tooling consolidated under `dev/` (tools · qa · harness · characters · art-src) with runbooks in root `README.md` + `dev/README.md`; dead legacy art and raw generation sources pruned. No product behavior change; dist 7.77 → 6.71 MB; awaiting the merge/release decision.*

*2026-09-16 — PWA resilience (track `pwa-resilience_20260916`) completed on branch `track/pwa-resilience`: updates download in the background and apply only on next launch (a running session is never taken over mid-play); progress can no longer be lost to storage trouble — save writes are exception-proof, storage persistence is requested once at boot, and the app stays fully playable even when storage is unavailable (session-only). No visible change for the child; suite 333 tests + update/persistence probes green; device pass on Android + iPad; awaiting the merge/release decision.*

*2026-09-16 — Fifth skin (track `teddy-skin_20260916`) completed on branch `track/teddy-skin`: `teddy` — a family teddy plush restyled through the img2img pipeline (owner-approved master → cutout → Rive) — joins the skin cycle with its cozy-bedroom backdrop, face icon, and music-box voice — the first full proof that new skins are pipeline work, not code. Implemented + acceptance-passed (Android + iPad, speaker check); dist 7.26 MB / precache 79 entries; awaiting the merge/release decision.*

*2026-09-17 — Payload diet (track `payload-diet_20260916`) completed on branch `track/payload-diet`: all shipped raster art re-encoded to WebP at identical dimensions (6.39 → 1.39 MB) and the art pipeline now emits WebP by default; `dino.riv` rebuilt to the cast patch-technique standard (699,844 → 455,201 B — the last over-budget cast member, closing the old accepted deviation); and a `pnpm budget` guard (dist total + precache entries vs documented ceilings) now runs locally and in CI after the build. No child-visible change; offline bundle 9.26 → 4.16 MB (−57%); offline cold-start, letters journey, and perf probes green; awaiting the merge/release decision.*

*2026-09-17 — My Name (track `my-name_20260916`) implemented on branch `track/my-name`, awaiting the merge/release decision: a personalized mini-pack where the parent sets the child's name once (2–7 uppercase letters, behind the 2-finger gate) and the trace level is composed at runtime from the shipped letter glyphs — her own sticker + badge; the name stays on-device (never shipped or networked). QA evidence: full gate probe on the production build, hostile stored-name fixtures, offline cold start + perf spot-check unchanged; device pass on Android + iPad kept the 7-letter cap and the thinning floors (≥5-letter gate satisfied); the toddler traced their name unaided.*

*2026-09-17 — Parent zone improvements (track `parent-zone_20260917`, completed — device pass kept the 2.5s one-finger hold): the parent gate becomes a one-finger press-and-hold with visible progress (replacing the two-finger hold, awkward one-handed on a phone) plus a one-time parent hint for discoverability; the zone gains sound level pips with preview notes and auto-unmute, a platform-aware install guide, section cards, and reactive feedback on every control.*

## Target Audience

- **Primary — toddlers ~3–4 years old** (starting at ~3.5): one-hand touch, short attention spans, no reading. Need instant feedback, generous tolerance, zero dead-ends.
- **Secondary — parents/caregivers**: safe, offline, no ads/accounts; settings behind a one-finger hold gate (with a one-time parent hint); easy home-screen install.

## Core Features

- **Packs × skins architecture** — content and presentation are independent: the child picks *what to trace*; *who comes along* is a tap away
  - **Packs:** Pre-writing (12 levels re-ramped small → medium → large; circles unlock at 4/8/12) · Numbers (0–9, toy-piano counted reward) · Letters (uppercase A–Z in two pages, per-stroke counted reward; `ABC`/`MOM`/`ZOO` bonuses at 9/18/26)
  - **Skins:** 🦖 Dino · ⭐ Star · 🚜 Construction · 🦁 Animal Friends · 🐻 Teddy — character, backdrop, accent, instrument; switchable anytime via the top-left button; persisted
- **My Name mini-pack** — the parent sets the child's name once (behind the parent gate; 2–7 uppercase letters); the trace level is composed at runtime from the shipped letter glyphs — her own sticker and badge, fully on-device
- Continuous trail-tip engine: forgiving start zone, capped speed (no skip-swipe), ~12% tolerance, paint-fill feedback
- No-fail assists: lift keeps progress · star nudge at 2s · hand-hint at 4s · gentle auto-assist + parent toggle
- Pentatonic audio per skin (marimba · bell · woodblock · kalimba · music box): chime per checkpoint, chord resolve + fanfare on completion
- Reward loop: content-neutral sticker per level, badge per pack; legacy world badges shown as display-only trophies
- Zero-text, content-first UI: pack cards → level cards + sticker slots → 3-icon success screen; idle mascot on menu + pack screens
- Parent zone (hold-to-open gate): sound with level pips + preview, easier tracing, skin setter, trophies, reset progress, platform-aware install guide
- PWA: installable, standalone, fully offline after first load

## Success Criteria

- **Independent play** — she can start and finish levels mostly unaided within a session or two of first contact; tolerance, hints, and assists do their job.

## Out of Scope

Lowercase letters & phonics · additional skins beyond the five (drop-in contract proven; further skins remain pipeline work) · accounts/cloud sync · spoken voice/localization · store shipping/monetization · parent dashboards.

## Technical Constraints

- **$0 lane**: no paid services; local pipeline only
- All art via the agent pipeline (Rive CLI + Workers AI)
- Each character ≤ ~500 KB; the whole app must cache for offline play
