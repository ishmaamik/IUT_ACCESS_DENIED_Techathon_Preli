// Derives alert conditions from live device state. Pure function of the
// store's current snapshot — no state of its own, so both the REST route
// and the periodic WebSocket broadcaster can call it freely.

import { getAllDevices } from './simulator/deviceStore.js';

const OFFICE_OPEN_HOUR = 9;
const OFFICE_CLOSE_HOUR = 17;
// Shortened from a "realistic" 2h so a live demo actually sees this alert
// fire from the simulator's random toggling instead of only from the
// seeded demo room.
const CONTINUOUS_ON_THRESHOLD_MS = 10 * 60 * 1000;
const CONTINUOUS_ON_THRESHOLD_LABEL = '10 minutes';
// The simulator flips a few devices every few seconds — without a minimum
// dwell time, an after-hours alert would flap in and out that fast. Only
// flag a device once it's actually stayed on for a little while.
const AFTER_HOURS_MIN_ON_MS = 60 * 1000;

function isAfterHours(date) {
  const hour = date.getHours();
  return hour < OFFICE_OPEN_HOUR || hour >= OFFICE_CLOSE_HOUR;
}

export function computeAlerts(now = new Date()) {
  const devices = getAllDevices();
  const alerts = [];

  if (isAfterHours(now)) {
    const rooms = [...new Set(devices.map((d) => d.room))];
    for (const room of rooms) {
      const offenders = devices.filter(
        (d) =>
          d.room === room &&
          d.status &&
          now.getTime() - new Date(d.lastChanged).getTime() >= AFTER_HOURS_MIN_ON_MS
      );
      if (offenders.length === 0) continue;

      alerts.push({
        id: `after-hours-${room}`,
        type: 'after-hours',
        severity: 'warning',
        room,
        message:
          offenders.length === 1
            ? `${offenders[0].name} in ${offenders[0].roomLabel} is still ON outside office hours (9AM-5PM).`
            : `${offenders.length} devices in ${offenders[0].roomLabel} are still ON outside office hours (9AM-5PM).`,
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
        message: `${roomDevices[0].roomLabel} has had all ${roomDevices.length} devices ON continuously for over ${CONTINUOUS_ON_THRESHOLD_LABEL}.`,
        timestamp: now.toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
}
