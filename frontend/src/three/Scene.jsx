import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sky } from '@react-three/drei';
import { useDeviceStore } from '../store/useDeviceStore';
import RoomShell from './RoomShell';
import Fan from './Fan';
import Light from './Light';
import Outdoors from './Outdoors';
import { Walker } from './Human';
import {
  ROOM_ORDER,
  ROOM_CENTERS,
  ROOM_LABELS,
  ROOM_KIND,
  ROOM_SIZE,
  DOOR_Z,
  buildDeviceLayout,
} from './layout';

const devicePositions = buildDeviceLayout();

// A path that walks in through one room's doorway, loops around the back
// of the room (clear of the desks/furniture in the middle), and out the
// far doorway into the next room — repeated across all three rooms, with
// a short stretch outside each end. The walker ping-pongs along this same
// list forever.
const HALF_WIDTH = ROOM_SIZE.width / 2;
const BACK_Z = -ROOM_SIZE.depth / 2 + 0.7;
const WALKER_PATH = ROOM_ORDER.flatMap((room, i) => {
  const cx = ROOM_CENTERS[room][0];
  const leftDoorX = cx - HALF_WIDTH + 0.4;
  const rightDoorX = cx + HALF_WIDTH - 0.4;
  const points = [
    [leftDoorX, DOOR_Z], // just inside the left doorway
    [leftDoorX, BACK_Z], // back-left corner, hugging the side wall
    [rightDoorX, BACK_Z], // across the back of the room
    [rightDoorX, DOOR_Z], // just inside the right doorway
  ];
  return i === 0 ? [[cx - HALF_WIDTH - 1, DOOR_Z], ...points] : points;
}).concat([[ROOM_CENTERS[ROOM_ORDER.at(-1)][0] + HALF_WIDTH + 1, DOOR_Z]]);

export default function Scene() {
  // Only need the id set to decide what to render; each Fan/Light
  // subscribes to its own status independently.
  const deviceIds = useDeviceStore((state) => Object.keys(state.devices));

  return (
    <Canvas shadows camera={{ position: [0, 16, 17], fov: 42 }}>
      <color attach="background" args={['#f3e6c8']} />
      <fog attach="fog" args={['#f3e6c8', 26, 58]} />

      <Sky sunPosition={[10, 6, 8]} turbidity={4} rayleigh={1.2} mieCoefficient={0.01} mieDirectionalG={0.9} />

      <ambientLight intensity={0.55} color="#fff3dd" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.9}
        color="#fff2d6"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <hemisphereLight args={['#fff3dd', '#cdbb8c', 0.4]} />

      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={14}
        maxDistance={32}
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

      {/* isolated from the rooms: the walker's model load (or a slow font
          fetch elsewhere) should never be able to blank the other */}
      <Suspense fallback={null}>
        <Walker path={WALKER_PATH} />
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
