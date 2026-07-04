import { useEffect } from 'react';
import Scene from './three/Scene';
import TopBar from './components/TopBar';
import { AlertToasts } from './components/NotificationBell';
import Joystick from './components/Joystick';
import { useDeviceStore } from './store/useDeviceStore';

export default function App() {
  const connect = useDeviceStore((state) => state.connect);

  useEffect(() => {
    connect();
  }, [connect]);

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <div className="scene-wrap">
          <Scene />
          <AlertToasts />
          <Joystick />
        </div>
      </div>
    </div>
  );
}
