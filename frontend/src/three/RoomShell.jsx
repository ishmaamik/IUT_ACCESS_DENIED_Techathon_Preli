import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useDeviceStore } from '../store/useDeviceStore';
import { ROOM_SIZE } from './layout';
import { WorkFurniture, LoungeFurniture } from './Furniture';

const WALL_HEIGHT = 1.5;
const BASE_COLOR = new THREE.Color('#1b2230');
const ALERT_COLOR = new THREE.Color('#3a1418');

export default function RoomShell({ room, center, label, kind }) {
  const [cx, cy, cz] = center;
  const { width, depth } = ROOM_SIZE;
  const floorMaterial = useRef();
  const pulse = useRef(0);

  const hasAlert = useDeviceStore((state) => state.alerts.some((a) => a.room === room));

  useFrame((frameState, delta) => {
    if (!floorMaterial.current) return;
    const target = hasAlert ? 0.55 + 0.25 * Math.sin(frameState.clock.elapsedTime * 4) : 0;
    pulse.current = THREE.MathUtils.lerp(pulse.current, target, Math.min(1, delta * 3));
    floorMaterial.current.color.copy(BASE_COLOR).lerp(ALERT_COLOR, Math.max(0, pulse.current));
  });

  return (
    <group position={[cx, cy, cz]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <MeshReflectorMaterial
          ref={floorMaterial}
          color={BASE_COLOR}
          blur={[300, 100]}
          resolution={512}
          mixBlur={1}
          mixStrength={15}
          roughness={1}
          depthScale={0.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[0, WALL_HEIGHT / 2, -depth / 2]}>
        <boxGeometry args={[width, WALL_HEIGHT, 0.08]} />
        <meshStandardMaterial color="#2a3244" />
      </mesh>
      <mesh position={[-width / 2, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.08, WALL_HEIGHT, depth]} />
        <meshStandardMaterial color="#2a3244" />
      </mesh>
      <mesh position={[width / 2, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.08, WALL_HEIGHT, depth]} />
        <meshStandardMaterial color="#2a3244" />
      </mesh>

      {kind === 'lounge' ? <LoungeFurniture /> : <WorkFurniture />}

      <Text
        position={[0, 0.02, depth / 2 - 0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#7d8db3"
        anchorX="center"
      >
        {label}
      </Text>
    </group>
  );
}
