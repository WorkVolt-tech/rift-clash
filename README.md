# RIFT CLASH ⚡ — Alpha 0.1

**An original anime-inspired 2D platform fighter for desktop and mobile browsers.**

RIFT CLASH takes place in a fractured world where martial artists, supernatural beings, and cybernetic warriors compete. Its **Competitive** and **Party** modes use the same fighting engine. This is an early playable prototype using deliberately simple procedural character art, not finished anime sprites.

## What you can play

- **Competitive** — 1v1 versus CPU, 3 stocks, 6-minute match, no items or hazards.
- **Party Brawl** — 1v1 versus CPU, 3 stocks, 5-minute match, Rift Core damage boosts and Rift Pulse hazard.
- **Training** — practice movement, attacks and launches against a stationary respawning dummy.
- Select **Kaito** (lightning rushdown) or **Nyra** (violet magic zoner).
- Four platforms, double jump, fast fall, directional attacks, specials, up-special recovery, shields, damage %, knockback, KO / respawn and a match results screen.

**Planned, not yet implemented:** anime sprite art/animations, audio, 2–4 local players, gamepad input, more fighters/stages, online matches, rankings and story mode. No accounts or backend are needed for this alpha.

## Run locally

Requires Node.js 22+.

```bash
npm install
npm run dev
```

Open the local address printed by Vite. For validation:

```bash
npm test
npm run build
npm run preview
```

## Controls

| Action | PC | Touchscreen |
|---|---|---|
| Move | A / D or arrow keys | Virtual joystick |
| Jump / double jump | W / Up / Space | JUMP or joystick up |
| Crouch / fast fall | S / Down | Joystick down |
| Normal / directional attack | J + direction | HIT + joystick |
| Special | K | SPECIAL |
| Recovery (up special) | Up + K | Joystick up + SPECIAL |
| Shield | L | SHIELD |
| Drop through upper platform | Down + Jump | Joystick down + JUMP |
| Pause | Escape | Pause button |

Landscape orientation is recommended on phones. Touch controls support simultaneous presses. To recover after falling off a ledge, steer back toward the arena, double jump, then use up-special.

## Deploy

The Vite configuration uses relative assets so this project works at `/rift-clash/` on GitHub Pages, as well as on Cloudflare Pages.

1. In GitHub repository **Settings → Pages**, select **GitHub Actions** as the build and deployment source.
2. Push to `main` (or run **Build and deploy RIFT CLASH** manually in Actions).
3. The workflow installs dependencies, tests, builds, and deploys `dist/` to Pages.

Cloudflare Pages alternative: connect this repository and use **Build command:** `npm run build`, **Output directory:** `dist`.

## Code structure

- `src/combat/engine.ts`: 60 Hz match simulation, platform physics, hits, damage, stocks, items, hazards.
- `src/combat/moves.ts`: editable character move tables (frame data and knockback).
- `src/combat/ai.ts`: first-pass CPU logic.
- `src/game/FightScene.ts`: Phaser 4 WebGL/Canvas rendering and effects.
- `src/input.ts`: keyboard, mobile joystick and touch action buttons.
- `src/main.ts`: game menus, character selection, HUD, match flow.

Combat balance values are provisional and should be playtested before expanding the roster.

## Originality

All names, story elements, and procedural visual placeholders in this project are original RIFT CLASH concepts; no Nintendo, Street Fighter, or Guilty Gear assets are included.
