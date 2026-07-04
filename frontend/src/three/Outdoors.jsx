// Fills the space around the office block so the view past the windows
// and beyond the room cluster reads as a modern business district —
// paved plaza, hedge planters, street lamps, benches, a road with a few
// parked cars, and a skyline of glass office towers fading into the fog.

const FLOOR_H = 0.85;

// A simple office tower: a matte core with a slightly-oversized glass
// band per floor, so every face reads as ribbon windows from any orbit
// angle without needing textures.
function Tower({ position, width = 3, depth = 3, floors = 6, color = '#8ea3b5', rotation = 0 }) {
  const height = floors * FLOOR_H;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      {Array.from({ length: floors }, (_, i) => (
        <mesh key={i} position={[0, i * FLOOR_H + FLOOR_H * 0.55, 0]}>
          <boxGeometry args={[width + 0.06, FLOOR_H * 0.42, depth + 0.06]} />
          <meshStandardMaterial color="#2b4356" roughness={0.15} metalness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, height + 0.06, 0]}>
        <boxGeometry args={[width * 0.96, 0.12, depth * 0.96]} />
        <meshStandardMaterial color="#5b6875" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Concrete planter with a trimmed hedge — the office-campus stand-in for
// the old pine trees.
function Planter({ position, width = 1.6 }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <boxGeometry args={[width, 0.36, 0.6]} />
        <meshStandardMaterial color="#aab2ba" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[width - 0.16, 0.34, 0.44]} />
        <meshStandardMaterial color="#5d7d52" roughness={1} />
      </mesh>
    </group>
  );
}

function StreetLamp({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.1, 10]} />
        <meshStandardMaterial color="#3d454e" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 2.1, 8]} />
        <meshStandardMaterial color="#3d454e" roughness={0.6} metalness={0.4} />
      </mesh>
      <mesh position={[0, 2.18, 0]}>
        <sphereGeometry args={[0.09, 12, 12]} />
        <meshStandardMaterial color="#fdf3d0" emissive="#f4e3a0" emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function Bench({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[1.1, 0.06, 0.36]} />
        <meshStandardMaterial color="#8a6a48" roughness={0.9} />
      </mesh>
      {[-0.42, 0.42].map((x) => (
        <mesh key={x} position={[x, 0.11, 0]}>
          <boxGeometry args={[0.06, 0.22, 0.3]} />
          <meshStandardMaterial color="#4a525b" roughness={0.7} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// Low-poly parked car: body + cabin, enough at plaza distance.
function Car({ position, color, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.22, 0]} castShadow>
        <boxGeometry args={[1.7, 0.34, 0.78]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[-0.08, 0.5, 0]} castShadow>
        <boxGeometry args={[0.9, 0.28, 0.7]} />
        <meshStandardMaterial color="#22303c" roughness={0.15} metalness={0.5} />
      </mesh>
      {[[-0.55, 0.32], [0.55, 0.32], [-0.55, -0.32], [0.55, -0.32]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.14, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.1, 12]} />
          <meshStandardMaterial color="#1c2126" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Skyline ring: mostly behind and beside the office (the camera starts
// on +z looking in), with a couple of far towers on the camera side so
// orbiting all the way around still shows a district, not a void.
const TOWERS = [
  { position: [-17, 0, -13], width: 3.6, depth: 3.2, floors: 7, color: '#8ea3b5' },
  { position: [-9, 0, -15], width: 2.8, depth: 2.8, floors: 5, color: '#9db0bf', rotation: 0.2 },
  { position: [-1.5, 0, -16], width: 3.4, depth: 3, floors: 8, color: '#87552e' },
  { position: [6, 0, -14.5], width: 2.6, depth: 2.6, floors: 6, color: '#9db0bf', rotation: -0.15 },
  { position: [14, 0, -13], width: 3.8, depth: 3.4, floors: 7, color: '#8ea3b5', rotation: 0.1 },
  { position: [22, 0, -7], width: 3, depth: 3, floors: 5, color: '#a3b2c0' },
  { position: [-22, 0, -5], width: 3.2, depth: 3, floors: 6, color: '#a3b2c0', rotation: 0.3 },
  { position: [-26, 0, 9], width: 3.4, depth: 3.2, floors: 5, color: '#9db0bf' },
  { position: [27, 0, 11], width: 3.6, depth: 3.2, floors: 6, color: '#8ea3b5', rotation: -0.2 },
];

const PLANTERS = [
  { position: [-10.6, 0, 3.4], width: 2 },
  { position: [-4.6, 0, 5.4], width: 1.6 },
  { position: [1.8, 0, 5.4], width: 1.6 },
  { position: [8, 0, 5.4], width: 1.6 },
  { position: [11, 0, 2.2], width: 1.8 },
  { position: [-11, 0, -2.8], width: 1.8 },
  { position: [11.2, 0, -3.2], width: 1.8 },
];

const LAMPS = [
  [-7.8, 0, 6.4],
  [4.8, 0, 6.4],
  [-12.2, 0, 0.6],
  [12.4, 0, 0.2],
  [-2, 0, -7.6],
  [7, 0, -7.6],
];

const BENCHES = [
  { position: [-1.6, 0, 6.2], rotation: Math.PI },
  { position: [-6.4, 0, -6.9], rotation: 0 },
];

const CARS = [
  { position: [-6, 0, -10.4], color: '#c8cdd3' },
  { position: [-2.6, 0, -10.4], color: '#4a606f' },
  { position: [3.2, 0, -10.4], color: '#7a3b34' },
  { position: [9.4, 0, -10.4], color: '#37404a' },
];

export default function Outdoors() {
  return (
    <group>
      {/* concrete plaza */}
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#c3c9cf" roughness={1} />
      </mesh>

      {/* darker paved apron directly around the office block */}
      <mesh position={[0, -0.012, 0.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[23.5, 8.4]} />
        <meshStandardMaterial color="#aeb5bd" roughness={1} />
      </mesh>

      {/* entrance walkway out from the right doorway */}
      <mesh position={[9.1 + 0.7, 0.004, 1.4]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.4, 3.2]} />
        <meshStandardMaterial color="#98a1aa" roughness={1} />
      </mesh>

      {/* road behind the building, with lane dashes and parked cars */}
      <mesh position={[0, -0.008, -9.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 3.4]} />
        <meshStandardMaterial color="#4c525a" roughness={1} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[-32 + i * 5, -0.004, -9.6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 0.12]} />
          <meshStandardMaterial color="#d8dce0" roughness={1} />
        </mesh>
      ))}

      {TOWERS.map((t, i) => (
        <Tower key={i} {...t} />
      ))}
      {PLANTERS.map((p, i) => (
        <Planter key={i} {...p} />
      ))}
      {LAMPS.map((p, i) => (
        <StreetLamp key={i} position={p} />
      ))}
      {BENCHES.map((b, i) => (
        <Bench key={i} {...b} />
      ))}
      {CARS.map((c, i) => (
        <Car key={i} {...c} />
      ))}
    </group>
  );
}
