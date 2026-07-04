// MongoDB persistence layer. Entirely optional: if MONGODB_URI is not set
// (or the connection fails), initDb() resolves false and every write here
// becomes a no-op, so the app keeps working purely in-memory as before.
//
// Storage layout (one database, three concerns):
//   devices        - regular collection, current state of each device,
//                    upserted on every change (mirror of the in-memory store)
//   energy_samples - native time-series collection holding the raw 5s power
//                    samples; MongoDB compresses these columnar-style and
//                    auto-deletes them after RAW_RETENTION_DAYS
//   energy_hourly  - regular collection of per-hour kWh rollups, $inc-upserted
//                    on every sample and kept forever. This is the long-term
//                    history (~9k docs/year), which is why raw samples can expire.
//   alerts         - one doc per alert occurrence. Alerts are recomputed every
//                    few seconds, so we only insert when an alert id newly
//                    appears, not on every recompute.

import dns from 'node:dns';
import { MongoClient } from 'mongodb';

// Some networks synthesize a NAT64 IPv6 address for Atlas's hostnames
// (visible as ENETUNREACH on a 64:ff9b::... address alongside an ETIMEDOUT
// on the real IPv4 one) and Node tries that broken route first. Preferring
// IPv4 resolution avoids racing that path.
dns.setDefaultResultOrder('ipv4first');

const RAW_RETENTION_DAYS = 7;

let db = null;

export async function initDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log('MONGODB_URI not set — running without persistence.');
    return false;
  }

  try {
    const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    db = client.db(); // database name comes from the URI path

    // Time-series collections must be created explicitly (a plain insert
    // would create a regular collection). NamespaceExists just means a
    // previous run already created it.
    try {
      await db.createCollection('energy_samples', {
        timeseries: { timeField: 'ts', metaField: 'meta', granularity: 'seconds' },
        expireAfterSeconds: RAW_RETENTION_DAYS * 24 * 3600,
      });
    } catch (err) {
      if (err.codeName !== 'NamespaceExists') throw err;
    }

    console.log(`Connected to MongoDB (db: ${db.databaseName}).`);
    return true;
  } catch (err) {
    console.error(`MongoDB connection failed (${err.message}) — running without persistence.`);
    db = null;
    return false;
  }
}

// Device id doubles as the Mongo _id, so upserts are natural-keyed and
// re-seeding on restart never duplicates.
const deviceDoc = ({ id, ...rest }) => rest;

const logWriteError = (what) => (err) =>
  console.error(`Mongo write failed (${what}): ${err.message}`);

export const seedDevices = async (devices) => {
  if (!db) return;
  await db.collection('devices').bulkWrite(
    devices.map((d) => ({
      updateOne: { filter: { _id: d.id }, update: { $set: deviceDoc(d) }, upsert: true },
    }))
  );
};

export const persistDeviceState = (device) => {
  if (!db) return;
  db.collection('devices')
    .updateOne({ _id: device.id }, { $set: deviceDoc(device) }, { upsert: true })
    .catch(logWriteError('device'));
};

export const recordEnergySample = ({ now, totalWatts, perRoomWatts, whAdded, perRoomWhAdded }) => {
  if (!db) return;

  db.collection('energy_samples')
    .insertOne({ ts: now, meta: { scope: 'office' }, totalWatts, perRoomWatts })
    .catch(logWriteError('energy sample'));

  const inc = { wh: whAdded };
  for (const [room, wh] of Object.entries(perRoomWhAdded ?? {})) {
    inc[`roomWh.${room}`] = wh;
  }

  const hourStart = new Date(now);
  hourStart.setMinutes(0, 0, 0);
  db.collection('energy_hourly')
    .updateOne(
      { _id: hourStart.toISOString() },
      { $inc: inc, $setOnInsert: { hourStart } },
      { upsert: true }
    )
    .catch(logWriteError('hourly rollup'));
};

// Tracks which alert ids were present on the previous recompute so an alert
// that stays active for minutes is stored once, and stored again only if it
// clears and later re-fires.
let activeAlertIds = new Set();

export const recordAlerts = (alerts) => {
  const newAlerts = alerts.filter((a) => !activeAlertIds.has(a.id));
  activeAlertIds = new Set(alerts.map((a) => a.id));

  if (!db || newAlerts.length === 0) return;
  db.collection('alerts')
    .insertMany(newAlerts.map(({ id, ...rest }) => ({ alertId: id, ...rest })))
    .catch(logWriteError('alerts'));
};

// room = null → whole office; otherwise that room's slice of each rollup.
export const getHourlyEnergy = async (hours = 24, room = null) => {
  if (!db) return [];
  const since = new Date(Date.now() - hours * 3_600_000);
  const docs = await db
    .collection('energy_hourly')
    .find({ hourStart: { $gte: since } })
    .sort({ hourStart: 1 })
    .toArray();
  return docs.map((d) => ({
    hourStart: d.hourStart,
    kwh: Number((((room ? d.roomWh?.[room] : d.wh) ?? 0) / 1000).toFixed(3)),
  }));
};

// Total Wh recorded since the start of the current month. Returns null
// (not 0) when there is no database, so callers can tell "no tracking"
// apart from "tracked, but nothing used".
export const getMonthWh = async (room = null) => {
  if (!db) return null;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const field = room ? `$roomWh.${room}` : '$wh';
  const [result] = await db
    .collection('energy_hourly')
    .aggregate([
      { $match: { hourStart: { $gte: monthStart } } },
      { $group: { _id: null, wh: { $sum: { $ifNull: [field, 0] } } } },
    ])
    .toArray();
  return result?.wh ?? 0;
};
