import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Sky } from '@react-three/drei';
import { useDeviceStore } from '../store/useDeviceStore';
import RoomShell from './RoomShell';
import Fan from './Fan';
import Light from './Light';
import Outdoors from './Outdoors';
import { Walker } from './Human';
import { ROOM_ORDER, ROOM_CENTERS, ROOM_LABELS, ROOM_KIND, ROOM_SIZE, buildDeviceLayout } from './layout';

const devicePositions = buildDeviceLayout();

const WALKER_Z = ROOM_SIZE.depth / 2 + 1.1;
const WALKER_X_RANGE = [
  ROOM_CENTERS.drawing[0] - ROOM_SIZE.width / 2 + 0.6,
  ROOM_CENTERS.work2[0] + ROOM_SIZE.width / 2 - 0.6,
];

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

      <Suspense fallback={null}>
        {ROOM_ORDER.map((room) => (
          <RoomShell
            key={room}
            room={room}
            center={ROOM_CENTERS[room]}
            label={ROOM_LABELS[room]}
            kind={ROOM_KIND[room]}
          />
        ))}
        <Walker xRange={WALKER_X_RANGE} z={WALKER_Z} />
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
