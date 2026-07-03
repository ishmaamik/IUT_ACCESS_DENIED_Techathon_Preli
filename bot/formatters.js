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
