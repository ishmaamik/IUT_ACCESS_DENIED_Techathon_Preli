// Derives alert conditions from live device state. Pure function of the
// store's current snapshot — no state of its own, so both the REST route
// and the periodic WebSocket broadcaster can call it freely.

import { getAllDevices } from './simulator/deviceStore.js';

const OFFICE_OPEN_HOUR = 9;
const OFFICE_CLOSE_HOUR = 17;
const CONTINUOUS_ON_THRESHOLD_MS = 2 * 60 * 60 * 1000;

function isAfterHours(date) {
  const hour = date.getHours();
  return hour < OFFICE_OPEN_HOUR || hour >= OFFICE_CLOSE_HOUR;
}

export function computeAlerts(now = new Date()) {
  const devices = getAllDevices();
  const alerts = [];

  if (isAfterHours(now)) {
    for (const device of devices) {
      if (!device.status) continue;
      alerts.push({
        id: `after-hours-${device.id}`,
        type: 'after-hours',
        severity: 'warning',
        room: device.room,
        message: `${device.name} in ${device.roomLabel} is still ON outside office hours (9AM-5PM).`,
        timestamp: now.toISOString(),
      });
    }
  }

  const rooms = [...new Set(devices.map((d) => d.room))];
  for (const room of rooms) {
    const roomDevices = devices.filter((d) => d.room === room);
    const allOn = roomDevices.every((d) => d.status);
    if (!allOn) continue;

    // Every device in the room is currently on, but they may have switched on
    // at different times. The group has only been "continuously all on"
    // since the last one of them flipped to on.
    const groupOnSince = Math.max(...roomDevices.map((d) => new Date(d.lastChanged).getTime()));
    const durationMs = now.getTime() - groupOnSince;

    if (durationMs >= CONTINUOUS_ON_THRESHOLD_MS) {
      alerts.push({
        id: `continuous-on-${room}`,
        type: 'continuous-on',
        severity: 'critical',
        room,
        message: `${roomDevices[0].roomLabel} has had all ${roomDevices.length} devices ON continuously for over 2 hours.`,
        timestamp: now.toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}
