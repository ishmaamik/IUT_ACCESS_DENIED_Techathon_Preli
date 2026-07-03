// Low-poly furniture so each room reads as a place, not an empty box.
// Kept to primitives (boxes/cylinders) — silhouette is enough at this
// camera distance and it costs nothing to render 18 devices' worth of scene.
// The one office worker (Human.jsx's Walker) patrols outside instead of
// standing at a desk, so it never blocks a room's light fixture.

function Rug({ position, size = [1.6, 1.2], color = '#b8552f' }) {
  return (
    <mesh position={[position[0], 0.011, position[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Plant({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.14, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.28, 10]} />
        <meshStandardMaterial color="#a86b3c" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[0, 0.42 + i * 0.06, 0]}
          rotation={[0.3, (i * Math.PI) / 2, 0]}
          castShadow
        >
          <coneGeometry args={[0.22 - i * 0.03, 0.4, 6]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#3c6b3f' : '#4b7f4d'} />
        </mesh>
      ))}
    </group>
  );
}

function Desk({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.42, 0]} castShadow>
        <boxGeometry args={[0.9, 0.05, 0.5]} />
        <meshStandardMaterial color="#8a6a4d" />
      </mesh>
      {[
        [-0.4, 0.2, -0.2],
        [0.4, 0.2, -0.2],
        [-0.4, 0.2, 0.2],
        [0.4, 0.2, 0.2],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <boxGeometry args={[0.05, 0.4, 0.05]} />
          <meshStandardMaterial color="#3f3a35" />
        </mesh>
      ))}
    </group>
  );
}

function Chair({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.32, 0.06, 0.32]} />
        <meshStandardMaterial color="#2f3546" />
      </mesh>
      <mesh position={[0, 0.42, -0.15]}>
        <boxGeometry args={[0.32, 0.36, 0.05]} />
        <meshStandardMaterial color="#2f3546" />
      </mesh>
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.2, 8]} />
        <meshStandardMaterial color="#1b1e28" />
      </mesh>
    </group>
  );
}

export function WorkFurniture() {
  return (
    <>
      <Rug position={[0, 0, 0.3]} size={[4.6, 3]} color="#c98a4b" />
      <Desk position={[-1.05, 0, 0.1]} />
      <Chair position={[-1.05, 0, 0.55]} rotation={Math.PI} />
      <Desk position={[1.05, 0, 0.1]} />
      <Chair position={[1.05, 0, 0.55]} rotation={Math.PI} />
      <Plant position={[2.35, 0, -1.75]} />
      <Plant position={[-2.35, 0, 1.75]} />
    </>
  );
}

export function LoungeFurniture() {
  return (
    <group>
      <Rug position={[-0.4, 0, -0.1]} size={[3.4, 2.6]} color="#a8452f" />
      <mesh position={[-1.35, 0.22, -0.3]} castShadow>
        <boxGeometry args={[0.5, 0.44, 1.4]} />
        <meshStandardMaterial color="#5c4a3f" />
      </mesh>
      <mesh position={[-1.1, 0.5, -0.3]} castShadow>
        <boxGeometry args={[0.12, 0.3, 1.4]} />
        <meshStandardMaterial color="#6b5748" />
      </mesh>
      <mesh position={[0.2, 0.2, -0.1]} castShadow>
        <boxGeometry args={[0.7, 0.05, 0.4]} />
        <meshStandardMaterial color="#3f3a35" />
      </mesh>
      <mesh position={[0.2, 0.08, -0.1]}>
        <cylinderGeometry args={[0.03, 0.03, 0.16, 8]} />
        <meshStandardMaterial color="#1b1e28" />
      </mesh>
      <Plant position={[-2.5, 0, 1.85]} />
      <Plant position={[2.4, 0, -1.85]} />
    </group>
  );
}
