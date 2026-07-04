import 'dotenv/config';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import WebSocket from 'ws';

import {
  fetchAllDevices,
  fetchRoomDevices,
  fetchUsage,
  fetchAlerts,
  fetchRoomReport,
  resolveRoom,
} from './officeApi.js';
import { statusFacts, roomFacts, usageFacts, reportFacts } from './formatters.js';
import { humanize, chat, askAboutReport } from './llm.js';

const ALERT_CHANNEL_ID = process.env.ALERT_CHANNEL_ID;
const ALERT_POLL_MS = 30000;
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:4000/ws';
const WS_RECONNECT_MS = 3000;

const ROOM_LABELS = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

// Prefers an LLM-polished sentence built from the same facts every reply is
// grounded in; template phrasing is the fallback, never a guess.
async function reply(message, facts) {
  const polished = await humanize(facts);
  await message.reply(polished || facts);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot logged in as ${readyClient.user.tag}`);
  if (ALERT_CHANNEL_ID) {
    startAlertWatcher(readyClient);
    startAnnouncementListener(readyClient);
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  const [command, ...args] = message.content.trim().split(/\s+/);

  try {
    if (command === '!status') {
      const devices = await fetchAllDevices();
      await reply(message, statusFacts(devices, ROOM_LABELS));
    } else if (command === '!room') {
      const room = resolveRoom(args[0]);
      if (!room) {
        await message.reply("I don't recognize that room. Try: `!room drawing`, `!room work1`, or `!room work2`.");
        return;
      }
      const devices = await fetchRoomDevices(room);
      await reply(message, roomFacts(ROOM_LABELS[room], devices));
    } else if (command === '!usage') {
      const usage = await fetchUsage();
      await reply(message, usageFacts(usage));
    } else if (command === '!report') {
      const room = resolveRoom(args[0]);
      if (!room) {
        await message.reply(
          "I don't recognize that room. Try: `!report drawing`, `!report work1`, or `!report work2` — " +
            'optionally followed by a question, e.g. `!report work2 how does this month look?`'
        );
        return;
      }
      const question = args.slice(1).join(' ');
      const report = await fetchRoomReport(room);
      const facts = reportFacts(report);
      if (question) {
        const answer = await askAboutReport(question, facts);
        await message.reply(answer || `Gemini isn't available right now. Here's the raw report: ${facts}`);
      } else {
        await reply(message, facts);
      }
    } else if (command === '!ask') {
      const question = args.join(' ');
      if (!question) {
        await message.reply('Ask me something, e.g. `!ask why does the drawing room use more power?`');
        return;
      }
      const answer = await chat(question);
      await message.reply(answer || "Gemini isn't available right now — try again in a moment.");
    } else if (command === '!help') {
      await message.reply(
        'Commands: `!status`, `!room <drawing|work1|work2>`, `!usage`, ' +
          '`!report <room> [question]`, `!ask <question>`'
      );
    }
  } catch (err) {
    console.error(err);
    await message.reply('Hmm, I could not reach the office backend just now — try again in a moment.');
  }
});

// Bonus: proactively posts new alerts to a designated channel. Tracks which
// alert ids have already been announced so a still-active alert isn't
// re-posted every poll, but re-announces if it clears and re-triggers later.
const announcedAlertIds = new Set();

function startAlertWatcher(readyClient) {
  setInterval(async () => {
    try {
      const alerts = await fetchAlerts();
      const channel = await readyClient.channels.fetch(ALERT_CHANNEL_ID);

      for (const alert of alerts) {
        if (announcedAlertIds.has(alert.id)) continue;
        announcedAlertIds.add(alert.id);
        const icon = alert.severity === 'critical' ? '⛔' : '⚠️';
        await channel.send(`${icon} ${alert.message} (as of ${new Date(alert.timestamp).toLocaleTimeString()})`);
      }

      const activeIds = new Set(alerts.map((a) => a.id));
      for (const id of announcedAlertIds) {
        if (!activeIds.has(id)) announcedAlertIds.delete(id);
      }
    } catch (err) {
      console.error('Alert watcher error:', err);
    }
  }, ALERT_POLL_MS);
}

// The dashboard's in-game phone posts announcements to the backend, which
// fans them out over its WebSocket. The bot sits on that socket like any
// dashboard client and relays them to the channel as @everyone pings,
// reconnecting quietly whenever the backend restarts.
function startAnnouncementListener(readyClient) {
  const connect = () => {
    const ws = new WebSocket(BACKEND_WS_URL);

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type !== 'announce') return;
        const channel = await readyClient.channels.fetch(ALERT_CHANNEL_ID);
        await channel.send({
          content: `@everyone 📢 **Office announcement:** ${msg.message}`,
          allowedMentions: { parse: ['everyone'] },
        });
      } catch (err) {
        console.error('Announcement relay error:', err);
      }
    });

    ws.on('close', () => setTimeout(connect, WS_RECONNECT_MS));
    ws.on('error', () => {}); // 'close' always follows; reconnect happens there
  };
  connect();
}

client.login(process.env.DISCORD_TOKEN);
