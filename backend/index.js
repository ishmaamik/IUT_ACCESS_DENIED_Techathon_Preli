// Single backend serving both the web dashboard and the Discord bot.
// REST for one-shot queries (bot commands, initial page load), WebSocket
// for push updates (dashboard live view). Both read through deviceStore,
// so there is exactly one source of truth for device state.

import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer } from 'ws';

import * as store from './simulator/deviceStore.js';
import { startSimulation } from './simulator/simulateChanges.js';
import { computeAlerts } from './alerts.js';
import { sampleEnergy, getEstimatedKwhToday } from './energyTracker.js';

const PORT = process.env.PORT || 4000;
const ENERGY_SAMPLE_MS = 5000;
const ALERT_BROADCAST_MS = 8000;

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
});

// Alerts depend on wall-clock time (office hours, "on for 2h") as much as
// on device state, so they're recomputed on a timer rather than only on
// device-change events.
setInterval(() => {
  broadcast({ type: 'alerts', alerts: computeAlerts() });
}, ALERT_BROADCAST_MS);

setInterval(() => sampleEnergy(), ENERGY_SAMPLE_MS);

startSimulation({ intervalMs: 5000 });

server.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT} (WebSocket at /ws)`);
});
