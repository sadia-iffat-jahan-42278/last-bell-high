import { describe, expect, it } from 'vitest';
import { buildCampusGeometry } from '../src/render/campus';
import { resolveCollisions, type Collider } from '../src/world/collision';
import { BOUNDS, BUILDINGS, CATS, CROWD_POINTS, HANGOUTS, START, STARS, ZONES } from '../src/world/layout';
import { lightAt } from '../src/world/lighting';

const campus = buildCampusGeometry();

/** True if a circle of radius `r` at (x, z) overlaps any collider. */
function blocked(colliders: Collider[], x: number, z: number, r = 0.48): Collider | undefined {
  return colliders.find((c) => {
    if (c.t === 'c') return Math.hypot(x - c.x, z - c.z) < c.r + r - 1e-6;
    const cx = Math.max(c.x0, Math.min(x, c.x1));
    const cz = Math.max(c.z0, Math.min(z, c.z1));
    return Math.hypot(x - cx, z - cz) < r - 1e-6;
  });
}

describe('campus geometry', () => {
  it('builds non-empty, finite geometry for every layer', () => {
    for (const [name, g] of Object.entries({
      ground: campus.ground,
      solid: campus.solid,
      windows: campus.windows,
      lamps: campus.lamps,
    })) {
      const pos = g.getAttribute('position');
      expect(pos.count, name).toBeGreaterThan(0);
      expect(pos.count % 3, `${name} is a triangle list`).toBe(0);
      for (const attr of ['position', 'normal', 'color']) {
        const a = g.getAttribute(attr);
        expect(a, `${name}.${attr}`).toBeDefined();
        expect(a.count, `${name}.${attr} count`).toBe(pos.count);
        expect(
          a.array.every((v) => Number.isFinite(v)),
          `${name}.${attr} finite`,
        ).toBe(true);
      }
    }
  });

  it('produces normals of unit length (or zero for degenerate triangles)', () => {
    const n = campus.solid.getAttribute('normal');
    let bad = 0;
    for (let i = 0; i < n.count; i++) {
      const len = Math.hypot(n.getX(i), n.getY(i), n.getZ(i));
      if (!(Math.abs(len - 1) < 1e-3 || len === 0)) bad++;
    }
    expect(bad).toBe(0);
  });

  it('is deterministic (same layout every build)', () => {
    const again = buildCampusGeometry();
    expect(again.solid.getAttribute('position').count).toBe(campus.solid.getAttribute('position').count);
    expect(again.colliders).toEqual(campus.colliders);
  });
});

/** Can the player stand somewhere free within `within` units of (x, z)? */
function reachable(colliders: Collider[], x: number, z: number, within: number): boolean {
  for (let dx = -within; dx <= within; dx += 0.25) {
    for (let dz = -within; dz <= within; dz += 0.25) {
      if (Math.hypot(dx, dz) > within) continue;
      const px = x + dx;
      const pz = z + dz;
      if (px < BOUNDS.x0 || px > BOUNDS.x1 || pz < BOUNDS.z0 || pz > BOUNDS.z1) continue;
      if (!blocked(colliders, px, pz)) return true;
    }
  }
  return false;
}

// Interaction radii used by the game loop (see main.ts): doors 2.9 (main 3.6), friends 2.4, cats 2.2, stars 1.5.
describe('interaction spots are reachable', () => {
  it('spawn point is clear', () => {
    expect(blocked(campus.colliders, START.x, START.z)).toBeUndefined();
  });
  it('the player can get in range of every door and object', () => {
    for (const [id, z] of Object.entries(ZONES)) {
      expect(reachable(campus.colliders, z.x, z.z, id === 'main' ? 3.6 : 2.9), id).toBe(true);
    }
  });
  it('the player can get in range of every friend, star and cat', () => {
    for (const [id, h] of Object.entries(HANGOUTS)) {
      expect(reachable(campus.colliders, h.lunch[0], h.lunch[1], 2.4), `${id} lunch`).toBe(true);
      expect(reachable(campus.colliders, h.after[0], h.after[1], 2.4), `${id} after`).toBe(true);
    }
    STARS.forEach(([x, z], i) => expect(reachable(campus.colliders, x, z, 1.5), `star ${i}`).toBe(true));
    CATS.forEach(([x, z], i) => expect(reachable(campus.colliders, x, z, 2.2), `cat ${i}`).toBe(true));
  });
  it('wandering students can arrive at every crowd waypoint (arrival radius 0.6)', () => {
    CROWD_POINTS.forEach(([x, z], i) => {
      const p = { x, z };
      resolveCollisions(campus.colliders, p, 0.45);
      expect(Math.hypot(p.x - x, p.z - z), `crowd ${i}`).toBeLessThan(0.6);
    });
  });
  it('buildings are solid', () => {
    for (const b of BUILDINGS) {
      expect(blocked(campus.colliders, b.cx, b.cz), `${b.id} body`).toBeDefined();
    }
  });
});

describe('resolveCollisions', () => {
  it('pushes a point out of a box and a circle', () => {
    const cols: Collider[] = [
      { t: 'b', x0: 0, x1: 10, z0: 0, z1: 10 },
      { t: 'c', x: 30, z: 30, r: 2 },
    ];
    const p = { x: 5, z: 5 };
    resolveCollisions(cols, p, 0.5);
    expect(blocked(cols, p.x, p.z, 0.5)).toBeUndefined();
    const q = { x: 30.1, z: 30 };
    resolveCollisions(cols, q, 0.5);
    expect(Math.hypot(q.x - 30, q.z - 30)).toBeGreaterThanOrEqual(2.5 - 1e-6);
    const exact = { x: 30, z: 30 };
    resolveCollisions(cols, exact, 0.5);
    expect(Number.isFinite(exact.x) && Number.isFinite(exact.z)).toBe(true);
  });

  it('keeps the player inside the campus bounds', () => {
    const p = { x: 999, z: -999 };
    resolveCollisions([], p, 0.5);
    expect(p.x).toBe(BOUNDS.x1);
    expect(p.z).toBe(BOUNDS.z0);
  });

  it('cannot walk through any building from outside', () => {
    for (const b of BUILDINGS) {
      const p = { x: b.cx, z: b.cz };
      resolveCollisions(campus.colliders, p, 0.48);
      expect(blocked(campus.colliders, p.x, p.z), b.id).toBeUndefined();
    }
  });
});

describe('time-of-day lighting', () => {
  it('stays finite across the whole day and all weather', () => {
    for (const w of ['sunny', 'cloudy', 'rain'] as const) {
      for (let h = 0; h < 24; h += 0.25) {
        const L = lightAt(h, w);
        const all = [
          ...L.sunCol,
          ...L.sky,
          ...L.ground,
          ...L.skyTop,
          ...L.skyBot,
          ...L.fogCol,
          ...L.toSun,
          L.night,
          L.fogDen,
          L.lamps,
        ];
        expect(
          all.every((v) => Number.isFinite(v)),
          `${w} @${h}`,
        ).toBe(true);
        expect(Math.hypot(...L.toSun)).toBeCloseTo(1, 5);
      }
    }
  });

  it('is dark with lamps on at night, bright with lamps off at noon', () => {
    const night = lightAt(23);
    const noon = lightAt(12.5);
    expect(night.night).toBe(1);
    expect(night.lamps).toBe(1);
    expect(noon.night).toBe(0);
    expect(noon.lamps).toBe(0);
    expect(noon.toSun[1]).toBeGreaterThan(0.5);
  });

  it('rain thickens the fog and dims the sun', () => {
    const sunny = lightAt(12.5, 'sunny');
    const rain = lightAt(12.5, 'rain');
    expect(rain.fogDen).toBeGreaterThan(sunny.fogDen);
    expect(rain.sunCol[0]).toBeLessThan(sunny.sunCol[0]);
  });
});
