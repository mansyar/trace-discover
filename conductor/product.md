# Product Definition: Trace & Discover!

## Description

A mobile-first, installable PWA where toddlers (~3–4 years) build fine-motor control and pre-writing skills by tracing generous, guided paths across three playful worlds — 🦖 Dinosaur Trail, 🚜 Construction Site, and 🦁 Animal Friends. Each of the 12 levels (+3 bonus circles) pairs a code-drawn path with an AI-generated, Rive-animated character: the child drags a glowing tip along the trail (paint-fill reveals progress, a pentatonic chime per checkpoint), the character hops to its goal and celebrates, and a sticker flies into the theme's collection. Zero-text, zero-network, zero-failure-state: fully offline, sounds-only, tuned for little fingers on Android phones and iPads — built at $0 with an agent-driven asset pipeline.

## Vision

Give a 3.5-year-old a joyful first taste of "writing" — no text, no timers, no failure states. Every stroke she completes turns into music, motion, and a sticker.

Long-term direction: a **letters & numbers tracing pack** that continues the stroke curriculum. The architecture (path engine + Rive characters + sticker loop) is designed so that pack is *content*, not code.

*2026-09-15 — Numbers pack, Part 1 (numerals 0–9 with the star guide: pack screen, multi-stroke engine, counted reward) implemented on local branch `track/letters-numbers-pack` — awaiting the merge/release decision. Letters A–Z remain the planned follow-up.*

## Target Audience

- **Primary — toddlers ~3–4 years old** (starting at ~3.5): one-hand touch, short attention spans, no reading. Need instant feedback, generous tolerance, zero dead-ends.
- **Secondary — parents/caregivers**: safe, offline, no ads/accounts; settings behind a 2-finger gate; easy home-screen install.

## Core Features (v1)

- 12 levels (3 themes × 4 stroke patterns: line, wave, arc, zigzag) + 1 bonus circle per theme
- Continuous trail-tip engine: forgiving start zone, capped speed (no skip-swipe), ~12% tolerance, paint-fill feedback
- No-fail assists: lift keeps progress · star nudge at 2s · hand-hint at 4s · gentle auto-assist + parent toggle
- Pentatonic audio: chime per checkpoint, chord resolve + fanfare on completion
- Reward loop: sticker per level, badge + bonus pattern per theme
- Zero-text UI: theme cards → level cards + sticker slots → 3-icon success screen
- Parent zone (2-finger hold): volume, easier tracing, reset progress, install guide
- PWA: installable, standalone, fully offline after first load

## Success Criteria

- **Independent play** — she can start and finish levels mostly unaided within a session or two of first contact; tolerance, hints, and assists do their job.

## Out of Scope (v1)

Letters/numbers tracing · accounts/cloud sync · spoken voice/localization · store shipping/monetization · parent dashboards · additional themes.

## Technical Constraints

- **$0 lane**: no paid services; local pipeline only
- All art via the agent pipeline (Rive CLI + Workers AI)
- Each character ≤ ~500 KB; the whole app must cache for offline play
