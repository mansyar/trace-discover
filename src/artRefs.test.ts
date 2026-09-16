// Art-reference invariant (payload-diet_20260916): every art URL the app can
// request must resolve to a shipped file under `public/art/`, encoded as WebP.
// The enumeration mirrors the real request families: pack menu cards and
// badges, skin backdrops and face icons, per-level goal vignettes, and
// per-level stickers (level presentation + pack sticker shelf). Shipped files
// are resolved through `import.meta.glob` — Vite's view of what the bundle
// serves — because the client tsconfig carries no Node types in tests.
import { describe, expect, it } from 'vitest';
import { menuCardArtUrl, packBadgeArtUrl } from './app/packArt';
import { levelPresentation } from './app/skinSwap';
import { allPacks } from './packs/catalog';
import { SKINS } from './skins/skins';

// Glob keys look like "/public/art/bg/dino.webp" for a served URL "/art/bg/dino.webp".
const SHIPPED = new Set(Object.keys(import.meta.glob('/public/art/**/*')));

/** Served file key for an app art URL, or null when nothing ships there. */
function artFile(url: string): string | null {
  const key = `/public${url}`;
  return SHIPPED.has(key) ? key : null;
}

// Sequence bonuses ship goal vignettes but no sticker art; their completion
// renders without one (pre-existing, unchanged by this track).
const STICKERLESS_LEVELS = new Set(['abc-bonus-1', 'abc-bonus-2', 'abc-bonus-3']);

describe('art references', () => {
  it('resolves every referenced art URL to an existing WebP file', () => {
    const urls = new Set<string>();
    for (const pack of allPacks()) {
      urls.add(menuCardArtUrl(pack.id));
      urls.add(packBadgeArtUrl(pack.id));
    }
    for (const skin of SKINS) {
      urls.add(skin.backdrop);
      urls.add(skin.face);
      for (const pack of allPacks()) {
        for (const level of pack.levels) {
          urls.add(level.goalArt);
          if (!STICKERLESS_LEVELS.has(level.id)) {
            urls.add(levelPresentation(skin, level).sticker);
          }
        }
      }
    }
    for (const url of urls) {
      expect(url.endsWith('.webp'), `${url} is not WebP`).toBe(true);
      expect(artFile(url), `${url} does not exist under public/`).not.toBeNull();
    }
  });

  it('resolves a known shipped file (positive control)', () => {
    expect(artFile('/art/bg/dino.webp')).not.toBeNull();
  });

  it('reports a missing file as missing (hostile control)', () => {
    expect(artFile('/art/goal/definitely-missing.webp')).toBeNull();
  });
});
