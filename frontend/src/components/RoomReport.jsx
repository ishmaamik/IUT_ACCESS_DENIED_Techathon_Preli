// Per-room report modal, opened by walking up to a room's table in the
// 3D scene (ReportSpot). Live device state comes from the store; the
// 24h energy chart and month cost come from GET /api/rooms/:room/report.

import { useEffect, useMemo, useState } from 'react';
import { useDeviceStore } from '../store/useDeviceStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// --- 24h hourly kWh column chart (single series → no legend) -----------
// Geometry in viewBox units; the SVG scales to the card's width.
const VB_W = 560;
const VB_H = 190;
const M = { top: 16, right: 10, bottom: 22, left: 40 };
const PLOT_W = VB_W - M.left - M.right;
const PLOT_H = VB_H - M.top - M.bottom;
const BAR_MAX_THICKNESS = 24;

// Round the axis max up to a clean step so ticks are readable numbers.
function niceMax(value) {
  if (value <= 0) return 0.1;
  const pow = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 1.5, 2, 2.5, 5, 10]) {
    if (m * pow >= value) return m * pow;
  }
  return 10 * pow;
}

function hourLabel(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Column with a 4px-rounded cap and a square baseline.
function barPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

function EnergyChart({ hourly }) {
  const [hovered, setHovered] = useState(null);

  const { bars, ticks, maxIndex } = useMemo(() => {
    const top = niceMax(Math.max(...hourly.map((h) => h.kwh), 0));
    const slot = PLOT_W / hourly.length;
    const thickness = Math.min(BAR_MAX_THICKNESS, slot - 2); // ≥2px air per slot
    const bars = hourly.map((h, i) => {
      const height = top > 0 ? (h.kwh / top) * PLOT_H : 0;
      return {
        ...h,
        x: M.left + slot * i + (slot - thickness) / 2,
        y: M.top + PLOT_H - height,
        w: thickness,
        h: height,
        cx: M.left + slot * (i + 0.5),
      };
    });
    const ticks = [0, 0.5, 1].map((f) => ({
      value: top * f,
      y: M.top + PLOT_H - PLOT_H * f,
    }));
    let maxIndex = -1;
    for (let i = 0; i < hourly.length; i++) {
      if (hourly[i].kwh > 0 && (maxIndex < 0 || hourly[i].kwh > hourly[maxIndex].kwh)) maxIndex = i;
    }
    return { bars, ticks, maxIndex };
  }, [hourly]);

  const hoveredBar = hovered !== null ? bars[hovered] : null;

  return (
    <div className="report-chart-wrap">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="report-chart"
        role="img"
        aria-label="Hourly energy use over the last 24 hours"
        onPointerLeave={() => setHovered(null)}
      >
        {ticks.map((t) => (
          <g key={t.y}>
            <line x1={M.left} x2={VB_W - M.right} y1={t.y} y2={t.y} className="grid" />
            <text x={M.left - 6} y={t.y + 3} className="tick" textAnchor="end">
              {Number(t.value.toFixed(2))}
            </text>
          </g>
        ))}

        {bars.map((b, i) => (
          <g key={b.hourStart}>
            {b.h > 0 && (
              <path d={barPath(b.x, b.y, b.w, b.h)} className={`bar ${hovered === i ? 'hover' : ''}`} />
            )}
            {/* hit target: the whole column, not just the painted bar */}
            <rect
              x={b.cx - (PLOT_W / bars.length) / 2}
              y={M.top}
              width={PLOT_W / bars.length}
              height={PLOT_H}
              fill="transparent"
              onPointerEnter={() => setHovered(i)}
              onFocus={() => setHovered(i)}
              onBlur={() => setHovered(null)}
              tabIndex={-1}
            />
            {i % 4 === 0 && (
              <text x={b.cx} y={VB_H - 6} className="tick" textAnchor="middle">
                {hourLabel(b.hourStart)}
              </text>
            )}
          </g>
        ))}

        {/* direct label on the peak hour only — tooltip carries the rest */}
        {maxIndex >= 0 && hovered === null && (
          <text
            x={bars[maxIndex].cx}
            y={bars[maxIndex].y - 5}
            className="peak-label"
            textAnchor="middle"
          >
            {bars[maxIndex].kwh} kWh
          </text>
        )}

        <line
          x1={M.left}
          x2={VB_W - M.right}
          y1={M.top + PLOT_H}
          y2={M.top + PLOT_H}
          className="baseline"
        />
      </svg>

      {hoveredBar && (
        <div
          className="report-tooltip"
          style={{ left: `${(hoveredBar.cx / VB_W) * 100}%` }}
        >
          <strong>{hoveredBar.kwh} kWh</strong>
          <span>{hourLabel(hoveredBar.hourStart)}</span>
        </div>
      )}

      <details className="report-data-table">
        <summary>Data table</summary>
        <table>
          <thead>
            <tr>
              <th>Hour</th>
              <th>kWh</th>
            </tr>
          </thead>
          <tbody>
            {hourly.map((h) => (
              <tr key={h.hourStart}>
                <td>{hourLabel(h.hourStart)}</td>
                <td>{h.kwh}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div className="report-stat">
      <div className="report-stat-label">{label}</div>
      <div className="report-stat-value">{value}</div>
      {sub && <div className="report-stat-sub">{sub}</div>}
    </div>
  );
}

export default function RoomReport() {
  const room = useDeviceStore((state) => state.reportRoom);
  const close = useDeviceStore((state) => state.closeReport);
  const usage = useDeviceStore((state) => state.usage);
  const devices = useDeviceStore((state) =>
    Object.values(state.devices)
      .filter((d) => d.room === room)
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  const [report, setReport] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!room) return;
    setStatus('loading');
    setReport(null);
    let cancelled = false;
    fetch(`${API_URL}/rooms/${room}/report`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setReport(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, [room]);

  useEffect(() => {
    if (!room) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [room, close]);

  if (!room) return null;

  const roomLabel = devices[0]?.roomLabel ?? report?.roomLabel ?? room;
  const watts = usage.perRoomWatts?.[room] ?? 0;
  const month = report?.month;
  const hourly = report?.hourly ?? [];
  const hasHistory = hourly.some((h) => h.kwh > 0);
  const fans = devices.filter((d) => d.type === 'fan');
  const lights = devices.filter((d) => d.type === 'light');

  return (
    <div className="report-backdrop" onClick={close}>
      <div
        className="report-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${roomLabel} report`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="report-header">
          <div>
            <h2>{roomLabel}</h2>
            <span className="report-sub">
              {fans.length} fans · {lights.length} lights · live report
            </span>
          </div>
          <button className="report-close" onClick={close} aria-label="Close report">
            ✕
          </button>
        </div>

        <div className="report-stats">
          <StatTile label="Current draw" value={`${watts} W`} sub="right now" />
          <StatTile
            label="This month"
            value={month ? `${month.currency}${month.cost}` : '—'}
            sub={month ? `${month.kwh} kWh so far` : 'not tracking'}
          />
          <StatTile
            label="Est. month cost"
            value={month ? `${month.currency}${month.projectedCost}` : '—'}
            sub={
              month
                ? `~${month.projectedKwh} kWh at ${month.currency}${month.tariff}/kWh`
                : 'connect MongoDB to track'
            }
          />
        </div>

        <div className="report-section">
          <h3>Energy — last 24 hours</h3>
          {status === 'loading' && <p className="report-empty">Loading…</p>}
          {status === 'error' && (
            <p className="report-empty">Couldn’t load the report — is the backend up?</p>
          )}
          {status === 'ready' && !hasHistory && (
            <p className="report-empty">
              No usage recorded yet — history builds up as devices run.
            </p>
          )}
          {status === 'ready' && hasHistory && <EnergyChart hourly={hourly} />}
        </div>

        <div className="report-section">
          <h3>Devices</h3>
          <table className="report-devices">
            <thead>
              <tr>
                <th>Device</th>
                <th>Status</th>
                <th>Power</th>
                <th>Last changed</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id}>
                  <td>
                    <span className="report-device-icon">
                      {device.type === 'fan' ? '🌀' : '💡'}
                    </span>
                    {device.name}
                  </td>
                  <td>
                    <span className={`report-state ${device.status ? 'on' : 'off'}`}>
                      {device.status ? 'ON' : 'OFF'}
                    </span>
                  </td>
                  <td>{device.status ? `${device.wattage} W` : `0 W (rated ${device.wattage})`}</td>
                  <td>
                    {new Date(device.lastChanged).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
