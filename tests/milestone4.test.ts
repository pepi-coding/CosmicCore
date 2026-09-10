import { describe, expect, it } from 'vitest';
import { B } from '../src/game/config/balance';
import { C } from '../src/game/config/combatV4';
import { ButtonTracker } from '../src/game/input/ActionState';
import { newChannel, tickChannel, channelForce, interruptChannel, lineOfSight } from '../src/game/systems/ChannelSystem';
import { tickMelee, withinMeleeArc, meleeDamage, meleeReach } from '../src/game/systems/MeleeSystem';
import { Simulation } from '../src/game/systems/Simulation';
import { newProfile, migrateProfile } from '../src/game/persistence/Profile';
import { dungeonRewards, grantDungeonRewards, summon, equipManifestation, upgradeManifestation } from '../src/game/systems/EconomySystem';
import { modifiersFor } from '../src/game/content/manifestations';
import { fieldRadius } from '../src/game/systems/GravitySystem';
import { distribute } from '../src/game/systems/MassSystem';
import type { Actions } from '../src/game/systems/types';
const idle: Actions = { move: {x: 0,y: 0}, aim: {x:1,y:0}, distribution: .5, cast:false, impulse:false, pulse:false, surge:false };
describe('channel lifecycle and Flux', () => {
  it('exposes one press, sustained holds, and one release', () => {
    const t = new ButtonTracker(); expect(t.sample({pull:true}).pull).toEqual({pressed:true,held:true,released:false});
    expect(t.sample({pull:true}).pull).toEqual({pressed:false,held:true,released:false}); expect(t.sample({}).pull).toEqual({pressed:false,held:false,released:true}); expect(t.sample({}).pull.released).toBe(false);
  });
  it('ramps to maximum in configured time and releases without force', () => {
    const a = new Simulation('training',100).player, t = new ButtonTracker(), target = {x:a.x+70,y:a.y}; let first = 0;
    for(let i=0;i<48;i++) {tickChannel(a.channel,t.sample({pull:true}),B.step); const f=channelForce(a,target,100); expect(f.x).toBeLessThan(0); if(i===0)first=Math.abs(f.x);}
    expect(a.channel.intensity).toBeCloseTo(1); expect(Math.abs(channelForce(a,target,100).x)).toBeGreaterThan(first);
    tickChannel(a.channel,t.sample({}),B.step); expect(a.channel.mode).toBeNull(); expect(a.channel.decay).toBeGreaterThan(0); expect(channelForce(a,target,100)).toEqual({x:0,y:0});
  });
  it('pulse is continuous, shares the resource, and is exclusive with pull', () => {
    const a = new Simulation('training',100).player,t=new ButtonTracker(); tickChannel(a.channel,t.sample({pull:true,pulse:true}),B.step);expect(a.channel.mode).toBe('pulse');
    for(let i=0;i<60;i++){tickChannel(a.channel,t.sample({pull:true,pulse:true}),B.step);expect(channelForce(a,{x:a.x+60,y:a.y},100).x).toBeGreaterThan(0);}
    expect(a.channel.flux).toBeLessThan(C.flux.max);
    tickChannel(a.channel,t.sample({pull:true}),B.step);expect(a.channel.mode).toBe('pull');
  });
  it('accelerates drain, overloads, requires release and then recovers', () => {
    const c=newChannel(), t=new ButtonTracker(); let early=0,late=0;
    for(let i=0;i<600;i++){const before=c.flux;tickChannel(c,t.sample({pulse:true}),B.step);if(i===60)early=before-c.flux;if(i===240)late=before-c.flux;if(c.overload>0)break;}
    expect(late).toBeGreaterThan(early);expect(c.flux).toBe(0);expect(c.overload).toBeGreaterThan(0);expect(c.mode).toBeNull();
    for(let i=0;i<150;i++)tickChannel(c,t.sample({pulse:true}),B.step);
    expect(c.mode).toBeNull();expect(c.flux).toBeGreaterThan(0);
    tickChannel(c,t.sample({}),B.step);tickChannel(c,t.sample({pull:true}),B.step);expect(c.mode).toBe('pull');
  });
  it('obstacles and heavier mass counter channel acceleration', () => {
    const a=new Simulation('training',100).player,t=new ButtonTracker(),target={x:a.x+100,y:a.y};tickChannel(a.channel,t.sample({pull:true}),B.step);
    expect(lineOfSight(a,target,[{x:a.x+50,y:a.y,radius:15}])).toBe(false);expect(channelForce(a,target,100,[{x:a.x+50,y:a.y,radius:15}])).toEqual({x:0,y:0});
    expect(Math.abs(channelForce(a,target,400).x)).toBeLessThan(Math.abs(channelForce(a,target,100).x));
    interruptChannel(a.channel);expect(channelForce(a,target,100).x).toBe(0);
  });
  it('distribution changes range and close-range intensity', () => {
    const a=new Simulation('training',100).player,t=new ButtonTracker();tickChannel(a.channel,t.sample({pull:true}),B.step);
    a.mass.distribution=0;a.radius=fieldRadius(0);const expanded=Math.abs(channelForce(a,{x:a.x+70,y:a.y},100).x);expect(channelForce(a,{x:a.x+220,y:a.y},100).x).not.toBe(0);
    a.mass.distribution=1;a.radius=fieldRadius(1);expect(Math.abs(channelForce(a,{x:a.x+70,y:a.y},100).x)).toBeGreaterThan(expanded);expect(channelForce(a,{x:a.x+220,y:a.y},100).x).toBe(0);
  });
  it('fixed-tick outcomes are identical at 30, 60 and 120 render FPS', () => {
    const run=(fps:number)=>{const s=new Simulation('training',100);s.actors[1].x=2000;s.actors[1].y=2000;let accumulator=0;for(let f=0;f<fps*4;f++){accumulator+=1/fps;while(accumulator+1e-10>=B.step){s.step({...idle,surge:true});accumulator-=B.step;}}return {mass:s.player.mass,channel:s.player.channel,position:[s.player.x,s.player.y],debris:s.debris};};
    expect(run(30)).toEqual(run(60));expect(run(120)).toEqual(run(60));
  });
});
describe('facing-directed melee',()=>{
  it('hits only in the active window, inside the arc, and never spawns fallback bullets',()=>{
    const s=new Simulation('training',100),[p,r]=s.actors;r.x=p.x+60;r.y=p.y;s.trainingEngaged=false;
    const t=new ButtonTracker(); tickMelee(p,t.sample({primary:true}).primary,B.step,false);expect(p.melee.phase).toBe('windup');s.resolveMelee();expect(r.mass.combatMass).toBe(100);
    for(let i=0;i<7;i++)tickMelee(p,t.sample({}).primary,B.step,false);
    expect(p.melee.phase).toBe('active');expect(withinMeleeArc(p,r)).toBe(true);expect(withinMeleeArc(p,{x:p.x-50,y:p.y})).toBe(false);expect(withinMeleeArc(p,{x:p.x+500,y:p.y})).toBe(false);
    s.resolveMelee();expect(r.integrity.current).toBeLessThan(100);expect(r.mass.combatMass).toBe(100);const hp=r.integrity.current;s.resolveMelee();expect(r.integrity.current).toBe(hp);expect(s.debris.some(d=>d.projectile)).toBe(false);
  });
  it('chains three timings and punishes a missed finisher',()=>{
    const p=new Simulation('training',100).player,t=new ButtonTracker(),indices=new Set<number>();let heavyRecovery=0;
    for(let i=0;i<140;i++){tickMelee(p,t.sample({primary:true}).primary,B.step,false);indices.add(p.melee.index);if(p.melee.index===2&&p.melee.phase==='recovery')heavyRecovery+=B.step;}
    expect([...indices].sort()).toEqual([0,1,2]);expect(heavyRecovery).toBeGreaterThan(C.melee.attacks[2].recovery);
  });
  it('buffer persists across release and launches at the recovery cancel window',()=>{
    const p=new Simulation('training',100).player,t=new ButtonTracker();p.melee.phase='recovery';p.melee.index=0;p.melee.elapsed=.31;p.melee.hits=[99];
    tickMelee(p,t.sample({primary:true}).primary,B.step,false);tickMelee(p,t.sample({}).primary,B.step,false);expect(p.melee.index).toBe(1);expect(p.melee.serial).toBe(1);
  });
  it('compression trades reach for damage and momentum has a hard cap',()=>{
    const p=new Simulation('training',100).player;p.mass.distribution=0;const reach=meleeReach(p),damage=meleeDamage(p);p.mass.distribution=1;expect(meleeReach(p)).toBeLessThan(reach);expect(meleeDamage(p)).toBeGreaterThan(damage);p.vx=1000;const fast=meleeDamage(p);p.vx=100000;expect(meleeDamage(p)).toBe(fast);
  });
  it('boss anchor rejects attacks until a channel creates a melee opening',()=>{
    const s=new Simulation('pve',100);s.enterRoom(2);const [p,boss]=s.actors;p.x=boss.x-60;p.y=boss.y;const mass=boss.integrity.current;s.hit(boss,30,true,true);expect(boss.integrity.current).toBe(mass);
    const t=new ButtonTracker();for(let i=0;i<45;i++){tickChannel(p.channel,t.sample({pull:true}),B.step);s.resolveChannels(B.step);}expect(boss.guardBroken).toBeGreaterThan(0);
    s.hit(boss,30,true);expect(boss.integrity.current).toBe(mass);s.hit(boss,30,true,true);expect(boss.integrity.current).toBeLessThan(mass);
  });
});
describe('local collection and economy',()=>{
  it('migrates v1 mass and statistics without resetting progress',()=>{const p=migrateProfile({schemaVersion:1,maximumMass:321,statistics:{wins:7}});expect(p.schemaVersion).toBe(2);expect(p.maximumMass).toBe(321);expect(p.statistics.wins).toBe(7);expect(p.ownedManifestations).toEqual(['vessel']);});
  it('summons deterministically, converts duplicates, and guarantees an unowned sample',()=>{const a=newProfile(),b=newProfile();a.summonCurrency=b.summonCurrency=3;for(let i=0;i<3;i++)expect(summon(a)).toEqual(summon(b));expect(a.ownedManifestations.length).toBeGreaterThan(1);expect(a.maximumMass).toBe(100);expect(a.summonCurrency).toBe(0);expect(summon(a)).toBeNull();const p=newProfile();p.ownedManifestations=['vessel','stride','hollow'];p.summonCurrency=1;const result=summon(p)!;expect(result.duplicate).toBe(true);expect(p.resonanceShards).toBe(result.shards);});
  it('equips only owned samples, upgrades without mass cost, and caps PvP properties',()=>{const p=newProfile();expect(equipManifestation(p,'hollow')).toBe(false);p.ownedManifestations.push('hollow');expect(equipManifestation(p,'hollow')).toBe(true);p.upgradeMaterial=100;expect(upgradeManifestation(p,'hollow')).toBe(true);expect(p.maximumMass).toBe(100);expect(modifiersFor('vessel',5,true)).toEqual(modifiersFor('vessel',1,true));expect(Object.values(modifiersFor('hollow',5,true)).every(v=>v<=1.15)).toBe(true);});
  it('seeded rewards separate resources and grant first-clear bonuses once',()=>{expect(dungeonRewards(147,100,true)).toEqual(dungeonRewards(147,100,true));const p=newProfile(),first=grantDungeonRewards(p,147,100),repeat=grantDungeonRewards(p,147,100);expect(first.firstClear).toBe(true);expect(repeat.firstClear).toBe(false);expect(first.mass-repeat.mass).toBe(20);expect(first.grade).toBe('S');expect(p.maximumMass).toBe(100);expect(p.upgradeMaterial).toBe(first.materials+repeat.materials);});
});
