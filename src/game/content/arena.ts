export const arenaContent = {
  duelBounds: { left: 900, right: 1660, top: 950, bottom: 1290 },
  pillars: [{x:1190,y:920,radius:40},{x:1390,y:1280,radius:45}],
  beacon: { x: 1600, y: 700, radius: 110 },
  extraction: { x: 1100, y: 350, radius: 100 },
  well: { x: 1550, y: 930, radius: 130 },
  entropy: { x: 1050, y: 1350, radius: 100 },
  current: { x: 1250, y: 450, width: 550, height: 150 },
  asteroid: { x: 1100, y: 800, rangeX: 500, rangeY: 200, rateX: .35, rateY: .6, radius: 45 },
};
export function asteroidAt(time: number): { x: number; y: number } {
  const a = arenaContent.asteroid;
  return { x: a.x + Math.sin(time * a.rateX) * a.rangeX, y: a.y + Math.cos(time * a.rateY) * a.rangeY };
}
