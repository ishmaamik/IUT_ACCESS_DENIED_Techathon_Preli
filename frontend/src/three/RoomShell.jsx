import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useDeviceStore } from '../store/useDeviceStore';
import { ROOM_SIZE } from './layout';
import { WorkFurniture, LoungeFurniture } from './Furniture';

const WALL_HEIGHT = 1.75;
const WALL_COLOR = '#241f19';
const TRIM_COLOR = '#3a2f22';
const BASE_COLOR = new THREE.Color('#2c2519');
const ALERT_COLOR = new THREE.Color('#7a2f2a');

// Window geometry, shared by every room's back wall.
const WIN_WIDTH = 1.9;
const WIN_SILL = 0.4;
const WIN_TOP = 1.4;

// Door geometry, shared by every room's right-hand wall.
const DOOR_WIDTH = 1.1;
const DOOR_HEIGHT = 1.5;

function Window({ width, depth }) {
  const sideWidth = (width - WIN_WIDTH) / 2;
  return (
    <group position={[0, 0, -depth / 2]}>
      <mesh position={[-(WIN_WIDTH / 2 + sideWidth / 2), WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[sideWidth, WALL_HEIGHT, 0.08]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[WIN_WIDTH / 2 + sideWidth / 2, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[sideWidth, WALL_HEIGHT, 0.08]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[0, WIN_SILL / 2, 0]}>
        <boxGeometry args={[WIN_WIDTH, WIN_SILL, 0.08]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[0, WIN_TOP + (WALL_HEIGHT - WIN_TOP) / 2, 0]}>
        <boxGeometry args={[WIN_WIDTH, WALL_HEIGHT - WIN_TOP, 0.08]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* glass */}
      <mesh position={[0, (WIN_SILL + WIN_TOP) / 2, -0.01]}>
        <planeGeometry args={[WIN_WIDTH - 0.04, WIN_TOP - WIN_SILL - 0.04]} />
        <meshPhysicalMaterial color="#bfe0ee" transparent opacity={0.35} roughness={0.05} metalness={0} />
      </mesh>
      {/* muntins */}
      <mesh position={[0, (WIN_SILL + WIN_TOP) / 2, 0]}>
        <boxGeometry args={[0.03, WIN_TOP - WIN_SILL, 0.05]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      <mesh position={[0, (WIN_SILL + WIN_TOP) / 2, 0]}>
        <boxGeometry args={[WIN_WIDTH, 0.03, 0.05]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>

      {/* a hint of outside — a soft sky-toned backdrop so the window
          doesn't look out onto the void */}
      <mesh position={[0, (WIN_SILL + WIN_TOP) / 2, -0.6]}>
        <planeGeometry args={[WIN_WIDTH + 1.4, 2.2]} />
        <meshBasicMaterial color="#cfe6ea" />
      </mesh>
    </group>
  );
}

function Door({ depth }) {
  const doorZ = depth / 2 - DOOR_WIDTH / 2 - 0.35;
  const frontWidth = depth / 2 - (doorZ + DOOR_WIDTH / 2);
  const backWidth = depth - DOOR_WIDTH - frontWidth;
  const backZ = -depth / 2 + backWidth / 2;
  const frontZ = depth / 2 - frontWidth / 2;

  return (
    <group>
      <mesh position={[0, WALL_HEIGHT / 2, backZ]}>
        <boxGeometry args={[0.08, WALL_HEIGHT, backWidth]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, frontZ]}>
        <boxGeometry args={[0.08, WALL_HEIGHT, frontWidth]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>
      <mesh position={[0, DOOR_HEIGHT + (WALL_HEIGHT - DOOR_HEIGHT) / 2, doorZ]}>
        <boxGeometry args={[0.08, WALL_HEIGHT - DOOR_HEIGHT, DOOR_WIDTH]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* frame trim */}
      <mesh position={[0, DOOR_HEIGHT / 2, doorZ - DOOR_WIDTH / 2 - 0.015]}>
        <boxGeometry args={[0.1, DOOR_HEIGHT, 0.03]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      <mesh position={[0, DOOR_HEIGHT / 2, doorZ + DOOR_WIDTH / 2 + 0.015]}>
        <boxGeometry args={[0.1, DOOR_HEIGHT, 0.03]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>

      {/* door leaf, ajar on a hinge at the back edge of the opening */}
      <group position={[0, 0, doorZ - DOOR_WIDTH / 2]} rotation={[0, -0.55, 0]}>
        <mesh position={[-0.02, DOOR_HEIGHT / 2, DOOR_WIDTH / 2]} castShadow>
          <boxGeometry args={[0.045, DOOR_HEIGHT - 0.02, DOOR_WIDTH - 0.03]} />
          <meshStandardMaterial color="#8a5a3a" />
        </mesh>
        <mesh position={[-0.05, DOOR_HEIGHT / 2, DOOR_WIDTH - 0.12]}>
          <sphereGeometry args={[0.025, 10, 10]} />
          <meshStandardMaterial color="#e8d9a0" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

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
          mixStrength={8}
          roughness={1}
          depthScale={0.15}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          metalness={0.05}
        />
      </mesh>

      {/* back wall, with a window */}
      <Window width={width} depth={depth} />

      {/* left wall, solid */}
      <mesh position={[-width / 2, WALL_HEIGHT / 2, 0]}>
        <boxGeometry args={[0.08, WALL_HEIGHT, depth]} />
        <meshStandardMaterial color={WALL_COLOR} />
      </mesh>

      {/* right wall, with a doorway */}
      <group position={[width / 2, 0, 0]}>
        <Door depth={depth} />
      </group>

      {/* baseboard trim along the back and left walls */}
      <mesh position={[0, 0.04, -depth / 2 + 0.02]}>
        <boxGeometry args={[width, 0.08, 0.02]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>
      <mesh position={[-width / 2 + 0.02, 0.04, 0]}>
        <boxGeometry args={[0.02, 0.08, depth]} />
        <meshStandardMaterial color={TRIM_COLOR} />
      </mesh>

      {kind === 'lounge' ? <LoungeFurniture /> : <WorkFurniture />}

      <Text
        position={[0, 0.02, depth / 2 - 0.25]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#cdbb90"
        anchorX="center"
      >
        {label}
      </Text>
    </group>
  );
}
