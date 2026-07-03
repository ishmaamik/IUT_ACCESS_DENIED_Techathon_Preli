// A single low-poly office worker (Kenney "Mini Characters", CC0 — see
// /public/models/License.txt) that patrols the walkway in front of the
// rooms. The pack ships a real "walk" clip, so it actually walks rather
// than just standing there — one figure only, kept small so it never
// blocks a light fixture.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/character-male-a.glb';
const TARGET_HEIGHT = 1.15;
const WALK_SPEED = 0.55;
const TURN_RATE = 4;

export function Walker({ xRange, z }) {
  const group = useRef();
  const direction = useRef(1);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);

  const { scale, footOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    return { scale: s, footOffset: -box.min.y * s };
  }, [scene]);

  useEffect(() => {
    const walk = actions?.walk;
    walk?.reset().play();
    return () => walk?.stop();
  }, [actions]);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;

    g.position.x += direction.current * WALK_SPEED * delta;
    if (g.position.x > xRange[1]) direction.current = -1;
    else if (g.position.x < xRange[0]) direction.current = 1;

    const targetRotation = direction.current > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, targetRotation, Math.min(1, delta * TURN_RATE));
  });

  return (
    <group ref={group} position={[xRange[0], 0, z]}>
      <primitive object={scene} scale={scale} position={[0, footOffset, 0]} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
