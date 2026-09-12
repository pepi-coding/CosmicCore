import type { Simulation } from '../src/game/systems/Simulation';
import { distance,unit,type Vec,type Actions } from '../src/game/systems/types';
// Deterministic playtest controller. Uses normal player actions; never edits combat state.
export function moonController(sim:Simulation):()=>Actions {
  const m=sim.moon!;let resting=false;
  return ()=>{
    const p=sim.player,enemy=sim.actors.filter(a=>a!==p&&a.alive).sort((a,b)=>distance(p,a)-distance(p,b))[0],s=enemy&&m.states.get(enemy.id);
    let target:Vec=enemy??m.room.gate,cast=false,pull=false,pulse=false;
    if(enemy&&s){
      if(s.id==='comet-hound'&&s.state!=='stagger'&&s.state!=='recovery'){pull=s.state==='move';pulse=s.state==='attack'||s.state==='telegraph';}
      if(s.id==='graviton-crab') { const part=s.parts.find(part=>!part.broken&&part.id.includes('anchor'));if(part)target=m.partPosition(enemy,part);else if(s.state!=='stagger')pull=true; }
      if(s.id==='entropy-wisp'&&s.materialized<=0)pull=true;
      if(s.id==='lunar-devourer') {
        if(s.phase===1){const part=s.parts.find(part=>!part.broken&&part.id.includes('organ'));if(part){target=m.partPosition(enemy,part);pull=part.exposed<=0;}}
        if(s.phase===0||s.phase===2&&s.exposure<=0){
          const object=m.objects.filter(o=>o.kind==='boulder').sort((a,b)=>distance(p,a)-distance(p,b))[0];
          if(object){const part=s.phase===0?s.parts.find(part=>!part.broken&&part.id.includes('armor')):undefined,goal=part?m.partPosition(enemy,part):enemy,n=unit({x:object.x-goal.x,y:object.y-goal.y});target={x:object.x+n.x*65,y:object.y+n.y*65};pulse=distance(p,target)<35;}else target={x:enemy.x-160,y:enemy.y};
        }
      }
      cast=!pull&&!pulse&&distance(p,target)<65&&!(s.id==='lunar-devourer'&&(s.phase===0||s.phase===2&&s.exposure<=0));
    }
    if(sim.room===3&&sim.roomCleared)m.chooseCache('recovery');
    if(p.channel.flux<10)resting=true;if(p.channel.flux>65||s?.exposure||s?.materialized)resting=false;
    if(resting&&enemy){const n=unit({x:p.x-enemy.x,y:p.y-enemy.y});target={x:enemy.x+n.x*160,y:enemy.y+n.y*160};}
    const danger=sim.actors.find(a=>a!==p&&a.alive&&m.states.get(a.id)?.state==='telegraph'&&distance(p,a)<135);
    if(danger){const n=unit({x:p.x-danger.x,y:p.y-danger.y});target=s?.id==='lunar-devourer'?{x:m.room.center.x-n.y*110,y:m.room.center.y+n.x*110}:{x:p.x+n.x*160,y:p.y+n.y*160};cast=false;}
    const d={x:target.x-p.x,y:target.y-p.y},n=unit(d),r=distance(p,target);
    const release=resting||p.channel.needsRelease||p.channel.overload>0||p.channel.flux<8;
    return {move:r>(pulse?12:pull?95:cast?40:45)?n:{x:0,y:0},aim:d,cast,pulse:pulse&&!release,surge:pull&&!release,impulse:!!danger};
  };
}
