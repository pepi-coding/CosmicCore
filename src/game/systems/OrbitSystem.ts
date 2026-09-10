import { B } from '../config/balance';
import { distribute } from './MassSystem';
import { distance, type Actor, type Debris } from './types';
export const slots = (a: Actor) => Math.floor(B.orbit.minSlots + (1 - a.mass.distribution) * (B.orbit.maxSlots - B.orbit.minSlots));
export function release(a: Actor, d: Debris): void {
  d.owner = null; d.previousOwner = a.id; d.capture = {}; d.life = B.mass.fragmentLife; d.vx = a.vx - Math.sin(d.angle) * a.radius * B.orbit.angularSpeed; d.vy = a.vy + Math.cos(d.angle) * a.radius * B.orbit.angularSpeed;
  a.mass.orbitingStoredMass -= d.mass; distribute(a.mass);
}
export function orbit(a: Actor, debris: Debris[], dt: number): void {
  const owned = debris.filter(d => d.owner === a.id).sort((x, y) => x.id - y.id);
  while (owned.length > slots(a)) release(a, owned.pop()!);
  for (const d of owned) { d.angle += dt * B.orbit.angularSpeed; d.x = a.x + Math.cos(d.angle) * a.radius * B.orbit.radius; d.y = a.y + Math.sin(d.angle) * a.radius * B.orbit.radius; }
}
export function tryCapture(a: Actor, d: Debris, count: number, dt: number): boolean {
  const r = distance(a, d), tangent = r ? Math.abs((d.x - a.x) * (d.vy - a.vy) - (d.y - a.y) * (d.vx - a.vx)) / r : 0;
  if (r < a.radius && r > B.orbit.minDistance && Math.hypot(d.vx - a.vx, d.vy - a.vy) < B.orbit.maxSpeed && tangent >= B.orbit.minTangent && count < slots(a) && a.mass.orbitingStoredMass + d.mass <= a.cap) {
    d.capture[a.id] = (d.capture[a.id] ?? 0) + dt;
    if (d.capture[a.id] >= B.orbit.captureTime) {
      d.owner = a.id; d.angle = Math.atan2(d.y - a.y, d.x - a.x); a.mass.orbitingStoredMass += d.mass;
      d.capture = {}; distribute(a.mass); return true;
    }
  } else d.capture[a.id] = 0;
  return false;
}
