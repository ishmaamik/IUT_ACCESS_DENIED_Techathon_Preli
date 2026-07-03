// Maps device ids (must match backend/simulator/deviceStore.js's id
// scheme: `${room}-fan-${n}` / `${room}-light-${n}`) to 3D positions,
// arranged left-to-right like the office top-view: Drawing | Work 1 | Work 2.

export const ROOM_ORDER = ['drawing', 'work1', 'work2'];

export const ROOM_LABELS = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

export const ROOM_CENTERS = {
  drawing: [-4.6, 0, 0],
  work1: [0, 0, 0],
  work2: [4.6, 0, 0],
};

export const ROOM_SIZE = { width: 4.2, depth: 3.4 };

export const ROOM_KIND = {
  drawing: 'lounge',
  work1: 'work',
  work2: 'work',
};

const FAN_SLOTS = [
  [-1.2, 0, -1.1],
  [1.2, 0, -1.1],
];

const LIGHT_SLOTS = [
  [-1.3, 0, 1.1],
  [0, 0, 1.1],
  [1.3, 0, 1.1],
];

export function buildDeviceLayout() {
  const positions = {};

  for (const room of ROOM_ORDER) {
    const [cx, cy, cz] = ROOM_CENTERS[room];

    FAN_SLOTS.forEach(([dx, dy, dz], i) => {
      positions[`${room}-fan-${i + 1}`] = [cx + dx, cy + dy, cz + dz];
    });

    LIGHT_SLOTS.forEach(([dx, dy, dz], i) => {
      positions[`${room}-light-${i + 1}`] = [cx + dx, cy + dy, cz + dz];
    });
  }

  return positions;
}
