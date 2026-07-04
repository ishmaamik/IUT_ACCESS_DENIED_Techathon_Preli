// Periodically flips a handful of devices on/off so the system has
// live, changing data without real hardware. This is the ONLY module
// (besides a future manual-override API route) that should call
// store.setDeviceState — everything else just reads.

import * as store from './deviceStore.js';

let intervalHandle = null;

// Picks a small random subset of devices to toggle this tick.
function pickDevicesToToggle(allDevices, count) {
  const shuffled = [...allDevices].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function tick() {
  const allDevices = store.getAllDevices();

  // Toggle 1–3 devices per tick — enough to feel alive, not so much
  // that the dashboard flickers unreadably.
  const changeCount = 1 + Math.floor(Math.random() * 3);
  const targets = pickDevicesToToggle(allDevices, changeCount);

  for (const device of targets) {
    const newStatus = !device.status;
    store.setDeviceState(device.id, newStatus);
  }
}

// Seeds deliberately "forgotten on" devices at startup so the dashboard
// always has at least one alert to show immediately during a demo,
// rather than depending on random chance (or, for the after-hours check,
// on what time of day the demo happens to run).
function seedDemoState() {
  // After-hours candidate — only actually fires as an alert outside 9-5.
  const afterHoursTarget = store.getDevice('work2-light-1');
  if (afterHoursTarget) {
    store.setDeviceState('work2-light-1', true);
    afterHoursTarget.lastChanged = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  }

  // A whole room left fully on — this one fires the "continuously on"
  // critical alert regardless of time of day, so there's always
  // something in the bell even during office hours.
  const allOnRoom = store.getRoomDevices('work1');
  for (const device of allOnRoom) {
    store.setDeviceState(device.id, true);
    device.lastChanged = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  }
}

// intervalMs: how often the simulator ticks.
// Returns a stop function so callers (or tests) can clean up.
export function startSimulation({ intervalMs = 5000, seedDemo = true } = {}) {
  if (intervalHandle) {
    throw new Error('Simulation already running — call stopSimulation() first');
  }

  if (seedDemo) seedDemoState();

  intervalHandle = setInterval(tick, intervalMs);
  return stopSimulation;
}

export function stopSimulation() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}