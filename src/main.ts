import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

const classroom = { lat: 36.99803803339612, lng: -122.05670161815607 };

// Single-slot inventory comes in Phase 8, but scaffold Player now
type Player = {
  lat: number;
  lng: number;
  holding: number | null; // will be used in D3.a inventory/crafting
};

let player: Player = { ...classroom, holding: null };

// Leaflet references
let map: L.Map;
let playerMarker: L.CircleMarker;

let gridLayer: L.LayerGroup | null = null;
// Small HUD showing player state (holding will be useful later)
let hudEl: HTMLDivElement;

// Size of each rectilinear lat-lng grid cell (≈ a house)
const CELL = 0.0001;

// Discrete cell index from any lat/lng (integer grid)
type CellId = { i: number; j: number };

// Keep a reference so we can replace/redraw later
let oneCellRect: L.Rectangle | null = null;

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
    player.lng.toFixed(5)
  })  |  Holding: ${player.holding ?? "—"}`;
}

function createPlayerMarker() {
  playerMarker = L.circleMarker([player.lat, player.lng], {
    radius: 8,
    weight: 2,
  }).addTo(map);
}

function updatePlayerMarker() {
  playerMarker.setLatLng([player.lat, player.lng]);
}

function init() {
  const container = ensureMapContainer();
  hudEl = ensureHUD();

  map = L.map(container, {
    zoomControl: true,
    preferCanvas: true,
  }).setView([player.lat, player.lng], 18);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  drawGrid();

  // Redraw whenever the map view changes
  map.on("zoomend", drawGrid);
  map.on("moveend", drawGrid);
  map.on("resize", drawGrid);
  createPlayerMarker();
  renderHUD();

  map.on("click", () => map.setView([player.lat, player.lng]));
}

// DOM ready
if (document.readyState === "loading") {
  globalThis.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// ---------------------------------------------------
// Dev helper (optional): a function to move player for testing Phase 3.
// Call this in the console: movePlayerBy(0.0001, 0)
// ---------------------------------------------------
(globalThis as typeof globalThis & {
  movePlayerBy?: (dLat?: number, dLng?: number) => void;
}).movePlayerBy = (dLat = 0, dLng = 0) => {
  player = { ...player, lat: player.lat + dLat, lng: player.lng + dLng };
  updatePlayerMarker();
  renderHUD();
  map.setView([player.lat, player.lng]); // keep camera on player
};

function toCellId(lat: number, lng: number): CellId {
  return {
    i: Math.floor(lat / CELL),
    j: Math.floor(lng / CELL),
  };
}

// Bounds (southWest -> northEast) of a given cell in lat/lng
function cellBounds(id: CellId): [[number, number], [number, number]] {
  const south = id.i * CELL;
  const west = id.j * CELL;
  const north = (id.i + 1) * CELL;
  const east = (id.j + 1) * CELL;
  return [[south, west], [north, east]];
}

function drawPlayersCell() {
  const id = toCellId(player.lat, player.lng);
  const bounds = cellBounds(id);
  if (oneCellRect) {
    map.removeLayer(oneCellRect);
  }

  oneCellRect = L.rectangle(bounds, {
    weight: 2,
  }).addTo(map);
}

// call once on init and whenever player moves (dev helper already moves the player)
drawPlayersCell();

type MovePlayerFn = (dLat?: number, dLng?: number) => void;
const _origMove =
  (globalThis as typeof globalThis & { movePlayerBy?: MovePlayerFn })
    .movePlayerBy;

(globalThis as typeof globalThis & { movePlayerBy?: MovePlayerFn })
  .movePlayerBy = (dLat = 0, dLng = 0) => {
    _origMove?.(dLat, dLng); // call original helper
    drawPlayersCell(); // redraw cell outline when player moves
  };

function visibleCellRange() {
  const b = map.getBounds(); // south, west, north, east
  const iMin = Math.floor(b.getSouth() / CELL);
  const iMax = Math.ceil(b.getNorth() / CELL);
  const jMin = Math.floor(b.getWest() / CELL);
  const jMax = Math.ceil(b.getEast() / CELL);
  return { iMin, iMax, jMin, jMax };
}

// Draw thin rectangles for every visible cell
function drawGrid() {
  if (!map) return;

  if (!gridLayer) {
    gridLayer = L.layerGroup().addTo(map);
  } else {
    gridLayer.clearLayers();
  }

  const { iMin, iMax, jMin, jMax } = visibleCellRange();

  // Safety cap to avoid accidental huge loops if something goes wrong
  const MAX_CELLS = 8000;
  let count = 0;

  for (let i = iMin; i < iMax; i++) {
    for (let j = jMin; j < jMax; j++) {
      // bail out if extreme zoom-out
      if (++count > MAX_CELLS) return;

      const south = i * CELL;
      const west = j * CELL;
      const north = (i + 1) * CELL;
      const east = (j + 1) * CELL;

      L.rectangle([[south, west], [north, east]], {
        weight: 1,
        opacity: 0.6,
      }).addTo(gridLayer);
    }
  }
}
