# Neutral vessel asset pipeline

The Milestone 4 placeholder is original procedural artwork, not an AI-generated image or external character asset. No image-generation prompts or third-party art licenses are needed. It intentionally uses a neutral fitted energy/training body with no gender detail, faction mark, costume theme, or narrative identity.

`source/neutral-vessel.mjs` is the editable vector/joint source and animation specification. `npm run assets:vessel` uses the installed Playwright Chromium Canvas2D renderer to produce four transparent PNG atlases in `public/assets/vessel/`, plus `metadata.json`. Each atlas is 576×1408, with six 96×128 frames per animation row. Four facings × eleven states × six frames = 264 frames. PNG output contains only the transparent sprites, with no editor/UI padding beyond the fixed frame bounds; no runtime rasterization or image downloads are needed.

Rows: idle, move, melee1, melee2, heavy, pull, pulse, hit, unstable, collapse, victory. Directional sheets: down, left, right, up. Core socket is `(48,54)` and the sprite anchor is `(0.5,54/128)`. The world position always refers to this socket. Even collapse rotates around the torso socket. The metadata supplies body bounds and a physics-radius reference; actual collision uses gameplay configuration and never inspects opaque pixels.

`VesselRig.ts` selects facing and animation from simulation state. Melee frames use the actual attack timeline. Colors come from Manifestation content data. Replacing these atlases and metadata changes costumes without changing mass rules, damage origins, or abilities. Phaser's loaded atlases are reused across all actors.

Audio is also original: `CombatAudio.ts` synthesizes a sustained low-frequency channel layer, a rising Pull pitch, Discharge tone, maximum/low-Flux/Overload cues, and two-layer impacts with Web Audio. It starts only after a user gesture, can be muted, and disconnects when the scene exits. No external audio assets are used.
