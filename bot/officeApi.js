// Thin client over the shared backend. The bot never touches device
// state directly — it reads the same REST API the web dashboard's
// initial load uses, so both surfaces are guaranteed to agree.

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function getJSON(path) {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Backend returned ${res.status} for ${path}`);
  }
  return res.json();
}

export const ROOM_ALIASES = {
  drawing: 'drawing',
  drawingroom: 'drawing',
  lounge: 'drawing',
  work1: 'work1',
  workroom1: 'work1',
  work2: 'work2',
  workroom2: 'work2',
};

export function resolveRoom(input) {
  const key = (input || '').toLowerCase().replace(/\s+/g, '');
  return ROOM_ALIASES[key] ?? null;
}

export function fetchAllDevices() {
  return getJSON('/devices');
}

export function fetchRoomDevices(room) {
  return getJSON(`/rooms/${room}`);
}

export function fetchUsage() {
  return getJSON('/usage');
}

export function fetchAlerts() {
  return getJSON('/alerts');
}
