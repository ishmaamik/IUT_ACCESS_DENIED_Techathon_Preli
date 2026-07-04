// Round on-screen joystick (bottom-left of the scene), like a mobile
// game's movement pad. Works with touch and mouse via pointer events.
// The knob position is written straight to the DOM and the deflection
// straight into `playerInput` — no React state per move, so dragging it
// never causes re-renders or lag.

import { useEffect, useRef } from 'react';
import { playerInput } from '../three/playerInput';

const TRAVEL = 40; // max knob travel from center, px

export default function Joystick() {
  const baseRef = useRef(null);
  const knobRef = useRef(null);
  const pointerId = useRef(null);

  useEffect(() => {
    const base = baseRef.current;
    const knob = knobRef.current;
    if (!base || !knob) return;

    const setStick = (x, y, active) => {
      knob.style.transform = `translate(${x}px, ${y}px)`;
      playerInput.joystick.x = x / TRAVEL;
      playerInput.joystick.y = y / TRAVEL;
      playerInput.joystick.active = active;
      if (active) playerInput.target = null;
    };

    const updateFromPointer = (event) => {
      const rect = base.getBoundingClientRect();
      let dx = event.clientX - (rect.left + rect.width / 2);
      let dy = event.clientY - (rect.top + rect.height / 2);
      const len = Math.hypot(dx, dy);
      if (len > TRAVEL) {
        dx = (dx / len) * TRAVEL;
        dy = (dy / len) * TRAVEL;
      }
      setStick(dx, dy, true);
    };

    const onDown = (event) => {
      if (pointerId.current !== null) return;
      pointerId.current = event.pointerId;
      base.setPointerCapture(event.pointerId);
      base.classList.add('joystick--active');
      updateFromPointer(event);
      event.preventDefault();
    };
    const onMove = (event) => {
      if (event.pointerId !== pointerId.current) return;
      updateFromPointer(event);
    };
    const onUp = (event) => {
      if (event.pointerId !== pointerId.current) return;
      pointerId.current = null;
      base.classList.remove('joystick--active');
      setStick(0, 0, false);
    };

    base.addEventListener('pointerdown', onDown);
    base.addEventListener('pointermove', onMove);
    base.addEventListener('pointerup', onUp);
    base.addEventListener('pointercancel', onUp);
    return () => {
      base.removeEventListener('pointerdown', onDown);
      base.removeEventListener('pointermove', onMove);
      base.removeEventListener('pointerup', onUp);
      base.removeEventListener('pointercancel', onUp);
      setStick(0, 0, false);
    };
  }, []);

  return (
    <div className="joystick" ref={baseRef} aria-label="Movement joystick">
      <div className="joystick-ring" />
      <div className="joystick-knob" ref={knobRef} />
    </div>
  );
}
