// A department building's corridor floor: six classroom doors, benches, a stair alcove with a flight up and a flight
// down you can really walk, and (on the ground floor) the entrance and a building directory. The same three layouts
// serve all five floors; the scene puts the right room names on the doors.
import { DEPARTMENTS } from '../core/courses';
import type { ClassBuilding } from '../core/types';
import { Kit } from './clubhouse';
import { floorKey, type FloorExtras, type FloorVariant, type Person, type RoomInterior } from './rooms';

/** Height between two floors; the stairs climb this much. */
export const FLOOR_RISE = 4;
export const FLOOR_W = 40;
export const FLOOR_D = 16;
const H = 4.4;
/** Flights run west from the corridor: they start at x = -12.4 and end at the west wall alcove. */
const STAIR_X0 = -12.4;
const STAIR_LEN = 5.2;
const STEPS = 8;
/** x of the three door slots on the north and south walls. */
export const DOOR_X = [-6, 4, 14];

const DOOR_WOOD = 0x6b4a2f;
const GOLD = 0xe3b53c;
const WOOD = 0xb98a55;
const METAL = 0x3a3f4a;
const SKY = 0x9fd2ff;

const mix = (c: number, f: number): number => {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * f));
  const b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
};

export const floorVariant = (floor: number, floors = 5): FloorVariant =>
  floor <= 1 ? 'ground' : floor >= floors ? 'top' : 'mid';

export function buildFloor(dept: ClassBuilding, variant: FloorVariant, at: [number, number]): RoomInterior {
  const k = new Kit(at[0], at[1], FLOOR_W, FLOOR_D, H);
  const { w, d } = k;
  const col = DEPARTMENTS[dept].color;
  const dark = mix(col, 0.7);
  const hasUp = variant !== 'top';
  const hasDown = variant !== 'ground';
  const slab = 0xd9d3c4;

  k.shell({ floor: slab, wall: 0xf4efe6, trim: dark, noDoor: true, noFloor: true });

  /* ---- floor slab, with an opening for the flight down ---- */
  const slabBox = (x0: number, x1: number, z0: number, z1: number) =>
    k.box((x0 + x1) / 2, -0.03, (z0 + z1) / 2, x1 - x0, 0.12, z1 - z0, slab);
  if (hasDown) {
    slabBox(STAIR_X0, w / 2 + 0.3, -d / 2 - 0.3, d / 2 + 0.3);
    slabBox(-w / 2 - 0.3, STAIR_X0, -d / 2 - 0.3, -4);
    slabBox(-w / 2 - 0.3, STAIR_X0, -1.2, d / 2 + 0.3);
  } else slabBox(-w / 2 - 0.3, w / 2 + 0.3, -d / 2 - 0.3, d / 2 + 0.3);
  k.box(5, 0.045, 0, 30, 0.02, 3.4, mix(col, 1.6)); // a runner down the middle in the department's colour
  for (let i = -8; i <= 8; i++) k.box(i * 2.2 + 3, 0.05, 0, 0.05, 0.02, 3.4, mix(col, 1.3));
  for (const sz of [-1, 1]) k.box(0, 0.5, sz * (d / 2 - 0.05), w, 1.0, 0.08, mix(col, 1.25)); // wainscot

  /* ---- six classroom doors: three on the north wall, three on the south wall ---- */
  const doors: Point2[] = [];
  const doorYaw: number[] = [];
  for (let slot = 0; slot < 6; slot++) {
    const north = slot < 3;
    const x = DOOR_X[slot % 3];
    const wz = north ? -d / 2 : d / 2;
    const dz = north ? 1 : -1; // into the corridor
    k.box(x, 1.45, wz + dz * 0.07, 2.5, 2.9, 0.12, col);
    k.box(x, 1.35, wz + dz * 0.13, 1.8, 2.7, 0.1, DOOR_WOOD);
    k.box(x, 1.95, wz + dz * 0.19, 0.7, 0.9, 0.04, 0xcfe8ff);
    k.box(x + 0.62, 1.2, wz + dz * 0.2, 0.1, 0.1, 0.1, GOLD);
    k.box(x, 3.4, wz + dz * 0.1, 2.2, 0.5, 0.1, col);
    doors.push({ x: k.ox + x, z: k.oz + wz + dz * 1.9 });
    doorYaw.push(north ? 0 : Math.PI);
  }
  // windows and benches between the doors
  for (const x of [-1, 9]) {
    for (const sz of [-1, 1]) {
      const wz = sz * (d / 2);
      k.box(x, 2.6, wz - sz * 0.05, 2.4, 1.5, 0.1, 0xffffff);
      k.box(x, 2.6, wz - sz * 0.1, 2.1, 1.25, 0.1, SKY);
      k.box(x, 0.46, wz - sz * 0.75, 3.0, 0.1, 0.6, WOOD);
      for (const lx of [-1.3, 1.3]) k.box(x + lx, 0.22, wz - sz * 0.75, 0.08, 0.44, 0.5, METAL);
      k.solid(x - 1.5, x + 1.5, sz < 0 ? -d / 2 : d / 2 - 1.05, sz < 0 ? -d / 2 + 1.05 : d / 2);
    }
  }
  // potted plants
  k.plant(w / 2 - 0.9, -d / 2 + 0.9);
  k.plant(w / 2 - 0.9, d / 2 - 0.9);

  /* ---- the stair alcove (west end) ---- */
  k.solid(-w / 2, STAIR_X0 + 0.2, -d / 2, -4); // block north of the alcove
  k.solid(-w / 2, STAIR_X0 + 0.2, 4, d / 2); // block south of the alcove
  k.solid(-w / 2, STAIR_X0 + 0.2, -1.2, 1.2); // divider between the two flights
  k.box((-w / 2 + STAIR_X0) / 2, 1.2, -6, STAIR_X0 + w / 2, 2.4, 4, mix(col, 1.5));
  k.box((-w / 2 + STAIR_X0) / 2, 1.2, 6, STAIR_X0 + w / 2, 2.4, 4, mix(col, 1.5));
  k.box((-w / 2 + STAIR_X0) / 2, 1.0, 0, STAIR_X0 + w / 2, 2.0, 2.4, mix(col, 1.3));
  const run = STAIR_LEN / STEPS;
  const rail = (z: number) => {
    k.box(STAIR_X0 - STAIR_LEN / 2, 0.95, z, STAIR_LEN, 0.07, 0.07, 0xc9a24a);
    for (let i = 0; i <= 3; i++) k.box(STAIR_X0 - (STAIR_LEN * i) / 3, 0.5, z, 0.07, 1.0, 0.07, METAL);
  };
  if (hasUp) {
    // flight up: steps rise as you walk west, ending on a landing at floor height +4
    for (let i = 0; i < STEPS; i++) {
      const top = ((i + 1) * FLOOR_RISE) / STEPS;
      k.box(STAIR_X0 - run * (i + 0.5), top / 2, 2.6, run, top, 2.8, i % 2 ? 0xcfc8b8 : 0xe3dccb);
    }
    k.box(
      (-w / 2 + (STAIR_X0 - STAIR_LEN)) / 2,
      FLOOR_RISE / 2,
      2.6,
      STAIR_X0 - STAIR_LEN + w / 2,
      FLOOR_RISE,
      2.8,
      0xb9b2a2,
    );
    rail(1.25);
    rail(3.95);
  } else {
    k.box((-w / 2 + STAIR_X0) / 2, 1.1, 2.6, STAIR_X0 + w / 2, 2.2, 2.8, 0xc9c1b0);
    k.box(STAIR_X0 - 1.2, 1.5, 2.6, 0.1, 1.0, 1.6, 0xd94a3a); // a closed gate: no stairs above
  }
  if (hasDown) {
    // flight down: a well beneath the floor, steps dropping as you walk west
    const depth = FLOOR_RISE + 0.2;
    k.box((-w / 2 + STAIR_X0) / 2, -depth, -2.6, STAIR_X0 + w / 2, 0.2, 2.8, 0x4a4d57); // bottom of the well
    for (const z of [-4.05, -1.15])
      k.box((-w / 2 + STAIR_X0) / 2, -depth / 2, z, STAIR_X0 + w / 2, depth, 0.1, 0x6b6f7a);
    for (let i = 0; i < STEPS; i++) {
      const top = (-(i + 1) * FLOOR_RISE) / STEPS;
      const h = top + depth;
      k.box(STAIR_X0 - run * (i + 0.5), -depth + h / 2, -2.6, run, h, 2.8, i % 2 ? 0xa59f90 : 0xbdb6a5);
    }
    rail(-1.25);
    rail(-3.95);
  } else {
    k.box((-w / 2 + STAIR_X0) / 2, 1.1, -2.6, STAIR_X0 + w / 2, 2.2, 2.8, 0xc9c1b0);
    k.cyl(STAIR_X0 - 2, 0.6, -2.6, 0.22, 0.22, 1.2, 0xd94a3a); // a fire extinguisher
    k.box(STAIR_X0 - 3.6, 1.6, -2.6, 0.1, 1.0, 1.4, 0xf4efe6);
  }
  // arrows on the floor at the foot of each flight
  if (hasUp) k.box(STAIR_X0 + 0.9, 0.06, 2.6, 0.9, 0.02, 0.5, 0x2fd3a0);
  if (hasDown) k.box(STAIR_X0 + 0.9, 0.06, -2.6, 0.9, 0.02, 0.5, 0xff9a3c);

  /* ---- the way out (ground floor) and the directory ---- */
  let directory: Point2 | undefined;
  if (variant === 'ground') {
    k.box(w / 2 - 0.03, 1.35, 0, 0.1, 2.7, 2.6, 0xffffff);
    k.box(w / 2 - 0.08, 1.3, -0.65, 0.1, 2.6, 1.15, DOOR_WOOD);
    k.box(w / 2 - 0.08, 1.3, 0.65, 0.1, 2.6, 1.15, DOOR_WOOD);
    k.box(w / 2 - 0.1, 3.1, 0, 0.1, 0.3, 1.2, 0x2fd3a0);
    k.box(w / 2 - 0.12, 3.9, 0, 0.1, 0.6, 5, col);
    // the directory board beside the doors
    k.box(w / 2 - 0.1, 1.8, -4.6, 0.1, 1.6, 2.8, 0x1b2330);
    for (let i = 0; i < 5; i++)
      k.box(w / 2 - 0.17, 2.3 - i * 0.28, -4.6, 0.04, 0.12, 2.0 - (i % 2) * 0.6, 0xf4f1e8);
    directory = { x: k.ox + w / 2 - 1.8, z: k.oz - 4.6 };
  } else {
    k.box(w / 2 - 0.1, 1.9, 0, 0.1, 1.6, 3.2, 0x1b2330);
    for (let i = 0; i < 4; i++)
      k.box(w / 2 - 0.17, 2.4 - i * 0.3, 0, 0.04, 0.12, 2.2 - (i % 2) * 0.7, 0xf4f1e8);
  }
  k.box(w / 2 - 0.1, 3.5, 6.2, 0.06, 0.5, 2.0, mix(col, 1.4));

  /* ---- people ---- */
  const people: Person[] = [
    k.person(-8, 4.6, Math.PI, 'stand'),
    k.person(-3, -1.0, Math.PI / 2, 'stand'),
    k.person(-2.2, -0.6, -Math.PI / 2, 'stand'),
    k.person(8, 1.2, Math.PI, 'stand'),
    k.person(11.5, -1.4, 0, 'stand'),
    k.person(15.5, 2.2, Math.PI / 2, 'stand'),
    k.person(1, 2.2, 0, 'stand'),
    k.person(5.5, -2.2, Math.PI, 'stand'),
  ];

  /* ---- walking the stairs ---- */
  const floorY = (x: number, z: number): number => {
    const lx = x - k.ox;
    const lz = z - k.oz;
    if (lx > STAIR_X0 || lx < -w / 2) return 0;
    const t = Math.max(0, Math.min(1, (STAIR_X0 - lx) / STAIR_LEN));
    if (hasUp && lz >= 1.2 && lz <= 4) return t * FLOOR_RISE;
    if (hasDown && lz <= -1.2 && lz >= -4) return -t * FLOOR_RISE;
    return 0;
  };
  const lane = (z0: number, z1: number) => ({
    x: k.ox + STAIR_X0 - STAIR_LEN + 0.1,
    z0: k.oz + z0,
    z1: k.oz + z1,
  });

  const base = k.base(floorKey(dept, variant), k.seat(0, 0, 0));
  const entrance = { x: k.ox + w / 2 - 2.2, z: k.oz };
  const extras: FloorExtras = {
    building: dept,
    variant,
    doors,
    arrive: {
      entrance,
      fromBelow: { x: k.ox + STAIR_X0 + 1.4, z: k.oz - 2.6 },
      fromAbove: { x: k.ox + STAIR_X0 + 1.4, z: k.oz + 2.6 },
      door: doors,
    },
    up: hasUp ? lane(1.2, 4) : undefined,
    down: hasDown ? lane(-4, -1.2) : undefined,
    directory,
    stairSign: { x: k.ox + STAIR_X0 - 2.6, z: k.oz },
    floorY,
    people,
  };
  return {
    ...base,
    spawn: entrance,
    door: { x: k.ox + w / 2 - 0.9, z: k.oz },
    floor: extras,
  };
}

interface Point2 {
  x: number;
  z: number;
}
