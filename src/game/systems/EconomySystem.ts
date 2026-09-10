import { economy } from '../config/economy';
import { dungeon } from '../content/dungeon';
import { manifestationFor } from '../content/manifestations';
import type { PlayerProfile } from '../persistence/Profile';
import { seeded } from './types';
export function dungeonRewards(seed: number, duration: number, firstClear: boolean) {
  const rng = seeded(seed), r = dungeon.rewards;
  const first = firstClear ? r.firstClear : { mass: 0, materials: 0, currency: 0 };
  return { mass: r.mass + Math.floor(rng() * (r.massVariance + 1)) + first.mass, materials: r.materials + Math.floor(rng() * (r.materialVariance + 1)) + first.materials, currency: r.currency + first.currency, firstClearMass: first.mass, firstClear, grade: duration <= r.grades.s ? 'S' : duration <= r.grades.a ? 'A' : duration <= r.grades.b ? 'B' : 'C' };
}
export function grantDungeonRewards(p: PlayerProfile, seed: number, duration: number) {
  const key = `${dungeon.id}:normal`, rewards = dungeonRewards(seed, duration, !p.firstClears.includes(key));
  p.upgradeMaterial += rewards.materials; p.summonCurrency += rewards.currency;
  if (rewards.firstClear) p.firstClears.push(key);
  return rewards;
}
export function enterDungeon(p: PlayerProfile): boolean {
  if (!economy.energyEnabled) return true;
  if (p.energy < dungeon.energyCost) return false; p.energy -= dungeon.energyCost; return true;
}
export function summon(p: PlayerProfile, seed = economy.seed): { id: string; duplicate: boolean; shards: number; pity: boolean } | null {
  if (p.summonCurrency < economy.summonCost) return null;
  const rng = seeded(seed + p.summonCount), unowned = economy.pool.filter(m => !p.ownedManifestations.includes(m.id));
  const pity = p.pity + 1 >= economy.pityAt && unowned.length > 0;
  let id: string;
  if (pity) id = unowned[Math.floor(rng() * unowned.length)].id;
  else { let roll = rng() * economy.pool.reduce((n, m) => n + m.weight, 0); id = economy.pool[economy.pool.length - 1].id; for (const item of economy.pool) { roll -= item.weight; if (roll < 0) { id = item.id; break; } } }
  const duplicate = p.ownedManifestations.includes(id), shards = duplicate ? manifestationFor(id).duplicateShards : 0;
  p.summonCurrency -= economy.summonCost; p.summonCount++; p.pity = duplicate ? Math.min(economy.pityAt - 1, p.pity + 1) : 0;
  if (duplicate) p.resonanceShards += shards; else { p.ownedManifestations.push(id); p.manifestationLevels[id] = 1; }
  return { id, duplicate, shards, pity };
}
export function equipManifestation(p: PlayerProfile, id: string): boolean { if (!p.ownedManifestations.includes(id)) return false; p.equippedManifestation = id; return true; }
export function upgradeManifestation(p: PlayerProfile, id: string): boolean {
  if (!p.ownedManifestations.includes(id)) return false;
  const config = manifestationFor(id).upgrade, level = p.manifestationLevels[id] ?? 1, cost = config.materialCost * level;
  if (level >= config.maxLevel || p.upgradeMaterial < cost) return false;
  p.upgradeMaterial -= cost; p.manifestationLevels[id] = level + 1; return true;
}
