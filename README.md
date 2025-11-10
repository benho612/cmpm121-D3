# 🌍 D3: World of Bits

## D3: World of Bits — Core Mechanics (D3.a)

A map-based crafting game prototype built with **TypeScript**, **Leaflet**.
Players can explore a map, collect nearby tokens, and merge identical ones into higher-value tokens.

---

## 🎯 Game Design Vision

> A map-based crafting game where players collect nearby tokens and merge identical ones to form higher-value tokens.

The prototype implements the **core mechanics** of the final game:

- deterministic token spawning based on map grid cells
- inventory and merging rules
- basic movement and interaction system

---

## 🧩 Features Implemented (D3.a)

- Displays an interactive Leaflet map centered at UCSC.
- Renders a grid of cells covering the visible area.
- Shows token values (`2`, `4`, `8`) using deterministic spawning via the `luck()` function.
- Player can **move with arrow keys or WASD**.
- Can **pick up nearby tokens** (within 3 cells).
- Can **merge identical tokens** to form a doubled value (e.g., `2 + 2 = 4`).
- Win condition when the player holds a token ≥ 16.
- HUD displays position and inventory state.

---
