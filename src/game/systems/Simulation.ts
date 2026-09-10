import { B } from '../config/balance';
import { C } from '../config/combatV4';
import { newChannel, channelForce, interruptChannel, lineOfSight, type Obstacle } from './ChannelSystem';
import { newMelee, withinMeleeArc, meleeDamage, attackSpec } from './MeleeSystem';
import { ButtonTracker } from '../input/ActionState';
import { modifiersFor } from '../content/manifestations';
import { dungeon } from '../content/dungeon';
import { arenaContent as map, asteroidAt } from '../content/arena';
import { divisionFor } from '../content/content';
import { createMass, redistribute, recover, eject } from './MassSystem';
import { fieldRadius, gravity } from './GravitySystem';
import { orbit, release, tryCapture } from './OrbitSystem';
import { damage } from './DamageSystem';
import { tickStability, timeout } from './StabilitySystem';
import { abilities } from './AbilitySystem';
import { clamp, distance, seeded, unit, type Actions, type Actor, type Debris, type Kind, type Mode, type Result } from './types';

export class Simulation {
  actors: Actor[] = []; debris: Debris[] = []; time = 0; phase = 0; nextSpawn = 0; suddenDeath = false;
  result: Result | null = null; random: () => number; nextId = 1; killed = new Set<number>(); trainingEngaged = false;
  effects: { x: number; y: number; radius: number; life: number; hostile: boolean }[] = [];
  trackers = new Map<number, ButtonTracker>(); hitEvents: {source: number; target: number; heavy: boolean; x: number; y: number; serial: number}[] = []; hitSerial = 0;
  room = 0; roomCleared = false; obstacles: Obstacle[] = [];
  readonly player: Actor; readonly effectiveMass: number;
  constructor(public mode: Mode, public maximumMass: number, seed: number = B.seed, options: { manifestationId?: string; level?: number } = {}) {
    this.random = seeded(seed);
    this.effectiveMass = mode === 'pvp' ? Math.min(maximumMass, divisionFor(maximumMass).ceiling) : maximumMass;
    this.player = this.actor('player', B.arena / 2, B.arena / 2, this.effectiveMass * (mode === 'pve' ? B.pve.safeMass : 1));
    this.player.manifestationId = options.manifestationId ?? 'vessel'; this.player.modifiers = modifiersFor(this.player.manifestationId, options.level ?? 1, mode === 'pvp');
    if (mode !== 'pve') this.actor('bot', B.arena / 2 + B.bot.startDistance, B.arena / 2, this.effectiveMass);
    for (let i = 0; i < B.visuals.debrisCount; i++) {
      const angle = this.random() * Math.PI * 2, radius = i < B.debris.initialNearCount ? B.debris.nearMin + this.random() * B.debris.nearSpread : B.debris.farMin + this.random() * B.debris.farSpread;
      this.debris.push(this.makeDebris(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius, B.mass.debris, true));
    }
    if (mode === 'pve') this.enterRoom(0);
  }
  actor(kind: Kind, x: number, y: number, mass: number): Actor {
    const a: Actor = { id: this.nextId++, kind, x, y, vx: 0, vy: 0, mass: createMass(kind === 'player' ? this.maximumMass : mass, mass), stability: { phase: 'stable', unstableRemainingMs: 0, instabilityCount: 0, trauma: 0 }, targetDistribution: .5, radius: fieldRadius(.5), cooldown: { cast: 0, impulse: 0, pulse: 0, surge: 0, contact: 0, orbit: 0 }, channel: newChannel(), melee: newMelee(), modifiers: {melee: 1, reach: 1, pull: 1, pulse: 1, fluxEfficiency: 1, fluxOnHit: 1}, manifestationId: 'vessel', hitPause: 0, hitTime: 0, deathTime: 0, guardBroken: 0, guardCharge: 0, channelUsed: false, meleeHits: 0, stagger: 0, cap: mass * B.mass.cap, angle: 0, alive: true };
    this.actors.push(a); this.trackers.set(a.id, new ButtonTracker()); return a;
  }
  makeDebris(x: number, y: number, mass: number, fresh = false): Debris {
    const angle = this.random() * Math.PI * 2;
    return { id: this.nextId++, x, y, vx: Math.cos(angle) * B.debris.driftSpeed, vy: Math.sin(angle) * B.debris.driftSpeed, mass, owner: null, previousOwner: null, capture: {}, life: fresh ? Infinity : B.mass.fragmentLife, angle, projectile: false, damage: 0, launchOwner: null, fresh };
  }
  fragment(a: Actor, mass: number): Debris {
    const angle = this.random() * Math.PI * 2;
    const d = this.makeDebris(a.x + Math.cos(angle) * B.combat.fragmentOffset, a.y + Math.sin(angle) * B.combat.fragmentOffset, mass);
    d.previousOwner = a.id; d.vx = Math.cos(angle) * B.combat.fragmentSpeed; d.vy = Math.sin(angle) * B.combat.fragmentSpeed; this.debris.push(d); return d;
  }
  hit(a: Actor, amount: number, direct: boolean, melee = false): void {
    if (this.mode === 'pve' && a.kind === 'guardian' && (a.guardBroken <= 0 || !melee)) return;
    const removed = damage(a, amount, direct); if (removed > 0) { this.fragment(a, removed); a.hitTime = C.feedback.hitDuration; }
  }
  pulseVisual(a: Actor): void { this.effects.push({ x: a.x, y: a.y, radius: a.radius, life: .5, hostile: a.id !== this.player.id }); }
  botActions(a: Actor): Actions {
    const target = this.player, delta = { x: target.x - a.x, y: target.y - a.y }, dist = Math.hypot(delta.x, delta.y), n = unit(delta);
    if (this.mode === 'training' && !this.trainingEngaged) return { move: { x: 0, y: 0 }, aim: delta, distribution: .5, cast: false, impulse: false, pulse: false, surge: false };
    const preferred = a.kind === 'leech' ? target.radius * B.bot.leechRadius : C.bot.pursuitDistance;
    const move = dist > preferred ? n : { x: -n.y * .2, y: n.x * .2 };
    const cycle = (this.time + a.id) % C.bot.period;
    const canChannel = a.kind === 'guardian' || a.kind === 'bot' || a.kind === 'wisp';
    const pull = canChannel && cycle < C.bot.pullDuration && dist < a.radius;
    const pulse = canChannel && cycle >= C.bot.pullDuration && cycle < C.bot.pullDuration + C.bot.pulseDuration && dist < a.radius;
    const distribution = pull ? B.bot.wide : B.bot.dense;
    return { move: { x: move.x * B.bot.thrust, y: move.y * B.bot.thrust }, aim: delta, distribution,
      cast: dist < C.bot.meleeRange && !pull && !pulse && (a.kind === 'bot' || a.kind === 'guardian' || (this.time + a.id) % C.bot.enemyAttackPeriod < C.bot.enemyAttackDuration), impulse: false, pulse, surge: pull,
      orbit: a.kind === 'orbiter' && cycle < B.step };
  }

  step(input: Actions, dt = B.step): void {
    if (this.result) return;
    if (input.cast || input.pulse || input.surge) this.trainingEngaged = true;
    this.time += dt;
    for (const a of this.actors) {
      if (!a.alive) continue;
      a.hitPause = Math.max(0, a.hitPause - dt);
      if (a.hitPause > 0) { tickStability(a, dt); continue; }
      const action = a === this.player ? input : this.botActions(a);
      for (const key of Object.keys(a.cooldown) as (keyof Actor['cooldown'])[]) a.cooldown[key] = Math.max(0, a.cooldown[key] - dt);
      a.stagger = Math.max(0, a.stagger - dt); a.hitTime = Math.max(0, a.hitTime - dt); a.guardBroken = Math.max(0, a.guardBroken - dt);
      const buttons = action.buttons ?? this.trackers.get(a.id)!.sample({ primary: action.cast, impulse: action.impulse, pull: action.surge, pulse: action.pulse, orbit: action.orbit });
      abilities(a, action, buttons, this, dt);
      a.targetDistribution = action.distribution;
      redistribute(a.mass, a.targetDistribution, dt, a.channel.overload > 0 ? C.flux.redistributionRate : 1);
      a.radius = fieldRadius(a.mass.distribution);
      const accel = B.movement.thrust * (1 - a.mass.distribution * B.movement.inertia) * (a === this.player ? 1 : B.enemy.speed) * (a.stagger > 0 ? B.movement.staggerMultiplier : 1) * (a.channel.mode ? C.channel.movement : 1);
      a.vx += action.move.x * accel * dt; a.vy += action.move.y * accel * dt;
      for (const other of this.actors) if (other !== a && other.alive) { const f = gravity(other, a, a.mass.combatMass); a.vx += f.x * dt * B.gravity.entityScale * (1 - a.mass.distribution * B.movement.inertia); a.vy += f.y * dt * B.gravity.entityScale * (1 - a.mass.distribution * B.movement.inertia); }
      a.vx *= Math.exp(-B.movement.drag * dt); a.vy *= Math.exp(-B.movement.drag * dt);
      const speed = Math.hypot(a.vx, a.vy); if (speed > B.movement.speed) { const limit = Math.max(B.movement.speed, speed * Math.exp(-dt * B.movement.overspeedDecay)); a.vx *= limit / speed; a.vy *= limit / speed; }
      a.x = clamp(a.x + a.vx * dt, B.movement.boundary, B.arena - B.movement.boundary); a.y = clamp(a.y + a.vy * dt, B.movement.boundary, B.arena - B.movement.boundary);
      orbit(a, this.debris, dt); tickStability(a, dt);
    }
    this.resolveChannels(dt);
    this.resolveMelee();
    this.moveDebris(dt);
    this.contacts();

    for (const a of this.actors) if (!a.alive && !this.killed.has(a.id)) {
      this.killed.add(a.id); a.deathTime = this.time; for (const d of this.debris.filter(d => d.owner === a.id)) release(a, d);
      if (a !== this.player && this.mode === 'pve') this.player.mass.unbankedMass += a.kind === 'guardian' ? B.pve.guardianReward : B.pve.reward;
      this.pulseVisual(a);
    }
    if (this.mode === 'pve' && this.player.alive) this.mission(dt);
    if (!this.player.alive) this.finish(false, 'Your Core collapsed');
    if (this.mode === 'pvp') {
      const opponent = this.actors[1];
      if (!opponent.alive) this.finish(true, 'Rival Core collapsed');
      else if (this.time >= B.pvp.duration && !this.suddenDeath) { const winner = timeout(this.player, opponent); if (winner !== null) this.finish(winner === this.player.id, 'Time limit · stability tiebreak'); else this.suddenDeath = true; }
      if (this.suddenDeath) for (const a of [this.player, opponent]) { const amount = eject(a.mass, B.pvp.suddenDeathDrain * dt, false); if (amount > 0) this.fragment(a, amount); a.stability.trauma += B.pvp.suddenDeathDrain * dt * B.pvp.suddenDeathTrauma; }
    }
    this.hitEvents = this.hitEvents.slice(-20);
    this.effects = this.effects.filter(e => (e.life -= dt) > 0);
  }
  moveDebris(dt: number): void {
    const living = this.actors.filter(a => a.alive);
    const counts = new Map(living.map(a => [a.id, this.debris.filter(d => d.owner === a.id).length]));
    for (const d of this.debris) {
      if (d.owner !== null) continue;
      d.life -= dt;
      if (d.life <= 0 && d.projectile) { d.projectile = false; d.launchOwner = null; d.life = B.mass.fragmentLife; }
      if (d.life <= 0) continue;
      for (const a of living) { const f = gravity(a, d, d.mass); d.vx += f.x * dt; d.vy += f.y * dt; }
      d.x += d.vx * dt; d.y += d.vy * dt;
      if (d.x < B.debris.boundary || d.x > B.arena - B.debris.boundary) { d.vx *= -1; d.x = clamp(d.x, B.debris.boundary, B.arena - B.debris.boundary); }
      if (d.y < B.debris.boundary || d.y > B.arena - B.debris.boundary) { d.vy *= -1; d.y = clamp(d.y, B.debris.boundary, B.arena - B.debris.boundary); }
      if (d.projectile) {
        for (const a of living) if (a.id !== d.launchOwner) {
          const dist = distance(a, d);
          if (dist < B.combat.coreRadius + B.combat.hitPadding) { this.hit(a, d.damage * Math.max(B.combat.minVelocityDamage, Math.hypot(d.vx - a.vx, d.vy - a.vy) / B.combat.velocityScale), true); d.projectile = false; d.launchOwner = null; d.life = B.mass.fragmentLife; d.vx *= B.combat.impactRetention; d.vy *= B.combat.impactRetention; break; }
          // A glancing trajectory strips the outer Field, while shots aimed at the Core pass through.
          const speed = Math.hypot(d.vx, d.vy), cross = speed ? Math.abs((a.x - d.x) * d.vy - (a.y - d.y) * d.vx) / speed : 0;
          if (dist < a.radius * B.combat.fieldHitRadius && cross > B.combat.coreRadius + B.combat.hitPadding) { this.hit(a, d.damage * B.combat.glancingMultiplier, false); d.projectile = false; d.launchOwner = null; d.life = B.mass.fragmentLife; break; }
        }
      } else {
        for (const a of living) {
          if (distance(a, d) < B.combat.coreRadius + B.combat.hitPadding) {
            const taken = recover(a.mass, d.mass, a.cap, d.previousOwner !== null && d.previousOwner !== a.id, d.fresh);
            d.mass -= taken; if (d.mass <= .00001) { d.life = 0; break; }
          }
          if (tryCapture(a, d, counts.get(a.id) ?? 0, dt)) { counts.set(a.id, (counts.get(a.id) ?? 0) + 1); break; }
        }
      }
    }
    this.debris = this.debris.filter(d => d.owner !== null || d.life > 0);
  }
  resolveChannels(dt: number): void {
    for (const source of this.actors) if (source.alive && source.hitPause <= 0 && source.channel.mode) {
      source.channelUsed = true;
      for (const target of this.actors) if (target !== source && target.alive) {
        const f = channelForce(source, target, target.mass.combatMass, this.obstacles);
        target.vx += f.x * dt; target.vy += f.y * dt;
        if (source.channel.mode === 'pull' && (f.x !== 0 || f.y !== 0) && distance(source, target) < C.channel.captureRadius) { const damping = Math.exp(-C.channel.captureDamping * dt); target.vx *= damping; target.vy *= damping; }
        if (source === this.player && target.kind === 'guardian' && this.mode === 'pve' && (f.x !== 0 || f.y !== 0)) {
          target.guardCharge += dt;
          if (target.guardCharge >= C.channel.bossBreakTime) { target.guardBroken = dungeon.bossVulnerable; target.guardCharge = 0; target.stagger = C.channel.interrupt; target.vx *= C.channel.breakVelocityRetention; target.vy *= C.channel.breakVelocityRetention; interruptChannel(target.channel); }
        }
      }
      for (const d of this.debris) if (d.owner === null) { const f = channelForce(source, d, d.mass, this.obstacles); d.vx += f.x * dt; d.vy += f.y * dt; }
    }
    if (!this.player.channel.mode) for (const a of this.actors) a.guardCharge = 0;
  }
  resolveMelee(): void {
    for (const source of this.actors) if (source.alive && source.hitPause <= 0 && source.melee.phase === 'active') {
      for (const target of this.actors) if (target !== source && target.alive && (source === this.player || target === this.player) && !source.melee.hits.includes(target.id) && withinMeleeArc(source, target) && lineOfSight(source, target, this.obstacles)) {
        source.melee.hits.push(target.id);
        if (this.mode === 'pve' && target.kind === 'guardian' && target.guardBroken <= 0) continue;
        const heavy = source.melee.index === 2;
        this.hit(target, meleeDamage(source), true, true); source.meleeHits++;
        source.hitPause = target.hitPause = heavy ? C.melee.heavyHitStop : C.melee.hitStop;
        source.channel.flux = Math.min(C.flux.max, source.channel.flux + C.flux.meleeRestore * source.modifiers.fluxOnHit);
        const n = unit({ x: target.x - source.x, y: target.y - source.y });
        const force = C.melee.knockback * attackSpec(source).force * (1 + source.mass.distribution) * Math.min(1.4, source.mass.combatMass / Math.max(1, target.mass.combatMass));
        target.vx += n.x * force; target.vy += n.y * force;
        target.stagger = (heavy ? C.melee.heavyStagger : C.melee.stagger) * (1 + source.mass.distribution);
        if (heavy) interruptChannel(target.channel);
        this.hitEvents.push({ source: source.id, target: target.id, heavy, x: target.x, y: target.y, serial: ++this.hitSerial });
      }
    }
  }
  contacts(): void {
    const p = this.player;
    for (const a of this.actors) if (a !== p && a.alive && p.alive && distance(a, p) < B.combat.coreRadius * 2 + B.combat.contactPadding) {

      const n = unit({ x: a.x - p.x, y: a.y - p.y }); a.vx += n.x * B.combat.contactPush; a.vy += n.y * B.combat.contactPush; p.vx -= n.x * B.combat.contactPush; p.vy -= n.y * B.combat.contactPush;
    }
  }
  enterRoom(index: number): void {
    this.room = index; this.phase = index; this.roomCleared = false;
    const room = dungeon.rooms[index];
    for (const d of this.debris) if (d.owner === this.player.id) release(this.player, d);
    this.actors = [this.player]; this.debris = []; this.obstacles = room.obstacles.map(o => ({ ...o }));
    this.player.x = room.center.x - 140; this.player.y = room.center.y; this.player.vx = 0; this.player.vy = 0;
    for (let i = 0; i < room.enemies.length; i++) this.actor(room.enemies[i], room.center.x + room.offsets[i].x, room.center.y + room.offsets[i].y, room.masses[i]);
    for (let i = 0; i < 12; i++) { const angle = this.random() * Math.PI * 2; this.debris.push(this.makeDebris(room.center.x + Math.cos(angle) * 180, room.center.y + Math.sin(angle) * 180, B.mass.debris, true)); }
  }
  get missionStage(): string {
    const r = dungeon.rooms[this.room];
    return this.roomCleared ? this.room === 2 ? 'DUNGEON CLEAR · Enter the green exit to bank rewards' : 'ROOM CLEAR · Enter the green gate to continue' : String(this.room + 1).padStart(2, '0') + ' / ' + r.name + ' · ' + r.instruction;
  }
  mission(dt: number): void {
    const room = dungeon.rooms[this.room], half = dungeon.roomHalfSize;
    this.roomCleared = !this.actors.some(a => a !== this.player && a.alive);
    for (const a of this.actors) if (a.alive) {
      a.x = clamp(a.x, room.center.x - half, room.center.x + half); a.y = clamp(a.y, room.center.y - half, room.center.y + half);
      for (const o of this.obstacles) { const d = distance(a, o), radius = o.radius + B.combat.coreRadius; if (d < radius) { const n = unit({x: a.x - o.x, y: a.y - o.y}); a.x = o.x + n.x * radius; a.y = o.y + n.y * radius; a.vx *= .5; a.vy *= .5; } }
    }
    if (room.hazard) {
      if (distance(this.player, room.hazard) < room.hazard.radius) this.player.stability.trauma += B.pve.hazardDamage * dt;
      for (const d of this.debris) if (d.owner === null && distance(d, room.hazard) < room.hazard.radius) d.life -= dt * B.pve.entropyDecay;
    }
    for (const a of this.actors) if (a.alive && a.kind === 'leech' && distance(a, this.player) < this.player.radius && !this.player.channel.mode) this.player.mass.unbankedMass = Math.max(0, this.player.mass.unbankedMass - B.pve.leechDrain * dt);
    if (this.roomCleared && distance(this.player, room.gate) < dungeon.gateRadius) {
      if (this.room < dungeon.rooms.length - 1) this.enterRoom(this.room + 1); else this.finish(true, 'The Silent Orbit completed');
    }
  }
  finish(won: boolean, reason: string): void { if (!this.result) this.result = { won, reason, gained: this.player.mass.unbankedMass, banked: 0, lost: 0, duration: this.time }; }
}
