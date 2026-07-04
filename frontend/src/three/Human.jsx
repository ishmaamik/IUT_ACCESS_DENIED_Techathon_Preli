// The player's avatar: a low-poly office worker (Kenney "Mini
// Characters", CC0 — see /public/models/License.txt) driven by the user
// via keyboard (WASD / arrows), the on-screen joystick, or tapping a
// spot on the floor. Movement is camera-relative, velocity-smoothed,
// and collides with the room walls (passing only through the doorways).
// The pack ships real "walk" and "idle" clips, so it walks when moving
// and idles when still.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';
import { playerInput } from './playerInput';
import { ROOM_ORDER, ROOM_CENTERS, ROOM_SIZE, DOOR_Z, DOOR_WIDTH } from './layout';

const MODEL_URL = '/models/character-male-a.glb';
const TARGET_HEIGHT = 1.35;
const MOVE_SPEED = 1.6; // units/sec at full stick deflection
const ACCEL = 12; // how quickly velocity chases the input (1/sec)
const TURN_RATE = 10;
const ARRIVE_EPSILON = 0.08;
const CROSSFADE = 0.2;
const BODY_RADIUS = 0.2;

// --- collision geometry, derived from the room layout ------------------
// Every left/right wall is a plane at a fixed x; the only way through is
// the doorway slot around DOOR_Z, which all rooms share.
const HALF_W = ROOM_SIZE.width / 2;
const HALF_D = ROOM_SIZE.depth / 2;
const WALL_X = ROOM_ORDER.flatMap((room) => {
  const cx = ROOM_CENTERS[room][0];
  return [cx - HALF_W, cx + HALF_W];
}).sort((a, b) => a - b);
const DOOR_MIN_Z = DOOR_Z - DOOR_WIDTH / 2 + 0.12;
const DOOR_MAX_Z = DOOR_Z + DOOR_WIDTH / 2 - 0.12;
const X_MIN = WALL_X[0] + BODY_RADIUS;
const X_MAX = WALL_X[WALL_X.length - 1] - BODY_RADIUS;
const Z_MIN = -HALF_D + BODY_RADIUS;
const Z_MAX = HALF_D - BODY_RADIUS;
// The narrow strips between neighbouring rooms (and the wall thickness
// itself): while inside one, z is confined to the doorway slot.
const CORRIDORS = [];
for (let i = 1; i < WALL_X.length - 1; i += 2) {
  CORRIDORS.push([WALL_X[i] - BODY_RADIUS, WALL_X[i + 1] + BODY_RADIUS]);
}

function moveWithCollision(x, z, dx, dz) {
  const inDoorSlot = z >= DOOR_MIN_Z && z <= DOOR_MAX_Z;

  let nx = x + dx;
  if (!inDoorSlot) {
    // Off the doorway line, no wall plane may be approached or crossed.
    for (const w of WALL_X) {
      if (x <= w && nx > w - BODY_RADIUS) nx = w - BODY_RADIUS;
      else if (x >= w && nx < w + BODY_RADIUS) nx = w + BODY_RADIUS;
    }
  }
  nx = THREE.MathUtils.clamp(nx, X_MIN, X_MAX);

  let nz = z + dz;
  const inCorridor = CORRIDORS.some(([a, b]) => nx > a && nx < b);
  if (inCorridor) {
    nz = THREE.MathUtils.clamp(nz, DOOR_MIN_Z, DOOR_MAX_Z);
  } else {
    nz = THREE.MathUtils.clamp(nz, Z_MIN, Z_MAX);
  }
  return [nx, nz];
}

// Scratch vectors reused across frames — no per-frame allocations.
const camForward = new THREE.Vector3();
const camRight = new THREE.Vector3();

export function Player({ start = [0, DOOR_Z] }) {
  const group = useRef();
  const marker = useRef();
  const velocity = useRef({ x: 0, z: 0 });
  const wasMoving = useRef(false);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions } = useAnimations(animations, group);

  const { scale, footOffset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
    return { scale: s, footOffset: -box.min.y * s };
  }, [scene]);

  // Seed the shared position before the first frame so proximity
  // triggers never read a stale [0, 0].
  useEffect(() => {
    playerInput.position[0] = start[0];
    playerInput.position[1] = start[1];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    actions?.idle?.reset().fadeIn(CROSSFADE).play();
    return () => {
      actions?.idle?.stop();
      actions?.walk?.stop();
    };
  }, [actions]);

  // WASD + arrow keys. Held keys live in the shared input object so the
  // frame loop reads them without any React round-trip.
  useEffect(() => {
    const KEYMAP = {
      KeyW: 'forward',
      ArrowUp: 'forward',
      KeyS: 'back',
      ArrowDown: 'back',
      KeyA: 'left',
      ArrowLeft: 'left',
      KeyD: 'right',
      ArrowRight: 'right',
    };
    const setKey = (down) => (event) => {
      const key = KEYMAP[event.code];
      if (!key) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault(); // keep arrows from scrolling the page
      playerInput.keys[key] = down;
      if (down) playerInput.target = null;
    };
    const onDown = setKey(true);
    const onUp = setKey(false);
    const clearAll = () => {
      const { keys } = playerInput;
      keys.forward = keys.back = keys.left = keys.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', clearAll);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', clearAll);
      clearAll();
    };
  }, []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    // --- 1. desired direction in screen space (x right, y down) -------
    const { keys, joystick } = playerInput;
    let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let iy = (keys.back ? 1 : 0) - (keys.forward ? 1 : 0);
    if (joystick.active && (joystick.x || joystick.y)) {
      ix = joystick.x;
      iy = joystick.y;
      playerInput.target = null;
    }

    // --- 2. map to a world-space direction -----------------------------
    let dirX = 0;
    let dirZ = 0;
    let strength = Math.min(1, Math.hypot(ix, iy));
    if (strength > 0.001) {
      // Camera-relative: "up" on the stick/keys walks away from the
      // camera no matter how the view has been orbited.
      state.camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();
      camRight.set(-camForward.z, 0, camForward.x);
      dirX = camRight.x * ix - camForward.x * iy;
      dirZ = camRight.z * ix - camForward.z * iy;
      const len = Math.hypot(dirX, dirZ) || 1;
      dirX /= len;
      dirZ /= len;
    } else if (playerInput.target) {
      const [tx, tz] = playerInput.target;
      const dx = tx - g.position.x;
      const dz = tz - g.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < ARRIVE_EPSILON) {
        playerInput.target = null;
      } else {
        dirX = dx / dist;
        dirZ = dz / dist;
        strength = Math.min(1, dist / 0.3); // ease in on arrival
      }
    } else {
      strength = 0;
    }

    // --- 3. smooth velocity, move with wall collision -------------------
    const blend = 1 - Math.exp(-ACCEL * delta);
    const v = velocity.current;
    v.x += (dirX * MOVE_SPEED * strength - v.x) * blend;
    v.z += (dirZ * MOVE_SPEED * strength - v.z) * blend;
    const speed = Math.hypot(v.x, v.z);

    if (speed > 0.005) {
      const [nx, nz] = moveWithCollision(g.position.x, g.position.z, v.x * delta, v.z * delta);
      g.position.x = nx;
      g.position.z = nz;
    }

    // --- 4. face the direction of travel -------------------------------
    if (speed > 0.05) {
      const targetRotation = Math.atan2(v.x, v.z);
      let turn = targetRotation - g.rotation.y;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      g.rotation.y += turn * Math.min(1, delta * TURN_RATE);
    }

    // --- 5. walk/idle animation blending -------------------------------
    const moving = speed > 0.08;
    if (moving !== wasMoving.current) {
      wasMoving.current = moving;
      if (moving) {
        actions?.idle?.fadeOut(CROSSFADE);
        actions?.walk?.reset().fadeIn(CROSSFADE).play();
      } else {
        actions?.walk?.fadeOut(CROSSFADE);
        actions?.idle?.reset().fadeIn(CROSSFADE).play();
      }
    }
    if (moving) {
      // Leg cadence tracks actual speed so the feet don't slide.
      actions?.walk?.setEffectiveTimeScale(THREE.MathUtils.clamp(speed * 1.1, 0.6, 1.8));
    }

    playerInput.position[0] = g.position.x;
    playerInput.position[1] = g.position.z;

    // --- 6. tap-to-move destination marker ------------------------------
    const m = marker.current;
    if (m) {
      if (playerInput.target) {
        m.visible = true;
        m.position.set(playerInput.target[0], 0.02, playerInput.target[1]);
        m.rotation.z += delta * 2;
      } else {
        m.visible = false;
      }
    }
  });

  return (
    <>
      <group ref={group} position={[start[0], 0, start[1]]} rotation={[0, Math.PI, 0]}>
        <primitive object={scene} scale={scale} position={[0, footOffset, 0]} />
      </group>
      <mesh ref={marker} visible={false} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.2, 32]} />
        <meshBasicMaterial color="#ffd76a" transparent opacity={0.85} />
      </mesh>
    </>
  );
}

useGLTF.preload(MODEL_URL);
