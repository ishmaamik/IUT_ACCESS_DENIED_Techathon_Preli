// Report access for each room, two ways:
//  1. Mouse-only: a small floating marker is always visible above the
//     table. Hover it (cursor turns to a pointer, it lifts + brightens)
//     and click — no need to walk the avatar there at all.
//  2. Walk-up: if the player does walk within reach, the same "Press
//     Enter or click" prompt from before still appears, as a redundant
//     path rather than a replacement.
// Proximity for path 2 is checked every frame against playerInput.position
// (no React state churn — state only flips on enter/leave transitions).

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useDeviceStore } from '../store/useDeviceStore';
import { playerInput } from './playerInput';

const TRIGGER_RADIUS = 1.25;
const MARKER_HEIGHT = 1.3;

function ReportMarker({ room, position, openReport }) {
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hovered]);

  return (
    <group position={[position[0], MARKER_HEIGHT, position[2]]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
        onClick={(e) => {
          e.stopPropagation(); // don't let it fall through to tap-to-move
          openReport(room);
        }}
        position={[0, hovered ? 0.08 : 0, 0]}
        scale={hovered ? 1.2 : 1}
      >
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial
          color={hovered ? '#38bdf8' : '#7dd3fc'}
          emissive="#0ea5e9"
          emissiveIntensity={hovered ? 0.9 : 0.4}
        />
      </mesh>

      {hovered && (
        <Html center position={[0, 0.42, 0]} zIndexRange={[9, 0]}>
          <div className="report-prompt">
            <span>Click — room report</span>
          </div>
        </Html>
      )}
    </group>
  );
}

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

  return (
    <>
      {!reportOpen && <ReportMarker room={room} position={position} openReport={openReport} />}

      {near && !reportOpen && (
        <Html position={[position[0], 1.35, position[2]]} center zIndexRange={[9, 0]}>
          <button className="report-prompt" onClick={() => openReport(room)}>
            <kbd>⏎ Enter</kbd>
            <span>or click — room report</span>
          </button>
        </Html>
      )}
    </>
  );
}
