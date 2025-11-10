import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

// ---------------------------------------------------
// Phase 3: Player object + marker + simple HUD
// ---------------------------------------------------

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

// Small HUD showing player state (holding will be useful later)
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
    player.lng.toFixed(5)
  })  |  Holding: ${player.holding ?? "—"}`;
}

function createPlayerMarker() {
  // Use a dedicated marker we can move later
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

  createPlayerMarker();
  renderHUD();

  // (Optional) quick test: click to re-center map on the player
  // (This is just for convenience while developing)
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
