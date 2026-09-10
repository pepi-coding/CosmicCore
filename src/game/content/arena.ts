export const arenaContent = {
  beacon: { x: 1600, y: 700, radius: 110 },
  extraction: { x: 1100, y: 350, radius: 100 },
  well: { x: 1450, y: 1000, radius: 240 },
  entropy: { x: 1500, y: 650, radius: 155 },
  current: { x: 1250, y: 450, width: 550, height: 150 },
  asteroid: { x: 1100, y: 800, rangeX: 500, rangeY: 200, rateX: .35, rateY: .6, radius: 45 },
};
export function asteroidAt(time: number): { x: number; y: number } {
  const a = arenaContent.asteroid;
  return { x: a.x + Math.sin(time * a.rateX) * a.rangeX, y: a.y + Math.cos(time * a.rateY) * a.rangeY };
}
