// Walk-in classroom interiors. Each room kind is built once, far outside the campus, as one merged mesh.
// The scene shows exactly one of them at a time and moves the player inside.
import { Group, Mesh, MeshLambertMaterial } from 'three';
import { DEPT_IDS, type ClassBuilding, type ClubId, type RoomKind } from '../core/types';
import type { Bounds, Collider } from '../world/collision';
import type { Point } from '../world/layout';
import { Batch } from './batch';
import { buildCanteen } from './canteen';
import { buildClubhouse } from './clubhouse';
import { buildFloor } from './departments';
import { COURSES } from '../core/courses';

export interface Seat extends Point {
  /** Facing angle (as used by `Character.yaw`). */
  yaw: number;
}

/** Every walk-in interior: the four classroom kinds, the canteen, the Club House lobby and the five club rooms. */
export type InteriorKind = string;

/** The three kinds of corridor floor in a department building: ground (entrance, stairs up), middle, top (stairs down). */
export type FloorVariant = 'ground' | 'mid' | 'top';
export const classKey = (building: ClassBuilding, kind: RoomKind): InteriorKind =>
  `class:${building}:${kind}`;
export const floorKey = (building: ClassBuilding, variant: FloorVariant): InteriorKind =>
  `floor:${building}:${variant}`;

/** What a department building's corridor floor adds on top of a normal interior. */
export interface FloorExtras {
  building: ClassBuilding;
  variant: FloorVariant;
  /** Where to stand to use each of the six classroom doors, in slot order. */
  doors: Point[];
  /** Where the player appears: through the entrance, up the stairs from below, down the stairs from above, or out of a classroom door. */
  arrive: { entrance: Point; fromBelow: Point; fromAbove: Point; door: Point[] };
  /** Walking to the end of a flight changes floor: the x limit and the lane's z range (world coordinates). */
  up?: { x: number; z0: number; z1: number };
  down?: { x: number; z0: number; z1: number };
  /** Ground floor: the building directory board. */
  directory?: Point;
  /** Where the floor number sign hangs. */
  stairSign: Point;
  /** Floor height under (x, z): stairs rise to +4 (up flight) and sink to -4 (down flight). */
  floorY: (x: number, z: number) => number;
  people: Person[];
  /** Where people may stroll: the corridor without the stairs. */
  walk: Bounds;
}

/** Someone (a classmate or a friend) who stands, sits, dances or plays somewhere in a club room. */
export interface Person extends Seat {
  pose: 'stand' | 'sit' | 'dance' | 'play' | 'playSit';
  /** Floor height under the person (stage, bleachers). */
  y?: number;
}

/** What the Club House lobby and the five club rooms add on top of a normal interior. */
export interface ClubExtras {
  /** The club this room belongs to; absent in the lobby. */
  club?: ClubId;
  /** Where the player takes part in the club activity, and the pose they take there. */
  play?: Seat & { sit?: boolean; y?: number };
  /** Lobby only: where to stand to open each club's door. */
  doors?: { club: ClubId; at: Point }[];
  /** Lobby only: where you reappear after leaving each club room. */
  arrive?: Partial<Record<ClubId, Point>>;
  /** Lobby only: the reception desk (stand here to talk to the registrar) and the registrar's spot. */
  desk?: Point;
  registrar?: Seat;
  /** The people who fill the room. */
  people: Person[];
  /** Floor height at (x, z) when part of the room is raised (stage, podium). */
  floorY?: (x: number, z: number) => number;
}

/** Extra points of interest that only the canteen has. */
export interface CanteenExtras {
  /** Stand here to order at the hot-food counter, use the campus store or the vending machines. */
  order: Point;
  store: Point;
  vending: Point;
  /** Where the kitchen staff stand (server, cashier, cook) and which way they face. */
  staff: Seat[];
}

export interface RoomInterior {
  kind: InteriorKind;
  group: Group;
  colliders: Collider[];
  bounds: Bounds;
  /** Where the player appears when walking in (facing the board). */
  spawn: Point;
  /** Stand here to leave. */
  door: Point;
  /** Where the professor stands, and which way they face. */
  prof: Seat;
  seats: Seat[];
  /** Index into `seats` reserved for the player. */
  playerSeat: number;
  /** Room centre (for camera clamps and lamps). */
  centre: Point;
  size: { w: number; d: number };
  /** Canteen only. */
  extras?: CanteenExtras;
  /** Club House lobby and club rooms only. */
  club?: ClubExtras;
  /** Department building corridor floors only. */
  floor?: FloorExtras;
}

interface RoomCfg {
  w: number;
  d: number;
  /** World-space centre of the room, far from the campus. */
  at: [number, number];
}

const CFG: Record<RoomKind, RoomCfg> = {
  lecture: { w: 20, d: 18, at: [-75, 225] },
  seminar: { w: 14, d: 12, at: [-25, 225] },
  lab: { w: 16, d: 14, at: [25, 225] },
  computer: { w: 16, d: 14, at: [75, 225] },
};

const H = 3.8;
const BASE = {
  floor: 0xc8a878,
  rug: 0x8a4a4a,
  wall: 0xf1ead9,
  trim: 0x8a6a4a,
  wood: 0xb98a55,
  woodDark: 0x7a5232,
  board: 0xf7f7f2,
  frame: 0x4a4a4a,
  chalk: 0x2f5d46,
  metal: 0x3a3f4a,
  sky: 0x9fd2ff,
  door: 0x6b4a2f,
  chair: 0x3a5a99,
  plant: 0x3e8a3a,
  pot: 0xb36a4a,
};

/** Each department's classrooms have their own colours so you can tell which building you are in. */
const THEMES: Record<ClassBuilding, Partial<typeof BASE>> = {
  hum: { wall: 0xf3e6cf, trim: 0x8a3b3b, rug: 0x8a4a4a },
  math: { wall: 0xe6eefc, trim: 0x2f5fb8, rug: 0x3a5a99 },
  cse: { wall: 0xe4eef0, trim: 0x13867f, rug: 0x2a6f6a },
  chem: { wall: 0xe5f3e4, trim: 0x2f8a4a, rug: 0x3a8a5a },
  eee: { wall: 0xf6efd9, trim: 0xb8862b, rug: 0x7a5a2a },
  phy: { wall: 0xebe4f7, trim: 0x5a3f9c, rug: 0x5a4a8a },
};

export function createRooms(): Record<InteriorKind, RoomInterior> {
  const out: Record<InteriorKind, RoomInterior> = { ...buildClubhouse(), canteen: buildCanteen() };
  // one classroom interior per department and room kind that has a course in it (plus the exam hall)
  const combos = new Set<string>(['hum:lecture']);
  for (const c of Object.values(COURSES)) combos.add(`${c.building}:${c.kind}`);
  [...combos].sort().forEach((combo, i) => {
    const [b, kind] = combo.split(':') as [ClassBuilding, RoomKind];
    const key = classKey(b, kind);
    out[key] = build(kind, key, [-75 + 50 * i, 325], THEMES[b]);
  });
  // and a corridor floor (ground, middle and top) for each department building
  DEPT_IDS.forEach((b, bi) => {
    (['ground', 'mid', 'top'] as const).forEach((v, vi) => {
      out[floorKey(b, v)] = buildFloor(b, v, [-75 + 60 * (bi * 3 + vi), 400]);
    });
  });
  return out;
}

function build(
  kind: RoomKind,
  key: InteriorKind,
  at: [number, number],
  theme: Partial<typeof BASE>,
): RoomInterior {
  const C = { ...BASE, ...theme };
  const { w, d } = CFG[kind];
  const [ox, oz] = at;
  const B = new Batch();
  const colliders: Collider[] = [];
  const box = (x: number, y: number, z: number, bw: number, bh: number, bd: number, col: number, ry = 0) =>
    B.box(ox + x, y, oz + z, bw, bh, bd, col, ry);
  const cyl = (x: number, y: number, z: number, rt: number, rb: number, h: number, col: number, rx = 0) =>
    B.cyl(ox + x, y, oz + z, rt, rb, h, col, 12, true, rx);
  const solid = (x0: number, x1: number, z0: number, z1: number) =>
    colliders.push({ t: 'b', x0: ox + x0, x1: ox + x1, z0: oz + z0, z1: oz + z1 });
  const post = (x: number, z: number, r: number) => colliders.push({ t: 'c', x: ox + x, z: oz + z, r });
  const seats: Seat[] = [];

  /* ---- shell: floor, walls, door, windows ---- */
  // The floor top sits a few cm above y=0 so it never z-fights with the campus ground plane underneath.
  box(0, -0.03, 0, w + 0.6, 0.12, d + 0.6, C.floor);
  for (let i = -Math.floor(w / 2) + 1; i < w / 2; i += 2) box(i, 0.04, 0, 0.04, 0.02, d, 0xb89968); // floorboards
  box(0, H / 2, -d / 2 - 0.15, w + 0.6, H, 0.3, C.wall); // north (board wall)
  box(0, H / 2, d / 2 + 0.15, w + 0.6, H, 0.3, C.wall); // south (door wall)
  box(-w / 2 - 0.15, H / 2, 0, 0.3, H, d, C.wall);
  box(w / 2 + 0.15, H / 2, 0, 0.3, H, d, C.wall);
  for (const sz of [-1, 1]) box(0, 0.18, sz * (d / 2 - 0.02), w, 0.36, 0.06, C.trim); // skirting
  for (const sx of [-1, 1]) box(sx * (w / 2 - 0.02), 0.18, 0, 0.06, 0.36, d, C.trim);
  box(0, H + 0.08, -d / 2 - 0.15, w + 0.8, 0.16, 0.46, C.trim); // wall caps
  box(0, H + 0.08, d / 2 + 0.15, w + 0.8, 0.16, 0.46, C.trim);
  box(-w / 2 - 0.15, H + 0.08, 0, 0.46, 0.16, d + 0.4, C.trim);
  box(w / 2 + 0.15, H + 0.08, 0, 0.46, 0.16, d + 0.4, C.trim);
  // windows on both side walls
  const nWin = Math.max(2, Math.floor((d - 3) / 4));
  for (const sx of [-1, 1])
    for (let i = 0; i < nWin; i++) {
      const z = -d / 2 + 2.6 + ((i + 0.5) / nWin) * (d - 5);
      box(sx * (w / 2 - 0.02), 2.2, z, 0.1, 1.5, 1.8, 0xffffff);
      box(sx * (w / 2 - 0.08), 2.2, z, 0.1, 1.3, 1.6, C.sky);
      box(sx * (w / 2 - 0.1), 2.2, z, 0.1, 1.3, 0.07, 0xffffff);
    }
  // door
  box(0, 1.35, d / 2 - 0.03, 2.0, 2.7, 0.1, 0xffffff);
  box(0, 1.3, d / 2 - 0.08, 1.7, 2.6, 0.1, C.door);
  box(0.55, 1.2, d / 2 - 0.15, 0.1, 0.1, 0.1, 0xffd24a);
  box(0, 3.0, d / 2 - 0.1, 1.1, 0.3, 0.1, 0x2fd3a0); // EXIT sign
  // clock above the board
  cyl(0, 3.35, -d / 2 + 0.12, 0.36, 0.36, 0.06, 0xffffff, Math.PI / 2);
  box(0, 3.43, -d / 2 + 0.17, 0.04, 0.26, 0.02, 0x222222);
  box(0.08, 3.35, -d / 2 + 0.17, 0.2, 0.04, 0.02, 0x222222);
  // plants in the back corners
  for (const sx of [-1, 1]) {
    cyl(sx * (w / 2 - 0.7), 0.3, d / 2 - 0.7, 0.3, 0.24, 0.6, C.pot);
    B.sphere(ox + sx * (w / 2 - 0.7), 1.0, oz + d / 2 - 0.7, 0.5, C.plant, 8, 6);
    post(sx * (w / 2 - 0.7), d / 2 - 0.7, 0.4);
  }
  // posters on the side walls
  for (const [sx, z, col] of [
    [-1, -d / 4, 0xffc2d6],
    [1, -d / 4, 0xffe58a],
    [-1, d / 4, 0xc2e5ff],
    [1, d / 4, 0xd8ffd0],
  ] as [number, number, number][])
    box(sx * (w / 2 - 0.05), 1.7, z, 0.05, 0.9, 0.65, col);

  /* ---- furniture ---- */
  const chair = (x: number, z: number, yaw: number, col = C.chair): void => {
    // `yaw` is the facing direction the sitter looks towards (0 = +z, PI = -z)
    const bx = -Math.sin(yaw) * 0.3;
    const bz = -Math.cos(yaw) * 0.3;
    box(x, 0.46, z, 0.62, 0.08, 0.62, col);
    box(x + bx, 0.86, z + bz, yaw % Math.PI === 0 ? 0.62 : 0.08, 0.7, yaw % Math.PI === 0 ? 0.08 : 0.62, col);
    for (const [lx, lz] of [
      [-0.25, -0.25],
      [0.25, -0.25],
      [-0.25, 0.25],
      [0.25, 0.25],
    ])
      box(x + lx, 0.21, z + lz, 0.05, 0.42, 0.05, C.metal);
    post(x, z, 0.36);
  };
  const desk = (x: number, z: number, dw: number, dd = 0.9): void => {
    box(x, 0.76, z, dw, 0.08, dd, C.wood);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        box(x + sx * (dw / 2 - 0.1), 0.38, z + sz * (dd / 2 - 0.1), 0.07, 0.76, 0.07, C.metal);
    solid(x - dw / 2, x + dw / 2, z - dd / 2, z + dd / 2);
  };
  const board = (bw: number): void => {
    box(0, 1.95, -d / 2 + 0.07, bw + 0.3, 2.3, 0.1, C.frame);
    box(0, 1.95, -d / 2 + 0.13, bw, 2.0, 0.06, C.board);
    box(0, 0.88, -d / 2 + 0.22, bw, 0.08, 0.3, C.frame); // marker ledge
    for (let i = 0; i < 4; i++)
      box(-bw / 2 + 1 + i * 0.9, 2.2 - (i % 2) * 0.5, -d / 2 + 0.17, 0.5, 0.05, 0.02, 0x4a78d6);
  };
  const addProf = (x: number, z: number): Seat => ({ x: ox + x, z: oz + z, yaw: 0 });
  const world = (x: number, z: number, yaw: number): Seat => ({ x: ox + x, z: oz + z, yaw });
  let prof: Seat;
  let playerSeat = 0;

  if (kind === 'lecture') {
    board(9);
    box(-7, 1.95, -d / 2 + 0.1, 2.6, 1.8, 0.06, C.chalk); // side chalkboard
    box(7, 2.2, -d / 2 + 0.1, 2.6, 1.6, 0.06, 0xdcefee); // projector screen
    box(0, 0.05, -d / 2 + 3.2, 14, 0.04, 3.2, C.rug); // rug in front of the board
    box(3.6, 0.6, -d / 2 + 2.2, 1.2, 1.2, 0.8, C.wood); // podium
    box(3.6, 1.24, -d / 2 + 2.2, 1.4, 0.08, 0.9, C.woodDark);
    solid(3.0, 4.2, -d / 2 + 1.8, -d / 2 + 2.6);
    box(-4.5, 0.74, -d / 2 + 2.2, 3, 0.08, 1.2, C.woodDark); // teacher's desk
    solid(-6, -3, -d / 2 + 1.6, -d / 2 + 2.8);
    prof = addProf(-1.2, -d / 2 + 2.0);
    const xs = [-7.8, -5.4, -3.0, 3.0, 5.4, 7.8];
    const z0 = -d / 2 + 5;
    for (let r = 0; r < 4; r++)
      xs.forEach((x, i) => {
        const z = z0 + r * 2.6;
        desk(x, z, 2.1);
        chair(x, z + 0.95, Math.PI);
        seats.push(world(x, z + 0.95, Math.PI));
        if (r === 1 && i === 3) playerSeat = seats.length - 1;
      });
  } else if (kind === 'seminar') {
    board(6);
    box(0, 0.05, -d / 2 + 2.6, 8, 0.04, 2.6, C.rug);
    // bookshelves along both side walls
    for (const sx of [-1, 1])
      for (let i = 0; i < 2; i++) {
        const z = -1.5 + i * 3.4;
        const x = sx * (w / 2 - 0.45);
        box(x, 1.2, z, 0.7, 2.4, 2.4, C.woodDark);
        for (let s = 0; s < 4; s++)
          for (let k = 0; k < 5; k++)
            box(
              x - sx * 0.2,
              0.5 + s * 0.55,
              z - 0.9 + k * 0.45,
              0.28,
              0.4,
              0.3,
              [0xc23b3b, 0x2f4a8a, 0xd9a520, 0x2f7a4b, 0x7a4fb5][(s + k) % 5],
            );
        solid(x - 0.35, x + 0.35, z - 1.2, z + 1.2);
      }
    box(0, 0.76, 0, 7, 0.1, 2.4, 0x8a5a33); // seminar table
    for (const sx of [-1, 1]) box(sx * 3, 0.38, 0, 0.3, 0.76, 2.0, C.woodDark);
    solid(-3.5, 3.5, -1.2, 1.2);
    prof = addProf(0, -d / 2 + 2.1);
    for (const [row, yaw] of [
      [-1.9, 0],
      [1.9, Math.PI],
    ] as [number, number][])
      for (let k = -2; k <= 2; k++) {
        chair(k * 1.2, row, yaw);
        seats.push(world(k * 1.2, row, yaw));
        if (row < 0 && k === 1) playerSeat = seats.length - 1; // far side of the table, facing the door
      }
    chair(-4.2, 0, Math.PI / 2);
    seats.push(world(-4.2, 0, Math.PI / 2));
    chair(4.2, 0, -Math.PI / 2);
    seats.push(world(4.2, 0, -Math.PI / 2));
  } else if (kind === 'lab') {
    board(8);
    // periodic-table style poster
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 6; c++)
        box(
          4.9 + c * 0.45,
          1.3 + r * 0.45,
          -d / 2 + 0.08,
          0.4,
          0.4,
          0.02,
          [0xffc2d6, 0xc2e5ff, 0xd8ffd0, 0xffe58a][(r + c) % 4],
        );
    // wall counters with sinks
    for (const sx of [-1, 1]) {
      const x = sx * (w / 2 - 0.55);
      box(x, 0.45, 0, 0.9, 0.9, 9, 0xd9d2c3);
      box(x, 0.93, 0, 1.0, 0.06, 9.1, 0x2a3a40);
      for (const z of [-2.5, 2.5]) box(x, 1.05, z, 0.4, 0.12, 0.5, 0xbfc7cc);
      solid(x - 0.5, x + 0.5, -4.5, 4.5);
    }
    // fume hood
    box(-3.4, 1.6, -d / 2 + 0.5, 2.4, 3.0, 0.9, 0xcfd6d9);
    box(-3.4, 1.6, -d / 2 + 0.96, 2.0, 1.6, 0.04, 0xbfe0ff);
    solid(-4.6, -2.2, -d / 2, -d / 2 + 0.95);
    // demonstration bench + professor
    box(0.6, 0.45, -d / 2 + 2.2, 5, 0.9, 1.1, 0xd9d2c3);
    box(0.6, 0.93, -d / 2 + 2.2, 5.1, 0.06, 1.2, 0x2a3a40);
    for (let i = 0; i < 4; i++)
      cyl(-1 + i * 0.9, 1.1, -d / 2 + 2.2, 0.12, 0.16, 0.3, [0xff6b6b, 0x4aa8ff, 0x2fd3a0, 0xffd23a][i]);
    solid(-1.9, 3.1, -d / 2 + 1.6, -d / 2 + 2.8);
    prof = addProf(0.6, -d / 2 + 0.95);
    for (const sx of [-1, 1])
      for (const bz of [-2.5, 1.7]) {
        const x = sx * 4.5;
        box(x, 0.45, bz, 4, 0.9, 1.1, 0xd9d2c3);
        box(x, 0.93, bz, 4.1, 0.06, 1.2, 0x2a3a40);
        cyl(x - 1, 1.1, bz, 0.12, 0.16, 0.3, 0x2fd3a0);
        box(x + 0.5, 1.15, bz, 0.3, 0.4, 0.3, 0x3a3f4a); // microscope
        cyl(x + 1.3, 1.1, bz, 0.1, 0.1, 0.25, 0xff9a3c);
        solid(x - 2, x + 2, bz - 0.6, bz + 0.6);
        for (let k = -1; k <= 1; k++) {
          const sxp = x + k * 1.2;
          cyl(sxp, 0.34, bz + 1.05, 0.28, 0.28, 0.68, 0x6b6f7a);
          post(sxp, bz + 1.05, 0.32);
          seats.push(world(sxp, bz + 1.05, Math.PI));
          if (sx > 0 && bz > 0 && k === -1) playerSeat = seats.length - 1;
        }
      }
  } else {
    board(7);
    box(0, 2.9, -d / 2 + 0.1, 4, 0.2, 0.06, C.frame);
    box(-3.5, 0.74, -d / 2 + 2.0, 2.8, 0.08, 1.1, C.woodDark); // instructor desk
    box(-3.5, 1.05, -d / 2 + 1.8, 0.9, 0.55, 0.06, 0x20242a);
    box(-3.5, 1.05, -d / 2 + 1.84, 0.8, 0.45, 0.02, 0x7fd0ff);
    solid(-4.9, -2.1, -d / 2 + 1.4, -d / 2 + 2.6);
    prof = addProf(0.5, -d / 2 + 1.8);
    const cols = [-6.0, -3.6, 3.6, 6.0];
    const z0 = -d / 2 + 4.0;
    for (let r = 0; r < 3; r++)
      cols.forEach((x, i) => {
        const z = z0 + r * 2.8;
        desk(x, z, 2.3);
        box(x, 1.05, z - 0.2, 0.9, 0.55, 0.06, 0x20242a);
        box(x, 1.05, z - 0.16, 0.8, 0.45, 0.02, 0x7fd0ff);
        box(x, 0.84, z - 0.2, 0.1, 0.1, 0.1, 0x20242a);
        box(x, 0.79, z + 0.15, 0.6, 0.03, 0.2, 0x333333);
        chair(x, z + 0.95, Math.PI, 0x4a4f5a);
        seats.push(world(x, z + 0.95, Math.PI));
        if (r === 1 && i === 2) playerSeat = seats.length - 1;
      });
  }

  const geo = B.build();
  const mesh = new Mesh(geo, new MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  const group = new Group();
  group.add(mesh);
  group.visible = false;

  return {
    kind: key,
    group,
    colliders,
    bounds: { x0: ox - w / 2 + 0.6, x1: ox + w / 2 - 0.6, z0: oz - d / 2 + 0.6, z1: oz + d / 2 - 0.5 },
    spawn: { x: ox, z: oz + d / 2 - 3 },
    door: { x: ox, z: oz + d / 2 - 0.7 },
    prof,
    seats,
    playerSeat,
    centre: { x: ox, z: oz },
    size: { w, d },
  };
}
