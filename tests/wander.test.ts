import { describe, expect, it } from 'vitest';
import { STUDENTS } from '../src/core/people';
import { mulberry32 } from '../src/core/util';
import { buildCampusGeometry } from '../src/render/campus';
import { createRooms } from '../src/render/rooms';
import type { Collider } from '../src/world/collision';
import { BOUNDS, CROWD_POINTS, GATHERING_SPOTS, STAFF_SPOTS } from '../src/world/layout';
import {
  HEADCOUNT,
  headCount,
  isClear,
  newWanderer,
  randomSpot,
  separate,
  stepWanderer,
  type Busyness,
  type WanderArea,
  type Wanderer,
} from '../src/world/wander';

const campus: WanderArea = { colliders: buildCampusGeometry().colliders, bounds: BOUNDS, body: 0.45 };

/** Walk `count` people about `area` for `seconds`; returns what they did. */
function simulate(area: WanderArea, count: number, seconds: number, seed: number) {
  const rng = mulberry32(seed);
  const people: { w: Wanderer; area: WanderArea; walked: number }[] = [];
  for (let i = 0; i < count; i++) {
    const at = randomSpot(
      area,
      rng,
      people.map((p) => p.w),
    );
    expect(at, `spot for person ${i}`).not.toBeNull();
    people.push({ w: newWanderer(at!, 1.6, rng), area, walked: 0 });
  }
  let inside = 0;
  for (let t = 0; t < seconds; t += 0.05) {
    for (const p of people) {
      const { x, z } = p.w;
      stepWanderer(p.w, area, rng, 0.05);
      p.walked += Math.hypot(p.w.x - x, p.w.z - z);
    }
    separate(people);
    // half a body width of overlap would show as walking through furniture
    for (const p of people) if (!isClear({ ...area, body: 0.2, ok: undefined }, p.w.x, p.w.z)) inside++;
  }
  return { people, inside };
}

describe('how many people turn up', () => {
  it('varies, within the range for the place and time', () => {
    for (const place of Object.keys(HEADCOUNT) as (keyof typeof HEADCOUNT)[]) {
      for (const busy of ['busy', 'quiet', 'late'] as Busyness[]) {
        const rng = mulberry32(9);
        const seen = new Set<number>();
        for (let i = 0; i < 300; i++) seen.add(headCount(place, busy, rng));
        const [lo, hi] = HEADCOUNT[place][busy];
        expect(Math.min(...seen), `${place} ${busy}`).toBe(lo);
        expect(Math.max(...seen), `${place} ${busy}`).toBe(hi);
        expect(seen.size, `${place} ${busy}`).toBe(hi - lo + 1);
      }
    }
  });

  it('never asks for more students than the cast has', () => {
    for (const range of Object.values(HEADCOUNT))
      for (const [, hi] of Object.values(range)) expect(hi).toBeLessThanOrEqual(STUDENTS.length);
    expect(HEADCOUNT.diners.busy[1] + HEADCOUNT.canteenWalkers.busy[1]).toBeLessThanOrEqual(16);
  });
});

describe('where people appear', () => {
  it('is open ground, spread out, and different each time', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const first: { x: number; z: number }[] = [];
    const second: { x: number; z: number }[] = [];
    for (let i = 0; i < 20; i++) {
      first.push(randomSpot(campus, a, first)!);
      second.push(randomSpot(campus, b, second)!);
    }
    for (const p of first) {
      expect(isClear(campus, p.x, p.z)).toBe(true);
      expect(first.filter((q) => Math.hypot(p.x - q.x, p.z - q.z) < 0.9).length).toBe(1);
    }
    expect(first).not.toEqual(second);
  });

  it('keeps off the places marked to be left free', () => {
    const area: WanderArea = {
      colliders: [],
      bounds: { x0: 0, x1: 10, z0: 0, z1: 10 },
      avoid: [{ x: 5, z: 5, r: 3 }],
    };
    const rng = mulberry32(3);
    for (let i = 0; i < 200; i++) {
      const p = randomSpot(area, rng)!;
      expect(Math.hypot(p.x - 5, p.z - 5)).toBeGreaterThanOrEqual(3);
    }
  });

  it('finds room near every gathering place and member of staff', () => {
    const rng = mulberry32(8);
    for (const [x, z] of [...GATHERING_SPOTS, ...CROWD_POINTS])
      expect(randomSpot({ ...campus, home: { x, z }, radius: 6 }, rng), `${x},${z}`).not.toBeNull();
    for (const s of STAFF_SPOTS)
      expect(randomSpot({ ...campus, home: s, radius: s.r }, rng), s.id).not.toBeNull();
  });
});

describe('walking', () => {
  it('takes students all over campus without walking through anything', () => {
    const { people, inside } = simulate(campus, 14, 120, 4);
    expect(inside).toBe(0);
    for (const p of people) expect(p.walked).toBeGreaterThan(30);
  });

  it('keeps someone with a patch of their own on it', () => {
    for (const s of STAFF_SPOTS) {
      const area: WanderArea = { ...campus, home: s, radius: s.r };
      const { people } = simulate(area, 1, 90, 5);
      expect(people[0].walked, s.id).toBeGreaterThan(3);
      expect(Math.hypot(people[0].w.x - s.x, people[0].w.z - s.z), s.id).toBeLessThan(s.r + 1);
    }
  });

  it('works inside every interior', () => {
    for (const room of Object.values(createRooms())) {
      const area: WanderArea = {
        colliders: room.colliders,
        bounds: room.floor?.walk ?? room.bounds,
        body: 0.36,
        ok: room.club?.floorY ? (x, z) => room.club!.floorY!(x, z) === 0 : undefined,
      };
      const { people, inside } = simulate(area, 4, 60, 6);
      expect(inside, room.kind).toBe(0);
      const walked = people.reduce((n, p) => n + p.walked, 0);
      expect(walked, room.kind).toBeGreaterThan(20);
    }
  });

  it('stops someone who is being talked to', () => {
    const rng = mulberry32(7);
    const area: WanderArea = { colliders: [], bounds: { x0: 0, x1: 20, z0: 0, z1: 20 } };
    const w = newWanderer({ x: 10, z: 10 }, 1.5, rng);
    w.held = true;
    for (let i = 0; i < 200; i++) expect(stepWanderer(w, area, rng, 0.05)).toBe(0);
    expect([w.x, w.z]).toEqual([10, 10]);
    w.held = false;
    for (let i = 0; i < 200; i++) stepWanderer(w, area, rng, 0.05);
    expect(Math.hypot(w.x - 10, w.z - 10)).toBeGreaterThan(0.5);
  });

  it('moves people who overlap apart, but not the one being talked to', () => {
    const rng = mulberry32(2);
    const wall: Collider[] = [];
    const area: WanderArea = { colliders: wall, bounds: { x0: 0, x1: 20, z0: 0, z1: 20 } };
    const a = { w: newWanderer({ x: 5, z: 5 }, 1, rng), area };
    const b = { w: newWanderer({ x: 5.1, z: 5 }, 1, rng), area };
    a.w.held = true;
    for (let i = 0; i < 100; i++) separate([a, b]);
    expect(a.w.x).toBe(5);
    expect(b.w.x - a.w.x).toBeGreaterThan(0.7);
  });
});
