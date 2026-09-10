import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { vessel, drawVessel } from '../assets/source/neutral-vessel.mjs';
const browser = await chromium.launch();
const page = await browser.newPage();
await fs.mkdir('public/assets/vessel', {recursive:true});
for (const facing of vessel.facings) {
  const data = await page.evaluate(({vessel,facing,source}) => {
    const draw = new Function('return ('+source+')')();
    const canvas = document.createElement('canvas'); canvas.width=vessel.frameWidth*vessel.frames;canvas.height=vessel.frameHeight*vessel.states.length;
    const ctx=canvas.getContext('2d');
    vessel.states.forEach((state,row)=>{for(let frame=0;frame<vessel.frames;frame++){ctx.save();ctx.translate(frame*vessel.frameWidth,row*vessel.frameHeight);draw(ctx,facing,state,frame);ctx.restore();}});
    return canvas.toDataURL('image/png').split(',')[1];
  },{vessel,facing,source:drawVessel.toString()});
  await fs.writeFile(`public/assets/vessel/${facing}.png`,Buffer.from(data,'base64'));
}
await fs.writeFile('public/assets/vessel/metadata.json',JSON.stringify(vessel,null,2));
await browser.close();
console.log('Generated four neutral-vessel sheets: 264 frames with fixed torso sockets.');
