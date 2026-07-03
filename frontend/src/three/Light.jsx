import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDeviceStore } from '../store/useDeviceStore';

const GLOW_RATE = 4; // how quickly the glow eases toward its target
const OFF_COLOR = new THREE.Color('#4b5164'); // dim, reads clearly as "off" under ambient light
const ON_COLOR = new THREE.Color('#fff6d8');

export default function Light({ id, position }) {
  const bulbMaterial = useRef();
  const pointLight = useRef();
  const intensity = useRef(0);
  const isOn = useDeviceStore((state) => state.devices[id]?.status ?? false);

  useFrame((_, delta) => {
    const target = isOn ? 1 : 0;
    intensity.current = THREE.MathUtils.lerp(intensity.current, target, Math.min(1, delta * GLOW_RATE));

    if (bulbMaterial.current) {
      bulbMaterial.current.emissiveIntensity = intensity.current * 2.2;
      bulbMaterial.current.color.copy(OFF_COLOR).lerp(ON_COLOR, intensity.current);
    }
    if (pointLight.current) pointLight.current.intensity = intensity.current * 1.4;
  });

  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial
          ref={bulbMaterial}
          color={OFF_COLOR}
          emissive="#ffe58a"
          emissiveIntensity={0}
        />
      </mesh>
      <pointLight ref={pointLight} position={[0, 1.3, 0]} color="#ffe9b0" distance={3.5} intensity={0} />
    </group>
  );
}
