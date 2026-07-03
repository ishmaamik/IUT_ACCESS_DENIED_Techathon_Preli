import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDeviceStore } from '../store/useDeviceStore';

const MAX_SPEED = 14; // rad/s when running — fast enough to read as "on" but still watchable
const EASE_RATE = 2.4; // how quickly speed approaches its target
const BLUR_THRESHOLD = 11; // rad/s above which blades give way to a blur disc

// A single tapered blade profile (wide at the hub, curved to a point at the
// tip) built once and reused by all three blades on every fan instance.
function useBladeGeometry() {
  return useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.07);
    shape.quadraticCurveTo(0.32, -0.1, 0.52, -0.015);
    shape.quadraticCurveTo(0.58, 0, 0.52, 0.015);
    shape.quadraticCurveTo(0.32, 0.1, 0, 0.07);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false });
    geometry.center();
    geometry.translate(0.29, 0, 0);
    return geometry;
  }, []);
}

// Radial-gradient alpha disc, generated once, used to fake motion blur for
// the blades once they're spinning fast enough to no longer read as blades.
function useBlurTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.12, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(210,216,228,0.05)');
    gradient.addColorStop(0.55, 'rgba(210,216,228,0.5)');
    gradient.addColorStop(1, 'rgba(210,216,228,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

export default function Fan({ id, position }) {
  const bladeGroup = useRef();
  const blurMaterial = useRef();
  const currentSpeed = useRef(0);
  const isOn = useDeviceStore((state) => state.devices[id]?.status ?? false);
  const bladeGeometry = useBladeGeometry();
  const blurTexture = useBlurTexture();
  const bladesMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f4f6fa',
        emissive: '#9aa3b5',
        emissiveIntensity: 0.35,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    [],
  );

  useFrame((_, delta) => {
    const targetSpeed = isOn ? MAX_SPEED : 0;
    currentSpeed.current += (targetSpeed - currentSpeed.current) * Math.min(1, delta * EASE_RATE);
    if (bladeGroup.current) {
      bladeGroup.current.rotation.y += currentSpeed.current * delta;
    }
    const blur = THREE.MathUtils.clamp(
      (currentSpeed.current - BLUR_THRESHOLD) / (MAX_SPEED - BLUR_THRESHOLD),
      0,
      1,
    );
    if (blurMaterial.current) blurMaterial.current.opacity = blur;
    bladesMaterial.opacity = 1 - blur * 0.85;
  });

  const hubColor = isOn ? '#ffb703' : '#c3c9d4';

  return (
    <group position={position}>
      {/* base — light brushed metal so it reads clearly against a dark wall */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.19, 0.04, 20]} />
        <meshStandardMaterial color="#d7dbe3" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* pole, pivoted precisely under the hub so the head reads as
          rotating around its own centre rather than an offset point */}
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.032, 1.1, 10]} />
        <meshStandardMaterial color="#c7cdd8" metalness={0.3} roughness={0.5} />
      </mesh>

      {/* motor housing */}
      <mesh position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.11, 0.16, 16]} />
        <meshStandardMaterial color="#bcc3d0" metalness={0.3} roughness={0.5} />
      </mesh>

      <group position={[0, 1.15, 0]}>
        <group ref={bladeGroup}>
          <mesh>
            <sphereGeometry args={[0.075, 14, 14]} />
            <meshStandardMaterial color={hubColor} emissive={hubColor} emissiveIntensity={isOn ? 0.9 : 0} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh
              key={i}
              geometry={bladeGeometry}
              material={bladesMaterial}
              rotation={[0.3, (i * Math.PI * 2) / 3, 0]}
            />
          ))}
        </group>

        {/* motion-blur disc: fades in as the blades exceed a readable
            spin rate, fades out again as the fan slows or stops */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.62, 32]} />
          <meshBasicMaterial
            ref={blurMaterial}
            map={blurTexture}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
}
