import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/game/systems/Simulation';
import { distribute } from '../src/game/systems/MassSystem';
import { damage } from '../src/game/systems/DamageSystem';
import { fieldRadius } from '../src/game/systems/GravitySystem';
import { coreExposed } from '../src/game/systems/IntegritySystem';
import { release, tryCapture } from '../src/game/systems/OrbitSystem';
import type { Actions } from '../src/game/systems/types';
const idle: Actions={move:{x:0,y:0},aim:{x:1,y:0},cast:false,pulse:false,surge:false,impulse:false};
const isolated=()=>{const s=new Simulation('training',125);s.actors=s.actors.slice(0,1);s.debris=[];return s;};
describe('Core Integrity combat contract',()=>{
  it('holds transfer one conserved resource to both extremes and release preserves the split',()=>{
    const s=isolated(),p=s.player;
    for(let i=0;i<90;i++)s.step({...idle,pulse:true});
    expect(p.mass.coreMass).toBeCloseTo(35);expect(p.mass.fieldMass).toBeCloseTo(90);
    expect(p.radius).toBe(300);expect(p.channel.maximumReached).toBe(true);
    for(let i=0;i<90;i++)s.step({...idle,surge:true});
    expect(p.mass.coreMass).toBe(125);expect(p.mass.fieldMass).toBe(0);expect(p.radius).toBe(100);
    for(let i=0;i<60;i++)s.step({...idle,distribution:0});
    expect(p.mass.coreMass).toBe(125);expect(p.mass.combatMass).toBe(125);
    expect(fieldRadius(.5)).toBe(200);
  });
  it('uses the specified core resistance without ejecting health as collectible mass',()=>{
    const s=isolated(),p=s.player;p.mass.distribution=1;distribute(p.mass);
    expect(s.hit(p,30,false)).toBeCloseTo(30*100/225);
    expect(p.integrity.current).toBeCloseTo(100-30*100/225);
    expect(p.mass.combatMass).toBe(125);expect(s.debris).toHaveLength(0);
    expect(s.damageEvents[0].amount).toBeCloseTo(30*100/225);
    p.integrity.current=20;expect(coreExposed(p)).toBe(false);damage(p,1,false);expect(coreExposed(p)).toBe(true);
    damage(p,10000,true);expect(p.alive).toBe(false);expect(p.integrity.current).toBe(0);
  });
  it('capturing and launching ammunition does not alter total core/external mass',()=>{
    const s=isolated(),p=s.player,d=s.makeDebris(p.x+100,p.y,3);d.vx=0;d.vy=80;
    expect(tryCapture(p,d,0,1)).toBe(true);expect(p.mass.orbitingStoredMass).toBe(3);
    expect(p.mass.coreMass+p.mass.fieldMass).toBe(125);release(p,d);
    expect(p.mass.orbitingStoredMass).toBe(0);expect(p.mass.combatMass).toBe(125);
  });
  it('overload stops transfer and requires release before a new hold',()=>{
    const s=isolated(),p=s.player;p.channel.flux=.01;s.step({...idle,pulse:true});
    const split=p.mass.distribution;expect(p.channel.overload).toBeGreaterThan(0);
    for(let i=0;i<150;i++)s.step({...idle,pulse:true});
    expect(p.channel.mode).toBeNull();expect(p.mass.distribution).toBe(split);
    s.step(idle);s.step({...idle,surge:true});expect(p.channel.mode).toBe('pull');
  });
  it('pillars block melee and channels, and forced wall collisions damage integrity',()=>{
    const s=isolated(),p=s.player,t=s.actor('bot',p.x+60,p.y,100);
    p.channel.mode='pulse';p.channel.intensity=1;p.melee.phase='active';p.melee.angle=0;
    s.obstacles=[{x:p.x+30,y:p.y,radius:10}];s.resolveChannels(1/60);s.resolveMelee();
    expect(t.vx).toBe(0);expect(t.integrity.current).toBe(100);
    s.obstacles=[];s.resolveChannels(1/60);expect(t.vx).toBeGreaterThan(0);
    t.x=2170;t.vx=300;t.impactWindow=.4;s.environment(1/60);expect(t.integrity.current).toBeLessThan(100);
    const hp=t.integrity.current;t.impactWindow=0;t.vx=300;s.environment(1/60);expect(t.integrity.current).toBe(hp);
  });
  it('crystals break only once and release collectible mass',()=>{
    const s=isolated(),p=s.player;s.crystals=[{x:p.x+50,y:p.y,radius:20,hp:1}];
    p.melee.phase='active';p.melee.angle=0;s.environment(1/60);expect(s.crystals[0].hp).toBeLessThanOrEqual(0);expect(s.debris).toHaveLength(4);
    s.environment(1/60);expect(s.debris).toHaveLength(4);
  });
  it('mobile assist nudges a deliberate attack but never attacks automatically',()=>{
    const s=isolated(),p=s.player,t=s.actor('drifter',p.x+110,p.y+20,30);s.trainingEngaged=false;
    s.step({...idle,aimAssist:true});expect(p.melee.phase).toBe('idle');
    const before=p.vx;s.step({...idle,cast:true,aimAssist:true});expect(p.melee.phase).toBe('windup');expect(p.vx).toBeGreaterThan(before);expect(p.angle).toBeGreaterThan(0);expect(t.integrity.current).toBe(40);
  });
});
