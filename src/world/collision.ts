// 2D collision against the campus' static boxes and circles.
import { BOUNDS, type Point } from './layout';

export type Collider =
  { t: 'b'; x0: number; x1: number; z0: number; z1: number } | { t: 'c'; x: number; z: number; r: number };

/** Push `p` (a circle of radius `r`) out of every collider and keep it inside the campus bounds. */
export function resolveCollisions(colliders: readonly Collider[], p: Point, r: number): void {
  for (let pass = 0; pass < 2; pass++) {
    for (const c of colliders) {
      if (c.t === 'b') {
        const cx = Math.max(c.x0, Math.min(p.x, c.x1));
        const cz = Math.max(c.z0, Math.min(p.z, c.z1));
        const dx = p.x - cx;
        const dz = p.z - cz;
        const d = Math.hypot(dx, dz);
        if (d >= r) continue;
        if (d < 1e-5) {
          // Centre is inside the box: leave along the shortest axis.
          const left = p.x - c.x0;
          const right = c.x1 - p.x;
          const top = p.z - c.z0;
          const bottom = c.z1 - p.z;
          const m = Math.min(left, right, top, bottom);
          if (m === left) p.x = c.x0 - r;
          else if (m === right) p.x = c.x1 + r;
          else if (m === top) p.z = c.z0 - r;
          else p.z = c.z1 + r;
        } else {
          p.x = cx + (dx / d) * r;
          p.z = cz + (dz / d) * r;
        }
      } else {
        const dx = p.x - c.x;
        const dz = p.z - c.z;
        const d = Math.hypot(dx, dz);
        const min = c.r + r;
        if (d < min) {
          if (d < 1e-5) {
            p.x = c.x + min;
            p.z = c.z;
          } else {
            p.x = c.x + (dx / d) * min;
            p.z = c.z + (dz / d) * min;
          }
        }
      }
    }
  }
  p.x = Math.max(BOUNDS.x0, Math.min(BOUNDS.x1, p.x));
  p.z = Math.max(BOUNDS.z0, Math.min(BOUNDS.z1, p.z));
}
