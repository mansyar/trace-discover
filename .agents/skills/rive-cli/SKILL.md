---
name: rive-cli
description: >-
  Build and animate Rive (.riv) files from the terminal with the Rive CLI and RML markup —
  reacting characters for web games/PWAs, state machines driven from host JS, image-based
  AI-generated art, and pixel-perfect pose swaps. Use when working with Rive, RML, .riv,
  rive.yaml, rive verify/inspect/screenshot, agent-authored game characters, or the
  dev/tools asset pipeline in this repo.
---

# Rive CLI — Field Guide

Battle-tested workflow for authoring animated characters with the Rive CLI (`rive 1.0.2+`),
RML markup, and image assets. Distilled from building the "dino" characters in
`dev/characters/dino*`; reusable scripts live in `dev/tools/`.

## The golden loop — never skip the screenshot step

1. **Edit** `scene.rml` (+ assets in the project dir).
2. `rive . --verify` — compiles everything (syntax, Luau, shaders); exits non-zero on errors; writes nothing.
3. `rive inspect . --json` — resolved scene tree + `problems[]`; check `problems` is empty.
4. `rive . --once` — build `build/<name>.riv` (unsigned, no login, no watermark).
5. `rive . --screenshot=build/check.png [--advance=N] [--pointer=click@x,y]` — render one frame; **open and look at the PNG**.
6. Iterate. A clean verify+inspect is NOT proof: missing assets, unresolved ids, and wrong-looking renders all pass silently.

Notes:
- `--advance=N` = advance N frames @60fps before the screenshot (no flag = rest pose; previews start at `--advance=1`).
- `--pointer=click@x,y` takes **artboard coordinates** and replays before advancing (`--pointer` then `--advance`).
- `--viewport=WxH` sets size; `--bench=N` gives per-frame perf stats; `--test` runs Tests scripts; `--data=path=value` drives data binding.
- Windows shells don't keep PATH between calls: start each shell with `$env:Path += ";$HOME\.rive\bin"`.
- No account needed for create/preview/verify/build/screenshot. `--publish`/`--rev` need `rive login` — for the $0 lane, stay signed out.

## Values cheat sheet (RML)
- Colors: ARGB hex, NO `#` — e.g. `FFFF5A3C`.
- Booleans: quoted strings (`"true"`). Enums: by name or int.
- Rotation: **radians** (6.2831855 = full turn).
- Animation timing: **frames** @60fps (2 s = `duration="120"`). Transition durations: **milliseconds**.
- Ids: `"0:12"`, unique document-wide; unreferenced elements get ids written back at build (one-time big diff).
- Structure: element = Rive type, attribute = property, nesting = references (`<something>Id` attrs are references; most are set by nesting).
- Look things up, never guess: `rive docs` (format, drawing, transforms, state-machines, layout, data, rigging, gotchas, …), `rive schema <Type>`, `rive schema --search <text>`, `rive schema <Type> --animatable`.

## Drawing gotchas (hard-won)
- **Draw order: first-declared sibling paints ON TOP** (reverse of HTML). Within one shape, paints run last-on-top.
- `Node` (group) transform keys: x/y=13/14, rotation=15, scaleX/scaleY=16/17, opacity=18 (all animatable + bindable).
- Shape owns transforms; geometry owns size (`width` lives on the `Rectangle`, not the Shape).
- Rectangle has **`cornerRadiusTL`** (4 named corners; `linkCornerRadius` defaults true = TL drives all). There is no plain `cornerRadius`.
- Geometry origins are normalized (`originX/Y` default 0.5 = centered).
- Strokes: `thickness`, `cap` round|butt|square, `join` miter|round|bevel. `Feather` replaces the crisp stroke (stack two strokes for glow); inside a `Fill` it renders nothing (use a RadialGradient with alpha-00 outer stop instead).
- Gradients: `LinearGradient`/`RadialGradient` with `GradientStop colorValue position` children — positions default to 0, so always set them explicitly.

## Images (raster pipeline)
- Root asset: `<ImageAsset file="pic.png" name="…" id="…"/>`; node: `<Image assetId="…" x y scaleX scaleY opacity …/>`.
- Build scans the project dir: `.png`/`.jpg`/`.webp` → image, `.luau` → script, `.wgsl` → shader, anything else → blob (typos silently become blobs).
- **Bytes embed into the .riv at build** — self-contained output.
- **A missing/typo'd `file=` builds clean, `problems` stays empty, and the image renders as nothing.** Confirm files exist on disk.
- Image nodes **do NOT receive pointer hits** → add an invisible proxy Shape first (fill `colorValue="01000000"`, alpha 1/255) and point the click listener's `targetId` at the proxy.
- Image nodes animate like nodes: x/y/rotation/scaleX/scaleY/opacity keys all apply (squash & stretch works on raster art).
- SVG/Lottie assets are editor-only (stripped on export — CLI cannot author them). PSD layers are supported via `LayeredAsset`.

## Animations
- `<LinearAnimation duration="180" name="Idle" loopValue="loop">`; keyframes: `<KeyedObject objectId="…"><KeyedProperty propertyKey="N">` → `KeyFrame*`.
- Keyframe type MUST match the property type (`KeyFrameDouble`, `KeyFrameColor`, `KeyFrameUint` for enums, …). A mismatch **silently never animates**.
- `interpolationType` defaults to **hold** — set it explicitly (`linear`, `hold`, `cubic`…). `hold` = instant snap at the key's frame: perfect for pose swaps and blinks.
- Get propertyKey numbers from `rive schema <Type> --animatable` — never guess.

## State machines
- `<StateMachine>` → `<StateMachineLayer>` (each needs `AnyState`, `ExitState`, `EntryState` — all three, even unused) → `AnimationState`s; `EntryState`'s transition picks the start state.
- Transitions are children of the **source** state; `stateToId` = destination; `duration` = ms.
- Play-once-then-leave: `enableExitTime="true" exitTimeIsPercetange="true" exitTime="100"` (the `Percetange` typo is the real API).
- A layer with no inputs/conditions loops its animation forever = free idle.
- Trigger recipe (deprecated but fully working): `<StateMachineTrigger name="celebrate"/>` + `<TransitionTriggerCondition inputId="…"/>`; fire from host JS.
- Tap recipe: `<StateMachineListenerSingle targetId="…" listenerTypeValue="click">` + `<ListenerTriggerChange inputId="…"/>`.
- The artboard plays a machine when `defaultStateMachineId` names it.

## Runtime (web/PWA)
- `npm i @rive-app/canvas-lite` (MIT, ~222 KB brotli). The UMD `rive.js` works with a plain `<script src>` (global `rive`); `rive.wasm` sits next to it.
- `new rive.Rive({ src, canvas, stateMachines: 'State Machine 1', autoplay: true, onLoad })`; call `resizeDrawingSurfaceToCanvas()`; drive from host JS: `r.stateMachineInputs('State Machine 1').find(i => i.name === 'celebrate').fire()`.
- **Luau scripts force `--publish`** (login; signed files; free-plan published files show a Rive splash on play). For the $0 lane: keep `.riv` script-free and drive state machines from host JS. Runtimes are MIT; exported files keep working offline forever.
- `rive create` scaffolds `AGENTS.md` with the edit → verify → inspect contract — keep it.

## AI-art character pipeline (this repo)
1. **Generate** — Cloudflare Workers AI: `flux-1-schnell` (text-to-image, ~1 neuron/image), `flux-2-klein-4b` (image-to-image: fixed 4 steps, multipart `input_image_0`, up to 4 inputs). Use a consistent style suffix ("flat 2d vector illustration… kawaii chibi sticker style, thick dark navy outlines… no text, no words, no letters").
2. **Cut out** — `node tools/cutout.mjs in.png out.png 600 [--box=x0,y0,x1,y1]`: flood-fills background from borders, drops stray components, removes the baked ground shadow, trims + pads + resizes to 600px. **Cut every frame of a character with the SAME `--box`** → pixel-aligned exports.
3. **Scene** — one `scene.rml` per character project; copy `dev/characters/dino4/` as a template (image nodes + idle/celebrate + trigger + tap proxy).
4. **Golden loop** — verify → inspect → build → screenshot → look.
5. **Browser test** — per-character smoke against the harness: load `play.html?char=<name>` on the dev server, drive host `.fire()`, real pointer tap, assert zero page errors — copy `dev/qa/qa-teddy.mjs`; `dev/qa/qa-cast.mjs` is the canonical cast-level journey (preview build).

### Pixel-perfect pose swaps (the blink/flash lesson)
- Whole-drawing swaps are ONLY for full pose changes (e.g. jump). Two AI generations of "the same" character differ in **100k+ pixels across the whole body** — swapping whole drawings for a small change (blink) makes the entire body flash.
- For small changes: keep base art always visible (opacity 1) and overlay a **feathered patch** composited from both drawings:
  `node tools/composite.mjs base.png overlay.png out-full.png out-patch.png --rect=x0,y0,x1,y1 --feather=12 --margin=24`
  Animate the patch node's opacity with `hold` keys (e.g. 0 → 1 @f110 → 0 @f117 inside a 180-frame idle ≈ blink every 3 s), and declare the patch **before** the base in the file (first-declared paints on top).
- **Measure, don't guess**: `node tools/gridshot.mjs in.png out.png --rect=x0,y0,x1,y1 --scale=2 --step=25` renders a zoomed crop with a coordinate grid — read exact pixel positions off it. (`findeyes.mjs` auto-detects eye-white clusters, but blue-tinted sclera can evade thresholds — the grid never lies.)
- Patch node placement math (600px exports): `localX = baseNodeX + (patchCenterX - 300) * baseScale`; same for Y. Then verify visually in a screenshot.

### Jump / squash & stretch
- Airborne = swap in the jump drawing (base opacity → 0, jump → 1, `hold` keys: f10 up, f34 back — land on the sitting drawing).
- Weight = key the parent Node's scaleX/scaleY (crouch 1/0.86 → stretch 1.10/0.94 in air → land 1.15/0.84 → settle 1.04).
- Sparkles = Star nodes scaled 0→1→0 staggered (+rotation wiggle); shrink + dim the ground shadow during flight.

### Size discipline
- 600px PNGs weigh 280–330 KB each; 3 full-frame drawings ≈ 700 KB `.riv`. Cropped patches ≈ 100 KB. Fine for offline PWA caches — prefer patches/crops (and later WebP/512) to keep each character under ~500 KB.

## Silent-failure checklist (the killers)
1. Missing asset file → clean build, nothing renders. Check disk manually.
2. Unresolved id refs (`stateToId`, `animationId`, `inputId`, `targetId`) → NOT errors. Verify visually.
3. Keyframe/property type mismatch → silently never animates.
4. verify + inspect clean ≠ pixels correct — screenshot and look, every time.
5. Draw order is first-on-top (not HTML order).
6. `--pointer` coords are artboard-space and replay BEFORE `--advance`.
7. `hold` is the default interpolationType.
8. `cornerRadiusTL`, not `cornerRadius`.
9. `exitTimeIsPercetange` (typo is the API).
10. Free-plan `--publish` adds a Rive splash → keep script-free + `--once` for the $0 lane.

## Tool reference (dev/tools/)
| tool | usage | purpose |
|---|---|---|
| `gen.mjs` | `node tools/gen.mjs --prompt "…" --out x.png [--w 1024 --h 1024]` | text-to-image (flux-1-schnell) |
| `gen2.mjs` | `node tools/gen2.mjs --image in.png --prompt "…" --out x.png` | image-to-image (flux-2-klein-4b) |
| `cutout.mjs` | `node tools/cutout.mjs in.png out.png 600 [--box=x0,y0,x1,y1]` | bg + shadow removal, fixed-box aligned exports |
| `composite.mjs` | `node tools/composite.mjs base.png overlay.png outFull.png outPatch.png --rect=x0,y0,x1,y1 --feather=12 --margin=24` | feathered patch composite + cropped patch export |
| `gridshot.mjs` | `node tools/gridshot.mjs in.png out.png --rect=x0,y0,x1,y1 --scale=2 --step=25` | zoomed coordinate-grid measurement image |
| `findeyes.mjs` | `node tools/findeyes.mjs sprite.png [--margin=28]` | eye-white cluster detection → patch rect + node coords |
| `pnpm serve` (root) | `pnpm serve` | Vite preview over LAN (:4173) for device testing |
| `qa-teddy.mjs` | `node dev/qa/qa-teddy.mjs` | per-character smoke template (`play.html?char=teddy`): trace + celebrate + page errors |

All tools need `npm i playwright-core` and a local Edge/Chromium install (Windows: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`).
