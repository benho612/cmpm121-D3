import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

/* -------------------- Config / Coordinates -------------------- */

const classroom = { lat: 36.99803803339612, lng: -122.05670161815607 };

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

const CELL = 0.0001;
type CellId = { i: number; j: number };

function toCellId(lat: number, lng: number): CellId {
  return { i: Math.floor(lat / CELL), j: Math.floor(lng / CELL) };
}
function cellCenter(i: number, j: number): [number, number] {
  return [(i + 0.5) * CELL, (j + 0.5) * CELL];
}

/* -------------------- Deterministic Spawn -------------------- */

function prng01(i: number, j: number): number {
  let x = (i * 73856093) ^ (j * 19349663);
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  return (x >>> 0) / 0xffffffff;
}
function tokenAt(i: number, j: number): number {
  const r = prng01(i, j);
  if (r < 0.15) return 2;
  if (r < 0.2) return 4;
  return 0;
}

/* -------------------- Nearby Logic -------------------- */

const INTERACT_STEPS = 3;
function playerCellId(): CellId {
  return toCellId(player.lat, player.lng);
}
function isNearCell(i: number, j: number): boolean {
  const p = playerCellId();
  return Math.abs(i - p.i) <= INTERACT_STEPS &&
    Math.abs(j - p.j) <= INTERACT_STEPS;
}

/* -------------------- Game State (Inventory / Taken Cells) -------------------- */

const takenCells = new Set<string>(); // "i,j" keys of emptied cells

function cellKey(i: number, j: number) {
  return `${i},${j}`;
}

/* -------------------- Interaction -------------------- */

function onCellClick(i: number, j: number) {
  if (!isNearCell(i, j)) return; // too far
  const key = cellKey(i, j);
  const val = tokenAt(i, j);

  // if cell already emptied, skip
  if (takenCells.has(key)) {
    console.log("This cell is already empty.");
    return;
  }

  // if player empty-handed and cell has token → pick up
  if (player.holding === null && val > 0) {
    player.holding = val;
    takenCells.add(key);
    console.log(`Picked up token ${val} from cell [${i},${j}]`);
    renderHUD();
    drawGrid(); // refresh visible tokens
    return;
  }

  // later (Phase 9) we’ll handle placing/merging here
  console.log("Nothing to pick up or already holding a token.");
}

/* -------------------- Grid Rendering -------------------- */

let gridLayer: L.LayerGroup | null = null;
let tokenLayer: L.LayerGroup | null = null;

function visibleCellRange() {
  const b = map.getBounds();
  const iMin = Math.floor(b.getSouth() / CELL);
  const iMax = Math.ceil(b.getNorth() / CELL);
  const jMin = Math.floor(b.getWest() / CELL);
  const jMax = Math.ceil(b.getEast() / CELL);
  return { iMin, iMax, jMin, jMax };
}

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

      const key = cellKey(i, j);
      if (takenCells.has(key)) continue; // hide emptied cells

      const val = tokenAt(i, j);
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
