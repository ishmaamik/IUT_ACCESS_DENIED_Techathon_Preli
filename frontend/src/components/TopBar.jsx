import { useEffect, useRef, useState } from 'react';
import { useDeviceStore } from '../store/useDeviceStore';
import { ROOM_ORDER, ROOM_LABELS } from '../three/layout';
import NotificationBell from './NotificationBell';
import logo from './TeslaOS.png';

// Fixed denominator (2 fans x 60W + 3 lights x 15W = 165W) so each room's
// bar is scaled against the room's own max draw, not a value that shifts
// as other rooms change — a stable baseline instead of a rescaling axis.
const ROOM_MAX_WATTS = 2 * 60 + 3 * 15;

// Silent when connected — a "Live" pill next to an already-live dashboard
// is just noise. Only speaks up when there's actually something wrong.
function ConnectionBadge() {
  const connected = useDeviceStore((state) => state.connected);
  if (connected) return null;
  return <span className="badge down">Reconnecting…</span>;
}

// "Fan 1" -> "F1", "Light 3" -> "L3" — short enough to lay every device
// out in the collapsed chip instead of hiding them behind a click.
function shortLabel(device) {
  const num = device.name.match(/\d+/)?.[0] ?? '';
  return `${device.type === 'fan' ? 'F' : 'L'}${num}`;
}

// Live time + date on the right, so the bar always answers "as of when".
function Clock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="header-clock">
      <div className="header-clock-time">
        {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="header-clock-date">
        {now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
      </div>
    </div>
  );
}

// Collapsed, a room chip already shows every device's on/off state as a
// row of small tags — no click required for the basic picture. Click it
// to drop down the full names alongside their state, for when a tag's
// abbreviation isn't enough.
function RoomChip({ room }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const usage = useDeviceStore((state) => state.usage);
  const devices = useDeviceStore((state) =>
    Object.values(state.devices)
      .filter((d) => d.room === room)
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  const watts = usage.perRoomWatts?.[room] ?? 0;
  const pct = Math.min(100, (watts / ROOM_MAX_WATTS) * 100);
  const onCount = devices.filter((d) => d.status).length;

  return (
    <div className={`room-chip ${open ? 'open' : ''}`} ref={wrapRef}>
      <button className="room-chip-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="room-chip-top">
          <span className="room-chip-name">{ROOM_LABELS[room]}</span>
          <span className="watts-value">{watts} W</span>
          <span className="room-chip-chevron">▾</span>
        </span>
        <span className="room-chip-tags">
          {devices.map((device) => (
            <span key={device.id} className={`device-tag ${device.status ? 'on' : 'off'}`}>
              {shortLabel(device)}
            </span>
          ))}
          <span className="room-chip-oncount">{onCount}/{devices.length} on</span>
        </span>
        <span className="meter-track">
          <span className="meter-fill" style={{ width: `${pct}%` }} />
        </span>
      </button>

      {open && (
        <div className="room-chip-dropdown">
          <ul className="device-list">
            {devices.map((device) => (
              <li key={device.id} className={device.status ? 'on' : 'off'}>
                <span className="dot" />
                <span className="name">{device.name}</span>
                <span className="state">{device.status ? 'ON' : 'OFF'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function TopBar() {
  const usage = useDeviceStore((state) => state.usage);

  return (
    <header className="app-header">
      <div className="app-header-brand">
        <div className="brand-title">
          <img src={logo} alt="" className="brand-logo" />
          <h1>TeslaOS</h1>
        </div>
        <ConnectionBadge />
      </div>

      <div className="app-header-hero">
        <div className="total-watts">
          {usage.totalWatts ?? 0}
          <span className="unit">W</span>
        </div>
        <div className="kwh-today">Today: {usage.estimatedKwhToday ?? 0} kWh</div>
      </div>

      <div className="room-chip-row">
        {ROOM_ORDER.map((room) => (
          <RoomChip key={room} room={room} />
        ))}
      </div>

      <Clock />
      <NotificationBell />
    </header>
  );
}
