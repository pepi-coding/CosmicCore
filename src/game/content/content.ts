export const divisions = [
  { name: 'Dust', floor: 20, ceiling: 150 },
  { name: 'Nebula', floor: 150, ceiling: 300 },
  { name: 'Pulsar', floor: 300, ceiling: 600 },
  { name: 'Quasar', floor: 600, ceiling: 1200 },
];
export const evolutions = [{ id: 'core', name: 'Basic Core', floor: 20 }, { id: 'planetary', name: 'Planetary manifestation', floor: 300, locked: true, requirement: 'Awaiting base combat approval' }];
export const divisionFor = (mass: number) => [...divisions].reverse().find(d => mass >= d.floor) ?? divisions[0];
