// Single source of truth for all device state.
// Every other module (REST API, WebSocket broadcaster, Discord bot,
// alerts logic, simulator) reads from or writes through this file only.
// Nothing outside this module should mutate device state directly.

const ROOMS = ['drawing', 'work1', 'work2'];

const ROOM_LABELS = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

const WATTAGE = {
  fan: 60,
  light: 15,
};

// Builds the initial 15-device dataset: 2 fans + 3 lights per room.
export const buildInitialDevices=()=> {
  const devices = [];
  const now = new Date().toISOString();

  for (const room of ROOMS) {
    for (let i = 1; i <= 2; i++) {
      devices.push({
        id: `${room}-fan-${i}`,
        name: `Fan ${i}`,
        type: 'fan',
        room,
        roomLabel: ROOM_LABELS[room],
        status: false, // off by default
        wattage: WATTAGE.fan,
        lastChanged: now,
      });
    }
    for (let i = 1; i <= 3; i++) {
      devices.push({
        id: `${room}-light-${i}`,
        name: `Light ${i}`,
        type: 'light',
        room,
        roomLabel: ROOM_LABELS[room],
        status: false,
        wattage: WATTAGE.light,
        lastChanged: now,
      });
    }
  }

  return devices;
}

// The single in-memory state. Not exported directly — access only
// through the export consts below, so every mutation goes through one path.
let devices = buildInitialDevices();

// Listeners get called on every state change (used later by the
// WebSocket broadcaster and the Discord bot's proactive-alert feature).
// Kept here rather than in a separate event-bus module for now —
// simple enough not to need one yet.
const listeners = [];

export const onChange=(callback)=> {
  listeners.push(callback);
}

const notify=(device)=> {
  for (const cb of listeners) cb(device);
}

export const getAllDevices=()=> {
  return devices;
}

export const getRoomDevices=(room)=> {
  return devices.filter((d) => d.room === room);
}

export const getDevice=(id)=> {
  return devices.find((d) => d.id === id);
}

// The only export const allowed to mutate device state.
export const setDeviceState=(id, status)=> {
  const device = getDevice(id);
  if (!device) return null;
  if (device.status === status) return device; // no-op, no change event

  device.status = status;
  device.lastChanged = new Date().toISOString();
  notify(device);
  return device;
}

export const getUsage=()=> {
  const perRoom = {};
  let total = 0;

  for (const room of ROOMS) {
    perRoom[room] = 0;
  }

  for (const d of devices) {
    if (d.status) {
      total += d.wattage;
      perRoom[d.room] += d.wattage;
    }
  }

  return { totalWatts: total, perRoomWatts: perRoom };
}
