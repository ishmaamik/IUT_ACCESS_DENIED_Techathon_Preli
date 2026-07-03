// A single low-poly office worker (Kenney "Mini Characters", CC0 — see
// /public/models/License.txt) that patrols through the rooms, in one
// door and out the other, looping back and forth across the whole
// office. The pack ships a real "walk" clip, so it actually walks
// rather than just standing there.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/character-male-a.glb';
const TARGET_HEIGHT = 1.35;
const WALK_SPEED = 0.55;
const TURN_RATE = 4;
const ARRIVE_EPSILON = 0.05;

// `path` is a flat list of [x, z] waypoints; the walker ping-pongs from
// the first to the last and back, continuously, facing the direction of
// travel between each pair.
export function Walker({ path }) {
  const group = useRef();
  const waypointIndex = useRef(1);
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

    const target = path[waypointIndex.current];
    const dx = target[0] - g.position.x;
    const dz = target[1] - g.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < ARRIVE_EPSILON) {
      waypointIndex.current += direction.current;
      if (waypointIndex.current >= path.length) {
        waypointIndex.current = path.length - 2;
        direction.current = -1;
      } else if (waypointIndex.current < 0) {
        waypointIndex.current = 1;
        direction.current = 1;
      }
    } else {
      const step = Math.min(dist, WALK_SPEED * delta);
      g.position.x += (dx / dist) * step;
      g.position.z += (dz / dist) * step;

      const targetRotation = Math.atan2(dx, dz);
      let delta_ = targetRotation - g.rotation.y;
      delta_ = Math.atan2(Math.sin(delta_), Math.cos(delta_));
      g.rotation.y += delta_ * Math.min(1, delta * TURN_RATE);
    }
  });

  return (
    <group ref={group} position={[path[0][0], 0, path[0][1]]}>
      <primitive object={scene} scale={scale} position={[0, footOffset, 0]} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
