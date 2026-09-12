import { MoonSystem } from './MoonSystem';
import { B } from '../config/balance';
import { C } from '../config/combatV4';
import { newChannel, channelForce, interruptChannel, lineOfSight, type Obstacle } from './ChannelSystem';
import { newMelee, withinMeleeArc, meleeDamage, attackSpec, meleeReach } from './MeleeSystem';
import { ButtonTracker } from '../input/ActionState';
import { modifiersFor } from '../content/manifestations';
import { dungeon } from '../content/dungeon';
import { arenaContent as map } from '../content/arena';
import { divisionFor } from '../content/content';
import { createMass, redistribute, recover } from './MassSystem';
import { fieldRadius, gravity } from './GravitySystem';
import { orbit, release, tryCapture } from './OrbitSystem';
import { damage } from './DamageSystem';
import { timeout } from './IntegritySystem';
import { abilities } from './AbilitySystem';
import { clamp, distance, seeded, unit, type Actions, type Actor, type Debris, type Kind, type Mode, type Result } from './types';

export class Simulation {
  moon?: MoonSystem;
  actors: Actor[] = []; debris: Debris[] = []; time = 0; phase = 0; nextSpawn = 0; suddenDeath = false;
  result: Result | null = null; random: () => number; nextId = 1; killed = new Set<number>(); trainingEngaged = false;
  effects: { x: number; y: number; radius: number; life: number; hostile: boolean }[] = [];
  trackers = new Map<number, ButtonTracker>(); hitEvents: {source: number; target: number; heavy: boolean; x: number; y: number; serial: number}[] = []; hitSerial = 0;
  damageEvents: { x: number; y: number; amount: number; critical: boolean; time: number; target: number; kind?: 'melee' | 'environment' | 'part' | 'core' }[] = [];
  crystals: { x: number; y: number; radius: number; hp: number }[] = [];
  room = 0; roomCleared = false; obstacles: Obstacle[] = [];
  readonly player: Actor; readonly effectiveMass: number;
  constructor(public mode: Mode, public maximumMass: number, seed: number = B.seed, options: { manifestationId?: string; level?: number; dungeonId?: string } = {}) {
    this.random = seeded(seed);
    this.effectiveMass = mode === 'pvp' ? Math.min(maximumMass, divisionFor(maximumMass).ceiling) : maximumMass;
    this.player = this.actor('player', B.arena / 2, B.arena / 2, this.effectiveMass * (mode === 'pve' ? B.pve.safeMass : 1));
    this.player.manifestationId = options.manifestationId ?? 'vessel'; this.player.modifiers = modifiersFor(this.player.manifestationId, options.level ?? 1, mode === 'pvp');
    if (mode !== 'pve') this.actor('bot', B.arena / 2 + B.bot.startDistance, B.arena / 2, this.effectiveMass);
    for (let i = 0; i < B.visuals.debrisCount; i++) {
      const angle = this.random() * Math.PI * 2, radius = i < B.debris.initialNearCount ? B.debris.nearMin + this.random() * B.debris.nearSpread : B.debris.farMin + this.random() * B.debris.farSpread;
      this.debris.push(this.makeDebris(this.player.x + Math.cos(angle) * radius, this.player.y + Math.sin(angle) * radius, B.mass.debris, true));
    }
    if (mode === 'pve') { if (options.dungeonId === 'shattered-moon') this.moon = new MoonSystem(this); this.enterRoom(0); } else { this.obstacles = map.pillars.map(o => ({...o})); this.seedCrystals({x: 1250, y: 1100}); }
  }
  actor(kind: Kind, x: number, y: number, mass: number): Actor {
    const a: Actor = { id: this.nextId++, kind, x, y, vx: 0, vy: 0, mass: createMass(kind === 'player' ? this.maximumMass : mass, mass), integrity: { current: kind === 'player' || kind === 'bot' ? 100 : kind === 'guardian' ? 130 : 40, maximum: kind === 'player' || kind === 'bot' ? 100 : kind === 'guardian' ? 130 : 40 }, targetDistribution: .5, radius: fieldRadius(.5), cooldown: { cast: 0, impulse: 0, pulse: 0, surge: 0, contact: 0, orbit: 0 }, channel: newChannel(), melee: newMelee(), modifiers: {melee: 1, reach: 1, pull: 1, pulse: 1, fluxEfficiency: 1, fluxOnHit: 1}, manifestationId: 'vessel', hitPause: 0, hitTime: 0, deathTime: 0, guardBroken: 0, guardCharge: 0, channelUsed: false, meleeHits: 0, comboConnected: 0, impactWindow: 0, stagger: 0, cap: mass * B.mass.cap, angle: 0, alive: true };
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
  hit(a: Actor, amount: number, direct: boolean, melee = false): number {
    if (this.moon?.states.has(a.id)) return this.moon.hit(a, amount, melee);
    if (this.mode === 'pve' && a.kind === 'guardian' && (a.guardBroken <= 0 || !melee)) return 0;
    const actual = damage(a, amount, direct);
    if (actual > 0 && !a.alive) a.deathTime = this.time;
    if (actual > 0) { a.hitTime = C.feedback.hitDuration; this.damageEvents.push({x:a.x, y:a.y-55, amount:actual, critical:direct, time:this.time, target:a.id}); }
    return actual;
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
    if (this.moon?.state === 'intro') { this.time += dt; this.moon.update(dt); return; }
    if (input.cast || input.pulse || input.surge) this.trainingEngaged = true;
    this.time += dt;
    for (const a of this.actors) {
      if (!a.alive || this.moon?.states.has(a.id)) continue;
      a.hitPause = Math.max(0, a.hitPause - dt);
      if (a.hitPause > 0) continue;
      const action = { ...(a === this.player ? input : this.botActions(a)) };
      for (const key of Object.keys(a.cooldown) as (keyof Actor['cooldown'])[]) a.cooldown[key] = Math.max(0, a.cooldown[key] - dt);
      a.stagger = Math.max(0, a.stagger - dt); a.hitTime = Math.max(0, a.hitTime - dt); a.guardBroken = Math.max(0, a.guardBroken - dt);
      const buttons = action.buttons ?? (this.trackers.get(a.id) ?? this.trackers.set(a.id, new ButtonTracker()).get(a.id)!).sample({ primary: action.cast, impulse: action.impulse, pull: action.surge, pulse: action.pulse, orbit: action.orbit });
      // Assist only a deliberate melee press/hold, within a limited facing cone.
      if (buttons.primary.held && a.melee.phase === 'idle' && !a.channel.mode) {
        const aim = Math.atan2(action.aim.y, action.aim.x);
        const target = this.actors.filter(t => t !== a && t.alive && (a === this.player || t === this.player) && distance(a,t) < meleeReach(a)+38 && lineOfSight(a,t,this.obstacles) && Math.cos(Math.atan2(t.y-a.y,t.x-a.x)-aim) > (action.aimAssist ? .5 : .85)).sort((x,y)=>distance(a,x)-distance(a,y))[0];
        if (target) { const n=unit({x:target.x-a.x,y:target.y-a.y}); action.aim={...n}; a.vx+=n.x*85; a.vy+=n.y*85; }
      }
      abilities(a, action, buttons, this, dt);
      a.targetDistribution = a.channel.mode === 'pull' ? 1 : a.channel.mode === 'pulse' ? 0 : a.mass.distribution;
      redistribute(a.mass, a.targetDistribution, dt, a.channel.overload > 0 ? C.flux.redistributionRate : 1);
      a.radius = fieldRadius(a.mass.distribution);
      if (a.channel.mode) a.channel.maximumReached = a.channel.mode === 'pull' ? a.mass.distribution >= .999 : a.mass.distribution <= .001;
      a.impactWindow = Math.max(0, a.impactWindow - dt);
      const accel = B.movement.thrust * (1 - a.mass.distribution * B.movement.inertia) * (a === this.player ? 1 : B.enemy.speed) * (a.stagger > 0 ? B.movement.staggerMultiplier : 1) * (a.channel.mode === 'pull' ? .75 : 1);
      a.vx += action.move.x * accel * dt; a.vy += action.move.y * accel * dt;
      for (const other of this.actors) if (other !== a && other.alive && !this.moon?.states.has(other.id)) { const f = gravity(other, a, a.mass.combatMass); a.vx += f.x * dt * B.gravity.entityScale * (1 - a.mass.distribution * B.movement.inertia); a.vy += f.y * dt * B.gravity.entityScale * (1 - a.mass.distribution * B.movement.inertia); }
      a.vx *= Math.exp(-B.movement.drag * dt); a.vy *= Math.exp(-B.movement.drag * dt);
      const speed = Math.hypot(a.vx, a.vy); if (speed > B.movement.speed) { const limit = Math.max(B.movement.speed, speed * Math.exp(-dt * B.movement.overspeedDecay)); a.vx *= limit / speed; a.vy *= limit / speed; }
      a.x = clamp(a.x + a.vx * dt, B.movement.boundary, B.arena - B.movement.boundary); a.y = clamp(a.y + a.vy * dt, B.movement.boundary, B.arena - B.movement.boundary);
      orbit(a, this.debris, dt);
    }
    this.resolveChannels(dt);
    this.resolveMelee();
    this.moveDebris(dt);
    this.contacts();
    this.environment(dt);
    if (this.moon && this.player.alive) this.moon.update(dt);

    for (const a of this.actors) if (!a.alive && !this.killed.has(a.id)) {
      this.killed.add(a.id); a.deathTime = this.time; for (const d of this.debris.filter(d => d.owner === a.id)) release(a, d);
      if (a !== this.player && this.mode === 'pve' && !this.moon) this.player.mass.unbankedMass += a.kind === 'guardian' ? B.pve.guardianReward : B.pve.reward;
      this.pulseVisual(a);
    }
    if (this.mode === 'pve' && this.player.alive && !this.moon) this.mission(dt);
    if (!this.player.alive) this.finish(false, 'Your Core collapsed');
    if (this.mode === 'pvp') {
      const opponent = this.actors[1];
      if (!opponent.alive) this.finish(true, 'Rival Core collapsed');
      else if (this.time >= B.pvp.duration && !this.suddenDeath) { const winner = timeout(this.player, opponent); if (winner !== null) this.finish(winner === this.player.id, 'Time limit · integrity tiebreak'); else this.suddenDeath = true; }
      if (this.suddenDeath) for (const a of [this.player, opponent]) this.hit(a, B.pvp.suddenDeathDrain * dt, false);
    }
    this.damageEvents = this.damageEvents.filter(e => this.time - e.time < .85);
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
          if (this.moon?.states.has(a.id)) { if(this.moon.projectile(a,d,d.damage)){d.projectile=false;d.launchOwner=null;d.life=B.mass.fragmentLife;break;} continue; }
          const dist = distance(a, d);
          if (dist < B.combat.coreRadius + B.combat.hitPadding) { this.hit(a, d.damage * Math.max(B.combat.minVelocityDamage, Math.hypot(d.vx - a.vx, d.vy - a.vy) / B.combat.velocityScale), true); d.projectile = false; d.launchOwner = null; d.life = B.mass.fragmentLife; d.vx *= B.combat.impactRetention; d.vy *= B.combat.impactRetention; break; }
          // A glancing trajectory strips the outer Field, while shots aimed at the Core pass through.
          const speed = Math.hypot(d.vx, d.vy), cross = speed ? Math.abs((a.x - d.x) * d.vy - (a.y - d.y) * d.vx) / speed : 0;
          if (dist < a.radius * B.combat.fieldHitRadius && cross > B.combat.coreRadius + B.combat.hitPadding) { this.hit(a, d.damage * B.combat.glancingMultiplier, false); d.projectile = false; d.launchOwner = null; d.life = B.mass.fragmentLife; break; }
        }
      } else {
        for (const a of living) {
          if (this.moon?.states.has(a.id)) continue;
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
        if (this.moon?.states.has(target.id)) { if (source === this.player) this.moon.force(target, f, dt); continue; }
        target.vx += f.x * dt; target.vy += f.y * dt;
        if (source.channel.mode === 'pulse' && (f.x || f.y)) target.impactWindow = .4;
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
        this.hit(target, meleeDamage(source), true, true); source.meleeHits++; source.comboConnected |= 1 << source.melee.index;
        source.hitPause = target.hitPause = heavy ? C.melee.heavyHitStop : C.melee.hitStop;
        source.channel.flux = Math.min(C.flux.max, source.channel.flux + C.flux.meleeRestore * source.modifiers.fluxOnHit);
        const n = unit({ x: target.x - source.x, y: target.y - source.y });
        const momentum = 1 + clamp(Math.hypot(source.vx,source.vy)/C.melee.momentumSpeed,0,1)*C.melee.momentumCap;
        const force = C.melee.knockback * attackSpec(source).force * (1 + source.mass.distribution) * momentum * Math.min(1.4, source.mass.combatMass / Math.max(1, target.mass.combatMass));
        if (this.moon?.states.has(target.id)) { const state = this.moon.states.get(target.id)!; if (state.massClass === 'Anchored' || state.massClass === 'Titanic') continue; if (heavy && state.id === 'comet-hound' && source.mass.distribution >= .65) { state.state = 'stagger'; state.timer = 3; } }
        target.vx += n.x * force; target.vy += n.y * force; target.impactWindow = .4;
        source.vx -= n.x * 18; source.vy -= n.y * 18;
        target.stagger = (heavy ? C.melee.heavyStagger : C.melee.stagger) * (1 + source.mass.distribution);
        if (heavy) interruptChannel(target.channel);
        this.hitEvents.push({ source: source.id, target: target.id, heavy, x: target.x, y: target.y, serial: ++this.hitSerial });
      }
    }
  }
  contacts(): void {
    const p = this.player;
    for (const a of this.actors) if (a !== p && !this.moon?.states.has(a.id) && a.alive && p.alive && distance(a, p) < B.combat.coreRadius * 2 + B.combat.contactPadding) {

      const n = unit({ x: a.x - p.x, y: a.y - p.y }); a.vx += n.x * B.combat.contactPush; a.vy += n.y * B.combat.contactPush; p.vx -= n.x * B.combat.contactPush; p.vy -= n.y * B.combat.contactPush;
    }
  }
  seedCrystals(center: {x: number; y: number}): void {
    this.crystals = [{x:center.x-80,y:center.y-130,radius:20,hp:24},{x:center.x+70,y:center.y+130,radius:20,hp:24}];
  }
  environment(dt: number): void {
    if (this.moon) { const c = this.moon.room.center; this.player.x = clamp(this.player.x,c.x-290,c.x+290); this.player.y = clamp(this.player.y,c.y-290,c.y+290); return; }
    const room = this.mode === 'pve' ? dungeon.rooms[this.room] : null;
    const half = dungeon.roomHalfSize;
    const bounds = room ? {left:room.center.x-half,right:room.center.x+half,top:room.center.y-half,bottom:room.center.y+half} : this.mode === 'pvp' ? map.duelBounds : {left:B.movement.boundary,right:B.arena-B.movement.boundary,top:B.movement.boundary,bottom:B.arena-B.movement.boundary};
    for (const a of this.actors) if (a.alive) {
      const impact = (speed: number) => { if (a.impactWindow > 0 && speed > 100) { this.hit(a, Math.min(24,speed*.045), false); a.impactWindow=0; } };
      if (a.x <= bounds.left || a.x >= bounds.right) { impact(Math.abs(a.vx)); a.x=clamp(a.x,bounds.left,bounds.right); a.vx *= -.25; }
      if (a.y <= bounds.top || a.y >= bounds.bottom) { impact(Math.abs(a.vy)); a.y=clamp(a.y,bounds.top,bounds.bottom); a.vy *= -.25; }
      for (const o of this.obstacles) {
        const d=distance(a,o), radius=o.radius+B.combat.coreRadius;
        if (d<radius) { const n=unit({x:a.x-o.x,y:a.y-o.y}), inward=-(a.vx*n.x+a.vy*n.y); impact(inward); a.x=o.x+n.x*radius;a.y=o.y+n.y*radius; if(inward>0){a.vx+=n.x*inward*1.25;a.vy+=n.y*inward*1.25;} }
      }
      if (!room) {
        const d=distance(a,map.well); if(d<map.well.radius){const n=unit({x:map.well.x-a.x,y:map.well.y-a.y});a.vx+=n.x*B.pve.wellForce*dt;a.vy+=n.y*B.pve.wellForce*dt;}
        if(distance(a,map.entropy)<map.entropy.radius)this.hit(a,B.pve.hazardDamage*dt,false);
      }
      if (a.melee.phase==='active' && a.hitPause<=0) this.crystals.forEach((crystal,i)=>{
        const id=-i-1;
        if(crystal.hp>0&&!a.melee.hits.includes(id)&&withinMeleeArc(a,crystal)&&lineOfSight(a,crystal,this.obstacles)){
          a.melee.hits.push(id);crystal.hp-=meleeDamage(a);a.hitPause=.06;
          this.damageEvents.push({x:crystal.x,y:crystal.y,amount:meleeDamage(a),critical:false,time:this.time,target:id});
          if(crystal.hp<=0){for(let j=0;j<4;j++)this.debris.push(this.makeDebris(crystal.x+Math.cos(j*Math.PI/2)*26,crystal.y+Math.sin(j*Math.PI/2)*26,2.5,true));this.effects.push({x:crystal.x,y:crystal.y,radius:75,life:.5,hostile:false});}
        }
      });
    }
    if (!room) for(const d of this.debris) if(d.owner===null){const r=distance(d,map.well);if(r<map.well.radius){const n=unit({x:map.well.x-d.x,y:map.well.y-d.y});d.vx+=n.x*B.pve.wellForce*dt;d.vy+=n.y*B.pve.wellForce*dt;}if(distance(d,map.entropy)<map.entropy.radius)d.life-=dt*B.pve.entropyDecay;}
  }
  enterRoom(index: number): void {
    if (this.moon) { this.moon.enter(index); return; }
    this.room = index; this.phase = index; this.roomCleared = false;
    const room = dungeon.rooms[index];
    for (const d of this.debris) if (d.owner === this.player.id) release(this.player, d);
    this.actors = [this.player]; this.debris = []; this.obstacles = room.obstacles.map(o => ({ ...o }));
    this.seedCrystals(room.center);
    this.player.integrity.current = this.player.integrity.maximum;
    this.player.x = room.center.x - 140; this.player.y = room.center.y; this.player.vx = 0; this.player.vy = 0;
    for (let i = 0; i < room.enemies.length; i++) this.actor(room.enemies[i], room.center.x + room.offsets[i].x, room.center.y + room.offsets[i].y, room.masses[i]);
    for (let i = 0; i < 12; i++) { const angle = this.random() * Math.PI * 2; this.debris.push(this.makeDebris(room.center.x + Math.cos(angle) * 180, room.center.y + Math.sin(angle) * 180, B.mass.debris, true)); }
  }
  get missionStage(): string {
    if (this.moon) return `${this.room + 1}/5 · ${this.moon.room.name} · ${this.moon.hint}`;
    const r = dungeon.rooms[this.room];
    return this.roomCleared ? this.room === 2 ? 'DUNGEON CLEAR · Enter the green exit to bank rewards' : 'ROOM CLEAR · Enter the green gate to continue' : String(this.room + 1).padStart(2, '0') + ' / ' + r.name + ' · ' + r.instruction;
  }
  mission(dt: number): void {
    const room = dungeon.rooms[this.room], half = dungeon.roomHalfSize;
    this.roomCleared = !this.actors.some(a => a !== this.player && a.alive);
    for (const a of this.actors) if (a.alive) {
      a.x = clamp(a.x, room.center.x - half, room.center.x + half); a.y = clamp(a.y, room.center.y - half, room.center.y + half);
    }
    if (room.hazard) {
      if (distance(this.player, room.hazard) < room.hazard.radius) this.hit(this.player, B.pve.hazardDamage * dt, false);
      for (const d of this.debris) if (d.owner === null && distance(d, room.hazard) < room.hazard.radius) d.life -= dt * B.pve.entropyDecay;
    }
    for (const a of this.actors) if (a.alive && a.kind === 'leech' && distance(a, this.player) < this.player.radius && !this.player.channel.mode) this.player.mass.unbankedMass = Math.max(0, this.player.mass.unbankedMass - B.pve.leechDrain * dt);
    if (this.roomCleared && distance(this.player, room.gate) < dungeon.gateRadius) {
      if (this.room < dungeon.rooms.length - 1) this.enterRoom(this.room + 1); else this.finish(true, 'The Silent Orbit completed');
    }
  }
  finish(won: boolean, reason: string): void { if (this.moon && !won) this.moon.state = 'failure'; if (!this.result) this.result = { won, reason, gained: this.player.mass.unbankedMass, banked: 0, lost: 0, duration: this.time }; }
}
