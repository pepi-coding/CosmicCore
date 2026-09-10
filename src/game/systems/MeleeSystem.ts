import { C } from '../config/combatV4';
import { clamp, type Actor, type Vec } from './types';
import type { ButtonState } from '../input/ActionState';
export type MeleeState = { phase: 'idle' | 'windup' | 'active' | 'recovery'; index: number; elapsed: number; buffer: number; comboWait: number; hits: number[]; angle: number; missed: boolean; serial: number };
export const newMelee = (): MeleeState => ({ phase: 'idle', index: 0, elapsed: 0, buffer: 0, comboWait: 0, hits: [], angle: 0, missed: false, serial: 0 });
export const attackSpec = (a: Actor) => C.melee.attacks[a.melee.index];
export function meleeReach(a: Actor): number { return (C.melee.reachExpanded + (C.melee.reachCompressed - C.melee.reachExpanded) * a.mass.distribution) * attackSpec(a).reach * a.modifiers.reach; }
export function withinMeleeArc(a: Actor, target: Vec): boolean {
  const dx = target.x - a.x, dy = target.y - a.y;
  const angle = Math.atan2(dy, dx) - a.melee.angle, difference = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle)));
  return Math.hypot(dx, dy) <= meleeReach(a) && difference <= attackSpec(a).arc / 2 + (1 - a.mass.distribution) * C.melee.arcExpansion;
}
export function startMelee(a: Actor): void {
  if (a.melee.index === 0) a.comboConnected = 0;
  const m = a.melee; m.phase = 'windup'; m.elapsed = 0; m.buffer = 0; m.hits = []; m.angle = a.angle; m.missed = false; m.serial++;
  if (m.index === 1) { a.vx += Math.cos(m.angle) * C.melee.advance; a.vy += Math.sin(m.angle) * C.melee.advance; }
}
export function tickMelee(a: Actor, primary: ButtonState, dt: number, blocked: boolean): void {
  const m = a.melee;
  m.buffer = Math.max(0, m.buffer - dt);
  if (primary.pressed || primary.held) m.buffer = C.melee.buffer;
  if (m.phase === 'idle') {
    m.comboWait = Math.max(0, m.comboWait - dt); if (m.comboWait <= 0) m.index = 0;
    if (!blocked && m.buffer > 0) startMelee(a); return;
  }
  if (a.stagger > 0) { m.phase = 'idle'; m.comboWait = 0; m.buffer = 0; return; }
  m.elapsed += dt;
  const spec = attackSpec(a), activeEnd = spec.windup + spec.active, finish = activeEnd + spec.recovery + (m.index === 2 && m.missed ? C.melee.missRecovery : 0);
  m.phase = m.elapsed < spec.windup ? 'windup' : m.elapsed < activeEnd ? 'active' : 'recovery';
  if (m.phase === 'recovery' && m.hits.length === 0) m.missed = true;
  const cancel = m.index < 2 && m.hits.length > 0 && m.elapsed >= activeEnd + spec.recovery * spec.cancel;
  if (m.elapsed >= finish || (!blocked && m.buffer > 0 && cancel)) {
    m.phase = 'idle'; m.index = (m.index + 1) % 3; m.comboWait = C.melee.chainTimeout;
    if (!blocked && m.buffer > 0) startMelee(a);
  }
}
export function meleeDamage(a: Actor): number {
  const momentum = clamp(Math.hypot(a.vx, a.vy) / C.melee.momentumSpeed, 0, 1) * C.melee.momentumCap;
  const mass = clamp(Math.sqrt(a.mass.combatMass / C.melee.massReference), C.melee.massScaleMin, C.melee.massScaleMax);
  return attackSpec(a).damage * (1 + a.mass.distribution * C.melee.densityDamage) * (1 + momentum) * a.modifiers.melee * mass;
}
