// Fills the space around the office block so the view past the windows
// and beyond the room cluster reads as a courtyard, not a void.

function Tree({ position, scale = 1 }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.09, 0.13, 0.7, 8]} />
        <meshStandardMaterial color="#7a5636" />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.85 + i * 0.32, 0]} castShadow>
          <coneGeometry args={[0.55 - i * 0.12, 0.55, 8]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#4c7a4f' : '#5a8a56'} />
        </mesh>
      ))}
    </group>
  );
}

function Hill({ position, radius, color }) {
  return (
    <mesh position={[position[0], -radius * 0.72, position[1]]}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Path() {
  return (
    <mesh position={[9.1 + 0.7, 0.008, 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.4, 3.2]} />
      <meshStandardMaterial color="#b7a67c" roughness={1} />
    </mesh>
  );
}

const TREES = [
  { position: [-10.4, 0, 3.6], scale: 1.15 },
  { position: [-12, 0, -2.6], scale: 0.95 },
  { position: [10.8, 0, 4.2], scale: 1 },
  { position: [-9.6, 0, -4.4], scale: 1 },
  { position: [-4.4, 0, -6.2], scale: 0.9 },
  { position: [3.8, 0, -6.6], scale: 1 },
  { position: [0.4, 0, -7.2], scale: 1.1 },
  { position: [-7.6, 0, 5.8], scale: 0.95 },
  { position: [7.4, 0, 6.2], scale: 1.05 },
  { position: [-2.2, 0, -6.8], scale: 0.85 },
  { position: [12.6, 0, -1.4], scale: 1.1 },
  { position: [-13.4, 0, 1.2], scale: 1 },
];

const HILLS = [
  { position: [-28, 22], radius: 14, color: '#9fb37e' },
  { position: [30, 18], radius: 16, color: '#93aa74' },
  { position: [4, -30], radius: 18, color: '#a9bd88' },
];

export default function Outdoors() {
  return (
    <group>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#cdbb8c" roughness={1} />
      </mesh>

      <mesh position={[0, -0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[9.6, 15, 48]} />
        <meshStandardMaterial color="#9bb07c" roughness={1} />
      </mesh>

      <Path />

      {HILLS.map((h, i) => (
        <Hill key={i} {...h} />
      ))}

      {TREES.map((tree, i) => (
        <Tree key={i} {...tree} />
      ))}
    </group>
  );
}
