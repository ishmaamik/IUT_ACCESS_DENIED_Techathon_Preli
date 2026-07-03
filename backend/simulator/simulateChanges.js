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

// Seeds a deliberately "forgotten on" device at startup so the
// after-hours alert has something to show immediately during a demo,
// rather than relying on random chance during a live walkthrough.
// Remove this call if you'd rather run fully random from t=0.
function seedDemoState() {
  const target = store.getDevice('work2-light-1');
  if (!target) return;

  store.setDeviceState('work2-light-1', true);
  // Backdate lastChanged so it immediately reads as "on for hours",
  // which is what the after-hours / >2hr-continuous alert checks for.
  target.lastChanged = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
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