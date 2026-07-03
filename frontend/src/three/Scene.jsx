import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows } from '@react-three/drei';
import { useDeviceStore } from '../store/useDeviceStore';
import RoomShell from './RoomShell';
import Fan from './Fan';
import Light from './Light';
import { ROOM_ORDER, ROOM_CENTERS, ROOM_LABELS, ROOM_KIND, buildDeviceLayout } from './layout';

const devicePositions = buildDeviceLayout();

export default function Scene() {
  // Only need the id set to decide what to render; each Fan/Light
  // subscribes to its own status independently.
  const deviceIds = useDeviceStore((state) => Object.keys(state.devices));

  return (
    <Canvas shadows camera={{ position: [0, 12.5, 12.5], fov: 40 }}>
      <color attach="background" args={['#0b0e14']} />
      <fog attach="fog" args={['#0b0e14', 16, 32]} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[6, 10, 4]} intensity={0.5} castShadow />

      <OrbitControls
        enablePan={false}
        minPolarAngle={Math.PI / 4.5}
        maxPolarAngle={Math.PI / 2.3}
        minDistance={11}
        maxDistance={24}
      />

      {ROOM_ORDER.map((room) => (
        <RoomShell
          key={room}
          room={room}
          center={ROOM_CENTERS[room]}
          label={ROOM_LABELS[room]}
          kind={ROOM_KIND[room]}
        />
      ))}

      <ContactShadows position={[0, 0.005, 0]} opacity={0.35} scale={16} blur={2} far={2} />

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
