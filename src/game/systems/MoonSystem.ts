import { enemies, elites, emptyMaterials, moonBalance as M, shatteredMoon, bossPhases, objectiveComplete, validateMoon, type EnemyId, type MassClass, type Elite, type PartDef, type EncounterState, type Drop } from '../content/shatteredMoon';
import { channelForce, newChannel } from './ChannelSystem';
import { withinMeleeArc, meleeDamage } from './MeleeSystem';
import { release } from './OrbitSystem';
import { clamp, distance, unit, type Actor, type Vec } from './types';
import type { Simulation } from './Simulation';
export type PhysicsCause = 'Wall impact' | 'Enemy collision' | 'Launched debris' | 'Gravity well' | 'Entropy hazard' | 'Unsafe boundary' | 'Redirected boss';
export type Part = PartDef & { owner: number; current: number; broken: boolean; loosened: boolean; stabilization: number; exposed: number };
export type EnemyState = { id: EnemyId; massClass: MassClass; state: 'move' | 'telegraph' | 'attack' | 'recovery' | 'attached' | 'orbit' | 'stagger' | 'collapse'; timer: number; direction: Vec; displacement: number; forceWait: number; materialized: number; stabilization: number; parts: Part[]; elite?: Elite; launched: number; rewarded: boolean; phase: number; overload: number; exposure: number; revealed: boolean; attackHit: boolean; home: Vec };
export class MoonSystem {
  states = new Map<number, EnemyState>(); state: EncounterState = 'locked'; elapsed = 0; transition = 0; roomStart = 0;
  materials = emptyMaterials(); physics = 0; brokenParts = 0; optionalParts = 0; revealed = 0; multikills = 0; cache: 'recovery' | 'materials' | null = null;
  events: { x: number; y: number; text: string; kind: 'environment' | 'part' | 'special'; time: number }[] = [];
  audio: { cue: string; time: number }[] = [];
  patches: (Vec & { owner: number; radius: number; suppressed: number })[] = [];
  objects: (Vec & { vx: number; vy: number; radius: number; hp: number; ttl: number; kind: 'pillar' | 'boulder' | 'debris'; launched: boolean })[] = [];
  trails: (Vec & { life: number })[] = [];
  explosions: (Vec & { timer: number; damage: number })[] = []; objectTimer = 0;
  constructor(public sim: Simulation) { validateMoon(); }
  get room() { return shatteredMoon.rooms[this.sim.room]; }
  get boss() { return this.sim.actors.find(a => this.states.get(a.id)?.id === 'lunar-devourer'); }
  get hint(): string {
    const boss = this.boss, s = boss && this.states.get(boss.id);
    if (s) return `${bossPhases[s.phase].name} · ${bossPhases[s.phase].objective}${s.exposure > 0 ? ' CORE EXPOSED — MELEE!' : this.elapsed>M.hintDelay ? s.phase===1?' Purple organ meters fill with Pull. Release to strike.':' Stand behind a boulder, facing the boss; hold Pulse. Missed objects recycle.' : ''}`;
    return this.state === 'intro' ? 'SAFE ARRIVAL · Prepare your approach' : this.sim.roomCleared ? 'ROOM CLEAR · Enter the green gate' : this.room.instruction;
  }
  emit(a: Vec, text: string, kind: 'environment' | 'part' | 'special' = 'special') { this.events.push({ x: a.x, y: a.y, text, kind, time: this.sim.time }); }
  cue(cue: string) { this.audio.push({ cue, time: this.sim.time }); }
  roll(table: Drop[]) { for (const d of table) if (this.sim.random() < d.chance) this.materials[d.material] += d.min + Math.floor(this.sim.random() * (d.max - d.min + 1)); }
  enter(index: number) {
    const sim = this.sim, p = sim.player;
    for (const d of sim.debris) if (d.owner === p.id) release(p, d);
    sim.room = index; sim.phase = index; sim.roomCleared = false; sim.actors = [p]; sim.debris = []; sim.obstacles = []; sim.crystals = []; sim.trackers.clear();
    this.states.clear(); this.objects = []; this.patches = []; this.explosions = []; this.trails = []; this.revealed = 0; this.elapsed = 0; this.roomStart = sim.time; this.state = 'intro'; this.transition = M.transitionSeconds;
    p.x = this.room.center.x - 185; p.y = this.room.center.y; p.vx = p.vy = 0; p.channel = newChannel(); p.melee.phase = 'idle'; p.melee.hits = []; p.stagger = p.hitPause = 0;
    let n = 0;
    for (const spawn of this.room.spawns) for (let i = 0; i < spawn.count; i++) {
      const def = enemies[spawn.id], angle = n++ * 2.4, a = sim.actor(spawn.id, this.room.center.x + 85 + Math.cos(angle) * 100, this.room.center.y + Math.sin(angle) * 170, def.mass);
      a.integrity = { current: def.hp, maximum: def.hp };
      this.states.set(a.id, { id: spawn.id, massClass: def.massClass, state: 'move', timer: 1.5 + i * .17, direction: { x: 1, y: 0 }, displacement: 0, forceWait: 0, materialized: 0, stabilization: 0, parts: def.parts.map(part => ({ ...part, owner: a.id, current: part.hp, broken: false, loosened: false, stabilization: 0, exposed: 0 })), elite: 'elite' in spawn ? spawn.elite : undefined, launched: 0, rewarded: false, phase: 0, overload: 0, exposure: 0, revealed: false, attackHit: false, home: { x: a.x, y: a.y } });
      if (spawn.id === 'entropy-wisp') this.patches.push({ x: a.x, y: a.y, owner: a.id, radius: 85, suppressed: 0 });
      this.cue(`${spawn.id}:aggro`);
    }
    if (index === 0) for (const y of [-125, 125]) this.objects.push({ x: this.room.center.x + 15, y: this.room.center.y + y, vx: 0, vy: 0, radius: 32, hp: 60, ttl: Infinity, kind: 'pillar', launched: false });
    if (index === 1) for (const y of [-125, 125]) this.objects.push({ x: this.room.center.x, y: this.room.center.y + y, vx: 95, vy: 0, radius: 27, hp: 1000, ttl: Infinity, kind: 'debris', launched: false });
    this.objectTimer = 0;
    for (let i = 0; i < 12; i++) sim.debris.push(sim.makeDebris(this.room.center.x + Math.cos(i) * 160, this.room.center.y + Math.sin(i) * 160, 2.5, true));
  }
  partPosition(a: Actor, p: Part): Vec { return { x: a.x + p.x, y: a.y + p.y }; }
  breakPart(a: Actor, p: Part) {
    if (p.broken) return; p.broken = true; p.current = 0; this.brokenParts++; if(p.id.includes('plate'))this.optionalParts++; this.roll(p.drops); this.emit(this.partPosition(a, p), `${p.id} BROKEN`, 'part'); this.cue('part:break');
    const s = this.states.get(a.id)!;
    if (s.id === 'graviton-crab' && s.parts.filter(p => p.id.includes('anchor')).every(p => p.broken)) s.massClass = 'Heavy';
    if (s.id === 'lunar-devourer' && s.phase < 2 && bossPhases[s.phase].parts.every(id => s.parts.find(p => p.id === id)!.broken)) { s.phase++; a.x=this.room.center.x+30; a.y=this.room.center.y; a.vx=a.vy=0; s.timer = 3; s.state = 'recovery'; this.emit(a, bossPhases[s.phase].name); }
  }
  hitPart(a: Actor, p: Part, amount: number, environmental: boolean) {
    const s = this.states.get(a.id)!;
    if (p.broken || s.id === 'lunar-devourer' && (s.phase === 0 ? !p.id.includes('armor') || !environmental : s.phase !== 1 || !p.id.includes('organ') || p.exposed <= 0)) return;
    this.sim.damageEvents.push({...this.partPosition(a,p),amount:Math.min(p.current,amount/p.armor),critical:false,kind:'part',time:this.sim.time,target:-1000-a.id*10-s.parts.indexOf(p)});
    p.current = Math.max(0, p.current - amount / p.armor); this.emit(this.partPosition(a, p), `${p.id} -${Math.round(amount)}`, 'part');
    if (p.current <= 0) { if (p.id.includes('plate')) { p.loosened = true; this.emit(a, 'PLATE LOOSE · PULL'); } else this.breakPart(a, p); }
  }
  hit(a: Actor, amount: number, melee: boolean, cause?: PhysicsCause): number {
    const s = this.states.get(a.id); if (!s || !a.alive || s.state === 'collapse') return 0;
    if (s.id === 'entropy-wisp' && s.materialized <= 0) return 0;
    if (s.id === 'lunar-devourer' && (s.phase < 2 || s.exposure <= 0 || !melee)) return 0;
    if (s.id === 'lunar-devourer') amount *= M.bossCoreDamage;
    if (s.id === 'graviton-crab') { if (s.massClass === 'Anchored' || s.state !== 'stagger') amount *= .05; else if (melee) amount *= 2; }
    if (s.id === 'comet-hound' && s.state === 'attack' && !cause) { const toward = unit({ x: this.sim.player.x - a.x, y: this.sim.player.y - a.y }); if (toward.x * s.direction.x + toward.y * s.direction.y > .4) amount *= .35; }
    const actual = Math.min(a.integrity.current, amount); a.integrity.current -= actual; a.hitTime = .12;
    this.sim.damageEvents.push({ x: a.x, y: a.y, amount: actual, critical: s.id==='lunar-devourer', kind: cause?'environment':s.id==='lunar-devourer'?'core':'melee', target: a.id, time: this.sim.time });
    if (a.integrity.current <= 0) {
      if (s.id === 'lunar-devourer') { s.state = 'collapse'; s.timer = 2.5; this.emit(a, 'CORE COLLAPSE'); this.cue('boss:collapse'); }
      else { a.alive = false; a.deathTime = this.sim.time; }
      if (cause) { this.physics++; this.emit(a, `Physics Execution · ${cause}`, 'environment'); if (s.id === 'comet-hound') this.roll(enemies[s.id].drops); }
    }
    return actual;
  }
  environmentHit(a: Actor, amount: number, cause: PhysicsCause) { const s = this.states.get(a.id); if (!s) return; this.hit(a, amount * (s.elite ? elites[s.elite].collision : 1), false, cause); if (a.alive && s.massClass !== 'Titanic' && s.massClass !== 'Anchored') { s.state = 'stagger'; s.timer = 3; } this.emit(a, cause, 'environment'); }
  projectile(a: Actor, point: Vec, amount: number): boolean {
    const s=this.states.get(a.id);if(!s)return false;
    const part=s.parts.find(p=>!p.broken&&distance(point,this.partPosition(a,p))<p.radius+8);
    if(part){this.hitPart(a,part,amount,true);return true;}
    if(distance(a,point)<enemies[s.id].radius+8){this.environmentHit(a,amount,'Launched debris');return true;}
    return false;
  }
  force(a: Actor, f: Vec, dt: number) {
    const s = this.states.get(a.id)!; const p = this.sim.player, magnitude = Math.hypot(f.x, f.y); if (!magnitude) return;
    const pull = p.channel.mode === 'pull'; s.forceWait = M.displacementDelay;
    if (s.massClass === 'Titanic') return;
    if (s.id === 'entropy-wisp' && pull && s.materialized <= 0) { s.stabilization += dt / M.stabilizationSeconds; if (s.stabilization >= 1) { s.materialized = M.materializedSeconds; s.stabilization = 0; if (!s.revealed) this.revealed++; s.revealed = true; this.emit(a, 'MATERIALIZED · MELEE'); this.cue('wisp:materialize'); } }
    if (s.id === 'graviton-crab' && pull) for (const part of s.parts) if (part.loosened && !part.broken) this.breakPart(a, part);
    if (s.massClass === 'Anchored') return;
    if (s.massClass === 'Heavy') { s.displacement = Math.min(100, s.displacement + magnitude * dt * M.displacementRate / (s.elite ? elites[s.elite].resistance : 1)); if (s.displacement >= 100) { s.state = 'stagger'; s.timer = M.exposureSeconds; s.displacement = 0; this.emit(a, 'DISPLACED · UNDERSIDE EXPOSED'); this.cue('enemy:stagger'); } }
    const factor = (s.massClass === 'Heavy' && s.state !== 'stagger' ? .25 : 1) / (s.elite ? elites[s.elite].resistance : 1);
    a.vx += f.x * dt * factor; a.vy += f.y * dt * factor;
    if (s.id === 'comet-hound' && s.state === 'attack') s.launched = 2;
    if (!pull) { s.launched = 2; if (s.state === 'attached' || s.state === 'orbit') { s.state = 'recovery'; s.timer = 1; a.vx = f.x * .65; a.vy = f.y * .65; this.emit(a, 'SEPARATED'); } }
    else if (s.id === 'meteor-mite' && s.state !== 'attached' && s.state !== 'orbit' && distance(a, p) < 90) { s.state = 'orbit'; s.timer = 1; }
  }
  chooseCache(choice: 'recovery' | 'materials') { if (this.sim.room !== 3 || !this.sim.roomCleared || this.cache || this.sim.result) return false; this.cache = choice; if (choice === 'recovery') this.sim.player.integrity.current = Math.min(100, this.sim.player.integrity.current + M.cacheRecovery); else for (const id of ['Dense Matter', 'Frozen Momentum', 'Graviton Shell', 'Decay Fragment'] as const) this.materials[id] += 4; return true; }
  tickEnemy(a: Actor, dt: number) {
    const s = this.states.get(a.id)!, def = enemies[s.id], p = this.sim.player;
    if (!a.alive) { if (!s.rewarded) { s.rewarded = true; s.state = 'collapse'; this.roll(def.drops); this.cue(`${s.id}:defeat`); if (s.id === 'entropy-wisp') p.channel.flux = Math.min(100, p.channel.flux + 30); if (s.id === 'meteor-mite' && this.sim.random() < .2) p.mass.unbankedMass += 1; if (s.elite === 'Unstable') this.explosions.push({ x: a.x, y: a.y, timer: elites.Unstable.tell, damage: elites.Unstable.explosion }); } return; }
    s.timer -= dt; s.launched = Math.max(0, s.launched - dt); s.materialized = Math.max(0, s.materialized - dt); s.exposure = Math.max(0, s.exposure - dt); s.forceWait -= dt;
    if (s.forceWait <= 0) { s.displacement = Math.max(0, s.displacement - M.displacementDecay * dt); s.stabilization = Math.max(0, s.stabilization - dt * .3); }
    for (const part of s.parts) part.exposed = Math.max(0, part.exposed - dt);
    if (s.state === 'collapse') { if (s.timer <= 0) { a.alive = false; a.deathTime = this.sim.time; } return; }
    if (s.id === 'lunar-devourer') {
      if(s.exposure>0){s.state='stagger';s.timer=s.exposure;}
      // Boss locomotion is authored; player forces never translate the Titan.
      if (s.phase === 1 && s.state === 'attack') { const f = unit({ x: a.x - p.x, y: a.y - p.y }); if (p.channel.mode !== 'pulse') { p.vx += f.x * 170 * dt; p.vy += f.y * 170 * dt; } const puller:Actor={...a,radius:350,channel:{...a.channel,mode:'pull',intensity:.4}};for(const d of [...this.sim.debris.filter(d=>d.owner===null),...this.objects.filter(o=>o.kind!=='pillar')]){const force=channelForce(puller,d,'mass' in d?d.mass:30);d.vx+=force.x*dt*.25;d.vy+=force.y*dt*.25;} }
      if (s.phase === 2) { const half = Math.max(160, 300 - (this.sim.time - this.roomStart) * .35); if (Math.max(Math.abs(p.x - this.room.center.x), Math.abs(p.y - this.room.center.y)) > half) this.sim.hit(p, 4 * dt, false); }
      for (const part of s.parts) if (s.phase === 1 && part.id.includes('organ') && !part.broken) { const f = channelForce(p, this.partPosition(a, part), 20, []); if (p.channel.mode === 'pull' && Math.hypot(f.x, f.y) > 0) { part.stabilization += dt; if (part.stabilization >= M.stabilizationSeconds) { part.exposed = M.materializedSeconds; part.stabilization = 0; this.cue('organ:expose'); } } }
    }
    if (s.state === 'attached') { const angle = a.id * 2.4 + this.sim.time; a.x = p.x + Math.cos(angle) * 38; a.y = p.y + Math.sin(angle) * 38; a.vx = p.vx; a.vy = p.vy; return; }
    if (s.state === 'orbit') { const angle = a.id * 2.4 + this.sim.time * 2; a.x = p.x + Math.cos(angle) * 70; a.y = p.y + Math.sin(angle) * 70; a.vx = a.vy = 0; if (p.channel.mode !== 'pull') { s.state = 'recovery'; s.timer = .6; } else if(s.timer<=0 && [...this.states.values()].filter(s=>s.state==='attached').length<M.attachmentCap){s.state='attached';this.emit(p,'PULL OVERHELD · MITE ATTACHED');} return; }
    if (s.timer <= 0) {
      if (s.state === 'move') { s.state = 'telegraph'; s.timer = def.attack.tell; s.direction = unit({ x: p.x - a.x, y: p.y - a.y }); s.attackHit = false; if (s.id === 'entropy-wisp' && s.materialized <= 0) { const patch = this.patches.find(p => p.owner === a.id); if (patch) { const angle = this.sim.random() * Math.PI * 2; patch.x = this.room.center.x + Math.cos(angle)*170; patch.y = this.room.center.y + Math.sin(angle)*170; } } this.cue(def.attack.cue); }
      else if (s.state === 'telegraph') { s.state = 'attack'; s.timer = def.attack.duration; if (s.id === 'comet-hound') s.massClass = 'Heavy'; if (s.id === 'entropy-wisp' && s.materialized <= 0) { const patch = this.patches.find(patch => patch.owner === a.id); if (patch) { a.x = patch.x; a.y = patch.y; } } }
      else if (s.state === 'attack') { s.state = 'recovery'; s.timer = def.attack.recovery; if (s.id === 'comet-hound') s.massClass = 'Light'; }
      else { s.state = 'move'; s.timer = 2; }
    }
    const n = unit({ x: p.x - a.x, y: p.y - a.y }); a.angle = Math.atan2(n.y, n.x);
    if (s.state === 'move') { const circle = s.id === 'comet-hound'; a.vx += (circle ? -n.y : n.x) * def.speed * 2 * dt; a.vy += (circle ? n.x : n.y) * def.speed * 2 * dt; }
    if (s.state === 'attack') {
      if (s.id === 'comet-hound' || s.id === 'meteor-mite' || s.id === 'lunar-devourer' && s.phase === 0) { a.vx += s.direction.x * def.speed * 7 * dt; a.vy += s.direction.y * def.speed * 7 * dt; }
      if (s.id === 'comet-hound' && Math.floor(this.sim.time*10)!==Math.floor((this.sim.time-dt)*10)) this.trails.push({x:a.x,y:a.y,life:2});
      const reach = s.id === 'graviton-crab' ? 115 : def.radius + 22;
      if (distance(a, p) < reach && !s.attackHit && (s.id!=='lunar-devourer'&&s.id!=='graviton-crab'||n.x*s.direction.x+n.y*s.direction.y>.6)) { s.attackHit = true; if (s.id === 'meteor-mite' && [...this.states.values()].filter(s => s.state === 'attached').length < M.attachmentCap) { s.state = 'attached'; this.emit(p, 'ATTACHED · INERTIA'); } else this.sim.hit(p, def.attack.damage, true); }
    }
    if (s.id === 'graviton-crab' && s.state !== 'stagger' && distance(a,p)<230) { const dx=p.x-a.x,dy=p.y-a.y; if(dx*n.x+dy*n.y>0 && Math.abs(dx*n.y-dy*n.x)<45){p.vx*=Math.exp(-dt*2);p.vy*=Math.exp(-dt*2);} }
    if (s.massClass === 'Anchored' || s.id === 'lunar-devourer' && (s.phase !== 0 || s.state !== 'attack')) a.vx = a.vy = 0;
    this.integrateEnemy(a,s,dt);
  }
  // Executes locomotion and collisions after the explicit AI state has selected velocity.
  integrateEnemy(a:Actor,s:EnemyState,dt:number) {
    a.vx *= Math.exp(-2 * dt); a.vy *= Math.exp(-2 * dt); a.x += a.vx * dt; a.y += a.vy * dt;
    const c = this.room.center, h = 280;
    if (Math.abs(a.x - c.x) > h || Math.abs(a.y - c.y) > h) { if (s.launched > 0 && Math.hypot(a.vx, a.vy) > 120) { this.environmentHit(a, s.id === 'comet-hound' ? 100 : 36, 'Wall impact'); s.launched = 0; } a.x = clamp(a.x, c.x - h, c.x + h); a.y = clamp(a.y, c.y - h, c.y + h); a.vx *= -.3; a.vy *= -.3; }
    a.hitTime = Math.max(0, a.hitTime - dt);
  }
  update(dt: number) {
    const sim = this.sim, p = sim.player; this.elapsed += dt;
    this.events = this.events.filter(e => sim.time - e.time < 2).slice(-24); this.audio = this.audio.filter(e => sim.time - e.time < 1).slice(-32);
    if (this.state === 'intro') { this.transition -= dt; if (this.transition <= 0) this.state = 'active'; return; }
    for (const a of sim.actors) if (this.states.has(a.id)) this.tickEnemy(a, dt);
    const attached = [...this.states.values()].filter(s => s.state === 'attached').length; p.vx *= Math.exp(-attached * M.attachmentInertia * 5 * dt); p.vy *= Math.exp(-attached * M.attachmentInertia * 5 * dt);
    if (p.melee.phase === 'active' && p.hitPause <= 0) {
      for (const a of sim.actors) { const s = this.states.get(a.id); if (!s || !a.alive) continue;
        if (s.state === 'attached' && p.mass.distribution >= .65 && !p.melee.hits.includes(a.id)) { p.melee.hits.push(a.id); this.hit(a, 50, true); }
        for (let i = 0; i < s.parts.length; i++) { const part = s.parts[i], id = -(a.id * 10 + i + 1000); if (!part.broken && !p.melee.hits.includes(id) && withinMeleeArc(p, this.partPosition(a, part))) { p.melee.hits.push(id); this.hitPart(a, part, meleeDamage(p), false); } }
      }
    }
    for (const patch of this.patches) {
      patch.suppressed = Math.max(0, patch.suppressed - dt); const owner = sim.actors.find(a => a.id === patch.owner); if (!owner?.alive) continue;
      const f = channelForce(p, patch, 20); if (p.channel.mode === 'pulse' && Math.hypot(f.x, f.y)) patch.suppressed = 2;
      const radius = patch.suppressed > 0 ? patch.radius * .5 : patch.radius;
      if (distance(p, patch) < radius) { p.channel.flux = Math.max(0, p.channel.flux - 9 * dt); sim.hit(p, 1.5 * dt, false); for (const d of sim.debris) if (d.owner === p.id) release(p, d); }
      for (const d of sim.debris) if (d.owner === null && distance(d, patch) < radius) { if (!Number.isFinite(d.life)) d.life = 18; d.life -= 5 * dt; }
    }
    this.trails = this.trails.filter(t => (t.life -= dt) > 0).slice(-80);
    if (this.trails.some(t => distance(t,p)<24)) { p.vx*=Math.exp(-dt*2); p.vy*=Math.exp(-dt*2); }
    this.updateObjects(dt);
    const living = sim.actors.filter(a => a !== p && a.alive);
    for (let i = 0; i < living.length; i++) for (let j = i + 1; j < living.length; j++) { const a = living[i], b = living[j], s = this.states.get(a.id)!, t = this.states.get(b.id)!; if ((s.launched > 0 || t.launched > 0) && distance(a, b) < enemies[s.id].radius + enemies[t.id].radius && Math.hypot(a.vx - b.vx, a.vy - b.vy) > 100) { const before = this.physics; this.environmentHit(a, 40, 'Enemy collision'); this.environmentHit(b, 50, 'Enemy collision'); if (this.physics - before >= 2) { this.multikills++; this.emit(a, 'MULTI-COLLISION BONUS', 'environment'); } s.launched = t.launched = 0; } }
    for (const e of this.explosions) { e.timer -= dt; if (e.timer <= 0) { if (distance(e, p) < 90) sim.hit(p, e.damage, true); for (const a of living) if (distance(a, e) < 90) this.environmentHit(a, 40, 'Enemy collision'); this.cue('unstable:impact'); } } this.explosions = this.explosions.filter(e => e.timer > 0);
    // Include rewards from deaths occurring this tick before enabling the exit.
    for (const a of sim.actors) if (!a.alive && this.states.has(a.id)) this.tickEnemy(a, 0);
    if (this.state === 'active' && objectiveComplete(this.room.objective, { enemies: sim.actors.filter(a => a !== p && a.alive).length, destroyed: this.brokenParts, revealed: this.revealed, elapsed: this.elapsed, physics: this.physics, protectedHP: p.integrity.current, choice: !!this.cache, bossDefeated: !!this.boss && !this.boss.alive })) { this.state = 'success'; this.transition = M.transitionSeconds; sim.roomCleared = true; }
    if (this.state === 'success') { this.transition -= dt; if (this.transition <= 0) this.state = 'reward'; }
    if (this.state === 'reward' && distance(p, this.room.gate) < shatteredMoon.gateRadius && !p.channel.mode && p.melee.phase === 'idle') { this.state = 'exit'; if (sim.room < 4) this.enter(sim.room + 1); else sim.finish(true, 'The Shattered Moon completed'); }
  }
  updateObjects(dt: number) {
    const sim = this.sim, p = sim.player, boss = this.boss, bs = boss && this.states.get(boss.id);
    this.objectTimer -= dt;
    if (boss?.alive && this.objectTimer <= 0 && this.objects.length < 5) { this.objectTimer = M.objectRespawn; const angle = sim.random() * Math.PI * 2; this.objects.push({ x: boss.x + Math.cos(angle) * (bs?.phase===2?65:150), y: boss.y + Math.sin(angle) * (bs?.phase===2?65:150), vx: 0, vy: 0, radius: 20, hp: 40, ttl: M.objectLifetime, kind: 'boulder', launched: false }); }
    for (const o of this.objects) {
      o.ttl-=dt;if(o.ttl<=0){o.hp=0;continue;}
      const f = channelForce(p, o, 30); if (o.kind !== 'pillar') { o.vx += f.x * dt; o.vy += f.y * dt; if (p.channel.mode === 'pulse' && Math.hypot(f.x, f.y)) o.launched = true; o.x += o.vx * dt; o.y += o.vy * dt; if (o.kind === 'boulder') { o.vx *= Math.exp(-.5 * dt); o.vy *= Math.exp(-.5 * dt); } }
      const c = this.room.center; if (Math.abs(o.x - c.x) > 275) { o.x = clamp(o.x, c.x - 275, c.x + 275); o.vx *= -1; } if (Math.abs(o.y - c.y) > 275) { o.y = clamp(o.y, c.y - 275, c.y + 275); o.vy *= -1; }
      if (p.melee.phase === 'active' && withinMeleeArc(p, o) && o.kind === 'pillar') o.hp -= 65 * dt;
      for (const a of sim.actors) { const s = this.states.get(a.id); if (!s || !a.alive || o.hp <= 0) continue;
        if (o.launched && Math.hypot(o.vx, o.vy) > 65) {
          const target = s.parts.filter(part => !part.broken).find(part => distance(o, this.partPosition(a, part)) < part.radius + o.radius);
          if (target) { this.hitPart(a, target, 60, true); o.hp = 0; break; }
          if (s.id === 'lunar-devourer' && bs?.phase === 2 && distance(o, a) < 80) { bs.overload = Math.min(100, bs.overload + M.overloadPerFragment); o.hp = 0; if (bs.overload >= 100) { bs.overload = 0; bs.exposure = M.bossCoreWindow; this.emit(a, 'OVERLOADED · MELEE CORE'); } break; }
          if (distance(a, o) < enemies[s.id].radius + o.radius && s.id !== 'lunar-devourer') { this.environmentHit(a, 65, 'Launched debris'); o.hp = 0; break; }
        }
        if (s.launched > 0 && distance(a, o) < enemies[s.id].radius + o.radius && Math.hypot(a.vx, a.vy) > 100) { this.environmentHit(a, s.id === 'comet-hound' ? 110 : 40, 'Launched debris'); o.hp -= 35; s.launched = 0; }
      }
    }
    this.objects = this.objects.filter(o => o.hp > 0);
  }
}
