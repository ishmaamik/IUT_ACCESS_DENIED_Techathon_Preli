import { useEffect, useRef, useState } from 'react';
import { useDeviceStore } from '../store/useDeviceStore';

// Icon rides alongside the severity color so state never reads from
// color alone (after-hours = warning, continuous-on = critical).
const SEVERITY_ICON = {
  warning: '⚠️',
  critical: '⛔',
};

const TOAST_LIFETIME_MS = 7000;

function timeAgo(timestamp) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// A plain drawn bell instead of the 🔔 emoji — reads as part of the UI
// rather than a stray emoji glyph sitting in the corner.
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 3.5c-3 0-5 2.2-5 5.2v2.4c0 1-.4 2-1.1 2.7l-.7.8c-.5.5-.1 1.4.6 1.4h12.4c.7 0 1.1-.9.6-1.4l-.7-.8c-.7-.7-1.1-1.7-1.1-2.7V8.7c0-3-2-5.2-5-5.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.8 18.5a2.3 2.3 0 0 0 4.4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

// A bell + badge holding the full (small, deduped-by-room) alert list —
// closed by default, opened on click. Separate from the toasts below: the
// bell is "what's currently flagged", the toasts are "what just changed".
export default function NotificationBell() {
  const alerts = useDeviceStore((state) => state.alerts);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [open]);

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button className="notif-bell" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <BellIcon />
        {alerts.length > 0 && <span className="count">{alerts.length}</span>}
      </button>

      {open && (
        <div className="notif-dropdown">
          <h2>Active Alerts</h2>
          {alerts.length === 0 && <p className="empty">All clear — nothing flagged.</p>}
          <ul>
            {alerts.map((alert) => (
              <li key={alert.id} className={`alert ${alert.severity}`}>
                <span className="msg">
                  <span className="icon" aria-hidden="true">{SEVERITY_ICON[alert.severity] ?? '•'}</span>
                  {alert.message}
                </span>
                <span className="time">{timeAgo(alert.timestamp)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Transient toast stack for newly-appeared alerts only — compares each
// alert snapshot's ids against the previous one, so an alert that clears
// and later re-triggers pops up again instead of being silently deduped
// forever.
export function AlertToasts() {
  const alerts = useDeviceStore((state) => state.alerts);
  const previousIds = useRef(new Set());
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const currentIds = new Set(alerts.map((a) => a.id));
    const fresh = alerts.filter((a) => !previousIds.current.has(a.id));
    previousIds.current = currentIds;
    if (fresh.length === 0) return;

    setToasts((prev) => [...prev, ...fresh]);
    fresh.forEach((alert) => {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== alert.id));
      }, TOAST_LIFETIME_MS);
    });
  }, [alerts]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((alert) => (
        <div key={alert.id} className={`toast ${alert.severity}`}>
          <span className="icon" aria-hidden="true">{SEVERITY_ICON[alert.severity] ?? '•'}</span>
          <span className="msg">{alert.message}</span>
        </div>
      ))}
    </div>
  );
}
