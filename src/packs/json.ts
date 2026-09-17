// Turns raw pack JSON (imported from `src/packs/data/*.json`) into a validated
// `PackEntry`. Shape checks live in `parser.ts`; geometry + pack rules are
// wired through here (validateLevel / createPackEntry) so load-time failures
// carry a labeled, actionable message.
import type { PackEntry } from './pack';
import { createPackEntry } from './pack';
import { parseRawPack } from './parser';

/** Parses raw pack JSON into a validated pack; throws on any malformed data. */
export function parsePackJson(raw: unknown): PackEntry {
  const pack = parseRawPack(raw);
  return createPackEntry({
    badgeId: pack.badgeId,
    bonusUnlocks: pack.bonusUnlocks,
    bonuses: pack.bonuses,
    id: pack.id,
    levels: pack.levels,
    menuFill: pack.menuFill,
  });
}
