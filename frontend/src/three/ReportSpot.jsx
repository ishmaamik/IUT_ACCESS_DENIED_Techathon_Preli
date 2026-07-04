// Walk-up trigger at each room's table. When the player is within reach,
// a floating "Press Enter or click" prompt appears above the table;
// Enter (or clicking the prompt) opens that room's report modal.
// Proximity is checked every frame against playerInput.position (no
// React state churn — state only flips on enter/leave transitions).

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useDeviceStore } from '../store/useDeviceStore';
import { playerInput } from './playerInput';

const TRIGGER_RADIUS = 1.25;

export default function ReportSpot({ room, position }) {
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);
  const openReport = useDeviceStore((state) => state.openReport);
  const reportOpen = useDeviceStore((state) => state.reportRoom !== null);

  useFrame(() => {
    const [px, pz] = playerInput.position;
    const isNear = Math.hypot(px - position[0], pz - position[2]) < TRIGGER_RADIUS;
    if (isNear !== nearRef.current) {
      nearRef.current = isNear;
      setNear(isNear);
    }
  });

  // Enter opens the report — only while standing at this table, never
  // while typing in the phone (or any other input), never re-triggering
  // under an already-open modal.
  useEffect(() => {
    if (!near || reportOpen) return;
    const onKeyDown = (event) => {
      if (event.key !== 'Enter') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      openReport(room);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [near, reportOpen, room, openReport]);

  if (!near || reportOpen) return null;

  return (
    <Html position={[position[0], 1.35, position[2]]} center zIndexRange={[9, 0]}>
      <button className="report-prompt" onClick={() => openReport(room)}>
        <kbd>⏎ Enter</kbd>
        <span>or click — room report</span>
      </button>
    </Html>
  );
}
