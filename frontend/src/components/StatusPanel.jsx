import { useDeviceStore } from '../store/useDeviceStore';
import { ROOM_ORDER, ROOM_LABELS } from '../three/layout';

export default function StatusPanel() {
  const devices = useDeviceStore((state) => Object.values(state.devices));

  return (
    <section className="panel">
      <h2>Device Status</h2>
      {ROOM_ORDER.map((room) => {
        const roomDevices = devices
          .filter((d) => d.room === room)
          .sort((a, b) => a.name.localeCompare(b.name));

        return (
          <div key={room} className="room-block">
            <h3>{ROOM_LABELS[room]}</h3>
            <ul className="device-list">
              {roomDevices.map((device) => (
                <li key={device.id} className={device.status ? 'on' : 'off'}>
                  <span className="dot" />
                  <span className="name">{device.name}</span>
                  <span className="state">{device.status ? 'ON' : 'OFF'}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
