import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./style.css";

const classroom = { lat: 36.99803803339612, lng: -122.05670161815607 };

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

function init() {
  const container = ensureMapContainer();

  const map = L.map(container, {
    zoomControl: true,
    preferCanvas: true,
  }).setView([classroom.lat, classroom.lng], 18);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  L.circleMarker([classroom.lat, classroom.lng], { radius: 8 }).addTo(map);
}

if (document.readyState === "loading") {
  globalThis.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
