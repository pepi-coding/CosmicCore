import { B } from '../config/balance';
import { type Actor, type Vec, clamp } from './types';
export function fieldRadius(distribution: number): number { return B.gravity.radiusMax + (B.gravity.radiusMin - B.gravity.radiusMax) * distribution; }
export function gravity(source: Actor, target: Vec, targetMass: number): Vec {
  const dx = source.x - target.x, dy = source.y - target.y, d = Math.hypot(dx, dy);
  if (d > source.radius || d === 0) return { x: 0, y: 0 };
  const influence = source.mass.coreMass * (1 + source.mass.distribution * B.gravity.density) + source.mass.fieldMass;
  const force = clamp(B.gravity.g * influence * targetMass / Math.max(d * d, B.gravity.minDistance ** 2), 0, B.gravity.maxForce * targetMass);
  return { x: dx / d * force / Math.max(.01, targetMass), y: dy / d * force / Math.max(.01, targetMass) };
}
