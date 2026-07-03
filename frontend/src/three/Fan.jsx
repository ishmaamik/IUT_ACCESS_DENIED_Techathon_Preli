import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useDeviceStore } from '../store/useDeviceStore';

const MAX_SPEED = 7; // rad/s when running
const EASE_RATE = 2; // how quickly speed approaches its target

export default function Fan({ id, position }) {
  const bladeGroup = useRef();
  const currentSpeed = useRef(0);
  const isOn = useDeviceStore((state) => state.devices[id]?.status ?? false);

  useFrame((_, delta) => {
    const targetSpeed = isOn ? MAX_SPEED : 0;
    currentSpeed.current += (targetSpeed - currentSpeed.current) * Math.min(1, delta * EASE_RATE);
    if (bladeGroup.current) {
      bladeGroup.current.rotation.y += currentSpeed.current * delta;
    }
  });

  const hubColor = isOn ? '#ffb703' : '#666e7d';

  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 1.1, 8]} />
        <meshStandardMaterial color="#4a5468" />
      </mesh>

      <group ref={bladeGroup} position={[0, 1.15, 0]}>
        <mesh>
          <sphereGeometry args={[0.09, 12, 12]} />
          <meshStandardMaterial color={hubColor} emissive={hubColor} emissiveIntensity={isOn ? 0.5 : 0} />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[0.3, 0, 0]}>
            <boxGeometry args={[0.6, 0.03, 0.16]} />
            <meshStandardMaterial color="#c7cdd9" />
          </mesh>
        ))}
      </group>
    </group>
  );
}
