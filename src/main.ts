import L from "leaflet";
import "leaflet/dist/leaflet.css";
import luck from "./_luck.ts";
import "./style.css";

/* -------------------- Config / Coordinates -------------------- */

const classroom = { lat: 36.99803803339612, lng: -122.05670161815607 };
const CELL = 0.0001; // grid cell size in degrees (world-aligned)
const INTERACT_STEPS = 3; // how many cells away counts as "near"
const WIN = 16; // win threshold (holding >= WIN)

/* -------------------- Player / HUD -------------------- */

type Player = { lat: number; lng: number; holding: number | null };
let player: Player = { ...classroom, holding: null };

let map: L.Map;
let playerMarker: L.CircleMarker;
let hudEl: HTMLDivElement;

function ensureMapContainer(): HTMLElement {
  const existing = document.getElementById("app") ||
    document.getElementById("root") ||
    document.getElementById("map");
  if (existing) return existing as HTMLElement;
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

function ensureControls(): HTMLDivElement {
  let ctrls = document.getElementById("controls") as HTMLDivElement | null;
  if (!ctrls) {
    ctrls = document.createElement("div");
    ctrls.id = "controls";
    // 3x3 D-pad layout with spacers
    ctrls.innerHTML = `
      <div class="sp"></div>
      <button data-dir="n" aria-label="North">↑</button>
      <div class="sp"></div>
      <button data-dir="w" aria-label="West">←</button>
      <button data-dir="s" aria-label="South">↓</button>
      <button data-dir="e" aria-label="East">→</button>
      <div class="sp"></div>
      <div class="sp"></div>
      <div class="sp"></div>
    `;
    document.body.appendChild(ctrls);
  }
  return ctrls;
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

/* -------------------- Grid Math (world-aligned) -------------------- */

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

// snap any lat/lng to the exact center of its grid cell
function snapToCellCenter(
  lat: number,
  lng: number,
): { lat: number; lng: number } {
  const { i, j } = toCellId(lat, lng);
  const [cLat, cLng] = cellCenter(i, j);
  return { lat: cLat, lng: cLng };
}

/* -------------------- Deterministic Spawn (luck) -------------------- */

function tokenAt(i: number, j: number): number {
  const r = luck(`${i},${j}`); // stable [0,1)
  if (r < 0.15) return 2; // 15% chance
  if (r < 0.20) return 4; // 5% chance
  if (r < 0.22) return 8; // 2% chance
  return 0;
}

/* -------------------- Game State (Taken / Modified) -------------------- */

const takenCells = new Set<string>(); // emptied by pickups
const modifiedCells = new Map<string, number>(); // merged values

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
    takenCells.add(key);
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

  // empty-handed → pick up
  if (player.holding === null) {
    if (current > 0) {
      player.holding = current;
      setCellValue(i, j, 0);
      renderHUD();
      checkWin();
      drawGrid();
    }
    return;
  }

  // equal merge → double in the cell
  if (current === player.holding && current > 0) {
    const doubled = current * 2;
    setCellValue(i, j, doubled);
    player.holding = null;
    renderHUD();
    drawGrid();
    return;
  }
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
  ensureControls();

  // Snap start position to the *center* of its cell
  player = { ...player, ...snapToCellCenter(player.lat, player.lng) };

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

  // D-pad click wiring (move by cell steps)
  document.getElementById("controls")?.addEventListener("click", (ev) => {
    const t = ev.target as HTMLElement;
    if (t.tagName !== "BUTTON") return;
    const dir = t.getAttribute("data-dir");
    if (dir === "n") movePlayerCells(1, 0);
    if (dir === "s") movePlayerCells(-1, 0);
    if (dir === "w") movePlayerCells(0, -1);
    if (dir === "e") movePlayerCells(0, 1);
  });
}

if (document.readyState === "loading") {
  globalThis.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* -------------------- Movement by Cell Indices -------------------- */

function movePlayerCells(dI = 0, dJ = 0) {
  const { i, j } = toCellId(player.lat, player.lng);
  const [nLat, nLng] = cellCenter(i + dI, j + dJ);
  player = { ...player, lat: nLat, lng: nLng };
  updatePlayerMarker();
  renderHUD();
  map.setView([player.lat, player.lng]);
  drawGrid();
}

// expose for console/debug
type MoveByCellsFn = (dI?: number, dJ?: number) => void;
(globalThis as typeof globalThis & { movePlayerCells?: MoveByCellsFn })
  .movePlayerCells = movePlayerCells;

/* -------------------- Keyboard Controls (cell-steps) -------------------- */

globalThis.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "ArrowUp":
    case "w":
      movePlayerCells(1, 0);
      break; // north (+i)
    case "ArrowDown":
    case "s":
      movePlayerCells(-1, 0);
      break; // south
    case "ArrowLeft":
    case "a":
      movePlayerCells(0, -1);
      break; // west  (-j)
    case "ArrowRight":
    case "d":
      movePlayerCells(0, 1);
      break; // east  (+j)
  }
});
