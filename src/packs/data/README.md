# Pack JSON format

Declarative pack content. One JSON file per pack. The file is the source of
truth for a pack's levels, bonuses, badge, and menu card; `src/packs/json.ts`
parses and validates it (see "Validation" below).

Files in this directory are imported at build time and bundled into the app —
they are never fetched at runtime (offline-first).

## File shape

```jsonc
{
  "id": "pre",                     // pack id; also the level-id prefix (`pre-1`)
  "badgeId": "pre-badge",          // completion badge id (used by the save)
  "menuFill": "#a8d8b9",           // menu card fill color (CSS hex)
  "bonusUnlocks": [4, 8, 12],      // optional — bonus circle unlock rule (see below)
  "levels": [ /* LevelDef[] */ ],  // ordered main levels (≥ 1)
  "bonuses": [ /* LevelDef[] */ ]  // optional bonus levels (may be omitted)
}
```

### LevelDef

```jsonc
{
  "id": "pre-1",                   // unique, non-empty
  "goal": { "x": 285, "y": 430 },  // endpoint where the goal vignette appears
  "goalArt": "/art/goal/pre-1.webp", // bundle path under /art/goal/ (see rules)
  "stroke": "line",                // classification: line | wave | arc | zigzag | circle
  "strokes": [                     // ordered strokes, traced in sequence
    [ { "x": 145, "y": 430 }, { "x": 215, "y": 430 }, { "x": 285, "y": 430 } ]
  ]
}
```

`strokes` is an array of polylines; each polyline is a list of control points.
Points are Catmull-Rom-smoothed and resampled by the engine at runtime, so a
handful of well-placed control points is enough — you do not need to sample a
curve densely.

**Bonus circles** (`bonusUnlocks` + `bonuses`):
- `bonusUnlocks` — one threshold per bonus: a bonus unlocks once that many main
  levels are cleared. The list length must equal `bonuses`. Omit both for packs
  without bonuses. The parser requires exactly one threshold per bonus, and the
  final threshold must equal the number of main levels (all bonuses unlock by
  the time the pack is complete).
- Bonus circles use `"stroke": "circle"` and close their loop (last control
  point equals the first).

## Authoring rules (enforced by the parser)

- **Field space:** all coordinates are authored in the portrait 430×860 design
  space. Levels are orientation-agnostic — the runtime reflows for landscape.
- **Margin:** every control point and the `goal` must sit inside the field with
  a 24-point margin (24 ≤ x ≤ 406, 24 ≤ y ≤ 836).
- **Stroke points:** every stroke needs ≥ 2 control points; coordinates must be
  finite numbers; duplicate consecutive control points are rejected.
- **Goal art:** `goalArt` must be a bundle path under `/art/goal/`, no traversal
  (for example `/art/goal/pre-1.webp`). The art itself ships in `public/art/goal/`.
- **Unknown keys are rejected** — a typo such as `goals` for `goal` fails
  loudly instead of silently changing behavior.
- **Menu fill:** any CSS hex color the menu renderer accepts (the current packs
  use the palette established in earlier tracks).

## Validation

Two layers, one parser — `parsePackJson(raw)` in `src/packs/json.ts`:

1. **Load time** (dev and production): pack modules wrap the JSON with
   `parsePackJson`, which throws a labeled error if anything is malformed.
   A broken pack cannot reach play.
2. **Author time:** `pnpm pack:check` validates every `src/packs/data/*.json`
   and prints per-file, per-level problems. Run it before committing content
   changes; CI runs it alongside the other gates.

Geometry and pack rules reuse the engine's own semantics: `validateLevel`
(margin, point count, finiteness, duplicate points) and `createPackEntry`
(non-empty levels, one unlock threshold per bonus).

## Example: a complete minimal pack

```jsonc
{
  "id": "demo",
  "badgeId": "demo-badge",
  "menuFill": "#f3c969",
  "levels": [
    {
      "id": "demo-1",
      "goal": { "x": 285, "y": 430 },
      "goalArt": "/art/goal/demo-1.webp",
      "stroke": "line",
      "strokes": [
        [
          { "x": 145, "y": 430 },
          { "x": 215, "y": 430 },
          { "x": 285, "y": 430 }
        ]
      ]
    }
  ]
}
```

The static packs are all authored in this format: `pre.json` (12 levels + 3
bonuses), `numbers.json` (10 numerals, no bonuses), and `abc.json` (26 uppercase
letters + 3 sequence bonuses) — read any of them for a complete example. The My
Name mini-pack stays runtime-composed from the letter glyphs
(`src/packs/name.ts`), never a JSON file.
