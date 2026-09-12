import { emptyMaterials, materialIds, type Materials } from '../content/shatteredMoon';
import { B } from '../config/balance';
import { economy } from '../config/economy';
import { evolutions } from '../content/content';
import { manifestations } from '../content/manifestations';
export type PlayerProfile = { schemaVersion: 3; materials: Materials; id: string; displayName: string; maximumMass: number; evolutionId: string; unlockedEvolutionIds: string[]; statistics: Record<string, number>; energy: number; summonCurrency: number; upgradeMaterial: number; resonanceShards: number; dungeonKeys: number; firstClears: string[]; ownedManifestations: string[]; equippedManifestation: string; manifestationLevels: Record<string, number>; summonCount: number; pity: number };
export interface ProfileStore { load(): PlayerProfile; save(profile: PlayerProfile): boolean }
export const newProfile = (): PlayerProfile => ({ schemaVersion: 3, materials: emptyMaterials(), id: 'local-core', displayName: 'Wanderer', maximumMass: B.mass.initial, evolutionId: 'core', unlockedEvolutionIds: ['core'], statistics: {}, energy: economy.startingEnergy, summonCurrency: 0, upgradeMaterial: 0, resonanceShards: 0, dungeonKeys: 0, firstClears: [], ownedManifestations: ['vessel'], equippedManifestation: 'vessel', manifestationLevels: {vessel: 1}, summonCount: 0, pity: 0 });
export function deathLoss(mass: number, floor: number): number { return Math.max(0, Math.min(mass * B.progression.deathPercent, B.progression.deathCap, mass - floor)); }
export function settle(profile: PlayerProfile, won: boolean, unbanked: number, allowBank = true): { banked: number; lost: number } {
  const banked = won && allowBank ? unbanked * B.progression.bankShare : 0;
  const floor = evolutions.find(e => e.id === profile.evolutionId)?.floor ?? B.mass.minimum;
  const lost = won ? 0 : deathLoss(profile.maximumMass, floor);
  profile.maximumMass += banked - lost;
  const key = won ? 'wins' : 'losses'; profile.statistics[key] = (profile.statistics[key] ?? 0) + 1;
  return { banked, lost };
}
export function migrateProfile(value: unknown): PlayerProfile {
  const clean = newProfile(); if (!value || typeof value !== 'object') return clean;
  const raw = value as Record<string, unknown>;
  if (raw.schemaVersion !== 1 && raw.schemaVersion !== 2 && raw.schemaVersion !== 3) return clean;
  if (typeof raw.maximumMass !== 'number' || !Number.isFinite(raw.maximumMass) || raw.maximumMass < B.mass.minimum) return clean;
  clean.maximumMass = raw.maximumMass;
  const evolutionIds=evolutions.map(e=>e.id);
  if(typeof raw.evolutionId==='string'&&evolutionIds.includes(raw.evolutionId))clean.evolutionId=raw.evolutionId;
  if(Array.isArray(raw.unlockedEvolutionIds))clean.unlockedEvolutionIds=[...new Set(['core',...raw.unlockedEvolutionIds.filter((id):id is string=>typeof id==='string'&&evolutionIds.includes(id))])];
  if(typeof raw.displayName==='string')clean.displayName=raw.displayName.slice(0,64);
  if (raw.statistics && typeof raw.statistics === 'object') for (const [k,v] of Object.entries(raw.statistics)) if (typeof v === 'number' && Number.isFinite(v) && v >= 0) clean.statistics[k] = v;
  if (raw.schemaVersion === 1) return clean;
  for (const key of ['energy','summonCurrency','upgradeMaterial','resonanceShards','dungeonKeys','summonCount','pity'] as const) { const v = raw[key]; if (typeof v === 'number' && Number.isFinite(v) && v >= 0) clean[key] = Math.floor(v); }
  clean.energy = Math.min(economy.energyMax, clean.energy); clean.pity = Math.min(economy.pityAt - 1, clean.pity);
  const validIds = manifestations.map(m => m.id);
  if (Array.isArray(raw.ownedManifestations)) clean.ownedManifestations = [...new Set(['vessel', ...raw.ownedManifestations.filter((id): id is string => typeof id === 'string' && validIds.includes(id))])];
  if (typeof raw.equippedManifestation === 'string' && clean.ownedManifestations.includes(raw.equippedManifestation)) clean.equippedManifestation = raw.equippedManifestation;
  if (Array.isArray(raw.firstClears)) clean.firstClears = [...new Set(raw.firstClears.filter((id): id is string => typeof id === 'string' && ['silent-orbit:normal','shattered-moon:normal'].includes(id)))];
  for (const id of clean.ownedManifestations) { const levels = raw.manifestationLevels as Record<string, unknown> | undefined; const level = levels?.[id]; clean.manifestationLevels[id] = typeof level === 'number' && Number.isFinite(level) ? Math.max(1, Math.min(5, Math.floor(level))) : 1; }
  if (raw.materials && typeof raw.materials === 'object') for (const id of materialIds) { const value = (raw.materials as Record<string, unknown>)[id]; if (typeof value === 'number' && Number.isFinite(value) && value >= 0) clean.materials[id] = Math.floor(value); }
  return clean;
}
export class LocalProfileStore implements ProfileStore {
  // Keep the existing storage key so installed v1 profiles are migrated in place on save.
  static key = 'cosmic-core.profile.v1';
  load(): PlayerProfile { try { return migrateProfile(JSON.parse(localStorage.getItem(LocalProfileStore.key) ?? 'null')); } catch { return newProfile(); } }
  save(profile: PlayerProfile): boolean { try { localStorage.setItem(LocalProfileStore.key, JSON.stringify(profile)); return true; } catch { return false; } }
}
