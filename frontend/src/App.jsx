import { useEffect } from 'react';
import Scene from './three/Scene';
import StatusPanel from './components/StatusPanel';
import PowerMeter from './components/PowerMeter';
import AlertsPanel from './components/AlertsPanel';
import { useDeviceStore } from './store/useDeviceStore';

function ConnectionBadge() {
  const connected = useDeviceStore((state) => state.connected);
  return <span className={`badge ${connected ? 'ok' : 'down'}`}>{connected ? 'Live' : 'Reconnecting…'}</span>;
}

export default function App() {
  const connect = useDeviceStore((state) => state.connect);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Office Power Monitor</h1>
        <ConnectionBadge />
      </header>
      <div className="app-body">
        <div className="scene-wrap">
          <Scene />
        </div>
        <aside className="side-panel">
          <PowerMeter />
          <StatusPanel />
          <AlertsPanel />
        </aside>
      </div>
    </div>
  );
}
