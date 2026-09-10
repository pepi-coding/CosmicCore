import { C } from '../config/combatV4';
import { clamp, type Actor, type Vec } from './types';
import type { Buttons } from '../input/ActionState';
export type ChannelKind = 'pull' | 'pulse';
export type ChannelState = { mode: ChannelKind | null; lastMode: ChannelKind | null; heldTime: number; intensity: number; flux: number; regenWait: number; overload: number; interrupt: number; decay: number; needsRelease: boolean; maximumReached: boolean };
export const newChannel = (): ChannelState => ({ mode: null, lastMode: null, heldTime: 0, intensity: 0, flux: C.flux.max, regenWait: 0, overload: 0, interrupt: 0, decay: 0, needsRelease: false, maximumReached: false });
export function stopChannel(c: ChannelState): void {
  if (c.mode) { c.lastMode = c.mode; c.decay = C.channel.releaseDecay; c.regenWait = C.flux.regenDelay; }
  c.mode = null; c.heldTime = 0; c.intensity = 0; c.maximumReached = false;
}
export function interruptChannel(c: ChannelState): void { stopChannel(c); c.interrupt = C.channel.interrupt; c.needsRelease = true; }
export function tickChannel(c: ChannelState, buttons: Buttons, dt: number, blocked = false, efficiency = 1): void {
  c.decay = Math.max(0, c.decay - dt); c.overload = Math.max(0, c.overload - dt); c.interrupt = Math.max(0, c.interrupt - dt); c.regenWait = Math.max(0, c.regenWait - dt);
  if (!buttons.pull.held && !buttons.pulse.held) c.needsRelease = false;
  // A new press switches ownership. Simultaneous presses choose defensive Pulse deterministically.
  const desired: ChannelKind | null = buttons.pulse.pressed ? 'pulse' : buttons.pull.pressed ? 'pull' : c.mode && buttons[c.mode].held ? c.mode : buttons.pulse.held ? 'pulse' : buttons.pull.held ? 'pull' : null;
  if (blocked || c.overload > 0 || c.interrupt > 0 || c.needsRelease || !desired) stopChannel(c);
  else {
    if (c.mode !== desired) { stopChannel(c); c.mode = desired; c.lastMode = desired; c.decay = 0; }
    c.heldTime += dt;
    c.intensity = desired === 'pull' ? C.channel.initial + (1 - C.channel.initial) * clamp(c.heldTime / C.channel.charge, 0, 1) : 1;
    c.maximumReached = c.intensity >= 1;
    const ramp = C.flux.gentle + (1 - C.flux.gentle) * Math.min(1, c.heldTime / C.channel.charge);
    const heat = 1 + Math.max(0, c.heldTime - C.flux.accelerationAfter) * C.flux.acceleration;
    c.flux = Math.max(0, c.flux - (desired === 'pull' ? C.flux.pullDrain : C.flux.pulseDrain) * ramp * heat * dt / efficiency);
    c.regenWait = C.flux.regenDelay;
    if (c.flux <= 0) { stopChannel(c); c.overload = C.flux.overload; c.needsRelease = true; }
  }
  if (!c.mode && c.overload <= 0 && c.regenWait <= 0) c.flux = Math.min(C.flux.max, c.flux + C.flux.regen * dt);
}
export type Obstacle = Vec & { radius: number };
export function lineOfSight(a: Vec, b: Vec, obstacles: Obstacle[]): boolean {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  return !obstacles.some(o => { const t = length2 ? clamp(((o.x - a.x) * dx + (o.y - a.y) * dy) / length2, 0, 1) : 0; return Math.hypot(a.x + dx * t - o.x, a.y + dy * t - o.y) < o.radius; });
}
export function channelForce(a: Actor, target: Vec, targetMass: number, obstacles: Obstacle[] = []): Vec {
  const c = a.channel, dx = target.x - a.x, dy = target.y - a.y, r = Math.hypot(dx, dy);
  if (!c.mode || r === 0 || r > a.radius || !lineOfSight(a, target, obstacles)) return { x: 0, y: 0 };
  const resistance = clamp(a.mass.combatMass / Math.max(1, targetMass), C.channel.resistanceMin, C.channel.resistanceMax);
  const force = Math.min(C.channel.maxAcceleration, (c.mode === 'pull' ? -C.channel.pullForce : C.channel.pulseForce) * c.intensity * (1 + a.mass.distribution * C.channel.densityBonus) * resistance * (c.mode === 'pull' ? a.modifiers.pull : a.modifiers.pulse));
  return { x: dx / r * Math.max(-C.channel.maxAcceleration, force), y: dy / r * Math.max(-C.channel.maxAcceleration, force) };
}
