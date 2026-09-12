import type { Buttons } from '../input/ActionState';
import type { ChannelState } from './ChannelSystem';
import type { MeleeState } from './MeleeSystem';
export type Vec = { x: number; y: number };
export type Modifiers = { melee: number; reach: number; pull: number; pulse: number; fluxEfficiency: number; fluxOnHit: number };
export type MassState = { maximumMass: number; combatMass: number; coreMass: number; fieldMass: number; orbitingStoredMass: number; unbankedMass: number; distribution: number };
// Legacy booleans adapt existing replays: cast=melee, surge=pull. New input exposes edges.
export type Actions = { move: Vec; aim: Vec; distribution?: number; aimAssist?: boolean; cast: boolean; impulse: boolean; pulse: boolean; surge: boolean; orbit?: boolean; buttons?: Buttons };
export type Kind = import('../content/shatteredMoon').EnemyId | 'player' | 'bot' | 'drifter' | 'orbiter' | 'leech' | 'wisp' | 'guardian';
export type Actor = Vec & { id: number; kind: Kind; vx: number; vy: number; mass: MassState; integrity: { current: number; maximum: number }; targetDistribution: number; radius: number; cooldown: Record<'cast' | 'impulse' | 'pulse' | 'surge' | 'contact' | 'orbit', number>; stagger: number; cap: number; angle: number; alive: boolean; channel: ChannelState; melee: MeleeState; modifiers: Modifiers; manifestationId: string; hitPause: number; hitTime: number; deathTime: number; guardBroken: number; guardCharge: number; channelUsed: boolean; meleeHits: number; comboConnected: number; impactWindow: number };
export type Debris = Vec & { id: number; vx: number; vy: number; mass: number; owner: number | null; previousOwner: number | null; capture: Record<number, number>; life: number; angle: number; projectile: boolean; damage: number; launchOwner: number | null; fresh: boolean };
export type Mode = 'training' | 'pve' | 'pvp';
export type Result = { won: boolean; reason: string; gained: number; banked: number; lost: number; duration: number; grade?: string; materials?: number; currency?: number; firstClear?: boolean; firstClearMass?: number; dungeonId?: string; rewardBreakdown?: Record<string, import('../content/shatteredMoon').Materials> };
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const distance = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
export const unit = (v: Vec): Vec => { const length = Math.hypot(v.x, v.y); return length ? { x: v.x / length, y: v.y / length } : { x: 1, y: 0 }; };
export function seeded(seed: number): () => number { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
