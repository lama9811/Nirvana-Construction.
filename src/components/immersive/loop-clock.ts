/* ============================================================
   loop-clock — plays a scene's progress like a background video:
   from → to, hold, to → from, hold, repeat. Ping-pong, so the loop
   never jump-cuts. Pure; unit-tested. The scenes' own damping adds
   the easing, so the ramps here are linear.
   ============================================================ */

export interface Loop {
  from: number;
  to: number;
  /* seconds */
  up: number;
  holdHi: number;
  down: number;
  holdLo: number;
}

export const cycleLength = (l: Loop) => l.up + l.holdHi + l.down + l.holdLo;

export function pingPong(t: number, l: Loop): number {
  const c = cycleLength(l);
  let x = ((t % c) + c) % c;
  if (x < l.up) return l.from + (l.to - l.from) * (x / l.up);
  x -= l.up;
  if (x < l.holdHi) return l.to;
  x -= l.holdHi;
  if (x < l.down) return l.to - (l.to - l.from) * (x / l.down);
  return l.from;
}
