import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sky } from '@react-three/drei';
import { useDeviceStore } from '../store/useDeviceStore';
import RoomShell from './RoomShell';
import Fan from './Fan';
import Light from './Light';
import Outdoors from './Outdoors';
import ReportSpot from './ReportSpot';
import { Player } from './Human';
import { playerInput } from './playerInput';
import {
  ROOM_ORDER,
  ROOM_CENTERS,
  ROOM_LABELS,
  ROOM_KIND,
  ROOM_SIZE,
  DOOR_Z,
  REPORT_SPOTS,
  buildDeviceLayout,
} from './layout';

const devicePositions = buildDeviceLayout();

// Invisible hit-plane spanning all rooms' floors. A clean click/tap
// (not an orbit drag — e.delta is the pixels moved since pointerdown)
// sets the player's walk-to destination.
const FLOOR_SPAN_X =
  ROOM_CENTERS[ROOM_ORDER.at(-1)][0] - ROOM_CENTERS[ROOM_ORDER[0]][0] + ROOM_SIZE.width;

function TapToMoveFloor() {
  return (
    <mesh
      visible={false}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onClick={(e) => {
        if (e.delta > 6) return; // was a camera drag, not a tap
        playerInput.target = [e.point.x, e.point.z];
      }}
    >
      <planeGeometry args={[FLOOR_SPAN_X, ROOM_SIZE.depth]} />
    </mesh>
  );
}

export default function Scene() {
  // Only need the id set to decide what to render; each Fan/Light
  // subscribes to its own status independently.
  const deviceIds = useDeviceStore((state) => Object.keys(state.devices));

  return (
    <Canvas shadows camera={{ position: [0, 8.5, 12.5], fov: 42 }}>
      {/* cool urban haze — matches the paved plaza and glass towers */}
      <color attach="background" args={['#dbe3ea']} />
      <fog attach="fog" args={['#dbe3ea', 26, 58]} />

      <Sky sunPosition={[10, 6, 8]} turbidity={4} rayleigh={1.2} mieCoefficient={0.01} mieDirectionalG={0.9} />

      <ambientLight intensity={0.55} color="#f2f6fb" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.9}
        color="#fff6e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#e8f0f7', '#9aa5b0', 0.4]} />

      <OrbitControls
        enablePan={false}
        target={[0, 0.7, 0]}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={7}
        maxDistance={30}
      />

      <Outdoors />

      {ROOM_ORDER.map((room) => (
        <RoomShell
          key={room}
          room={room}
          center={ROOM_CENTERS[room]}
          label={ROOM_LABELS[room]}
          kind={ROOM_KIND[room]}
        />
      ))}

      <TapToMoveFloor />

      {ROOM_ORDER.map((room) => (
        <ReportSpot key={`report-${room}`} room={room} position={REPORT_SPOTS[room]} />
      ))}

      {/* isolated from the rooms: the player's model load (or a slow font
          fetch elsewhere) should never be able to blank the other */}
      <Suspense fallback={null}>
        <Player start={[0, DOOR_Z]} />
      </Suspense>

      <ContactShadows position={[0, 0.005, 0]} opacity={0.3} scale={22} blur={2} far={2} />

      {deviceIds.map((id) => {
        const position = devicePositions[id];
        if (!position) return null;
        return id.includes('fan') ? (
          <Fan key={id} id={id} position={position} />
        ) : (
          <Light key={id} id={id} position={position} />
        );
      })}
    </Canvas>
  );
}
