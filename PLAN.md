# D3: World of Bits

## Game Design Vision

A map-based crafting game where players collect nearby tokens and merge identical ones to form higher-value tokens.

## Technologies

- TypeScript
- Leaflet
- Deno + Vite
- GitHub Actions + GitHub Pages

## Assignments

## D3.a: Core Mechanics

Key technical challenge: assembling a map-based UI using Leaflet.

### Steps D3.a

- [x] copy main.ts to reference.ts
- [x] delete everything in main.ts
- [x] display a basic Leaflet map centered at classroom location
- [x] draw a player marker
- [x] render a grid of cells on the map
- [x] show which cells contain tokens
- [x] implement cell math + draw one cell
- [x] render a full grid covering the viewport
- [x] deterministic token spawn function
- [x] enforce nearby-only interaction
- [x] single-slot inventory & pickup
- [x] merge equal→double + win check

## D3.b: Globe-spanning Gameplay

### Steps D3.b

- [x] keep grid anchored to a world coordinate system (Null Island origin)
- [x] add on-screen movement buttons (N/S/E/W) that move one cell per click
- [x] allow scrolling the map without moving the player
- [x] keep cells visible to the map edge (spawn/despawn on pan/zoom)
- [x] enforce nearby-only interaction (confirm + keep)
- [x] make cells “memoryless” once they leave view (reset on view change)
- [x] raise crafting target and win threshold (WIN = 32)
- [ ] README and PLAN.md updates
