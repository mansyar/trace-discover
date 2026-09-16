// Art-reference invariant (payload-diet_20260916): every art URL the app can
// request must resolve to a shipped file under `public/art/`, encoded as WebP.
// The enumeration mirrors the real request families: pack menu cards and
// badges, skin backdrops and face icons, per-level goal vignettes, and
// per-level stickers (level presentation + pack sticker shelf).
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { menuCardArtUrl, packBadgeArtUrl } from './app/packArt';
import { levelPresentation } from './app/skinSwap';
import { allPacks } from './packs/catalog';
import { SKINS } from './skins/skins';

const PUBLIC = join(process.cwd(), 'public');

/** Shipped file path for an app art URL, or null when nothing ships there. */
function artFile(url: string): string | null {
  const path = join(PUBLIC, url);
  return existsSync(path) ? path : null;
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

  it('reports a missing file as missing (hostile control)', () => {
    expect(artFile('/art/goal/definitely-missing.webp')).toBeNull();
  });
});
