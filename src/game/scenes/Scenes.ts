import { renderMoon, moonBossLabel } from '../render/MoonRenderer';
import { grantMoonRewards } from '../systems/MoonRewards';
import { enemies } from '../content/shatteredMoon';
import Phaser from 'phaser';
import { B, validateBalance } from '../config/balance';
import { C } from '../config/combatV4';
import { economy } from '../config/economy';
import { dungeon } from '../content/dungeon';
import { manifestationFor } from '../content/manifestations';
import { enterDungeon, grantDungeonRewards } from '../systems/EconomySystem';
import { VesselRig } from '../render/VesselRig';
import { CombatAudio } from '../audio/CombatAudio';
import { meleeReach, attackSpec } from '../systems/MeleeSystem';
import { divisionFor } from '../content/content';
import { arenaContent as map, asteroidAt } from '../content/arena';
import { ActionInput } from '../input/ActionInput';
import { LocalProfileStore, settle } from '../persistence/Profile';
import { Simulation } from '../systems/Simulation';
import { coreExposed, integrityRatio } from '../systems/IntegritySystem';
import { slots } from '../systems/OrbitSystem';
import { seeded, distance, type Actor, type Mode, type Result } from '../systems/types';

export const ui = () => document.querySelector<HTMLDivElement>('#ui')!;
export const store = new LocalProfileStore();
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const sceneFor = { training: 'TrainingScene', pve: 'PvEMissionScene', pvp: 'PvPArenaScene' };
export function backdrop(scene: Phaser.Scene): void {
  const g = scene.add.graphics(), random = seeded(B.seed);
  g.fillStyle(0x080c19); g.fillRect(0, 0, 4000, 3000);
  for (let i = 0; i < 230; i++) { g.fillStyle(i % 5 === 0 ? 0x9bbdd1 : 0x647188, random() * .5 + .1); g.fillCircle(random() * 2000, random() * 1200, random() * 1.6 + .4); }
  for (let r = 320; r > 0; r -= 12) { g.fillStyle(0x237e80, .014); g.fillCircle(1000, 500, r); }
  g.lineStyle(1, 0x74dec9, .18); g.strokeCircle(1000, 500, 190); g.strokeEllipse(1000, 500, 520, 170);
  g.fillStyle(0x91ffe3); g.fillCircle(1000, 500, 22);
}
export class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload(): void { VesselRig.preload(this); }
  create(): void { validateBalance(); this.scene.start('MainMenuScene'); }
}
export class MainMenuScene extends Phaser.Scene {
  constructor() { super('MainMenuScene'); }
  create(): void {
    backdrop(this); const profile = store.load();
    ui().innerHTML = `<main class="menu"><header><a class="brand">◈ <span>COSMIC CORE</span></a><span class="version">CORE INTEGRITY / 1.2</span></header><section class="hero"><div class="eyebrow"><span class="dot"></span> A SMALL CORE. AN UNLIMITED COSMOS.</div><h1>Make space.<br><em>Become mass.</em></h1><p>Expand to capture. Compress to strike.<br>Everything you gather is everything you stand to lose.</p><div class="profile"><div class="core-icon">✦</div><div><small>YOUR CORE / ${divisionFor(profile.maximumMass).name.toUpperCase()}</small><strong>${profile.maximumMass.toFixed(1)} <span>MAXIMUM MASS</span></strong></div><span class="saved">● LOCAL PROFILE</span></div></section><nav class="modes"><button data-mode="training"><span class="mode-no">01 / LEARN THE PULL</span><strong>Training sandbox <b>↗</b></strong><span>Find your orbit. Master your distribution.</span><small>FREE EXPLORATION · NO PROGRESSION RISK</small></button><button data-mode="pve" class="featured"><span class="mode-no">02 / GATHER & RETURN</span><strong>The Silent Orbit <b>↗</b></strong><span>Three rooms. One anchored Core. Earn your return.</span><small>THREE-ROOM DUNGEON · NORMAL</small></button><button data-mode="pvp"><span class="mode-no">03 / CORE AGAINST CORE</span><strong>Orbital duel <b>↗</b></strong><span>Control the field against a deterministic rival.</span><small>LOCAL BOT · 1V1 · 4 MINUTES</small></button></nav><footer><span>WASD move <i>·</i> HOLD E pull <i>·</i> HOLD Q pulse <i>·</i> Mouse aim & melee</span><span>◇ Planetary evolution <strong>LOCKED</strong></span></footer></main>`;
    ui().querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(button => button.onclick = () => this.scene.start(button.dataset.mode === 'pve' ? 'DungeonSelectScene' : sceneFor[button.dataset.mode as Mode]));
    const collection = document.createElement('button'); collection.id = 'collection'; collection.className = 'quiet'; collection.textContent = 'Manifestations ↗'; collection.onclick = () => this.scene.start('CollectionScene'); ui().querySelector('header')!.append(collection);
  }
}
class ArenaScene extends Phaser.Scene {
  sim!: Simulation; inputActions!: ActionInput; graphics!: Phaser.GameObjects.Graphics; stars!: Phaser.GameObjects.Graphics;
  accumulator = 0; hudTimer = 0; finished = false; paused = false; debug = false; sprites = new Map<number, Phaser.GameObjects.Zone>();
  labels = new Map<number, Phaser.GameObjects.Text>(); damageLabels: Phaser.GameObjects.Text[] = []; displayedMass = new Map<number, number>();
  rig!: VesselRig; audio!: CombatAudio; lastMoonCue = -1; lastHit = 0; resultDelay = 0; renderTime = 0;
  constructor(key: string, private mode: Mode) { super(key); }
  create(): void {
    this.accumulator = 0; this.hudTimer = 0; this.finished = false; this.paused = false; this.sprites.clear(); this.labels.clear(); this.damageLabels=[]; this.displayedMass.clear();
    const profile = store.load();
    if (this.mode === 'pve' && !enterDungeon(profile)) { this.scene.start('DungeonSelectScene'); return; }
    if (this.mode === 'pve' && economy.energyEnabled) store.save(profile);
    this.sim = new Simulation(this.mode, profile.maximumMass, B.seed, { manifestationId: profile.equippedManifestation, dungeonId: this.registry.get('dungeonId'), level: profile.manifestationLevels[profile.equippedManifestation] });
    this.rig = new VesselRig(this); this.audio = new CombatAudio(); this.lastMoonCue = -1; this.lastHit = 0; this.resultDelay = 0; this.renderTime = 0;
    this.physics.world.setBounds(0, 0, B.arena, B.arena);
    // Arcade bodies mirror the fixed-step model for collision/debug integration. Forces and authoritative state remain pure.
    this.graphics = this.add.graphics();
    this.stars = this.add.graphics().setDepth(-1); const random = seeded(B.seed);
    for (let i = 0; i < B.visuals.stars; i++) { this.stars.fillStyle(0x8ca3be, .2 + random() * .45); this.stars.fillCircle(random() * B.arena, random() * B.arena, .6 + random()); }
    this.cameras.main.setBackgroundColor('#080c19');
    this.inputActions = new ActionInput(this.game.canvas);
    ui().innerHTML = `<div class="hud"><header class="hud-top"><div class="hud-title"><span class="brand">◈ COSMIC CORE</span><small>${this.mode === 'pve' ? 'THE SILENT ORBIT / NORMAL' : this.mode === 'pvp' ? `LOCAL BOT DUEL / ${divisionFor(this.sim.maximumMass).name.toUpperCase()}` : 'TRAINING / NO PROGRESSION RISK'}</small></div><div id="objective"></div><button id="pause" class="quiet">Ⅱ Pause</button><button id="exit" class="quiet">Exit ↗</button></header><div class="mass-panel"><small>TOTAL MASS</small><strong id="mass-value"></strong><div class="distribution"><i id="core-meter"></i><i id="field-meter"></i></div><div class="split-label"><span id="core-value"></span><span id="field-value"></span></div><div class="integrity-track"><i id="integrity-meter"></i></div><div id="integrity"></div><div id="bank"></div></div><div id="rival"></div><div class="mission-note" id="mission-note"></div><div class="ability-bar"><button data-action="impulse"><kbd>SPACE</kbd><span>↗ Impulse</span><small id="cd-impulse">READY</small></button><button data-action="pulse"><kbd>Q</kbd><span>◎ Mass pulse</span><small id="cd-pulse">READY</small></button><button data-action="surge"><kbd>E</kbd><span>✦ Surge</span><small id="cd-surge">READY</small></button></div><div class="desktop-hints">WASD <span>thrust</span> · Mouse <span>melee</span> · HOLD E <span>pull</span> · HOLD Q <span>pulse</span><button id="reset">Reset training</button><button id="debug">Telemetry</button></div><div class="touch-controls"><div class="stick" data-stick="move"><i></i><span>THRUST</span></div><div class="stick" data-stick="aim"><i></i><span>AIM / CAST</span></div></div><pre id="debug-panel" hidden></pre><div id="pause-overlay" hidden><h2>Orbit paused</h2><p>Resume when you’re ready.</p><button id="resume">Resume →</button></div></div>`;
    ui().querySelector('.ability-bar')!.innerHTML = '<button data-action="pull" class="pull-control"><kbd>HOLD E</kbd><span>◉ Pull</span><small id="cd-pull">HOLD</small></button><div class="combat-state"><div class="flux-header"><span>FLUX</span><span id="flux-value">100</span></div><div class="flux-track"><i id="flux-meter"></i></div><div id="channel-state">FLUX READY</div><div id="melee-chain" aria-label="Melee chain"><i></i><i></i><i></i></div></div><button data-action="pulse" class="pulse-control"><kbd>HOLD Q</kbd><span>◎ Pulse</span><small id="cd-pulse">HOLD</small></button>';
    ui().querySelector('.hud')!.insertAdjacentHTML('beforeend','<div class="secondary-abilities"><button data-action="impulse"><kbd>SPACE</kbd> Impulse <small id="cd-impulse">READY</small></button><button data-action="orbit"><kbd>R</kbd> Orbit cast <small id="cd-orbit">READY</small></button></div>');
    ui().querySelector('[data-stick="aim"] span')!.textContent = 'AIM / MELEE';
    this.inputActions.attachTouch(ui());
    const sound = document.createElement('button'); sound.id = 'sound'; sound.className = 'quiet'; sound.textContent = 'Sound on'; sound.onclick = () => { this.audio.enabled = !this.audio.enabled; sound.textContent = this.audio.enabled ? 'Sound on' : 'Sound off'; }; ui().querySelector('.hud-top')!.append(sound);
    if (this.mode !== 'training') {
      const exit = ui().querySelector<HTMLButtonElement>('#exit')!;
      exit.textContent = 'Abandon ↗'; exit.title = 'Lose unbanked run mass and apply the protected 1% permanent penalty.';
    }
    ui().querySelector<HTMLButtonElement>('#exit')!.onclick = () => { if (this.mode === 'training') this.scene.start('MainMenuScene'); else { this.sim.finish(false, 'Run abandoned'); this.complete(); } };
    ui().querySelector<HTMLButtonElement>('#pause')!.onclick = () => this.togglePause();
    ui().querySelector<HTMLButtonElement>('#resume')!.onclick = () => this.togglePause();
    ui().querySelector<HTMLButtonElement>('#reset')!.hidden = this.mode !== 'training';
    ui().querySelector<HTMLButtonElement>('#reset')!.onclick = () => this.scene.restart();
    ui().querySelector<HTMLButtonElement>('#debug')!.onclick = () => { this.debug = !this.debug; };
    const blur = () => { if (!this.paused) this.togglePause(); }; window.addEventListener('blur', blur);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.inputActions.destroy(); this.rig.destroy(); this.audio.destroy(); this.labels.clear(); this.damageLabels=[]; window.removeEventListener('blur', blur); });
    if (this.sim.moon) { ui().querySelector('.hud-title small')!.textContent = 'THE SHATTERED MOON / NORMAL'; ui().querySelector('.hud')!.insertAdjacentHTML('beforeend','<div id="moon-boss" class="moon-boss"></div><div id="moon-cache" class="moon-cache" hidden><span>Lunar cache</span><button id="cache-recovery">Recover 35 Integrity</button><button id="cache-materials">+4 each material</button></div>'); for(const choice of ['recovery','materials'] as const) ui().querySelector<HTMLButtonElement>('#cache-'+choice)!.onclick=()=>this.sim.moon!.chooseCache(choice); }
    this.updateHUD();
  }
  togglePause(): void { this.paused = !this.paused; this.inputActions.clear(); ui().querySelector<HTMLElement>('#pause-overlay')!.hidden = !this.paused; }
  update(_time: number, delta: number): void {
    if (this.finished) return;
    const portrait = matchMedia('(pointer: coarse) and (orientation: portrait)').matches;
    if (!this.paused && !portrait && !this.sim.result) {
      this.accumulator += Math.min(delta / 1000, B.step * B.maxSteps);
      while (this.accumulator >= B.step) { this.sim.step(this.inputActions.sample({ x: (this.sim.player.x-this.cameras.main.worldView.x)*this.cameras.main.zoom, y: (this.sim.player.y-this.cameras.main.worldView.y)*this.cameras.main.zoom }, B.step)); this.accumulator -= B.step; }
    }
    this.renderWorld();
    this.audio.update(this.sim.player.channel, this.paused || portrait || !!this.sim.result);
    for (const e of this.sim.hitEvents) if (e.serial > this.lastHit) { this.lastHit = e.serial; if (e.source === this.sim.player.id || e.target === this.sim.player.id) { this.audio.impact(e.heavy); if (e.heavy) this.cameras.main.shake(C.melee.heavyShakeMs, C.melee.heavyShake); } }
    if(this.sim.moon&&!this.paused){const cues=this.sim.moon.audio.filter(e=>e.time>this.lastMoonCue);if(cues.length){this.lastMoonCue=cues[cues.length-1].time;const cue=cues[cues.length-1].cue;this.audio.tone(cue.includes('break')?720:cue.includes('charge')?380:cue.includes('slam')?130:cue.includes('teleport')?850:240,.16,.25);}}
    this.hudTimer += delta / 1000; if (this.hudTimer >= B.visuals.hudInterval) { this.hudTimer = 0; this.updateHUD(); }
    if (this.sim.result) { this.resultDelay += delta / 1000; if (this.resultDelay >= C.feedback.victoryDuration) this.complete(); }
  }
  complete(): void {
    if (this.finished || !this.sim.result) return; this.finished = true;
    const result = this.sim.result, profile = store.load(); let saved = true;
    if (this.mode !== 'training') {
      if (this.sim.moon && result.won) Object.assign(result, grantMoonRewards(profile, this.sim.moon));
      if (this.mode === 'pve' && result.won && !this.sim.moon) { const reward = grantDungeonRewards(profile, B.seed, result.duration); result.gained += reward.mass; Object.assign(result, { grade: reward.grade, materials: reward.materials, currency: reward.currency, firstClear: reward.firstClear, firstClearMass: reward.firstClearMass, dungeonId: dungeon.id }); }
      Object.assign(result, settle(profile, result.won, result.gained, this.mode === 'pve')); saved = store.save(profile);
    }
    this.scene.start('ResultsScene', { result, mode: this.mode, saved });
  }
  renderWorld(): void {
    const g = this.graphics, p = this.sim.player, cam = this.cameras.main;
    const rival = this.sim.actors.filter(a=>a!==p&&a.alive).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    const framed = this.mode === 'pvp' && rival ? rival : rival && distance(p,rival)<500 ? rival : p;
    const desired = Phaser.Math.Clamp(Math.min(this.scale.width*.8/(Math.abs(p.x-framed.x)+200), this.scale.height*.72/(Math.abs(p.y-framed.y)+220)), B.visuals.zoomMin, B.visuals.zoomMax);
    cam.setZoom(Phaser.Math.Linear(cam.zoom, desired, .05)); cam.centerOn((p.x+framed.x)/2,(p.y+framed.y)/2);
    if(this.sim.moon){cam.setZoom(Math.min(this.scale.width/900,this.scale.height/760));cam.centerOn(this.sim.moon.room.center.x,this.sim.moon.room.center.y);}
    g.clear(); g.lineStyle(2, 0x364965, .5); g.strokeRect(20, 20, B.arena - 40, B.arena - 40);
    if(this.mode==='pvp'){const b=map.duelBounds;g.fillStyle(0x142332,.6);g.fillRect(b.left,b.top,b.right-b.left,b.bottom-b.top);g.lineStyle(4,0x8aafba,.8);g.strokeRect(b.left,b.top,b.right-b.left,b.bottom-b.top);}
    g.lineStyle(1, 0x22314b, .23); for (let i = 0; i <= B.arena; i += 100) { g.lineBetween(i, 0, i, B.arena); g.lineBetween(0, i, B.arena, i); }
    if (this.mode === 'pve') {
      const room = this.sim.moon ? { ...this.sim.moon.room, hazard: null } : dungeon.rooms[this.sim.room], half = dungeon.roomHalfSize;
      g.fillStyle(this.sim.moon ? this.sim.moon.room.color : this.sim.room === 2 ? 0x201c31 : 0x111e29, .65); g.fillRect(room.center.x - half, room.center.y - half, half * 2, half * 2);
      g.lineStyle(3, 0x658a94, .6); g.strokeRect(room.center.x - half, room.center.y - half, half * 2, half * 2);
      for (const o of this.sim.obstacles) { g.fillStyle(0x253340); g.fillCircle(o.x, o.y, o.radius); g.lineStyle(3, 0x5b788a); g.strokeCircle(o.x, o.y, o.radius); }
      if (room.hazard) { g.fillStyle(0xa04ed9, .18); g.fillCircle(room.hazard.x, room.hazard.y, room.hazard.radius); g.lineStyle(2, 0xb983e4, .7); g.strokeCircle(room.hazard.x, room.hazard.y, room.hazard.radius); }
      g.lineStyle(4, this.sim.roomCleared ? 0x83ffbb : 0x576678, .8); g.strokeCircle(room.gate.x, room.gate.y, dungeon.gateRadius);
      g.lineStyle(2, this.sim.roomCleared ? 0x83ffbb : 0x576678, .5); g.strokeCircle(room.gate.x, room.gate.y, dungeon.gateRadius * .7);
      if (this.sim.roomCleared) { const angle = Math.atan2(room.gate.y - p.y, room.gate.x - p.x), r = p.radius + 12; g.lineStyle(4, 0xbcefa8); g.lineBetween(p.x + Math.cos(angle) * r, p.y + Math.sin(angle) * r, p.x + Math.cos(angle) * (r + 24), p.y + Math.sin(angle) * (r + 24)); }
    }
    if (this.sim.moon) renderMoon(g, this.sim.moon);
    for(const [id,label] of this.labels)if(!this.sim.actors.some(a=>a.id===id)){label.destroy();this.labels.delete(id);this.displayedMass.delete(id);}
    this.rig.prune(new Set(this.sim.actors.map(a => a.id)));
    for (const a of this.sim.actors) {
      if(this.sim.moon?.states.has(a.id)) {
        const state=this.sim.moon.states.get(a.id)!;let label=this.labels.get(a.id);
        if(!label){label=this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'12px',color:'#e6eef7',stroke:'#080c19',strokeThickness:3}).setOrigin(.5,1).setDepth(30);this.labels.set(a.id,label);}
        label.setVisible(a.alive&&state.id!=='meteor-mite'&&state.id!=='lunar-devourer').setPosition(a.x,a.y-58).setText(enemies[state.id].name+' · '+state.massClass+(state.elite?' · '+state.elite:''));
        continue;
      }
      this.rig.render(a, this.sim.time + this.resultDelay, !!this.sim.result?.won && a === p);
      if (!a.alive) { this.labels.get(a.id)?.setVisible(false); const t=(this.sim.time+this.resultDelay-a.deathTime)/C.feedback.collapseDuration;if(t<1){g.lineStyle(5,0xffdca7,1-t);g.strokeCircle(a.x,a.y,20+t*100);for(let i=0;i<16;i++){const angle=i*Math.PI/8;g.fillStyle(0xffdca7,1-t);g.fillCircle(a.x+Math.cos(angle)*t*125,a.y+Math.sin(angle)*t*125,4*(1-t));}} continue; }
      const friendly = a === p, color = friendly ? manifestationFor(a.manifestationId).color : a.kind === 'guardian' ? 0xffc276 : 0xf67a8e;
      g.fillStyle(color, .035 + a.mass.distribution * .035); g.fillCircle(a.x, a.y, a.radius);
      g.lineStyle(1.5 + a.channel.intensity * 2, color, .45 + a.channel.intensity * .3);
      g.beginPath();
      for(let i=0;i<=80;i++){const angle=i/80*Math.PI*2;let r=a.radius;const edge={x:a.x+Math.cos(angle)*r,y:a.y+Math.sin(angle)*r};for(const other of this.sim.actors)if(other!==a&&other.alive&&distance(edge,other)<other.radius)r-=12*(1-distance(edge,other)/other.radius)*(1+Math.sin(angle*7+this.sim.time*3)*.3);const x=a.x+Math.cos(angle)*r,y=a.y+Math.sin(angle)*r;if(i===0)g.moveTo(x,y);else g.lineTo(x,y);}g.strokePath();
      g.lineStyle(1, color, .13); g.strokeCircle(a.x, a.y, a.radius * .52);
      const radius = B.combat.coreRadius + a.mass.distribution * 5;
      for (let i = 4; i > 0; i--) { g.fillStyle(color, .035); g.fillCircle(a.x, a.y, radius + i * 8); }
      if (coreExposed(a)) { g.lineStyle(4, 0xffffff, .5 + Math.sin(this.sim.time * 16) * .45); g.strokeCircle(a.x, a.y, radius + 12); g.lineStyle(2, 0xff5069, .9); g.strokeCircle(a.x, a.y, radius + 25); }
      const hp = integrityRatio(a);
      g.fillStyle(0x080c19,.95);g.fillRoundedRect(a.x-44,a.y-87,88,8,3);g.fillStyle(coreExposed(a)?0xff637e:0x8ff5cf);g.fillRoundedRect(a.x-43,a.y-86,86*hp,6,2);
      let label=this.labels.get(a.id);if(!label){label=this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'10px',color:'#e6eef7',align:'center',stroke:'#080c19',strokeThickness:3}).setOrigin(.5,1).setDepth(30);this.labels.set(a.id,label);}
      const shown=Phaser.Math.Linear(this.displayedMass.get(a.id)??a.mass.combatMass,a.mass.combatMass,.12);this.displayedMass.set(a.id,shown);
      const moonState=this.sim.moon?.states.get(a.id);
      const name=moonState?enemies[moonState.id].name+' · '+moonState.massClass+(moonState.elite?' · '+moonState.elite:''):a===p?'YOUR CORE':a.kind==='bot'?'VOID INITIATE':a.kind.toUpperCase();
      label.setVisible(true).setPosition(a.x,a.y-91).setText(name+'\n'+Math.round(shown)+' MASS'+(coreExposed(a)?'\nCORE EXPOSED':''));
      const selected=a!==p && a===this.sim.actors.filter(t=>t!==p&&t.alive&&distance(p,t)<Math.max(p.radius,meleeReach(p))).sort((x,y)=>distance(p,x)-distance(p,y))[0];
      if(selected){g.lineStyle(2,0xffe7ae,.75);g.strokeEllipse(a.x,a.y+9,67,26);}
      if(hp<.65){g.lineStyle(2,0xffa0ab,.9);for(let i=0;i<Math.ceil((1-hp)*7);i++){const angle=i*2.4;g.beginPath();g.moveTo(a.x+Math.cos(angle)*8,a.y+Math.sin(angle)*8);g.lineTo(a.x+Math.cos(angle+.2)*20,a.y+Math.sin(angle+.2)*20);g.lineTo(a.x+Math.cos(angle)*31,a.y+Math.sin(angle)*31);g.strokePath();}}
      const channel = a.channel;
      if (channel.mode || channel.decay > 0) {
        const inward = (channel.mode ?? channel.lastMode) === 'pull', alpha = channel.mode ? .25 + channel.intensity * .35 : channel.decay / C.channel.releaseDecay * .35;
        g.lineStyle(2, inward ? 0x9fddff : 0xffcf89, alpha);
        for (let i = 0; i < 4; i++) { const t = (this.sim.time * .8 + i / 4) % 1; const r = (inward ? 1-t : t) * a.radius; g.strokeCircle(a.x, a.y, Math.max(10,r)); }
        for (let i = 0; i < 14; i++) { const angle = i * Math.PI * 2 / 14 + this.sim.time * .2, t = (this.sim.time + i / 14) % 1, r = (inward ? 1-t : t) * a.radius; g.fillStyle(inward ? 0xa4e1ff : 0xffd59a,alpha); g.fillCircle(a.x+Math.cos(angle)*r,a.y+Math.sin(angle)*r,2); }
        g.fillStyle(0xffffff, channel.intensity * .6); g.fillCircle(a.x,a.y,8);
      }
      if(channel.mode==='pull'){g.fillStyle(0xc3f4ff,.12+a.mass.distribution*.25);g.fillCircle(a.x,a.y-13,10+a.mass.distribution*8);}
      if(channel.mode==='pulse'){g.lineStyle(4,0xffd599,.35);for(const side of [-1,1]){g.lineBetween(a.x+side*16,a.y-16,a.x+side*(30+(1-a.mass.distribution)*25),a.y-28);g.lineStyle(2,0xffd599,.18);g.lineBetween(a.x+side*25,a.y-10,a.x+side*60,a.y+5);}}
      if (channel.overload > 0) { g.lineStyle(3, 0xff705c, .7); g.strokeCircle(a.x,a.y,32); }
      if (a.kind === 'guardian' && this.mode === 'pve') { g.lineStyle(4, a.guardBroken > 0 ? 0x87ffbf : 0xe7bd7a, .85); g.strokeCircle(a.x,a.y,44); }
      if (a.melee.phase !== 'idle') {
        const reach = meleeReach(a), spec = attackSpec(a), angle = a.melee.angle, arc = spec.arc / 2 + (1-a.mass.distribution)*C.melee.arcExpansion;
        g.lineStyle(a.melee.index===2 ? 6 : 3, color, a.melee.missed ? .12 : a.melee.phase === 'active' ? .9 : .3); g.beginPath(); g.arc(a.x,a.y,reach,angle-arc,angle+arc,false);g.strokePath();
      }
      if (!this.sprites.has(a.id)) { const zone = this.add.zone(a.x, a.y, radius * 2, radius * 2); this.physics.add.existing(zone); (zone.body as Phaser.Physics.Arcade.Body).moves = false; this.sprites.set(a.id, zone); }
      const zone = this.sprites.get(a.id)!; zone.setPosition(a.x, a.y); (zone.body as Phaser.Physics.Arcade.Body).reset(a.x, a.y);
    }
    for(const [id,label] of this.labels)if(!this.sim.actors.some(a=>a.id===id)){label.destroy();this.labels.delete(id);this.displayedMass.delete(id);}
    for(const o of this.sim.obstacles){g.fillStyle(0x253340);g.fillCircle(o.x,o.y,o.radius);g.lineStyle(3,0x5b788a);g.strokeCircle(o.x,o.y,o.radius);}
    if(this.mode!=='pve'){
      for(const [zone,color] of [[map.well,0x659cff],[map.entropy,0xc167eb]] as const){g.fillStyle(color,.12);g.fillCircle(zone.x,zone.y,zone.radius);g.lineStyle(2,color,.6);g.strokeCircle(zone.x,zone.y,zone.radius);for(let i=0;i<3;i++)g.strokeCircle(zone.x,zone.y,zone.radius*((this.sim.time*.2+i/3)%1));}
    }
    for(const c of this.sim.crystals)if(c.hp>0){g.fillStyle(0x86ffde,.8);g.fillTriangle(c.x,c.y-24,c.x-17,c.y+12,c.x+17,c.y+12);g.lineStyle(2,0xffffff,.6);g.strokeTriangle(c.x,c.y-24,c.x-17,c.y+12,c.x+17,c.y+12);g.lineBetween(c.x,c.y-24,c.x,c.y+12);}
    const events=this.sim.damageEvents.filter(e=>e.amount>=.5);
    while(this.damageLabels.length<events.length)this.damageLabels.push(this.add.text(0,0,'',{fontFamily:'Arial',fontSize:'18px',fontStyle:'bold',stroke:'#080c19',strokeThickness:4}).setOrigin(.5).setDepth(40));
    this.damageLabels.forEach((label,i)=>{const e=events[i];label.setVisible(!!e);if(e){const age=this.sim.time-e.time, target=this.sim.actors.find(a=>a.id===e.target), x=target?.x??e.x, y=target?target.y-65:e.y;label.setText('-'+e.amount.toFixed(0)).setColor(e.kind==='part'?'#d799ff':e.kind==='environment'?'#8adfff':e.critical?'#ffd080':'#ffffff').setPosition(x,y-age*60).setAlpha(Math.min(1,(.85-age)*3));for(let j=0;j<7;j++){const angle=j*2.4;g.fillStyle(e.critical?0xffd080:0xffffff,Math.max(0,1-age*4));g.fillCircle(e.x+Math.cos(angle)*age*120,e.y+55+Math.sin(angle)*age*120,2);}}});
    for (const d of this.sim.debris) {
      const color = d.owner === p.id ? 0x9bffe0 : d.owner !== null ? 0xff829b : d.previousOwner !== null ? 0xffd795 : 0xb4c8de;
      if (d.projectile) { g.lineStyle(3, color, .45); g.lineBetween(d.x, d.y, d.x - d.vx * .04, d.y - d.vy * .04); }
      g.fillStyle(color, d.life < 3 ? .4 : .95); const size = Math.min(9, 3 + Math.sqrt(d.mass)); g.fillRect(d.x - size / 2, d.y - size / 2, size, size);
      if (Object.values(d.capture).some(v => v > 0)) { g.lineStyle(1, 0xffdc96, .8); g.strokeCircle(d.x, d.y, size + 4); }
    }
    for (const e of this.sim.effects) { g.lineStyle(3, e.hostile ? 0xff8099 : 0xa0ffdc, e.life * 1.6); g.strokeCircle(e.x, e.y, e.radius * (1 - e.life)); }
  }
  updateHUD(): void {
    const p = this.sim.player, m = p.mass, text = (id: string, value: string) => { ui().querySelector<HTMLElement>(`#${id}`)!.textContent = value; };
    text('mass-value', m.combatMass.toFixed(1)); text('core-value', `${m.coreMass.toFixed(0)} CORE`); text('field-value', `${m.fieldMass.toFixed(0)} EXTERNAL`);
    ui().querySelector<HTMLElement>('#core-meter')!.style.width = `${m.coreMass / Math.max(1, m.combatMass) * 100}%`;
    ui().querySelector<HTMLElement>('#field-meter')!.style.width = `${m.fieldMass / Math.max(1, m.combatMass) * 100}%`;
    text('integrity', 'CORE INTEGRITY '+Math.ceil(p.integrity.current)+' / '+p.integrity.maximum+(coreExposed(p)?' · CORE EXPOSED':''));
    ui().querySelector<HTMLElement>('#integrity-meter')!.style.width = integrityRatio(p)*100+'%';
    ui().querySelector<HTMLElement>('#integrity')!.className = coreExposed(p)?'exposed':'';
    ui().querySelectorAll<HTMLElement>('#melee-chain i').forEach((marker,i)=>marker.classList.toggle('connected',p.melee.phase!=='idle'&&(p.comboConnected&(1<<i))!==0));
    text('bank', this.mode === 'pve' ? `◇ ${m.unbankedMass.toFixed(1)} unbanked mass` : `${this.sim.debris.filter(d => d.owner === p.id).length} / ${slots(p)} orbits · ${m.orbitingStoredMass.toFixed(1)} stored`);
    text('objective', this.mode === 'pvp' ? this.sim.suddenDeath ? 'SUDDEN DEATH' : clock(Math.max(0, B.pvp.duration - this.sim.time)) : clock(this.sim.time));
    text('mission-note', this.mode === 'pve' ? this.sim.missionStage : this.mode === 'training' ? this.sim.trainingEngaged ? 'Pull to close distance. Melee damages Core Integrity. Pulse to expand and escape.' : 'Hold E to pull · Hold Q to pulse · Primary: three-hit melee · R: orbit cast.' : `EFFECTIVE MASS ${this.sim.effectiveMass.toFixed(1)} · BOT SIMULATION`);
    const rival = this.sim.actors.filter(a => a !== p && a.alive && distance(a,p)<Math.max(p.radius,meleeReach(p))).sort((a,b)=>distance(a,p)-distance(b,p))[0];
    text('rival', rival?.kind === 'guardian' && this.mode === 'pve' ? rival.guardBroken > 0 ? 'ANCHOR BROKEN · MELEE NOW · ' + rival.guardBroken.toFixed(1) + 's' : 'ANCHORED · HOLD PULL / PULSE NEAR BOSS' : rival ? `${rival.kind.toUpperCase()} / ${Math.ceil(rival.integrity.current)} HP · ${rival.mass.combatMass.toFixed(0)} MASS` + ' · ' + (rival.mass.combatMass < p.mass.combatMass*.9 ? 'LIGHTER · PULL ADVANTAGE' : rival.mass.combatMass > p.mass.combatMass*1.1 ? 'HEAVIER · PULL RESISTED' : 'BALANCED') : 'NO TARGET IN RANGE');
    if (this.sim.moon) { const moon=this.sim.moon; text('moon-boss',moonBossLabel(moon)); ui().querySelector<HTMLElement>('#moon-cache')!.hidden=!(this.sim.room===3&&this.sim.roomCleared&&!moon.cache); const latest=moon.events.at(-1); if(latest) text('rival',latest.text); }
    const channel = p.channel;
    text('flux-value', channel.flux.toFixed(0)); ui().querySelector<HTMLElement>('#flux-meter')!.style.width = channel.flux + '%';
    ui().querySelector<HTMLElement>('.flux-track')!.className = 'flux-track' + (channel.flux <= C.flux.low ? ' low' : '');
    text('channel-state', channel.overload > 0 ? 'OVERLOAD · RELEASE TO RESET' : channel.mode ? channel.mode.toUpperCase() + (channel.maximumReached ? ' · MAXIMUM' : ' · CHARGING') : channel.needsRelease ? 'RELEASE CHANNEL BUTTONS' : channel.flux <= C.flux.low ? 'LOW FLUX · RECOVER' : 'FLUX READY');
    for (const key of ['impulse', 'orbit'] as const) text('cd-'+key, p.cooldown[key] > 0 ? p.cooldown[key].toFixed(1)+'s' : 'READY');
    for (const key of ['pull','pulse'] as const) text('cd-'+key, channel.overload > 0 ? 'OVERLOAD' : channel.mode === key ? 'CHANNELING' : 'HOLD');
    const debug = ui().querySelector<HTMLElement>('#debug-panel')!; debug.hidden = !this.debug;
    debug.textContent = `FPS ${this.game.loop.actualFps.toFixed(0)} | fixed ${1 / B.step}Hz\ndistribution ${m.distribution.toFixed(3)} | integrity ${p.integrity.current.toFixed(1)}\nmass error ${(m.combatMass - m.coreMass - m.fieldMass).toFixed(8)}\nchannel ${p.channel.mode ?? 'none'} | flux ${p.channel.flux.toFixed(1)} | melee ${p.melee.phase} ${p.melee.index + 1}\nseed ${B.seed} | bodies ${this.sim.actors.length} | debris ${this.sim.debris.length}`;
  }
}
export class TrainingScene extends ArenaScene { constructor() { super('TrainingScene', 'training'); } }
export class PvEMissionScene extends ArenaScene { constructor() { super('PvEMissionScene', 'pve'); } }
export class PvPArenaScene extends ArenaScene { constructor() { super('PvPArenaScene', 'pvp'); } }
export class ResultsScene extends Phaser.Scene {
  constructor() { super('ResultsScene'); }
  create(data: { result: Result; mode: Mode; saved: boolean }): void {
    backdrop(this); const { result: r, mode, saved } = data;
    ui().innerHTML = `<main class="results"><div class="eyebrow">${mode === 'pvp' ? 'LOCAL BOT DUEL' : mode.toUpperCase()} / ${clock(r.duration)}</div><h1>${r.won ? 'Core intact.' : 'Into the dust.'}</h1><p>${r.reason}</p><div class="result-grid"><div><small>GATHERED</small><strong>${r.gained.toFixed(1)}</strong></div><div><small>BANKED</small><strong>+${r.banked.toFixed(1)}</strong></div><div><small>PERMANENT LOSS</small><strong>−${r.lost.toFixed(1)}</strong></div></div><p>${!r.won && mode !== 'training' ? `Run mass lost: ${r.gained.toFixed(1)}. Permanent loss is capped and tier protected.` : mode === 'training' ? 'Training does not change your profile.' : mode === 'pvp' ? 'Duel gains are temporary. Earn permanent mass in PvE.' : 'Your gathered mass is now permanent maximum mass.'}</p><div class="result-actions"><button id="again">Play again ↗</button><button id="menu">Return to menu</button></div><small>${saved ? 'LOCAL PROFILE SAVED' : 'SAVE UNAVAILABLE · Browser storage is blocked; progress could not be persisted.'}</small></main>`;
    if (mode === 'pve' && r.won && !r.rewardBreakdown) ui().querySelector('.result-grid')!.insertAdjacentHTML('afterend', '<div class="dungeon-rewards">GRADE <b>' + r.grade + '</b> · MATERIALS +' + r.materials + ' · TEST SUMMON CURRENCY +' + r.currency + (r.firstClear ? '<br>FIRST CLEAR · Includes +' + r.firstClearMass + ' maximum mass and bonus materials/currency' : '<br>REPEAT CLEAR · Standard rewards') + '</div>');
    if(r.rewardBreakdown) ui().querySelector('.result-grid')!.insertAdjacentHTML('afterend','<div class="dungeon-rewards">GRADE <b>'+r.grade+'</b>'+Object.entries(r.rewardBreakdown).map(([label,items])=>'<p>'+label+': '+Object.entries(items).filter(([,n])=>n>0).map(([id,n])=>id+' +'+n).join(' · ')+'</p>').join('')+'</div>');
    ui().querySelector<HTMLButtonElement>('#again')!.onclick = () => this.scene.start(sceneFor[mode]); ui().querySelector<HTMLButtonElement>('#menu')!.onclick = () => this.scene.start('MainMenuScene');
  }
}
