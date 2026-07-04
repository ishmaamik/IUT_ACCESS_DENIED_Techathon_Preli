// Single backend serving both the web dashboard and the Discord bot.
// REST for one-shot queries (bot commands, initial page load), WebSocket
// for push updates (dashboard live view). Both read through deviceStore,
// so there is exactly one source of truth for device state.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

import * as store from './simulator/deviceStore.js';
import { startSimulation } from './simulator/simulateChanges.js';
import { computeAlerts } from './alerts.js';
import { sampleEnergy, getEstimatedKwhToday } from './energyTracker.js';
import * as db from './db.js';

const PORT = process.env.PORT || 4000;
const ENERGY_SAMPLE_MS = 5000;
const ALERT_BROADCAST_MS = 8000;
// Default tariff is the rough Bangladesh flat rate; override per deployment.
const COST_PER_KWH = Number(process.env.COST_PER_KWH) || 8.5;
const CURRENCY = process.env.CURRENCY || '৳';

const app = express();
app.use(cors());
app.use(express.json());

function usageSnapshot() {
  const usage = store.getUsage();
  return { ...usage, estimatedKwhToday: Number(getEstimatedKwhToday().toFixed(2)) };
}

app.get('/api/devices', (req, res) => {
  res.json(store.getAllDevices());
});

app.get('/api/rooms/:room', (req, res) => {
  const devices = store.getRoomDevices(req.params.room);
  if (!devices.length) {
    res.status(404).json({ error: `Unknown room "${req.params.room}"` });
    return;
  }
  res.json(devices);
});

app.get('/api/usage', (req, res) => {
  res.json(usageSnapshot());
});

app.get('/api/alerts', (req, res) => {
  res.json(computeAlerts());
});

// Hourly kWh history from the energy_hourly rollups. Empty array when
// running without a database. Optional ?room= narrows to one room.
app.get('/api/energy/history', async (req, res) => {
  const hours = Math.min(Number(req.query.hours) || 24, 24 * 90);
  res.json(await db.getHourlyEnergy(hours, req.query.room || null));
});

// Everything the dashboard's per-room report modal needs in one call:
// live device state, the last 24h of hourly kWh, and this month's cost
// (month-to-date plus a straight-line projection to month end).
app.get('/api/rooms/:room/report', async (req, res) => {
  const room = req.params.room;
  const devices = store.getRoomDevices(room);
  if (!devices.length) {
    res.status(404).json({ error: `Unknown room "${room}"` });
    return;
  }

  const [hourly, monthWh] = await Promise.all([
    db.getHourlyEnergy(24, room),
    db.getMonthWh(room),
  ]);

  let month = null; // null → no database, frontend shows "not tracking"
  if (monthWh !== null) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const elapsedFraction = (now - monthStart) / (monthEnd - monthStart);
    const kwh = monthWh / 1000;
    const projectedKwh = elapsedFraction > 0 ? kwh / elapsedFraction : kwh;
    month = {
      kwh: Number(kwh.toFixed(2)),
      cost: Number((kwh * COST_PER_KWH).toFixed(2)),
      projectedKwh: Number(projectedKwh.toFixed(2)),
      projectedCost: Number((projectedKwh * COST_PER_KWH).toFixed(2)),
      tariff: COST_PER_KWH,
      currency: CURRENCY,
    };
  }

  res.json({
    room,
    roomLabel: devices[0].roomLabel,
    currentWatts: store.getUsage().perRoomWatts[room] ?? 0,
    devices,
    hourly,
    month,
  });
});

// The dashboard's in-game phone posts here; the message is fanned out
// over the WebSocket, where the Discord bot (a WS client like any
// dashboard) picks it up and @everyone-announces it in the channel.
app.post('/api/announce', (req, res) => {
  const message = (req.body?.message ?? '').toString().trim();
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  if (message.length > 500) {
    res.status(400).json({ error: 'Message too long (max 500 characters)' });
    return;
  }
  broadcast({ type: 'announce', message, timestamp: Date.now() });
  res.json({ ok: true });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(payload) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(data);
  }
}

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      type: 'snapshot',
      devices: store.getAllDevices(),
      usage: usageSnapshot(),
      alerts: computeAlerts(),
    })
  );
});

// Every device flip goes out immediately; the dashboard never has to poll.
store.onChange((device) => {
  broadcast({ type: 'device-update', device, usage: usageSnapshot() });
  db.persistDeviceState(device);
});

// Alerts depend on wall-clock time (office hours, "on for 2h") as much as
// on device state, so they're recomputed on a timer rather than only on
// device-change events.
setInterval(() => {
  const alerts = computeAlerts();
  broadcast({ type: 'alerts', alerts });
  db.recordAlerts(alerts);
}, ALERT_BROADCAST_MS);

setInterval(() => db.recordEnergySample(sampleEnergy()), ENERGY_SAMPLE_MS);

await db.initDb();
await db.seedDevices(store.getAllDevices());

startSimulation({ intervalMs: 5000 });

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT} (WebSocket at /ws)`);
});
