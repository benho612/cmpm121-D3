import L from "leaflet";
import "leaflet/dist/leaflet.css";
import luck from "./_luck.ts";
import "./style.css";

/* -------------------- Config / Coordinates -------------------- */

const classroom = { lat: 36.99803803339612, lng: -122.05670161815607 };
const CELL = 0.0001; // grid cell size in degrees
const INTERACT_STEPS = 3; // how many cells away counts as "near"
const WIN = 16; // win threshold (holding >= WIN)

/* -------------------- Player / HUD -------------------- */

type Player = {
  lat: number;
  lng: number;
  holding: number | null;
};

let player: Player = { ...classroom, holding: null };

let map: L.Map;
let playerMarker: L.CircleMarker;
let hudEl: HTMLDivElement;

function ensureMapContainer(): HTMLElement {
  const existing = document.getElementById("app") ||
    document.getElementById("root") ||
    document.getElementById("map");
  if (existing) return existing;
  const div = document.createElement("div");
  div.id = "app";
  document.body.appendChild(div);
  return div;
}

function ensureHUD(): HTMLDivElement {
  let hud = document.getElementById("hud") as HTMLDivElement | null;
  if (!hud) {
    hud = document.createElement("div");
    hud.id = "hud";
    document.body.appendChild(hud);
  }
  return hud;
}

function renderHUD() {
  hudEl.textContent = `Player @ (${player.lat.toFixed(5)}, ${
    player.lng.toFixed(
      5,
    )
  }) | Holding: ${player.holding ?? "—"}`;
}

function checkWin() {
  if (player.holding !== null && player.holding >= WIN) {
    alert(`You win! Holding ${player.holding}.`);
  }
}

/* -------------------- Map / Marker -------------------- */

function createPlayerMarker() {
  playerMarker = L.circleMarker([player.lat, player.lng], {
    radius: 8,
    weight: 2,
  }).addTo(map);
}

function updatePlayerMarker() {
  playerMarker.setLatLng([player.lat, player.lng]);
}

/* -------------------- Grid Math -------------------- */

type CellId = { i: number; j: number };

function toCellId(lat: number, lng: number): CellId {
  return { i: Math.floor(lat / CELL), j: Math.floor(lng / CELL) };
}

function cellCenter(i: number, j: number): [number, number] {
  return [(i + 0.5) * CELL, (j + 0.5) * CELL];
}

function visibleCellRange() {
  const b = map.getBounds();
  const iMin = Math.floor(b.getSouth() / CELL);
  const iMax = Math.ceil(b.getNorth() / CELL);
  const jMin = Math.floor(b.getWest() / CELL);
  const jMax = Math.ceil(b.getEast() / CELL);
  return { iMin, iMax, jMin, jMax };
}

/* -------------------- Deterministic Spawn -------------------- */

function tokenAt(i: number, j: number): number {
  const r = luck(`${i},${j}`);
  if (r < 0.15) return 2; // 15% chance
  if (r < 0.20) return 4; // 5% chance
  if (r < 0.22) return 8; // 2% chance
  return 0;
}

/* -------------------- Game State (Taken / Modified) -------------------- */
/* We track cells the player has changed so draws reflect gameplay. */

const takenCells = new Set<string>(); // cells emptied by pickups
const modifiedCells = new Map<string, number>(); // cells whose value changed (e.g., merges)

function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

function getCellValue(i: number, j: number): number {
  const key = cellKey(i, j);
  if (modifiedCells.has(key)) return modifiedCells.get(key)!;
  if (takenCells.has(key)) return 0;
  return tokenAt(i, j);
}

function setCellValue(i: number, j: number, value: number) {
  const key = cellKey(i, j);
  if (value <= 0) {
    modifiedCells.delete(key);
    takenCells.add(key); // mark as empty
  } else {
    takenCells.delete(key);
    modifiedCells.set(key, value);
  }
}

/* -------------------- Nearby Logic -------------------- */

function playerCellId(): CellId {
  return toCellId(player.lat, player.lng);
}

function isNearCell(i: number, j: number): boolean {
  const p = playerCellId();
  return Math.abs(i - p.i) <= INTERACT_STEPS &&
    Math.abs(j - p.j) <= INTERACT_STEPS;
}

/* -------------------- Interaction (Pickup / Merge) -------------------- */

function onCellClick(i: number, j: number) {
  if (!isNearCell(i, j)) return;

  const current = getCellValue(i, j);

  // If empty-handed and cell has a token → pick up
  if (player.holding === null) {
    if (current > 0) {
      player.holding = current;
      setCellValue(i, j, 0); // remove token from cell
      renderHUD();
      checkWin();
      drawGrid();
    }
    return;
  }

  // If holding a token and the cell has equal value → merge to double in the cell
  if (current === player.holding && current > 0) {
    const doubled = current * 2;
    setCellValue(i, j, doubled); // new value lives in the cell
    player.holding = null; // hand is now empty
    renderHUD();
    drawGrid();
    // Note: win only triggers when holding >= WIN, so player must pick up the doubled token later
    return;
  }

  // Otherwise, do nothing (strict D3.a: no placing into empty or different-valued cells)
}

/* -------------------- Rendering (Grid + Tokens) -------------------- */

let gridLayer: L.LayerGroup | null = null;
let tokenLayer: L.LayerGroup | null = null;

function drawGrid() {
  if (!map) return;

  if (!gridLayer) gridLayer = L.layerGroup().addTo(map);
  else gridLayer.clearLayers();

  if (!tokenLayer) tokenLayer = L.layerGroup().addTo(map);
  else tokenLayer.clearLayers();

  const { iMin, iMax, jMin, jMax } = visibleCellRange();
  const MAX_CELLS = 8000;
  let count = 0;

  for (let i = iMin; i < iMax; i++) {
    for (let j = jMin; j < jMax; j++) {
      if (++count > MAX_CELLS) return;

      const south = i * CELL;
      const west = j * CELL;
      const north = (i + 1) * CELL;
      const east = (j + 1) * CELL;
      const near = isNearCell(i, j);

      const rect = L.rectangle([[south, west], [north, east]], {
        weight: near ? 2 : 1,
        color: near ? "#2a7a5e" : "#666",
        opacity: near ? 0.9 : 0.4,
      }).addTo(gridLayer);
      rect.on("click", () => onCellClick(i, j));

      const val = getCellValue(i, j);
      if (val > 0) {
        const [clat, clng] = cellCenter(i, j);
        const icon = L.divIcon({
          className: near ? "token-label" : "token-label token-far",
          html: String(val),
          iconSize: [0, 0],
        });
        L.marker([clat, clng], { icon }).addTo(tokenLayer);
      }
    }
  }
}

/* -------------------- Init -------------------- */

function init() {
  const container = ensureMapContainer();
  hudEl = ensureHUD();

  map = L.map(container, { zoomControl: true, preferCanvas: true }).setView(
    [player.lat, player.lng],
    18,
  );

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  createPlayerMarker();
  renderHUD();

  drawGrid();
  map.on("zoomend", drawGrid);
  map.on("moveend", drawGrid);
  map.on("resize", drawGrid);
  map.on("click", () => map.setView([player.lat, player.lng]));
}

if (document.readyState === "loading") {
  globalThis.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* -------------------- Dev Helper -------------------- */

type MovePlayerFn = (dLat?: number, dLng?: number) => void;
(globalThis as typeof globalThis & { movePlayerBy?: MovePlayerFn })
  .movePlayerBy = (
    dLat = 0,
    dLng = 0,
  ) => {
    player = { ...player, lat: player.lat + dLat, lng: player.lng + dLng };
    updatePlayerMarker();
    renderHUD();
    map.setView([player.lat, player.lng]);
    drawGrid();
  };

/* -------------------- Keyboard Controls -------------------- */

// how far one key press moves the player (in degrees)
/* -------------------- Keyboard Controls -------------------- */

const STEP = CELL * 1; // one grid cell per key press

// Define a typed reference to movePlayerBy on globalThis
const moveBy = (globalThis as typeof globalThis & {
  movePlayerBy?: (dLat?: number, dLng?: number) => void;
}).movePlayerBy;

globalThis.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
    case "w":
      moveBy?.(STEP, 0);
      break;
    case "ArrowDown":
    case "s":
      moveBy?.(-STEP, 0);
      break;
    case "ArrowLeft":
    case "a":
      moveBy?.(0, -STEP);
      break;
    case "ArrowRight":
    case "d":
      moveBy?.(0, STEP);
      break;
  }
});
