export const vessel = {
  frameWidth: 96, frameHeight: 128, frames: 6, coreSocket: { x: 48, y: 54 },
  anchor: { x: .5, y: 54 / 128 }, bodyBounds: { x: 30, y: 20, width: 36, height: 89 }, physicsRadius: 18,
  facings: ['down', 'left', 'right', 'up'],
  states: ['idle', 'move', 'melee1', 'melee2', 'heavy', 'pull', 'pulse', 'hit', 'unstable', 'collapse', 'victory'],
  fps: { idle: 5, move: 10, melee1: 16, melee2: 12, heavy: 8, pull: 9, pulse: 10, hit: 18, unstable: 10, collapse: 8, victory: 6 },
};
// Original procedural vector source. Fixed torso socket, no pixel-derived collision or anchors.
export function drawVessel(ctx, facing, state, frame) {
  const t = frame / 5, wave = Math.sin(t * Math.PI * 2), side = facing === 'left' ? -1 : facing === 'right' ? 1 : 0;
  const back = facing === 'up';
  ctx.save(); ctx.translate(48, 54);
  if(state === 'collapse') {ctx.rotate(t * 1.35); ctx.scale(1 - t * .35, 1 - t * .2); ctx.globalAlpha = 1 - t * .65;}
  if(state === 'hit') ctx.rotate(-.14 * Math.sin(t * Math.PI));
  const limb = (points, width=9) => { ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(...points[0]); for(const p of points.slice(1))ctx.lineTo(...p); ctx.strokeStyle='#111d29';ctx.lineWidth=width+3;ctx.stroke();ctx.strokeStyle='#a1adb8';ctx.lineWidth=width;ctx.stroke();ctx.strokeStyle='#d9e0e5';ctx.lineWidth=2;ctx.stroke(); };
  const gait = state === 'move' ? wave * 9 : state === 'unstable' ? wave * 2 : 0;
  const planted = state === 'pull' || state === 'pulse' || state === 'heavy';
  limb([[-6,18],[-8 - (planted?5:0),34+gait],[-10-(planted?7:0),49+gait]],10);
  limb([[6,18],[8+(planted?5:0),34-gait],[10+(planted?7:0),49-gait]],10);
  let left=[[-15,-11],[-21,5],[-18,19]], right=[[15,-11],[21,5],[18,19]];
  if(state==='move'){left=[[-15,-11],[-22,5-gait],[-19,18-gait]];right=[[15,-11],[22,5+gait],[19,18+gait]];}
  if(state==='pull'){const a=wave*2;left=[[-15,-11],[-24,1],[-8,3+a]];right=[[15,-11],[24,1],[8,3+a]];}
  if(state==='pulse'){left=[[-15,-11],[-27,-7],[-37,-15+wave*2]];right=[[15,-11],[27,-7],[37,-15-wave*2]];}
  if(state==='victory'){left=[[-15,-11],[-26,-24],[-19,-42+wave*2]];right=[[15,-11],[26,-24],[19,-42-wave*2]];}
  if(state==='melee1'||state==='melee2'||state==='heavy'){
    const punch=Math.sin(t*Math.PI), sign=state==='melee2'?-1:1;
    if(side){ const arm=[[side*15,-11],[side*(20+8*punch),-14],[side*(20+23*punch),-12]]; if(side>0)right=arm;else left=arm; }
    else { const y=back?-1:1;const arm=[[sign*15,-11],[sign*(20-10*punch),y*8],[sign*(20-15*punch),y*(18+25*punch)]];if(sign>0)right=arm;else left=arm; }
    if(state==='heavy'){if(side){left=[[-15,-11],[side*(12+12*punch),-28+22*punch],[side*(6+34*punch),-38+38*punch]];right=[[15,-11],[side*(20+12*punch),-24+24*punch],[side*(14+28*punch),-34+38*punch]];}else{const y=back?-1:1;left=[[-15,-11],[-22,y*(-28+36*punch)],[-9,y*(-42+72*punch)]];right=[[15,-11],[22,y*(-28+36*punch)],[9,y*(-42+72*punch)]];}}
  }
  limb(left,8);limb(right,8);
  ctx.beginPath();ctx.moveTo(-14,-16);ctx.lineTo(14,-16);ctx.lineTo(11,6);ctx.lineTo(8,22);ctx.lineTo(-8,22);ctx.lineTo(-11,6);ctx.closePath();ctx.fillStyle='#727f8d';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#d9e3e9';ctx.stroke();
  ctx.fillStyle='#b3bec7';ctx.fillRect(-5,-23,10,9);
  ctx.beginPath();ctx.ellipse(side*2,-31,9,11,0,0,Math.PI*2);ctx.fillStyle=back?'#8b99a7':'#c4cdd4';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#e6edf0';ctx.stroke();
  if(side){ctx.beginPath();ctx.moveTo(side*8,-34);ctx.lineTo(side*12,-30);ctx.lineTo(side*8,-27);ctx.strokeStyle='#dee8ee';ctx.lineWidth=2;ctx.stroke();}
  ctx.strokeStyle='#eef8ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,4);ctx.lineTo(0,18);ctx.stroke();
  ctx.beginPath();ctx.arc(0,0,state==='pull'?7+frame*.3:6,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();
  ctx.restore();
}
