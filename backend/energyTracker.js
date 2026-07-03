// Integrates total office wattage over time to produce a running
// "today's estimated usage" figure in kWh. Sampled on a fixed interval
// (see index.js) rather than only on device-change events, since power
// draw is continuous between changes and a change-only sample would
// undercount the energy used while devices sit idle-on between toggles.

import { getUsage } from './simulator/deviceStore.js';

let accumulatedWh = 0;
let lastSampleAt = Date.now();
let trackingDay = new Date().toDateString();

export function sampleEnergy(now = new Date()) {
  const today = now.toDateString();
  if (today !== trackingDay) {
    accumulatedWh = 0;
    trackingDay = today;
  }

  const elapsedHours = (now.getTime() - lastSampleAt) / 3_600_000;
  const { totalWatts } = getUsage();
  accumulatedWh += totalWatts * elapsedHours;
  lastSampleAt = now.getTime();
}

export function getEstimatedKwhToday() {
  return accumulatedWh / 1000;
}
