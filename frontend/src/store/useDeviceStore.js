// Single client-side source of truth, fed entirely by the backend
// WebSocket. Components read narrow slices (e.g. one device by id) via
// selectors so a single device flipping doesn't re-render the whole tree.

import { create } from 'zustand';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws';
const RECONNECT_DELAY_MS = 2000;

export const useDeviceStore = create((set, get) => ({
  devices: {},
  usage: { totalWatts: 0, perRoomWatts: {}, estimatedKwhToday: 0 },
  alerts: [],
  connected: false,
  _socket: null,

  connect: () => {
    if (get()._socket) return; // already connecting/connected

    const socket = new WebSocket(WS_URL);
    set({ _socket: socket });

    socket.onopen = () => set({ connected: true });

    socket.onclose = () => {
      set({ connected: false, _socket: null });
      setTimeout(() => get().connect(), RECONNECT_DELAY_MS);
    };

    socket.onerror = () => socket.close();

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'snapshot') {
        const devices = {};
        for (const device of message.devices) devices[device.id] = device;
        set({ devices, usage: message.usage, alerts: message.alerts });
      } else if (message.type === 'device-update') {
        set((state) => ({
          devices: { ...state.devices, [message.device.id]: message.device },
          usage: message.usage,
        }));
      } else if (message.type === 'alerts') {
        set({ alerts: message.alerts });
      }
    };
  },
}));
