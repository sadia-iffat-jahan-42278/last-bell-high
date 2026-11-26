// People walking about: how many turn up, where they appear, where they head next and how they get round things
// and each other. Pure logic (no 3D), so it runs in tests.
import type { Rng } from '../core/util';
import { resolveCollisions, type Bounds, type Collider } from './collision';
import type { Point } from './layout';

/** How much room a person takes up, unless an area says otherwise. */
export const BODY = 0.42;

/** A spot nobody should stop on (a doorway, a counter, the player's chair). People may still walk across it. */
export interface Keep extends Point {
  r: number;
}

/** Where one person may walk. */
export interface WanderArea {
  colliders: readonly Collider[];
  bounds: Bounds;
  body?: number;
  /** Keep within `radius` of this point (someone who stays around their own patch). */
  home?: Point;
  radius?: number;
  avoid?: readonly Keep[];
  /** Extra rule for every step, e.g. "stay on the same floor height as the stage". */
  ok?: (x: number, z: number) => boolean;
}

export interface Wanderer extends Point {
  tx: number;
  tz: number;
  /** Seconds left standing still before choosing somewhere else to go. */
  wait: number;
  speed: number;
  /** Shortest and longest pause on arriving somewhere. */
  pause: [number, number];
  /** How long they have been failing to get closer to the target. */
  stuck: number;
  /** Stopped by someone else (the player came up to talk). */
  held: boolean;
}

/* ---------------------------------------- how many ---------------------------------------- */

export type Busyness = 'busy' | 'quiet' | 'late';

/** [fewest, most] people for each kind of place. */
export const HEADCOUNT = {
  /** Students out on campus. */
  campus: { busy: [8, 14], quiet: [2, 7], late: [0, 3] },
  corridor: { busy: [4, 11], quiet: [1, 5], late: [0, 2] },
  diners: { busy: [5, 11], quiet: [1, 5], late: [0, 2] },
  canteenWalkers: { busy: [2, 5], quiet: [0, 3], late: [0, 1] },
  /** Students still on their feet when you walk into a classroom. */
  latecomers: { busy: [0, 3], quiet: [0, 3], late: [0, 3] },
  /** Extra people strolling round a club room. */
  clubVisitors: { busy: [1, 4], quiet: [0, 2], late: [0, 1] },
} as const satisfies Record<string, Record<Busyness, readonly [number, number]>>;

export const randInt = (rng: Rng, lo: number, hi: number): number => lo + Math.floor(rng() * (hi - lo + 1));
const between = (rng: Rng, lo: number, hi: number): number => lo + rng() * (hi - lo);

export function headCount(place: keyof typeof HEADCOUNT, busy: Busyness, rng: Rng): number {
  const [lo, hi] = HEADCOUNT[place][busy];
  return randInt(rng, lo, hi);
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------------------------------------- where ---------------------------------------- */

/** Could a person's body be at (x, z)? */
export function isClear(area: WanderArea, x: number, z: number): boolean {
  const b = area.bounds;
  if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return false;
  if (area.ok && !area.ok(x, z)) return false;
  const r = (area.body ?? BODY) - 0.02;
  for (const c of area.colliders) {
    if (c.t === 'b') {
      const dx = x - Math.max(c.x0, Math.min(x, c.x1));
      const dz = z - Math.max(c.z0, Math.min(z, c.z1));
      if (dx * dx + dz * dz < r * r) return false;
    } else {
      const min = c.r + r;
      if ((x - c.x) ** 2 + (z - c.z) ** 2 < min * min) return false;
    }
  }
  return true;
}

/** Can someone walk in a straight line from `from` to `to`? */
export function pathClear(area: WanderArea, from: Point, to: Point): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.3));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!isClear(area, from.x + (to.x - from.x) * t, from.z + (to.z - from.z) * t)) return false;
  }
  return true;
}

/** Is (x, z) a reasonable place to stand: clear, on the person's patch and not in anybody's way? */
export function canStop(area: WanderArea, x: number, z: number): boolean {
  if (area.home && Math.hypot(x - area.home.x, z - area.home.z) > (area.radius ?? 0)) return false;
  if (area.avoid?.some((k) => Math.hypot(x - k.x, z - k.z) < k.r)) return false;
  return isClear(area, x, z);
}

/** A random point of the person's patch, or of the whole area. */
function sample(area: WanderArea, rng: Rng): Point {
  if (area.home) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * (area.radius ?? 0);
    return { x: area.home.x + Math.cos(a) * d, z: area.home.z + Math.sin(a) * d };
  }
  const b = area.bounds;
  return { x: between(rng, b.x0, b.x1), z: between(rng, b.z0, b.z1) };
}

/** Not boxed in: there is at least one direction to walk off in. */
function hasWayOut(area: WanderArea, p: Point): boolean {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    if (pathClear(area, p, { x: p.x + Math.cos(a) * 0.8, z: p.z + Math.sin(a) * 0.8 })) return true;
  }
  return false;
}

/** A random free place to appear, at least `gap` from everyone in `others`. */
export function randomSpot(
  area: WanderArea,
  rng: Rng,
  others: readonly Point[] = [],
  gap = 0.9,
): Point | null {
  for (let i = 0; i < 80; i++) {
    const p = sample(area, rng);
    if (!canStop(area, p.x, p.z)) continue;
    if (others.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < gap)) continue;
    if (hasWayOut(area, p)) return p;
  }
  return null;
}

/** Somewhere to walk to from `from` in a straight line: a proper stroll if possible, a few steps if not. */
export function nextTarget(from: Point, area: WanderArea, rng: Rng): Point | null {
  for (let i = 0; i < 48; i++) {
    let p: Point;
    const short = i >= 24;
    if (area.home && !short) p = sample(area, rng);
    else {
      const a = rng() * Math.PI * 2;
      const d = short ? between(rng, 0.4, 2) : between(rng, 2, 13);
      p = { x: from.x + Math.cos(a) * d, z: from.z + Math.sin(a) * d };
    }
    if (canStop(area, p.x, p.z) && pathClear(area, from, p)) return p;
  }
  return null;
}

/* ---------------------------------------- walking ---------------------------------------- */

export function newWanderer(
  at: Point,
  speed: number,
  rng: Rng,
  pause: [number, number] = [0.8, 6],
): Wanderer {
  return {
    x: at.x,
    z: at.z,
    tx: at.x,
    tz: at.z,
    wait: rng() * 3,
    speed,
    pause,
    stuck: 0,
    held: false,
  };
}

/** Advance one person by `dt` seconds. Returns how fast they are walking (0 while standing). */
export function stepWanderer(w: Wanderer, area: WanderArea, rng: Rng, dt: number): number {
  if (w.held || dt <= 0) return 0;
  if (w.wait > 0) {
    w.wait -= dt;
    if (w.wait > 0) return 0;
    const t = nextTarget(w, area, rng);
    if (!t) {
      w.wait = 1 + rng() * 2;
      return 0;
    }
    w.tx = t.x;
    w.tz = t.z;
  }
  const dx = w.tx - w.x;
  const dz = w.tz - w.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.15) {
    w.wait = between(rng, ...w.pause);
    return 0;
  }
  const step = Math.min(d, w.speed * dt);
  w.x += (dx / d) * step;
  w.z += (dz / d) * step;
  resolveCollisions(area.colliders, w, area.body ?? BODY, area.bounds);
  // Something (or someone) is in the way: give up on this target and choose another shortly.
  const gained = d - Math.hypot(w.tx - w.x, w.tz - w.z);
  w.stuck = gained < step * 0.3 ? w.stuck + dt : Math.max(0, w.stuck - dt);
  if (w.stuck > 0.8) {
    w.stuck = 0;
    w.tx = w.x;
    w.tz = w.z;
    w.wait = 0.2 + rng();
    return 0;
  }
  return w.speed;
}

/** Nudge apart people who overlap. Anyone being talked to stays put and the other one gives way. */
export function separate(people: readonly { w: Wanderer; area: WanderArea }[], gap = 0.75): void {
  for (let i = 0; i < people.length; i++)
    for (let j = i + 1; j < people.length; j++) {
      const a = people[i];
      const b = people[j];
      let dx = b.w.x - a.w.x;
      let dz = b.w.z - a.w.z;
      let d = Math.hypot(dx, dz);
      if (d >= gap || (a.w.held && b.w.held)) continue;
      if (d < 1e-4) {
        dx = 1;
        dz = 0;
        d = 1;
      }
      // a gentle push each frame, so they slide past one another instead of jumping
      const push = Math.min(gap - d, 0.05);
      const share = a.w.held || b.w.held ? 1 : 0.5;
      for (const [p, sign] of [
        [a, -1],
        [b, 1],
      ] as const) {
        if (p.w.held) continue;
        p.w.x += (dx / d) * push * share * sign;
        p.w.z += (dz / d) * push * share * sign;
        resolveCollisions(p.area.colliders, p.w, p.area.body ?? BODY, p.area.bounds);
      }
    }
}
