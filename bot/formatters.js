// Template-based fallback phrasing. Always correct (built directly from the
// live data), used whenever the LLM polish in llm.js is unavailable or fails.

export function statusFacts(devices, roomLabels) {
  const rooms = Object.keys(roomLabels);
  return rooms
    .map((room) => {
      const roomDevices = devices.filter((d) => d.room === room);
      const fans = roomDevices.filter((d) => d.type === 'fan');
      const lights = roomDevices.filter((d) => d.type === 'light');
      const fansOn = fans.filter((d) => d.status).length;
      const lightsOn = lights.filter((d) => d.status).length;

      if (fansOn === 0 && lightsOn === 0) return `${roomLabels[room]}: all off.`;
      return `${roomLabels[room]}: ${fansOn} fan${fansOn === 1 ? '' : 's'} ON, ${lightsOn} light${
        lightsOn === 1 ? '' : 's'
      } ON.`;
    })
    .join(' ');
}

export function roomFacts(roomLabel, devices) {
  const on = devices.filter((d) => d.status);
  if (on.length === 0) return `${roomLabel} is all quiet — everything's switched off.`;
  const names = on.map((d) => d.name).join(', ');
  return `${roomLabel} has ${on.length} device${on.length === 1 ? '' : 's'} running right now: ${names}.`;
}

export function usageFacts(usage) {
  return `Total power right now: ${usage.totalWatts}W. Today's estimated usage: ${usage.estimatedKwhToday.toFixed(
    1
  )} kWh.`;
}

// Built from GET /api/rooms/:room/report. `hourly` and `month` are empty/null
// when the backend has no database connection — reported honestly rather
// than papered over, so the LLM (or the human reading it) knows history
// isn't tracked right now instead of assuming zero usage.
export function reportFacts(report) {
  const { roomLabel, currentWatts, devices, hourly, month } = report;
  const on = devices.filter((d) => d.status);
  const deviceLine =
    on.length === 0
      ? `all ${devices.length} devices are off`
      : `${on.length} of ${devices.length} devices on right now (${on.map((d) => d.name).join(', ')})`;

  const lines = [`${roomLabel} report.`, `Currently drawing ${currentWatts}W — ${deviceLine}.`];

  if (hourly.length > 0) {
    const last24hKwh = hourly.reduce((sum, h) => sum + h.kwh, 0);
    lines.push(`Last 24h: ${last24hKwh.toFixed(2)} kWh.`);
  } else {
    lines.push('No historical data yet — the database is not connected right now.');
  }

  if (month) {
    lines.push(
      `Month-to-date: ${month.kwh} kWh (${month.currency}${month.cost}), ` +
        `on track for about ${month.projectedKwh} kWh (${month.currency}${month.projectedCost}) by month end.`
    );
  }

  return lines.join(' ');
}
