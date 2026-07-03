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
  drawing: [-6.2, 0, 0],
  work1: [0, 0, 0],
  work2: [6.2, 0, 0],
};

export const ROOM_SIZE = { width: 5.8, depth: 4.6 };

// Shared with RoomShell's door geometry — kept here so the Walker's path
// can line up with the actual doorway openings without duplicating numbers.
export const DOOR_WIDTH = 1.1;
export const DOOR_Z = ROOM_SIZE.depth / 2 - DOOR_WIDTH / 2 - 0.35;

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
