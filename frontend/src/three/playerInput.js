// Shared, mutable input state for the player character. Written by the
// keyboard listeners (Human.jsx), the on-screen joystick (Joystick.jsx)
// and the floor's tap handler (Scene.jsx); read every frame inside
// useFrame. Deliberately kept outside React state: input changes many
// times per second and must never cause re-renders — that's what made
// movement feel laggy.
export const playerInput = {
  keys: { forward: false, back: false, left: false, right: false },
  // Screen-space stick deflection, each axis -1..1 (x right, y down).
  joystick: { x: 0, y: 0, active: false },
  // [x, z] click/tap-to-move destination, or null. Cleared as soon as
  // the keyboard or joystick takes over, or on arrival.
  target: null,
};
