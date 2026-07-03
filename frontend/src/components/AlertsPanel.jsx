import { useDeviceStore } from '../store/useDeviceStore';

// Icon rides alongside the severity color so state never reads from
// color alone (after-hours = warning, continuous-on = critical).
const SEVERITY_ICON = {
  warning: '⚠️',
  critical: '⛔',
};

export default function AlertsPanel() {
  const alerts = useDeviceStore((state) => state.alerts);

  return (
    <section className="panel alerts-panel">
      <h2>
        Active Alerts
        {alerts.length > 0 && <span className="count">{alerts.length}</span>}
      </h2>
      {alerts.length === 0 && <p className="empty">All clear — nothing flagged.</p>}
      <ul>
        {alerts.map((alert) => (
          <li key={alert.id} className={`alert ${alert.severity}`}>
            <span className="msg">
              <span className="icon" aria-hidden="true">{SEVERITY_ICON[alert.severity] ?? '•'}</span>
              {alert.message}
            </span>
            <span className="time">{new Date(alert.timestamp).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
