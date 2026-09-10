import { describe, expect, it } from 'vitest';
import { dungeon } from '../src/game/content/dungeon';
import { B, validateBalance } from '../src/game/config/balance';
import { createMass, distribute, eject, recover, redistribute } from '../src/game/systems/MassSystem';
import { damage } from '../src/game/systems/DamageSystem';
import { fieldRadius, gravity } from '../src/game/systems/GravitySystem';
import { orbit, tryCapture } from '../src/game/systems/OrbitSystem';
import { coreExposed, timeout } from '../src/game/systems/IntegritySystem';
import { Simulation } from '../src/game/systems/Simulation';
import { deathLoss, newProfile, settle } from '../src/game/persistence/Profile';
import type { Actions } from '../src/game/systems/types';

const idle: Actions = { move: { x: 0, y: 0 }, aim: { x: 1, y: 0 }, distribution: .5, cast: false, impulse: false, pulse: false, surge: false };
describe('mass accounting', () => {
  it('redistribution obeys speed, bounds and conservation with stored objects', () => {
    const m = createMass(100); m.orbitingStoredMass = 12; m.distribution = 0;
    redistribute(m, 1, .625); expect(m.distribution).toBeCloseTo(.5);
    for (let i = 0; i < 1000; i++) { redistribute(m, i % 2 ? 2 : -1, B.step); expect(m.coreMass + m.fieldMass).toBeCloseTo(m.combatMass); expect(m.distribution).toBeGreaterThanOrEqual(0); expect(m.distribution).toBeLessThanOrEqual(1); }
  });
  it('ejection transfers exactly the mass removed', () => { const m = createMass(100); const loose = eject(m, 18, false); expect(m.combatMass + loose).toBe(100); expect(m.coreMass + m.fieldMass).toBeCloseTo(m.combatMass); });
  it('recovery respects caps and stolen progression share', () => { const m = createMass(100); expect(recover(m, 40, 110, true, false)).toBe(10); expect(m.combatMass).toBe(110); expect(m.unbankedMass).toBeCloseTo(10 * B.mass.stolenProgress); expect(recover(m, 10, 110, false, true)).toBe(0); });
  it('compression increases near pull, reduces radius and releases independent orbit objects', () => {
    const sim = new Simulation('training', 100), p = sim.player;
    p.mass.distribution = 0; distribute(p.mass); p.radius = fieldRadius(0);
    const loose = gravity(p, { x: p.x + 50, y: p.y }, 2);
    p.mass.distribution = 1; distribute(p.mass); p.radius = fieldRadius(1);
    expect(Math.abs(gravity(p, { x: p.x + 50, y: p.y }, 2).x)).toBeGreaterThan(Math.abs(loose.x)); expect(fieldRadius(1)).toBeLessThan(fieldRadius(0));
    const ds = sim.debris.slice(0, 5); ds.forEach(d => d.owner = p.id); p.mass.orbitingStoredMass = 12.5;
    const total = p.mass.combatMass; orbit(p, ds, B.step);
    expect(ds.filter(d => d.owner === p.id)).toHaveLength(2); expect(p.mass.combatMass).toBe(total); expect(p.mass.orbitingStoredMass).toBe(5);
  });
  it('capture requires sustained eligible tangential motion', () => { const sim = new Simulation('training', 100), p = sim.player, d = sim.debris[0]; d.x = p.x + 100; d.y = p.y; d.vx = 0; d.vy = 80; expect(tryCapture(p, d, 0, B.orbit.captureTime / 2)).toBe(false); expect(tryCapture(p, d, 0, B.orbit.captureTime / 2)).toBe(true); expect(p.mass.orbitingStoredMass).toBe(d.mass); });
  it('overlapping symmetric Fields combine to zero net force', () => { const sim = new Simulation('pvp', 100); const [a, b] = sim.actors; a.x = 100; a.y = 100; b.x = 300; b.y = 100; const point = { x: 200, y: 100 }; expect(gravity(a, point, 2).x + gravity(b, point, 2).x).toBeCloseTo(0); });
});
describe('survival and progression', () => {
  it('exposes below 20 percent and collapses only at zero integrity', () => { const a = new Simulation('training', 100).player; a.integrity.current=19; expect(coreExposed(a)).toBe(true); damage(a,1,true); expect(a.alive).toBe(true); damage(a,1000,false);expect(a.integrity.current).toBe(0);expect(a.alive).toBe(false); });
  it('damage leaves mass unchanged and compression provides resistance', () => { const a=new Simulation('training',100).player;const mass={...a.mass}; const hp=a.integrity.current;const dealt=damage(a,20,true);expect(a.integrity.current).toBeCloseTo(hp-dealt);expect(a.mass).toEqual(mass);a.mass.distribution=1;distribute(a.mass);expect(damage(a,20,true)).toBeLessThan(dealt); });
  it('penalties obey percentage, cap and evolution floor', () => { expect(deathLoss(100, 20)).toBe(1); expect(deathLoss(10000, 20)).toBe(10); expect(deathLoss(20.1, 20)).toBeCloseTo(.1); expect(deathLoss(20, 20)).toBe(0); });
  it('only extraction banks PvE rewards; failure loses unbanked gains', () => { const p = newProfile(); expect(settle(p, true, 25)).toEqual({ banked: 25, lost: 0 }); expect(p.maximumMass).toBe(125); expect(settle(p, false, 90)).toEqual({ banked: 0, lost: 1.25 }); expect(settle(p, true, 90, false).banked).toBe(0); });
  it('timeout uses integrity percentage, then total mass, then sudden death', () => {
    const [a, b] = new Simulation('pvp', 100).actors; expect(timeout(a, b)).toBeNull();
    a.mass.combatMass += 1; expect(timeout(a, b)).toBe(a.id);
    a.integrity.current -= 2; expect(timeout(a, b)).toBe(b.id);
    b.integrity.current -= 5; expect(timeout(a, b)).toBe(a.id);
  });
});
describe('integrated vertical slice', () => {
  it('can naturally capture five debris objects while expanded', () => {
    const sim = new Simulation('training', 100); sim.actors[1].alive = false; sim.player.mass.distribution=0; distribute(sim.player.mass);
    let maximumOwned = 0;
    for (let i = 0; i < 600; i++) { sim.step({ ...idle, distribution: 0 }); maximumOwned = Math.max(maximumOwned, sim.debris.filter(d => d.owner === sim.player.id).length); }
    expect(maximumOwned).toBeGreaterThanOrEqual(5);
  });
  it('validates balance and rejects nonfinite constants', () => { expect(() => validateBalance()).not.toThrow(); expect(() => validateBalance({ ...B, step: NaN } as typeof B)).toThrow(); });
  it('is reproducible and maintains mass invariants under combat', () => {
    const a = new Simulation('training', 100), b = new Simulation('training', 100);
    for (let i = 0; i < 1800; i++) {
      const input = { ...idle, distribution: Math.sin(i / 90) * .5 + .5, cast: i % 4 === 0, pulse: i % 360 === 0, surge: i % 600 === 0 };
      a.step(input); b.step(input);
      for (const actor of a.actors) { const m = actor.mass; expect(m.coreMass + m.fieldMass).toBeCloseTo(m.combatMass); expect(m.combatMass).toBeGreaterThanOrEqual(0); expect(m.orbitingStoredMass).toBeCloseTo(a.debris.filter(d => d.owner === actor.id).reduce((sum, d) => sum + d.mass, 0)); }
    }
    expect(a.player.mass).toEqual(b.player.mass); expect(a.debris).toEqual(b.debris);
  });
  it('supports objective gating, Guardian defeat and portal extraction', () => {
    const sim = new Simulation('pve', 100);
    sim.time = 500; sim.mission(B.step); expect(sim.room).toBe(0);
    for(let room = 0; room < 3; room++) {
      const gate = dungeon.rooms[room].gate;
      sim.player.x = gate.x; sim.player.y = gate.y; sim.mission(B.step); expect(sim.room).toBe(room); expect(sim.result).toBeNull();
      sim.actors.filter(a => a !== sim.player).forEach(a => a.alive = false);
      sim.player.x = dungeon.rooms[room].center.x; sim.mission(B.step); expect(sim.room).toBe(room);
      sim.player.x = gate.x; sim.player.y = gate.y; sim.mission(B.step);
      if(room < 2) expect(sim.room).toBe(room + 1); else expect(sim.result?.won).toBe(true);
    }
  });
  it('resolves bot collapse and match timeout', () => { const s = new Simulation('pvp', 100); s.actors[1].alive = false; s.step(idle); expect(s.result?.won).toBe(true); const t = new Simulation('pvp', 100); t.time = B.pvp.duration; t.player.integrity.current -= 3; t.step(idle); expect(t.result).not.toBeNull(); });
});
