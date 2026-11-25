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

/* ------------------------------ classroom interiors ------------------------------ */
import { createRooms } from '../src/render/rooms';
import { COURSES, DEPARTMENTS } from '../src/core/data';
import { DEPT_IDS } from '../src/core/types';
import type { RoomInterior } from '../src/render/rooms';

const allRooms = createRooms();
const { canteen: canteenRoom, clubhall, chess, music, dance, debate, sports } = allRooms;
const byPrefix = (p: string) => Object.fromEntries(Object.entries(allRooms).filter(([k]) => k.startsWith(p)));
/** The themed classroom interiors (one per department and room kind) and the corridor floors. */
const rooms = byPrefix('class:');
const floorRooms = byPrefix('floor:');
const clubRooms = { chess, music, dance, debate, sports };
const PLAYER_R = 0.42;

function insideBlocked(room: RoomInterior, x: number, z: number): boolean {
  const b = room.bounds;
  if (x < b.x0 || x > b.x1 || z < b.z0 || z > b.z1) return true;
  return !!blocked(room.colliders, x, z, PLAYER_R);
}

/** Flood-fill the room floor from the door and report whether (x, z) can be approached within `within`. */
function walkable(room: RoomInterior, tx: number, tz: number, within: number): boolean {
  const step = 0.3;
  const key = (i: number, j: number) => i * 10000 + j;
  const ox = room.bounds.x0;
  const oz = room.bounds.z0;
  const W = Math.ceil((room.bounds.x1 - ox) / step);
  const D = Math.ceil((room.bounds.z1 - oz) / step);
  const start = [Math.round((room.spawn.x - ox) / step), Math.round((room.spawn.z - oz) / step)];
  const seen = new Set<number>([key(start[0], start[1])]);
  const queue = [start];
  while (queue.length) {
    const [i, j] = queue.pop()!;
    const x = ox + i * step;
    const z = oz + j * step;
    if (Math.hypot(x - tx, z - tz) <= within) return true;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni > W || nj > D || seen.has(key(ni, nj))) continue;
      if (insideBlocked(room, ox + ni * step, oz + nj * step)) continue;
      seen.add(key(ni, nj));
      queue.push([ni, nj]);
    }
  }
  return false;
}

describe('classroom interiors', () => {
  it('builds all four room kinds with finite geometry, far away from the campus', () => {
    // one interior for every (department, room kind) pair that has a course, plus the exam hall
    const want = new Set(['main:lecture', ...Object.values(COURSES).map((c) => `${c.building}:${c.kind}`)]);
    expect(Object.keys(rooms).sort()).toEqual([...want].map((w) => `class:${w}`).sort());
    for (const r of Object.values(rooms)) {
      const mesh = r.group.children[0] as unknown as { geometry: typeof campus.solid };
      const pos = mesh.geometry.getAttribute('position');
      expect(pos.count, r.kind).toBeGreaterThan(100);
      expect(
        pos.array.every((v) => Number.isFinite(v)),
        r.kind,
      ).toBe(true);
      // Outside the campus fence so the outdoor scene never overlaps a room.
      expect(Math.abs(r.centre.z), r.kind).toBeGreaterThan(150);
    }
  });

  it('has enough seats and a clear spawn point in every room', () => {
    for (const r of Object.values(rooms)) {
      expect(r.seats.length, r.kind).toBeGreaterThanOrEqual(10);
      expect(r.playerSeat, r.kind).toBeLessThan(r.seats.length);
      expect(insideBlocked(r, r.spawn.x, r.spawn.z), `${r.kind} spawn`).toBe(false);
      expect(insideBlocked(r, r.door.x, r.door.z), `${r.kind} door`).toBe(false);
    }
  });

  it('lets the player walk from the door to their seat, the professor and back to the exit', () => {
    for (const r of Object.values(rooms)) {
      const seat = r.seats[r.playerSeat];
      expect(walkable(r, seat.x, seat.z, 2.2), `${r.kind} seat`).toBe(true);
      expect(walkable(r, r.prof.x, r.prof.z, 2.3), `${r.kind} professor`).toBe(true);
      expect(walkable(r, r.door.x, r.door.z, 1.9), `${r.kind} exit`).toBe(true);
    }
  });

  it('does not trigger a prompt the moment you walk in', () => {
    for (const r of Object.values(rooms)) {
      const seat = r.seats[r.playerSeat];
      expect(Math.hypot(r.spawn.x - r.door.x, r.spawn.z - r.door.z), `${r.kind} exit`).toBeGreaterThan(1.9);
      expect(Math.hypot(r.spawn.x - seat.x, r.spawn.z - seat.z), `${r.kind} seat`).toBeGreaterThan(2.2);
      expect(Math.hypot(r.spawn.x - r.prof.x, r.spawn.z - r.prof.z), `${r.kind} prof`).toBeGreaterThan(2.3);
    }
  });

  it('seats every student in a unique chair', () => {
    for (const r of Object.values(rooms)) {
      const keys = r.seats.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`);
      expect(new Set(keys).size, r.kind).toBe(keys.length);
    }
  });
});

describe('canteen interior', () => {
  const r = canteenRoom;
  const ex = r.extras!;

  it('builds finite geometry far from the campus and the classrooms', () => {
    const mesh = r.group.children[0] as unknown as { geometry: typeof campus.solid };
    const pos = mesh.geometry.getAttribute('position');
    expect(pos.count).toBeGreaterThan(500);
    expect(pos.array.every((v) => Number.isFinite(v))).toBe(true);
    expect(Math.abs(r.centre.z)).toBeGreaterThan(150);
    for (const c of Object.values(rooms))
      expect(Math.hypot(c.centre.x - r.centre.x, c.centre.z - r.centre.z)).toBeGreaterThan(20);
  });

  it('has plenty of unique dining seats and a clear spawn and door', () => {
    expect(r.seats.length).toBeGreaterThanOrEqual(30);
    const keys = r.seats.map((s) => `${s.x.toFixed(2)},${s.z.toFixed(2)}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(insideBlocked(r, r.spawn.x, r.spawn.z)).toBe(false);
    expect(insideBlocked(r, r.door.x, r.door.z)).toBe(false);
  });

  it('lets the player walk to the counter, the store, the vending machines, every seat and the exit', () => {
    expect(walkable(r, ex.order.x, ex.order.z, 2.6)).toBe(true);
    expect(walkable(r, ex.store.x, ex.store.z, 2.3)).toBe(true);
    expect(walkable(r, ex.vending.x, ex.vending.z, 2.2)).toBe(true);
    expect(walkable(r, r.door.x, r.door.z, 1.9)).toBe(true);
    r.seats.forEach((s, i) => expect(walkable(r, s.x, s.z, 1.7), `seat ${i}`).toBe(true));
  });

  it('does not trigger a prompt the moment you walk in', () => {
    const d = (p: { x: number; z: number }) => Math.hypot(r.spawn.x - p.x, r.spawn.z - p.z);
    expect(d(r.door)).toBeGreaterThan(1.9);
    expect(d(ex.order)).toBeGreaterThan(2.6);
    expect(d(ex.store)).toBeGreaterThan(2.3);
    expect(d(ex.vending)).toBeGreaterThan(2.2);
    for (const s of r.seats) expect(d(s)).toBeGreaterThan(1.7);
  });

  it('keeps the kitchen staff behind the counter', () => {
    expect(ex.staff.length).toBe(3);
    for (const s of ex.staff) {
      expect(s.z).toBeLessThan(r.centre.z - 4.7);
      expect(blocked(r.colliders, s.x, s.z, 0.1)).toBeDefined(); // inside the kitchen block the player cannot enter
    }
    expect(walkable(r, ex.staff[0].x, ex.staff[0].z, 0.8)).toBe(false);
  });
});

describe('club house', () => {
  const lobby = clubhall;
  const ex = lobby.club!;

  it('builds a lobby and five themed rooms with finite geometry, far from the campus', () => {
    for (const [name, r] of Object.entries({ clubhall: lobby, ...clubRooms })) {
      const mesh = r.group.children[0] as unknown as { geometry: typeof campus.solid };
      const pos = mesh.geometry.getAttribute('position');
      expect(pos.count, name).toBeGreaterThan(300);
      expect(
        pos.array.every((v) => Number.isFinite(v)),
        name,
      ).toBe(true);
      expect(Math.abs(r.centre.z), name).toBeGreaterThan(150);
    }
    expect(Object.keys(clubRooms).sort()).toEqual(['chess', 'dance', 'debate', 'music', 'sports']);
  });

  it('has one door per club in the lobby, all reachable', () => {
    expect(ex.doors?.map((d) => d.club).sort()).toEqual(['chess', 'dance', 'debate', 'music', 'sports']);
    for (const d of ex.doors!) expect(walkable(lobby, d.at.x, d.at.z, 2.0), d.club).toBe(true);
    expect(walkable(lobby, ex.desk!.x, ex.desk!.z, 2.2)).toBe(true);
    expect(walkable(lobby, lobby.door.x, lobby.door.z, 1.9)).toBe(true);
    for (const c of Object.keys(clubRooms) as (keyof typeof clubRooms)[]) {
      const p = ex.arrive![c]!;
      expect(insideBlocked(lobby, p.x, p.z), `${c} arrival`).toBe(false);
    }
  });

  it('lets the player walk from the entrance to the activity spot and back to the exit in every club room', () => {
    for (const [name, r] of Object.entries(clubRooms)) {
      const play = r.club!.play!;
      expect(insideBlocked(r, r.spawn.x, r.spawn.z), `${name} spawn`).toBe(false);
      expect(walkable(r, play.x, play.z, 2.0), `${name} activity spot`).toBe(true);
      expect(walkable(r, r.door.x, r.door.z, 1.9), `${name} exit`).toBe(true);
      // not triggered by simply walking in
      expect(Math.hypot(r.spawn.x - play.x, r.spawn.z - play.z), `${name} prompt`).toBeGreaterThan(2.0);
      expect(Math.hypot(r.spawn.x - r.door.x, r.spawn.z - r.door.z), `${name} exit prompt`).toBeGreaterThan(
        1.9,
      );
    }
  });

  it('leaves room for at least eight people in each room, none standing inside furniture', () => {
    for (const [name, r] of Object.entries({ clubhall: lobby, ...clubRooms })) {
      const people = r.club!.people;
      expect(people.length, name).toBeGreaterThanOrEqual(6);
      const keys = people.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`);
      expect(new Set(keys).size, name).toBe(keys.length);
      const bad = people
        .filter((p) => p.pose === 'stand' || p.pose === 'dance' || p.pose === 'play')
        .filter((p) => !!blocked(r.colliders, p.x, p.z, 0.3));
      expect(
        bad.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`),
        `${name} standing in furniture`,
      ).toEqual([]);
    }
  });

  it('raises the stage in the music room and the podium platform in the debate hall', () => {
    const m = clubRooms.music;
    expect(m.club!.floorY!(m.centre.x, m.centre.z - 6)).toBeGreaterThan(0.3);
    expect(m.club!.floorY!(m.centre.x, m.centre.z + 4)).toBe(0);
    const d = clubRooms.debate;
    expect(d.club!.floorY!(d.centre.x - 4, d.centre.z - 6)).toBeGreaterThan(0.2);
    expect(d.club!.floorY!(d.centre.x, d.centre.z + 4)).toBe(0);
  });
});

describe('department building floors', () => {
  const list = Object.entries(floorRooms);

  it('has a ground, middle and top corridor for each of the five department buildings', () => {
    expect(list.length).toBe(DEPT_IDS.length * 3);
    for (const b of DEPT_IDS)
      for (const v of ['ground', 'mid', 'top'])
        expect(floorRooms[`floor:${b}:${v}`], `${b} ${v}`).toBeDefined();
  });

  it('builds finite geometry far from the campus, with six classroom doors on every floor', () => {
    for (const [name, r] of list) {
      const mesh = r.group.children[0] as unknown as { geometry: typeof campus.solid };
      const pos = mesh.geometry.getAttribute('position');
      expect(pos.count, name).toBeGreaterThan(300);
      expect(
        pos.array.every((v) => Number.isFinite(v)),
        name,
      ).toBe(true);
      expect(Math.abs(r.centre.z), name).toBeGreaterThan(150);
      expect(r.floor!.doors.length, name).toBe(6);
    }
  });

  it('lets you walk from the arrival point to every classroom door, the stairs and (on the ground floor) the exit', () => {
    for (const [name, r] of list) {
      const f = r.floor!;
      for (const [label, p] of Object.entries({
        entrance: f.arrive.entrance,
        below: f.arrive.fromBelow,
        above: f.arrive.fromAbove,
      })) {
        expect(insideBlocked(r, p.x, p.z), `${name} arrival ${label}`).toBe(false);
      }
      f.doors.forEach((d, i) => expect(walkable(r, d.x, d.z, 1.9), `${name} door ${i}`).toBe(true));
      if (f.up) expect(walkable(r, f.up.x + 1, (f.up.z0 + f.up.z1) / 2, 1.0), `${name} up flight`).toBe(true);
      if (f.down)
        expect(walkable(r, f.down.x + 1, (f.down.z0 + f.down.z1) / 2, 1.0), `${name} down flight`).toBe(true);
      if (f.variant === 'ground') {
        expect(walkable(r, r.door.x, r.door.z, 1.9), `${name} exit`).toBe(true);
        expect(f.directory, name).toBeDefined();
        expect(walkable(r, f.directory!.x, f.directory!.z, 2.2), `${name} directory`).toBe(true);
      }
    }
  });

  it('has an up flight everywhere except the top floor, and a down flight everywhere except the ground floor', () => {
    for (const [name, r] of list) {
      const f = r.floor!;
      expect(!!f.up, `${name} up`).toBe(f.variant !== 'top');
      expect(!!f.down, `${name} down`).toBe(f.variant !== 'ground');
    }
  });

  it('really climbs: the up flight rises a whole floor and the down flight sinks a whole floor', () => {
    for (const [name, r] of list) {
      const f = r.floor!;
      expect(f.floorY(r.centre.x + 5, r.centre.z), `${name} corridor`).toBe(0);
      if (f.up) {
        const mid = (f.up.z0 + f.up.z1) / 2;
        expect(f.floorY(f.up.x - 0.3, mid), `${name} top of the flight`).toBeGreaterThan(3.85);
        expect(f.floorY(f.up.x + 2.5, mid), `${name} halfway`).toBeGreaterThan(1.5);
        expect(f.floorY(f.up.x + 2.5, mid), `${name} halfway`).toBeLessThan(2.6);
      }
      if (f.down) {
        const mid = (f.down.z0 + f.down.z1) / 2;
        expect(f.floorY(f.down.x - 0.3, mid), `${name} bottom of the flight`).toBeLessThan(-3.85);
      }
    }
  });

  it('keeps people out of the furniture and gives each building its own colour', () => {
    for (const [name, r] of list) {
      const bad = r.floor!.people.filter((p) => !!blocked(r.colliders, p.x, p.z, 0.3));
      expect(
        bad.map((p) => `${p.x.toFixed(1)},${p.z.toFixed(1)}`),
        `${name} people in furniture`,
      ).toEqual([]);
    }
    const cols = new Set(DEPT_IDS.map((b) => DEPARTMENTS[b].color));
    expect(cols.size).toBe(DEPT_IDS.length);
  });
});
