import { useDeviceStore } from '../store/useDeviceStore';
import { ROOM_ORDER, ROOM_LABELS } from '../three/layout';

// Fixed denominator (2 fans x 60W + 3 lights x 15W = 165W) so each room's
// bar is scaled against the room's own max draw, not a value that shifts
// as other rooms change — a stable baseline instead of a rescaling axis.
const ROOM_MAX_WATTS = 2 * 60 + 3 * 15;

export default function PowerMeter() {
  const usage = useDeviceStore((state) => state.usage);

  return (
    <section className="panel">
      <h2>Power Consumption</h2>
      <div className="total-watts">
        {usage.totalWatts ?? 0}
        <span className="unit">W</span>
      </div>
      <div className="kwh-today">Today so far: {usage.estimatedKwhToday ?? 0} kWh</div>

      <ul className="room-usage">
        {ROOM_ORDER.map((room) => {
          const watts = usage.perRoomWatts?.[room] ?? 0;
          const pct = Math.min(100, (watts / ROOM_MAX_WATTS) * 100);
          return (
            <li key={room}>
              <div className="room-usage-label">
                <span>{ROOM_LABELS[room]}</span>
                <span className="watts-value">{watts} W</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
