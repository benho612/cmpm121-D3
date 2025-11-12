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

- [ ] keep grid anchored to a world coordinate system (Null Island origin, lat=0,lng=0)
- [ ] keep cells visible to the edge of the map (spawn/despawn on pan/zoom)
- [ ] add on-screen movement buttons (N/S/E/W) that move one cell per click
- [ ] allow scrolling the map without moving the player
- [ ] enforce nearby-only interaction (already implemented; keep it)
- [ ] make cells “memoryless” once they leave view (tokens can be farmed)
- [ ] raise crafting target and win threshold (e.g., WIN = 32)
- [ ] update README and PLAN.md with progress and acceptance checks
