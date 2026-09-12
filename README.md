# Cosmic Core

A Phaser 3 / TypeScript combat game with a seeded 60 Hz simulation, five-room Shattered Moon expedition, legacy three-room dungeon, local bot duel, and browser-local progression. See the current [combat contract 1.2](cosmic_core_game_product_contract_v1.2.md).

## Run and deploy

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
npm run build
npm test
npx playwright install chromium
npm run smoke
```

For Netlify, leave the base directory blank, use `npm run build`, and publish `dist`. No functions or environment variables are required. The build includes TypeScript validation.

## Controls and combat

- WASD: move. Mouse: aim. Hold left click: three-hit melee chain.
- Hold E / Pull: draw External Mass into the Core, contract the field, attract enemies, increase melee damage and protection, and slow movement.
- Hold Q / Pulse: distribute Core Mass outward, expand the field, repel enemies, and increase mobility.
- Release a channel to retain the current distribution. Both channels consume Flux; overload or interruption requires release before restarting.
- Space: directional Impulse. R: launch a captured orbit object.
- Mobile: independent movement and aim/melee sticks, held Pull/Pulse buttons, and secondary ability buttons. Landscape is required.

**Total Mass = Core Mass + External Mass.** Core Integrity is HP: damage reduces it, exposure begins below 20%, and zero causes Collapse. Damage does not consume mass. Compression increases damage resistance using `100 / (100 + Core Mass)`.

Melee is the primary damage source. Deliberate attacks receive a short step toward a nearby target in the facing cone; mobile has slightly wider aim assistance. Orange numbers show direct Core hits, white numbers show other damage. Overhead bars show remaining Integrity, and the three HUD markers light on connected melee-chain attacks.

Pillars block movement, melee, and channels. Break mint crystals with melee to release collectible mass. Blue gravity wells attract bodies and debris; violet entropy zones damage Integrity and erode loose debris. Pulse and melee can cause impact damage against walls and pillars. Captured orbit objects are separate ammunition, not a third partition of Total Mass; launching them does not lower Core Mass.

## Modes

- **Training:** free practice with a rival that activates when you first attack or channel. Reset restarts without changing your profile.
- **The Silent Orbit:** clear three compact rooms and enter each green gate. A cleared gate restores Core Integrity for the next room. Hold a channel near the Guardian to break its anchor, then attack during the opening. The final exit banks rewards.
- **The Shattered Moon:** choose it in Dungeon Select. Five distinct rooms introduce Mites, Hounds, Crab anchors, intangible Wisps and the three-phase Lunar Devourer. Integrity persists between rooms; Flux refills. Room 4 offers recovery or materials. Materials and the once-only Evolution Core persist in profile schema 3. See the [Milestone 5 report](docs/milestone5-report.md).
- **Orbital duel:** fight a deterministic local bot in a compact walled arena. The camera follows both fighters. Collapse wins; at four minutes, remaining Integrity percentage then Total Mass break ties. Exact ties enter sudden death.

Dungeon extraction banks rewards. Failure or abandonment loses unbanked rewards and 1% of permanent mass, capped at 10 and protected by the evolution floor. Training does not update progression; PvP gains do not become permanent. Profiles are stored in localStorage and are specific to the browser and site origin. There is no online multiplayer or backend.

## Verification

Unit/integration tests cover conservation, channel endpoints and overload, Integrity resistance and Collapse, melee arcs and timing, line-of-sight blocking, wall impacts, crystals, orbit ammunition, mobile aim assistance, deterministic simulation, dungeon completion, and progression. Playwright covers desktop controls, mobile holds and independent release, pause/reset, persistence, and collection/dungeon screens. Screenshots go to `test-results/`.

Visual checks use desktop and mobile-emulated Chromium. Physical-device performance and human balance testing remain necessary. Vite reports its existing large-bundle warning for Phaser.
