import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useDeviceStore } from '../store/useDeviceStore';

const GLOW_RATE = 4; // how quickly the glow eases toward its target
const OFF_COLOR = new THREE.Color('#2c2f3a'); // near-black so "off" reads unmistakably against a dark room
const ON_COLOR = new THREE.Color('#fff6d8');
const CEILING_Y = 1.48;

// Soft radial glow sprite, always facing the camera — this is what makes
// "on" readable at a glance instead of relying on a small bright bulb mesh.
function useGlowTexture() {
  return useMemo(() => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,235,160,0.9)');
    gradient.addColorStop(0.4, 'rgba(255,223,130,0.45)');
    gradient.addColorStop(1, 'rgba(255,223,130,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);
}

export default function Light({ id, position }) {
  const bulbMaterial = useRef();
  const shadeMaterial = useRef();
  const pointLight = useRef();
  const glowSprite = useRef();
  const intensity = useRef(0);
  const isOn = useDeviceStore((state) => state.devices[id]?.status ?? false);
  const glowTexture = useGlowTexture();

  useFrame((_, delta) => {
    const target = isOn ? 1 : 0;
    intensity.current = THREE.MathUtils.lerp(intensity.current, target, Math.min(1, delta * GLOW_RATE));

    if (bulbMaterial.current) {
      bulbMaterial.current.emissiveIntensity = intensity.current * 3;
      bulbMaterial.current.color.copy(OFF_COLOR).lerp(ON_COLOR, intensity.current);
    }
    if (shadeMaterial.current) {
      shadeMaterial.current.emissiveIntensity = intensity.current * 1.3;
    }
    if (pointLight.current) pointLight.current.intensity = intensity.current * 3.2;
    if (glowSprite.current) {
      glowSprite.current.material.opacity = intensity.current;
      const scale = 0.55 + intensity.current * 0.25;
      glowSprite.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <group position={position}>
      {/* ceiling mount plate */}
      <mesh position={[0, CEILING_Y, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.02, 16]} />
        <meshStandardMaterial color="#d9cdb0" />
      </mesh>

      {/* drop rod */}
      <mesh position={[0, (CEILING_Y + 1.32) / 2, 0]}>
        <cylinderGeometry args={[0.012, 0.012, CEILING_Y - 1.32, 8]} />
        <meshStandardMaterial color="#b9ac8b" />
      </mesh>

      {/* conical shade, open end down, catching the bulb's glow */}
      <mesh position={[0, 1.34, 0]}>
        <coneGeometry args={[0.22, 0.16, 24, 1, true]} />
        <meshStandardMaterial
          ref={shadeMaterial}
          color="#efe4cb"
          emissive="#ffdf9e"
          emissiveIntensity={0}
          side={THREE.DoubleSide}
          roughness={0.6}
        />
      </mesh>

      {/* bulb, recessed just inside the shade's mouth */}
      <mesh position={[0, 1.24, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          ref={bulbMaterial}
          color={OFF_COLOR}
          emissive="#ffe58a"
          emissiveIntensity={0}
        />
      </mesh>

      {/* camera-facing glow halo, the main "this light is on" signal */}
      <sprite ref={glowSprite} position={[0, 1.24, 0]} scale={[0.55, 0.55, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <pointLight ref={pointLight} position={[0, 1.24, 0]} color="#ffe9b0" distance={4.5} intensity={0} />
    </group>
  );
}
