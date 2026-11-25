// The Club House: a lobby with five doors, and one themed room per club (chess, music, dance, debate, sports).
// Every room is built once, far outside the campus, as one merged mesh. The scene shows one at a time.
import { Group, Mesh, MeshLambertMaterial } from 'three';
import { CLUB_IDS, type ClubId } from '../core/types';
import type { Collider } from '../world/collision';
import type { Point } from '../world/layout';
import { Batch } from './batch';
import type { ClubExtras, InteriorKind, Person, RoomInterior, Seat } from './rooms';

/** World position of each interior's centre, all in a row far outside the campus fence. */
const AT: Record<'clubhall' | ClubId, [number, number]> = {
  clubhall: [-75, 275],
  chess: [-25, 275],
  music: [25, 275],
  dance: [75, 275],
  debate: [125, 275],
  sports: [175, 275],
};
const SIZE: Record<'clubhall' | ClubId, { w: number; d: number; H: number }> = {
  clubhall: { w: 28, d: 14, H: 4.4 },
  chess: { w: 16, d: 14, H: 3.8 },
  music: { w: 22, d: 16, H: 4.8 },
  dance: { w: 18, d: 14, H: 4.2 },
  debate: { w: 18, d: 16, H: 4.4 },
  sports: { w: 26, d: 18, H: 6.2 },
};

/** Each club's signature colour (matches `CLUBS`). */
export const CLUB_COLOUR: Record<ClubId, number> = {
  chess: 0x5b6577,
  music: 0x9b59d6,
  dance: 0xff5fa2,
  debate: 0x3d7be0,
  sports: 0xff7a59,
};

const WOOD = 0xb98a55;
const WOOD_DARK = 0x7a5232;
const METAL = 0x3a3f4a;
const SKY = 0x9fd2ff;
const DOOR = 0x6b4a2f;
const PLANT = 0x3e8a3a;
const POT = 0xb36a4a;
const GOLD = 0xe3b53c;

/** Small drawing kit: boxes, cylinders and colliders positioned relative to a room's centre. */
export class Kit {
  readonly B = new Batch();
  readonly colliders: Collider[] = [];
  constructor(
    readonly ox: number,
    readonly oz: number,
    readonly w: number,
    readonly d: number,
    readonly H: number,
  ) {}
  box(x: number, y: number, z: number, bw: number, bh: number, bd: number, col: number, ry = 0): void {
    this.B.box(this.ox + x, y, this.oz + z, bw, bh, bd, col, ry);
  }
  /** A box tilted about X and Z (ramps, lids, wedges). */
  tilt(
    x: number,
    y: number,
    z: number,
    bw: number,
    bh: number,
    bd: number,
    col: number,
    rx: number,
    rz = 0,
  ): void {
    this.B.box(this.ox + x, y, this.oz + z, bw, bh, bd, col, 0, rx, rz);
  }
  cyl(x: number, y: number, z: number, rt: number, rb: number, h: number, col: number, rx = 0, rz = 0): void {
    this.B.cyl(this.ox + x, y, this.oz + z, rt, rb, h, col, 12, true, rx, rz);
  }
  ball(x: number, y: number, z: number, r: number, col: number, sy = 1): void {
    this.B.sphere(this.ox + x, y, this.oz + z, r, col, 9, 7, sy);
  }
  solid(x0: number, x1: number, z0: number, z1: number): void {
    this.colliders.push({ t: 'b', x0: this.ox + x0, x1: this.ox + x1, z0: this.oz + z0, z1: this.oz + z1 });
  }
  post(x: number, z: number, r: number): void {
    this.colliders.push({ t: 'c', x: this.ox + x, z: this.oz + z, r });
  }
  seat(x: number, z: number, yaw: number): Seat {
    return { x: this.ox + x, z: this.oz + z, yaw };
  }
  pt(x: number, z: number): Point {
    return { x: this.ox + x, z: this.oz + z };
  }
  person(x: number, z: number, yaw: number, pose: Person['pose'], y = 0): Person {
    return { x: this.ox + x, z: this.oz + z, yaw, pose, y };
  }
  /** A straight painted line between two points on the floor. */
  line(x0: number, z0: number, x1: number, z1: number, col: number, t = 0.12, y = 0.06): void {
    const len = Math.hypot(x1 - x0, z1 - z0);
    this.box((x0 + x1) / 2, y, (z0 + z1) / 2, t, 0.02, len + t, col, Math.atan2(x1 - x0, z1 - z0));
  }
  /** A painted arc (angles in radians, measured from +x towards +z). */
  arc(cx: number, cz: number, r: number, a0: number, a1: number, col: number, t = 0.12, n = 14): void {
    for (let i = 0; i < n; i++) {
      const p = a0 + ((a1 - a0) * i) / n;
      const q = a0 + ((a1 - a0) * (i + 1)) / n;
      this.line(
        cx + Math.cos(p) * r,
        cz + Math.sin(p) * r,
        cx + Math.cos(q) * r,
        cz + Math.sin(q) * r,
        col,
        t,
      );
    }
  }
  /** A flat painted disc or ring on the floor. */
  disc(cx: number, cz: number, r: number, col: number, y = 0.055): void {
    this.cyl(cx, y, cz, r, r, 0.012, col);
  }
  ring(cx: number, cz: number, r: number, col: number, floor: number, t = 0.16): void {
    this.disc(cx, cz, r, col, 0.055);
    this.disc(cx, cz, r - t, floor, 0.062);
  }

  /** Floor, four walls, skirting, wall caps, an entrance door on the south wall and optional windows. */
  shell(o: {
    floor: number;
    plank?: number;
    wall: number;
    trim: number;
    windows?: { y: number; h: number; n: number };
    exitText?: number;
    /** Leave out the entrance door in the south wall. */
    noDoor?: boolean;
    /** Leave out the floor slab (the caller draws it, for instance around a stairwell). */
    noFloor?: boolean;
  }): void {
    const { w, d, H } = this;
    if (!o.noFloor) this.box(0, -0.03, 0, w + 0.6, 0.12, d + 0.6, o.floor);
    if (o.plank !== undefined)
      for (let i = -Math.floor(w / 2) + 1; i < w / 2; i += 2) this.box(i, 0.04, 0, 0.04, 0.02, d, o.plank);
    this.box(0, H / 2, -d / 2 - 0.15, w + 0.6, H, 0.3, o.wall);
    this.box(0, H / 2, d / 2 + 0.15, w + 0.6, H, 0.3, o.wall);
    this.box(-w / 2 - 0.15, H / 2, 0, 0.3, H, d, o.wall);
    this.box(w / 2 + 0.15, H / 2, 0, 0.3, H, d, o.wall);
    for (const sz of [-1, 1]) this.box(0, 0.18, sz * (d / 2 - 0.02), w, 0.36, 0.06, o.trim);
    for (const sx of [-1, 1]) this.box(sx * (w / 2 - 0.02), 0.18, 0, 0.06, 0.36, d, o.trim);
    this.box(0, H + 0.08, -d / 2 - 0.15, w + 0.8, 0.16, 0.46, o.trim);
    this.box(0, H + 0.08, d / 2 + 0.15, w + 0.8, 0.16, 0.46, o.trim);
    this.box(-w / 2 - 0.15, H + 0.08, 0, 0.46, 0.16, d + 0.4, o.trim);
    this.box(w / 2 + 0.15, H + 0.08, 0, 0.46, 0.16, d + 0.4, o.trim);
    if (o.windows) {
      const { y, h, n } = o.windows;
      for (const sx of [-1, 1])
        for (let i = 0; i < n; i++) {
          const z = -d / 2 + 2.4 + ((i + 0.5) / n) * (d - 4.8);
          this.box(sx * (w / 2 - 0.02), y, z, 0.1, h, 2.0, 0xffffff);
          this.box(sx * (w / 2 - 0.08), y, z, 0.1, h - 0.2, 1.8, SKY);
          this.box(sx * (w / 2 - 0.1), y, z, 0.1, h - 0.2, 0.07, 0xffffff);
        }
    }
    // entrance door (south wall)
    if (!o.noDoor) {
      this.box(0, 1.35, d / 2 - 0.03, 2.2, 2.7, 0.1, 0xffffff);
      this.box(-0.5, 1.3, d / 2 - 0.08, 0.95, 2.6, 0.1, DOOR);
      this.box(0.5, 1.3, d / 2 - 0.08, 0.95, 2.6, 0.1, DOOR);
      this.box(0, 3.05, d / 2 - 0.1, 1.1, 0.3, 0.1, o.exitText ?? 0x2fd3a0);
    }
  }

  chair(x: number, z: number, yaw: number, col = 0x3a5a99): void {
    const bx = -Math.sin(yaw) * 0.3;
    const bz = -Math.cos(yaw) * 0.3;
    const alongX = Math.abs(Math.sin(yaw)) > 0.5;
    this.box(x, 0.46, z, 0.62, 0.08, 0.62, col);
    this.box(x + bx, 0.86, z + bz, alongX ? 0.08 : 0.62, 0.7, alongX ? 0.62 : 0.08, col);
    for (const [lx, lz] of [
      [-0.25, -0.25],
      [0.25, -0.25],
      [-0.25, 0.25],
      [0.25, 0.25],
    ])
      this.box(x + lx, 0.21, z + lz, 0.05, 0.42, 0.05, METAL);
    this.post(x, z, 0.36);
  }
  plant(x: number, z: number): void {
    this.cyl(x, 0.3, z, 0.32, 0.26, 0.6, POT);
    this.ball(x, 1.05, z, 0.55, PLANT);
    this.post(x, z, 0.42);
  }
  /** A framed poster on a wall. `face` is the wall the poster hangs on. */
  poster(face: 'N' | 'S' | 'E' | 'W', along: number, y: number, pw: number, ph: number, col: number): void {
    const { w, d } = this;
    if (face === 'N') this.box(along, y, -d / 2 + 0.06, pw, ph, 0.05, col);
    else if (face === 'S') this.box(along, y, d / 2 - 0.06, pw, ph, 0.05, col);
    else if (face === 'E') this.box(w / 2 - 0.06, y, along, 0.05, ph, pw, col);
    else this.box(-w / 2 + 0.06, y, along, 0.05, ph, pw, col);
  }
  bounds(): RoomInterior['bounds'] {
    return {
      x0: this.ox - this.w / 2 + 0.6,
      x1: this.ox + this.w / 2 - 0.6,
      z0: this.oz - this.d / 2 + 0.6,
      z1: this.oz + this.d / 2 - 0.5,
    };
  }
  finish(kind: InteriorKind, extras: ClubExtras, prof: Seat): RoomInterior {
    return { ...this.base(kind, prof), club: extras };
  }
  /** The interior without any extras: geometry, colliders, bounds and default spawn and door. */
  base(kind: InteriorKind, prof: Seat): RoomInterior {
    const mesh = new Mesh(this.B.build(), new MeshLambertMaterial({ vertexColors: true }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    const group = new Group();
    group.add(mesh);
    group.visible = false;
    return {
      kind,
      group,
      colliders: this.colliders,
      bounds: this.bounds(),
      spawn: this.pt(0, this.d / 2 - 3),
      door: this.pt(0, this.d / 2 - 0.7),
      prof,
      seats: [],
      playerSeat: -1,
      centre: this.pt(0, 0),
      size: { w: this.w, d: this.d },
    };
  }
}

const kitFor = (k: 'clubhall' | ClubId): Kit => new Kit(AT[k][0], AT[k][1], SIZE[k].w, SIZE[k].d, SIZE[k].H);

/* ============================================================================================ */
/* Lobby                                                                                        */
/* ============================================================================================ */
const DOOR_X: Record<ClubId, number> = { chess: -10, music: -5, dance: 0, debate: 5, sports: 10 };

/** A little emblem above each club door. */
function emblem(k: Kit, club: ClubId, x: number, y: number, z: number): void {
  const white = 0xffffff;
  if (club === 'chess') {
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 2; j++)
        k.box(x - 0.45 + i * 0.3, y - 0.12 + j * 0.24, z, 0.28, 0.22, 0.03, (i + j) % 2 ? 0x222222 : white);
  } else if (club === 'music') {
    k.ball(x - 0.12, y - 0.12, z, 0.13, white, 0.8);
    k.box(x - 0.01, y + 0.1, z, 0.05, 0.5, 0.03, white);
    k.box(x + 0.12, y + 0.3, z, 0.25, 0.08, 0.03, white);
  } else if (club === 'dance') {
    k.box(x, y, z, 0.12, 0.6, 0.03, white);
    k.box(x, y + 0.12, z, 0.6, 0.12, 0.03, white);
    k.ball(x, y + 0.34, z, 0.12, white);
  } else if (club === 'debate') {
    k.box(x - 0.1, y + 0.05, z, 0.6, 0.38, 0.03, white);
    k.box(x - 0.3, y - 0.2, z, 0.12, 0.14, 0.03, white);
    k.box(x + 0.3, y - 0.12, z, 0.3, 0.2, 0.03, 0xffe58a);
  } else {
    k.ball(x, y, z, 0.3, 0xffa43a, 1);
    k.box(x, y, z + 0.28, 0.6, 0.03, 0.02, 0x3a2410);
    k.box(x, y, z + 0.28, 0.03, 0.6, 0.02, 0x3a2410);
  }
}

function buildHall(): RoomInterior {
  const k = kitFor('clubhall');
  const { w, d } = k;
  const floor = 0xcdb89a;
  k.shell({ floor, plank: 0xbfa886, wall: 0xf8efe4, trim: 0x8a4a6a, windows: { y: 2.8, h: 1.5, n: 3 } });
  const arrive: Partial<Record<ClubId, Point>> = {};
  const doors: { club: ClubId; at: Point }[] = [];
  // five club doors on the north wall, each with a coloured frame, sign, emblem and doormat
  for (const club of CLUB_IDS) {
    const x = DOOR_X[club];
    const col = CLUB_COLOUR[club];
    k.box(x, 1.45, -d / 2 + 0.07, 2.5, 2.9, 0.12, col);
    k.box(x, 1.35, -d / 2 + 0.13, 1.8, 2.7, 0.1, 0x4a3626);
    k.box(x + 0.6, 1.2, -d / 2 + 0.22, 0.1, 0.1, 0.1, GOLD);
    k.box(x, 3.4, -d / 2 + 0.1, 2.7, 0.7, 0.1, col);
    emblem(k, club, x, 3.4, -d / 2 + 0.17);
    k.box(x, 0.05, -d / 2 + 1.7, 2.3, 0.02, 1.7, col);
    arrive[club] = k.pt(x, -d / 2 + 2.6);
    doors.push({ club, at: k.pt(x, -d / 2 + 1.9) });
  }
  // rug
  k.box(0, 0.05, 1.0, 9, 0.02, 5.4, 0x8a4a6a);
  k.box(0, 0.06, 1.0, 8.4, 0.02, 4.8, 0xb86a8a);
  // reception desk (west) with the club registrar behind it
  k.box(-8, 0.55, 3.5, 4.2, 1.1, 1.0, WOOD_DARK);
  k.box(-8, 1.13, 3.5, 4.4, 0.08, 1.2, WOOD);
  k.box(-9, 1.35, 3.4, 0.8, 0.36, 0.06, 0x20242a);
  k.box(-9, 1.35, 3.37, 0.7, 0.3, 0.02, 0x7fd0ff);
  k.box(-6.9, 1.2, 3.5, 0.4, 0.1, 0.3, 0xffffff);
  k.solid(-10.2, -5.8, 2.9, 4.1);
  // trophy cabinet (east wall)
  k.box(w / 2 - 0.7, 1.1, -1.6, 1.0, 2.2, 3.6, WOOD_DARK);
  k.box(w / 2 - 1.15, 1.2, -1.6, 0.06, 1.9, 3.3, 0xcfe8ff);
  for (let s = 0; s < 3; s++) {
    k.box(w / 2 - 1.0, 0.55 + s * 0.6, -1.6, 0.5, 0.05, 3.3, WOOD);
    for (let c = 0; c < 4; c++) {
      k.cyl(w / 2 - 1.0, 0.82 + s * 0.6, -2.8 + c * 0.8, 0.1, 0.06, 0.3, GOLD);
      k.ball(w / 2 - 1.0, 1.02 + s * 0.6, -2.8 + c * 0.8, 0.1, GOLD);
    }
  }
  k.solid(w / 2 - 1.3, w / 2, -3.5, 0.3);
  // lounge: sofa, coffee table, plants
  k.box(8.5, 0.35, 5.6, 4.0, 0.7, 1.1, 0x4a5f8f);
  k.box(8.5, 0.85, 6.0, 4.0, 0.7, 0.3, 0x3a4c75);
  for (const sx of [-1, 1]) k.box(8.5 + sx * 2.1, 0.55, 5.6, 0.3, 0.9, 1.1, 0x3a4c75);
  k.solid(6.3, 10.7, 5.0, 6.4);
  k.box(8.5, 0.28, 3.4, 1.8, 0.1, 0.9, WOOD);
  for (const sx of [-1, 1]) k.box(8.5 + sx * 0.7, 0.14, 3.4, 0.08, 0.28, 0.7, METAL);
  k.solid(7.5, 9.5, 2.9, 3.9);
  k.plant(-12.4, 6.0);
  k.plant(12.4, 6.0);
  k.plant(-12.4, -5.6);
  k.plant(12.4, -5.6);
  // notice board (west wall) and showcase banner
  k.box(-w / 2 + 0.08, 1.9, -3.2, 0.1, 1.6, 3.2, WOOD_DARK);
  k.box(-w / 2 + 0.13, 1.9, -3.2, 0.05, 1.4, 3.0, 0xc9a56a);
  CLUB_IDS.forEach((club, i) =>
    k.box(-w / 2 + 0.18, 1.9 + (i % 2 ? -0.3 : 0.3), -4.3 + i * 0.5, 0.03, 0.4, 0.4, CLUB_COLOUR[club]),
  );
  k.box(w / 2 - 0.1, 3.0, 4.0, 0.06, 0.9, 5.0, 0xe0762a);
  k.box(w / 2 - 0.14, 3.0, 4.0, 0.04, 0.4, 3.8, 0xfff2cf);
  for (const sx of [-1, 1])
    k.poster(sx < 0 ? 'W' : 'E', 3.6 * sx, 1.9, 1.0, 1.3, [0xffc2d6, 0xc2e5ff][sx < 0 ? 0 : 1]);

  const extras: ClubExtras = {
    doors,
    arrive,
    desk: k.pt(-8, 4.9),
    registrar: k.seat(-8, 2.4, 0),
    people: [
      k.person(-3.5, 3.4, Math.PI / 2, 'stand'),
      k.person(-2.7, 3.2, -Math.PI / 2, 'stand'),
      k.person(4.5, 0.2, Math.PI, 'stand'),
      k.person(-2.5, -1.2, 0, 'stand'),
      k.person(8.0, 5.6, 0, 'sit', 0.46),
      k.person(9.2, 5.6, 0, 'sit', 0.46),
    ],
  };
  return k.finish('clubhall', extras, k.seat(-8, 2.4, 0));
}

/* ============================================================================================ */
/* Chess room                                                                                   */
/* ============================================================================================ */
type PieceKind = 'p' | 'r' | 'n' | 'b' | 'q' | 'k';

function piece(k: Kit, kind: PieceKind, x: number, z: number, white: boolean, s = 1, y0 = 0.06): void {
  const col = white ? 0xf4efe2 : 0x2b2b33;
  const dark = white ? 0xd9d2c0 : 0x1a1a20;
  k.cyl(x, y0 + 0.05 * s, z, 0.3 * s, 0.34 * s, 0.1 * s, dark);
  if (kind === 'p') {
    k.cyl(x, y0 + 0.28 * s, z, 0.12 * s, 0.2 * s, 0.36 * s, col);
    k.ball(x, y0 + 0.58 * s, z, 0.17 * s, col);
  } else if (kind === 'r') {
    k.cyl(x, y0 + 0.36 * s, z, 0.2 * s, 0.26 * s, 0.56 * s, col);
    k.box(x, y0 + 0.72 * s, z, 0.5 * s, 0.14 * s, 0.5 * s, col);
    for (const [dx, dz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      k.box(x + dx * 0.18 * s, y0 + 0.86 * s, z + dz * 0.18 * s, 0.14 * s, 0.14 * s, 0.14 * s, col);
  } else if (kind === 'n') {
    k.cyl(x, y0 + 0.3 * s, z, 0.16 * s, 0.24 * s, 0.46 * s, col);
    k.box(x, y0 + 0.66 * s, z, 0.24 * s, 0.4 * s, 0.4 * s, col);
    k.box(x, y0 + 0.6 * s, z + 0.24 * s, 0.2 * s, 0.2 * s, 0.22 * s, col);
    k.box(x, y0 + 0.88 * s, z - 0.08 * s, 0.1 * s, 0.14 * s, 0.1 * s, col);
  } else if (kind === 'b') {
    k.cyl(x, y0 + 0.34 * s, z, 0.08 * s, 0.22 * s, 0.6 * s, col);
    k.ball(x, y0 + 0.74 * s, z, 0.17 * s, col, 1.35);
    k.ball(x, y0 + 0.98 * s, z, 0.06 * s, col);
  } else if (kind === 'q') {
    k.cyl(x, y0 + 0.4 * s, z, 0.1 * s, 0.24 * s, 0.7 * s, col);
    k.cyl(x, y0 + 0.82 * s, z, 0.26 * s, 0.12 * s, 0.16 * s, col);
    k.ball(x, y0 + 0.98 * s, z, 0.1 * s, col);
  } else {
    k.cyl(x, y0 + 0.42 * s, z, 0.1 * s, 0.25 * s, 0.76 * s, col);
    k.cyl(x, y0 + 0.82 * s, z, 0.22 * s, 0.12 * s, 0.12 * s, col);
    k.box(x, y0 + 1.0 * s, z, 0.08 * s, 0.3 * s, 0.08 * s, col);
    k.box(x, y0 + 1.03 * s, z, 0.24 * s, 0.08 * s, 0.08 * s, col);
  }
}

function buildChess(): RoomInterior {
  const k = kitFor('chess');
  const { w, d } = k;
  const floor = 0x8a6a48;
  k.shell({ floor, plank: 0x7a5a3a, wall: 0xe9e1d3, trim: 0x3a2f2a, windows: { y: 2.3, h: 1.5, n: 2 } });
  // giant floor chessboard with life-size pieces
  const bx0 = -4;
  const bz0 = -6.2;
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      k.box(bx0 + 0.5 + i, 0.045, bz0 + 0.5 + j, 1, 0.03, 1, (i + j) % 2 ? 0x2f2f38 : 0xeae2cf);
  k.box(0, 0.04, bz0 + 4, 8.5, 0.04, 8.5, 0x3a2f2a);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      k.box(bx0 + 0.5 + i, 0.065, bz0 + 0.5 + j, 1, 0.02, 1, (i + j) % 2 ? 0x2f2f38 : 0xeae2cf);
  const setup: [PieceKind, number, number, boolean][] = [
    ['r', 0, 0, false],
    ['n', 1, 0, false],
    ['b', 2, 0, false],
    ['q', 3, 0, false],
    ['k', 4, 0, false],
    ['p', 1, 1, false],
    ['p', 4, 1, false],
    ['p', 3, 3, true],
    ['p', 4, 4, true],
    ['n', 5, 4, true],
    ['b', 2, 5, true],
    ['q', 3, 6, true],
    ['k', 4, 7, true],
    ['r', 0, 7, true],
  ];
  for (const [kind, i, j, white] of setup) {
    piece(k, kind, bx0 + 0.5 + i, bz0 + 0.5 + j, white, 1.05, 0.08);
    k.post(bx0 + 0.5 + i, bz0 + 0.5 + j, 0.34);
  }
  // wall demonstration board
  k.box(0, 2.4, -d / 2 + 0.1, 3.6, 3.6, 0.1, 0x222228);
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++)
      k.box(
        -1.57 + i * 0.45,
        0.88 + 1.7 + j * 0.45 - 0.45,
        -d / 2 + 0.17,
        0.45,
        0.45,
        0.04,
        (i + j) % 2 ? 0x3a4a5a : 0xe6dfcc,
      );
  for (const [i, j, c] of [
    [2, 5, 0xf4efe2],
    [4, 4, 0x2b2b33],
    [5, 2, 0xf4efe2],
    [3, 1, 0x2b2b33],
    [6, 6, 0xf4efe2],
  ] as [number, number, number][])
    k.ball(-1.57 + i * 0.45, 0.88 + 1.7 + j * 0.45 - 0.2, -d / 2 + 0.26, 0.15, c);
  // bookshelves (west) and trophy shelf (east)
  for (let i = 0; i < 2; i++) {
    const z = -2.2 + i * 3.4;
    const x = -w / 2 + 0.45;
    k.box(x, 1.2, z, 0.7, 2.4, 2.8, WOOD_DARK);
    for (let s = 0; s < 4; s++)
      for (let b = 0; b < 6; b++)
        k.box(
          x + 0.2,
          0.5 + s * 0.55,
          z - 1.1 + b * 0.44,
          0.28,
          0.4,
          0.3,
          [0x1f2a44, 0xc23b3b, 0xd9a520, 0xeae2cf, 0x2f7a4b][(s + b) % 5],
        );
    k.solid(x - 0.35, x + 0.35, z - 1.4, z + 1.4);
  }
  k.box(w / 2 - 0.4, 1.0, -3.2, 0.7, 2.0, 3.0, WOOD_DARK);
  for (let s = 0; s < 3; s++)
    for (let c = 0; c < 3; c++) {
      k.cyl(w / 2 - 0.6, 0.62 + s * 0.6, -4.2 + c * 1.0, 0.11, 0.07, 0.3, GOLD);
      k.ball(w / 2 - 0.6, 0.82 + s * 0.6, -4.2 + c * 1.0, 0.1, GOLD);
    }
  k.solid(w / 2 - 0.8, w / 2, -4.8, -1.6);
  // four small chess tables with real boards, clocks and pieces
  const people: Person[] = [];
  const tables: [number, number][] = [
    [-5.8, 2.3],
    [-5.8, 5.3],
    [5.8, 2.3],
    [5.8, 5.3],
  ];
  tables.forEach(([tx, tz], idx) => {
    k.box(tx, 0.76, tz, 1.7, 0.08, 1.1, WOOD);
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) k.box(tx + sx * 0.75, 0.38, tz + sz * 0.45, 0.07, 0.76, 0.07, METAL);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++)
        k.box(
          tx - 0.35 + i * 0.1,
          0.81,
          tz - 0.35 + j * 0.1,
          0.1,
          0.02,
          0.1,
          (i + j) % 2 ? 0x2f2f38 : 0xeae2cf,
        );
    for (let n = 0; n < 7; n++)
      k.ball(
        tx - 0.3 + ((n * 37) % 7) * 0.1,
        0.9,
        tz - 0.3 + ((n * 53) % 7) * 0.1,
        0.045,
        n % 2 ? 0xf4efe2 : 0x2b2b33,
      );
    k.box(tx + 0.7, 0.88, tz - 0.3, 0.14, 0.1, 0.34, 0x222222);
    k.solid(tx - 0.85, tx + 0.85, tz - 0.55, tz + 0.55);
    k.chair(tx, tz - 0.95, 0, WOOD_DARK);
    k.chair(tx, tz + 0.95, Math.PI, WOOD_DARK);
    if (idx !== 2) {
      people.push(k.person(tx, tz - 0.95, 0, 'sit', 0.0));
      people.push(k.person(tx, tz + 0.95, Math.PI, 'sit', 0.0));
    } else people.push(k.person(tx, tz - 0.95, 0, 'sit', 0.0)); // the opponent at the player's table
  });
  // lounge corner (north-west) with armchairs and a floor lamp
  for (const [ax, az, r] of [
    [-6.2, -5.4, 0.6],
    [-6.2, -3.5, -0.6],
  ] as [number, number, number][]) {
    k.box(ax, 0.3, az, 1.0, 0.6, 0.9, 0x6a3a3a);
    k.box(ax - 0.4, 0.7, az, 0.2, 0.6, 0.9, 0x4f2a2a);
    k.box(ax, 0.55, az, 0.2, 0.3, 0.9, 0x4f2a2a);
    k.solid(ax - 0.55, ax + 0.55, az - 0.5, az + 0.5);
    void r;
  }
  k.cyl(-6.9, 0.8, -4.5, 0.04, 0.04, 1.6, 0x222222);
  k.ball(-6.9, 1.75, -4.5, 0.28, 0xffe9a8);
  k.post(-6.9, -4.5, 0.3);
  k.plant(-7.2, 6.0);
  k.plant(7.2, -5.8);
  k.poster('E', 3.8, 2.0, 1.2, 1.4, 0xffe58a);
  k.poster('S', 4.5, 2.2, 1.4, 1.0, 0xc2e5ff);
  k.poster('S', -4.5, 2.2, 1.4, 1.0, 0xffc2d6);
  people.push(k.person(-2.4, -3.0, Math.PI / 2, 'stand'), k.person(2.6, -3.6, -Math.PI / 2, 'stand'));
  const extras: ClubExtras = {
    club: 'chess',
    play: { ...k.seat(5.8, 3.25, Math.PI), sit: true },
    people,
  };
  return k.finish('chess', extras, k.seat(0, 0, 0));
}

/* ============================================================================================ */
/* Music room                                                                                   */
/* ============================================================================================ */
const STAGE_H = 0.4;

function buildMusic(): RoomInterior {
  const k = kitFor('music');
  const { w, d } = k;
  k.shell({ floor: 0x8a6038, plank: 0x7a5230, wall: 0xe4d6f2, trim: 0x5a3d7a });
  // raised stage with front steps
  const sz0 = -d / 2;
  const sz1 = -2.4;
  k.box(0, STAGE_H / 2, (sz0 + sz1) / 2, 19.4, STAGE_H, sz1 - sz0, 0x5a3a22);
  k.box(0, STAGE_H + 0.01, (sz0 + sz1) / 2, 19.2, 0.02, sz1 - sz0 - 0.2, 0x7a5232);
  k.box(0, STAGE_H - 0.1, sz1 + 0.04, 19.4, 0.2, 0.08, 0x2a1a10);
  for (const sx of [-1, 1]) k.box(sx * 2.2, 0.1, sz1 + 0.35, 2.6, 0.2, 0.7, 0x4a2f1a);
  // curtains, valance, side drapes
  k.box(0, 2.3, -d / 2 + 0.16, 19.2, 4.4, 0.2, 0x8a1f2d);
  for (let i = -8; i <= 8; i++)
    k.box(i * 1.12, 2.3, -d / 2 + 0.28, 0.5, 4.2, 0.08, i % 2 ? 0x6e1824 : 0x9a2535);
  k.box(0, 4.4, -d / 2 + 0.3, 19.4, 0.7, 0.4, 0xb0283a);
  for (const sx of [-1, 1]) k.box(sx * 9.9, 2.4, -d / 2 + 1.6, 0.4, 4.6, 3.2, 0x7a1a28);
  // lighting truss over the stage with coloured spotlights
  k.box(0, 4.0, -4.6, 19, 0.16, 0.16, 0x1a1a1f);
  for (const sx of [-1, 1]) k.cyl(sx * 9.4, 2.2, -4.6, 0.08, 0.08, 4.0, 0x1a1a1f);
  [0xff5a4a, 0x4aa8ff, 0xffd23a, 0x2fd3a0, 0xff5fa2, 0x9b59d6].forEach((col, i) => {
    const x = -7.5 + i * 3;
    k.box(x, 3.78, -4.6, 0.36, 0.3, 0.5, 0x111114);
    k.cyl(x, 3.58, -4.4, 0.16, 0.16, 0.06, col);
  });
  // drum kit (west) with a drummer behind it
  const dx = -5.6;
  const dz = -5.0;
  k.cyl(dx, STAGE_H + 0.5, dz, 0.5, 0.5, 0.55, 0xb02a2a, Math.PI / 2);
  k.cyl(dx, STAGE_H + 0.5, dz + 0.3, 0.46, 0.46, 0.04, 0xf4efe2, Math.PI / 2);
  for (const sx of [-1, 1]) {
    k.cyl(dx + sx * 0.45, STAGE_H + 1.15, dz - 0.1, 0.24, 0.24, 0.26, 0xb02a2a);
    k.cyl(dx + sx * 0.8, STAGE_H + 1.8, dz - 0.5, 0.42, 0.42, 0.03, GOLD);
    k.cyl(dx + sx * 0.8, STAGE_H + 0.9, dz - 0.5, 0.02, 0.02, 1.8, 0x999999);
  }
  k.cyl(dx + 1.0, STAGE_H + 0.85, dz + 0.3, 0.3, 0.3, 0.2, 0xe8e8e8);
  k.cyl(dx + 1.0, STAGE_H + 0.4, dz + 0.3, 0.025, 0.025, 0.8, 0x999999);
  k.cyl(dx - 1.1, STAGE_H + 0.55, dz + 0.4, 0.24, 0.24, 0.03, GOLD);
  k.cyl(dx - 1.1, STAGE_H + 0.25, dz + 0.4, 0.02, 0.02, 0.5, 0x999999);
  k.cyl(dx, STAGE_H + 0.3, dz - 1.15, 0.26, 0.26, 0.5, 0x222226);
  k.solid(dx - 1.5, dx + 1.4, dz - 0.8, dz + 0.7);
  // grand piano (east): body, lid, legs, keys and a stool
  const px = 6.4;
  const pz = -5.6;
  k.box(px, STAGE_H + 0.95, pz, 1.5, 0.3, 2.7, 0x16161a);
  k.cyl(px + 0.1, STAGE_H + 0.95, pz - 0.5, 0.75, 0.75, 0.3, 0x16161a);
  k.tilt(px + 0.55, STAGE_H + 1.45, pz - 0.2, 0.06, 1.2, 2.4, 0x25252b, 0, -0.6);
  for (const [lx, lz] of [
    [-0.55, 1.1],
    [0.55, 1.1],
    [0, -1.1],
  ])
    k.cyl(px + lx, STAGE_H + 0.4, pz + lz, 0.07, 0.07, 0.8, 0x16161a);
  k.box(px, STAGE_H + 1.06, pz + 1.45, 1.3, 0.06, 0.4, 0xf4efe2);
  for (let i = 0; i < 6; i++) k.box(px - 0.5 + i * 0.2, STAGE_H + 1.1, pz + 1.55, 0.09, 0.05, 0.2, 0x111114);
  k.cyl(px, STAGE_H + 0.35, pz + 2.25, 0.3, 0.3, 0.1, 0x3a2a1a);
  k.cyl(px, STAGE_H + 0.18, pz + 2.25, 0.05, 0.05, 0.36, METAL);
  k.solid(px - 0.9, px + 0.9, pz - 1.5, pz + 1.7);
  // amplifier stacks, floor monitors, mic stand and guitars on stands
  for (const sx of [-1, 1]) {
    k.box(sx * 8.7, STAGE_H + 0.7, -7.2, 1.1, 1.4, 0.7, 0x16161a);
    k.box(sx * 8.7, STAGE_H + 0.55, -6.83, 0.9, 0.9, 0.04, 0x55585f);
    k.solid(sx * 8.7 - 0.6, sx * 8.7 + 0.6, -7.6, -6.8);
  }
  for (const x of [-3, 0, 3]) k.tilt(x, STAGE_H + 0.18, -2.9, 0.9, 0.3, 0.5, 0x1a1a1f, -0.5);
  k.cyl(0, STAGE_H + 0.8, -4.3, 0.02, 0.02, 1.6, 0x222222);
  k.ball(0, STAGE_H + 1.62, -4.3, 0.07, 0x555555);
  k.post(0, -4.3, 0.18);
  [
    [-8.7, 0xc23b3b],
    [-8.1, 0x2f6fd0],
    [-7.5, 0xffd23a],
  ].forEach(([gx, col]) => {
    k.box(gx, STAGE_H + 0.65, -3.0, 0.4, 0.5, 0.1, col);
    k.box(gx, STAGE_H + 1.3, -3.0, 0.08, 0.8, 0.06, 0x3a2a1a);
    k.box(gx, STAGE_H + 0.3, -3.0, 0.5, 0.05, 0.05, METAL);
  });
  k.solid(-9.0, -7.2, -3.3, -2.7);
  // audience chairs (3 rows of 6) and a mixing desk at the back
  const people: Person[] = [
    k.person(dx, dz - 1.15, 0, 'playSit', STAGE_H),
    k.person(px, pz + 2.25, Math.PI, 'playSit', STAGE_H),
    k.person(-2.4, -4.2, 0, 'play', STAGE_H),
    k.person(2.6, -4.4, 0, 'play', STAGE_H),
  ];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) {
      const x = -5.2 + c * 2.08;
      const z = 0.4 + r * 1.9;
      k.chair(x, z, Math.PI, 0x5a3d7a);
      if ((r * 6 + c) % 3 !== 1) people.push(k.person(x, z, Math.PI, 'sit', 0));
    }
  k.box(0, 0.5, 6.6, 3.4, 1.0, 1.0, WOOD_DARK);
  k.box(0, 1.05, 6.55, 3.2, 0.08, 0.9, 0x2a2a30);
  for (let i = 0; i < 8; i++)
    k.box(-1.2 + i * 0.34, 1.12, 6.5, 0.08, 0.08, 0.5, [0xff5a4a, 0x4aa8ff, 0xffd23a, 0x2fd3a0][i % 4]);
  k.solid(-1.8, 1.8, 6.0, 7.0);
  // acoustic panels (west), hanging guitars and a cello (east)
  for (let i = 0; i < 6; i++)
    k.box(-w / 2 + 0.08, 2.2, -1 + i * 1.9 - 0.2, 0.1, 1.5, 1.6, i % 2 ? 0x3a4a6a : 0x6a3a5a);
  [0xc23b3b, 0x2f6fd0, 0xffd23a].forEach((col, i) => {
    k.box(w / 2 - 0.2, 2.0, 0.5 + i * 1.5, 0.12, 0.7, 0.5, col);
    k.box(w / 2 - 0.2, 2.7, 0.5 + i * 1.5, 0.08, 0.7, 0.1, 0x3a2a1a);
  });
  k.box(w / 2 - 0.6, 0.6, 5.2, 0.5, 1.2, 0.6, 0x8a4a22);
  k.solid(w / 2 - 0.9, w / 2, 4.8, 5.6);
  // music stands
  for (const [mx, mz] of [
    [-2.4, 7.0],
    [2.4, 7.0],
  ]) {
    k.cyl(mx, 0.6, mz, 0.025, 0.025, 1.2, 0x222222);
    k.tilt(mx, 1.25, mz, 0.5, 0.35, 0.03, 0xf4efe2, -0.4);
  }
  k.plant(-w / 2 + 0.8, 7.0);
  k.plant(w / 2 - 0.8, 7.0);
  const extras: ClubExtras = {
    club: 'music',
    play: { ...k.seat(0, -3.4, 0), y: STAGE_H },
    people,
    floorY: (x, z) => {
      const lx = x - AT.music[0];
      const lz = z - AT.music[1];
      if (lz < sz1 && Math.abs(lx) < 9.7) return STAGE_H;
      if (lz < sz1 + 0.8 && Math.abs(lx) < 1.6) return STAGE_H / 2;
      return 0;
    },
  };
  return k.finish('music', extras, k.seat(0, -3.4, 0));
}

/* ============================================================================================ */
/* Dance studio                                                                                 */
/* ============================================================================================ */
function buildDance(): RoomInterior {
  const k = kitFor('dance');
  const { w, d } = k;
  const floor = 0xe2bd85;
  k.shell({ floor, plank: 0xd1ab72, wall: 0xfbeff3, trim: 0xd34a86, windows: { y: 2.6, h: 1.4, n: 2 } });
  // mirrors: the whole north wall and part of the west wall
  k.box(0, 1.95, -d / 2 + 0.1, 16.0, 2.9, 0.12, 0x2a2a30);
  k.box(0, 1.95, -d / 2 + 0.17, 15.6, 2.7, 0.04, 0xcfe9f5);
  for (const x of [-5.5, -0.5, 5.2]) k.box(x, 1.95, -d / 2 + 0.2, 0.3, 2.5, 0.02, 0xeaf8fd);
  k.box(-w / 2 + 0.1, 1.95, 0, 0.12, 2.9, 8.4, 0x2a2a30);
  k.box(-w / 2 + 0.17, 1.95, 0, 0.04, 2.7, 8.0, 0xcfe9f5);
  k.box(-w / 2 + 0.2, 1.95, -1.5, 0.02, 2.5, 0.3, 0xeaf8fd);
  // ballet barres (mirror wall and east wall)
  k.cyl(0, 1.0, -d / 2 + 0.95, 0.04, 0.04, 15, 0xc9a24a, 0, Math.PI / 2);
  for (const x of [-7, -3.5, 0, 3.5, 7]) k.cyl(x, 0.5, -d / 2 + 0.95, 0.03, 0.03, 1.0, METAL);
  k.cyl(w / 2 - 0.7, 1.0, 0, 0.04, 0.04, 9, 0xc9a24a, Math.PI / 2);
  for (const z of [-3.5, 0, 3.5]) k.cyl(w / 2 - 0.7, 0.5, z, 0.03, 0.03, 1.0, METAL);
  // floor marking: stage ring and star
  k.ring(0, -1.0, 3.3, 0xff5fa2, floor, 0.16);
  k.ring(0, -1.0, 2.0, 0xffffff, floor, 0.1);
  // sound system (DJ table + speakers)
  k.box(-7.4, 0.55, 3.6, 1.2, 1.1, 2.6, 0x22252d);
  k.box(-7.4, 1.13, 3.6, 1.3, 0.06, 2.7, 0x32363f);
  k.box(-7.5, 1.3, 3.0, 0.8, 0.3, 0.05, 0x20242a);
  k.box(-7.5, 1.3, 3.0, 0.7, 0.24, 0.02, 0x7fd0ff);
  for (let i = 0; i < 5; i++)
    k.cyl(
      -7.2,
      1.2,
      3.8 + i * 0.1 - 0.2,
      0.05,
      0.05,
      0.05,
      [0xff5a4a, 0x4aa8ff, 0xffd23a, 0x2fd3a0, 0xff5fa2][i],
    );
  k.solid(-8.1, -6.7, 2.2, 5.0);
  for (const [sx, sz] of [
    [-8.2, -5.8],
    [8.0, -5.8],
  ]) {
    k.box(sx, 0.9, sz, 0.8, 1.8, 0.7, 0x16161a);
    k.cyl(sx, 1.35, sz + 0.33, 0.24, 0.24, 0.05, 0x333339, Math.PI / 2);
    k.cyl(sx, 0.55, sz + 0.33, 0.3, 0.3, 0.05, 0x333339, Math.PI / 2);
    k.solid(sx - 0.45, sx + 0.45, sz - 0.4, sz + 0.4);
  }
  // disco ball and two spotlight tripods
  k.cyl(7.0, 1.5, 3.2, 0.04, 0.04, 3.0, METAL);
  k.ball(7.0, 3.1, 3.2, 0.5, 0xe6e8f4);
  for (let i = 0; i < 8; i++)
    k.box(
      7.0 + Math.cos(i) * 0.47,
      3.1 + Math.sin(i * 1.3) * 0.3,
      3.2 + Math.sin(i) * 0.47,
      0.12,
      0.12,
      0.12,
      [0xff5fa2, 0x4aa8ff, 0xffd23a][i % 3],
    );
  k.post(7.0, 3.2, 0.3);
  for (const [sx, col] of [
    [-3.6, 0xff5fa2],
    [3.6, 0x4aa8ff],
  ] as [number, number][]) {
    k.cyl(sx, 0.9, -5.5, 0.04, 0.04, 1.8, METAL);
    k.box(sx, 1.95, -5.5, 0.4, 0.3, 0.5, 0x111114);
    k.cyl(sx, 1.95, -5.22, 0.16, 0.16, 0.04, col, Math.PI / 2);
    k.post(sx, -5.5, 0.25);
  }
  // benches with bags and bottles, cubbies, rolled yoga mats
  for (const bx of [-3.8, 3.8]) {
    k.box(bx, 0.45, d / 2 - 0.9, 3.2, 0.1, 0.5, 0x2f7d86);
    for (const sx of [-1, 1]) k.box(bx + sx * 1.4, 0.22, d / 2 - 0.9, 0.08, 0.44, 0.4, METAL);
    k.box(bx - 0.8, 0.7, d / 2 - 0.9, 0.45, 0.4, 0.3, 0xd94a3a);
    k.cyl(bx + 0.6, 0.65, d / 2 - 0.9, 0.07, 0.07, 0.3, 0x4aa8ff);
    k.solid(bx - 1.6, bx + 1.6, d / 2 - 1.2, d / 2 - 0.6);
  }
  k.box(-w / 2 + 0.5, 0.9, 5.2, 0.7, 1.8, 3.2, WOOD_DARK);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      k.box(
        -w / 2 + 0.9,
        0.35 + r * 0.55,
        4.0 + c * 1.0,
        0.1,
        0.4,
        0.8,
        [0xffc2d6, 0xc2e5ff, 0xd8ffd0][(r + c) % 3],
      );
  k.solid(-w / 2, -w / 2 + 0.9, 3.5, 6.8);
  for (let i = 0; i < 3; i++)
    k.cyl(w / 2 - 0.5, 0.15, 3.4 + i * 0.55, 0.14, 0.14, 1.0, [0xff5fa2, 0x4aa8ff, 0x2fd3a0][i], Math.PI / 2);
  k.plant(-w / 2 + 0.8, -5.8);
  k.plant(w / 2 - 0.8, 6.0);
  k.poster('E', -4.8, 2.4, 1.4, 1.1, 0xffc2d6);
  k.poster('S', 7.0, 2.4, 1.4, 1.1, 0xc2e5ff);
  const people: Person[] = [
    k.person(-3.5, 1.4, Math.PI, 'dance'),
    k.person(3.5, 1.4, Math.PI, 'dance'),
    k.person(-1.8, 3.0, Math.PI, 'dance'),
    k.person(1.8, 3.0, Math.PI, 'dance'),
    k.person(-5.2, -0.8, Math.PI, 'dance'),
    k.person(5.2, -0.8, Math.PI, 'dance'),
    k.person(-5.2, -4.2, Math.PI, 'stand'),
    k.person(5.8, 1.0, -Math.PI / 2, 'stand'),
  ];
  const extras: ClubExtras = { club: 'dance', play: k.seat(0, -1.0, Math.PI), people };
  return k.finish('dance', extras, k.seat(0, -1.0, Math.PI));
}

/* ============================================================================================ */
/* Debate hall                                                                                  */
/* ============================================================================================ */
const DEBATE_H = 0.25;

function buildDebate(): RoomInterior {
  const k = kitFor('debate');
  const { w, d } = k;
  k.shell({
    floor: 0x4f5d73,
    plank: 0x465267,
    wall: 0xe6ebf2,
    trim: 0x24324a,
    windows: { y: 2.5, h: 1.5, n: 3 },
  });
  const sz1 = -4.2;
  // low stage with front steps
  k.box(0, DEBATE_H / 2, (-d / 2 + sz1) / 2, 17.0, DEBATE_H, sz1 + d / 2, 0x3a2f2a);
  k.box(0, DEBATE_H + 0.01, (-d / 2 + sz1) / 2, 16.8, 0.02, sz1 + d / 2 - 0.2, 0x5a4636);
  k.box(0, 0.08, sz1 + 0.3, 3.0, 0.16, 0.6, 0x3a2f2a);
  // backdrop screen with motion text and two score bars, plus flags
  k.box(0, 3.0, -d / 2 + 0.1, 9.4, 2.6, 0.12, 0x1b2330);
  k.box(0, 3.0, -d / 2 + 0.17, 9.0, 2.2, 0.04, 0x25324a);
  for (let i = 0; i < 4; i++)
    k.box(0, 3.65 - i * 0.28, -d / 2 + 0.2, 6.5 - (i % 2) * 1.5, 0.12, 0.02, 0xf4f1e8);
  k.box(-3.1, 2.15, -d / 2 + 0.2, 2.6, 0.18, 0.02, 0x3d7be0);
  k.box(3.1, 2.15, -d / 2 + 0.2, 2.0, 0.18, 0.02, 0xd94a4a);
  for (const [fx, col] of [
    [-7.6, 0x3d7be0],
    [7.6, 0xd94a4a],
  ] as [number, number][]) {
    k.cyl(fx, DEBATE_H + 1.8, -7.3, 0.05, 0.05, 3.6, 0xcccccc);
    k.box(fx + (fx < 0 ? 0.55 : -0.55), DEBATE_H + 3.1, -7.3, 1.1, 0.8, 0.04, col);
    k.post(fx, -7.3, 0.2);
  }
  // podiums (proposition west, opposition east) and the moderator's table
  const podium = (x: number, col: number) => {
    k.box(x, DEBATE_H + 0.6, -5.6, 1.0, 1.2, 0.7, 0x3a2f2a);
    k.tilt(x, DEBATE_H + 1.28, -5.62, 1.1, 0.06, 0.7, 0x5a4636, 0.35);
    k.box(x, DEBATE_H + 0.7, -5.22, 0.8, 0.45, 0.04, col);
    k.cyl(x + 0.3, DEBATE_H + 1.5, -5.7, 0.02, 0.02, 0.5, 0x222222);
    k.ball(x + 0.3, DEBATE_H + 1.78, -5.7, 0.06, 0x555555);
    k.solid(x - 0.55, x + 0.55, -5.98, -5.22);
  };
  podium(-4.2, 0x3d7be0);
  podium(4.2, 0xd94a4a);
  k.box(0, DEBATE_H + 0.45, -6.0, 3.0, 0.9, 0.9, 0x5a4636);
  k.box(0, DEBATE_H + 0.93, -6.0, 3.2, 0.06, 1.0, 0x7a6048);
  k.box(-0.9, DEBATE_H + 1.0, -5.9, 0.7, 0.08, 0.16, 0xf4efe2);
  k.cyl(0.4, DEBATE_H + 1.03, -5.9, 0.12, 0.12, 0.05, 0x8a5a2a);
  k.box(1.0, DEBATE_H + 1.1, -6.0, 0.4, 0.2, 0.25, 0x16161a);
  k.box(1.0, DEBATE_H + 1.12, -5.87, 0.3, 0.1, 0.02, 0xff4a4a);
  k.solid(-1.6, 1.6, -6.5, -5.5);
  // judges' table (east) and timekeeper desk (west)
  k.box(7.4, 0.4, -0.5, 1.0, 0.8, 4.4, 0x5a4636);
  k.box(7.4, 0.82, -0.5, 1.1, 0.06, 4.5, 0x7a6048);
  for (let i = 0; i < 3; i++) {
    k.box(7.0, 0.9, -1.8 + i * 1.3, 0.2, 0.12, 0.35, [0x3d7be0, 0xffffff, 0xd94a4a][i]);
    k.chair(8.25, -1.8 + i * 1.3, -Math.PI / 2, 0x24324a);
  }
  k.solid(6.9, 7.95, -2.8, 1.8);
  k.box(-7.4, 0.4, -1.2, 1.0, 0.8, 1.8, 0x5a4636);
  k.box(-7.4, 0.82, -1.2, 1.1, 0.06, 1.9, 0x7a6048);
  k.box(-7.4, 1.1, -1.2, 0.5, 0.45, 0.8, 0x16161a);
  k.box(-7.1, 1.1, -1.2, 0.04, 0.3, 0.6, 0xff4a4a);
  k.chair(-8.25, -1.2, Math.PI / 2, 0x24324a);
  k.solid(-7.95, -6.9, -2.2, -0.2);
  // audience: 3 rows of 6 chairs
  const people: Person[] = [
    k.person(0, -7.0, 0, 'sit', DEBATE_H),
    k.person(4.2, -6.8, 0, 'stand', DEBATE_H),
    k.person(8.25, -1.8, -Math.PI / 2, 'sit'),
    k.person(8.25, -0.5, -Math.PI / 2, 'sit'),
    k.person(8.25, 0.8, -Math.PI / 2, 'sit'),
    k.person(-8.25, -1.2, Math.PI / 2, 'sit'),
  ];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 6; c++) {
      const x = -5.2 + c * 2.08;
      const z = 0.2 + r * 1.9;
      k.chair(x, z, Math.PI, 0x3a4a6a);
      if ((r * 6 + c) % 3 !== 2) people.push(k.person(x, z, Math.PI, 'sit'));
    }
  k.chair(0, -6.9 + 0.0, 0, 0x24324a);
  k.plant(-w / 2 + 0.8, d / 2 - 0.8);
  k.plant(w / 2 - 0.8, d / 2 - 0.8);
  k.poster('W', 3.0, 2.4, 1.6, 1.1, 0xc2e5ff);
  k.poster('E', 5.0, 2.4, 1.6, 1.1, 0xffe58a);
  const extras: ClubExtras = {
    club: 'debate',
    play: { ...k.seat(-4.2, -6.7, 0), y: DEBATE_H },
    people,
    floorY: (x, z) => {
      const lx = x - AT.debate[0];
      const lz = z - AT.debate[1];
      if (lz < sz1 && Math.abs(lx) < 8.5) return DEBATE_H;
      if (lz < sz1 + 0.6 && Math.abs(lx) < 1.6) return DEBATE_H / 2;
      return 0;
    },
  };
  return k.finish('debate', extras, k.seat(0, -7.0, 0));
}

/* ============================================================================================ */
/* Sports hall                                                                                  */
/* ============================================================================================ */
function buildSports(): RoomInterior {
  const k = kitFor('sports');
  const { w, d } = k;
  const floor = 0xd6a25c;
  k.shell({ floor, plank: 0xc8944c, wall: 0xf2e9dc, trim: 0xc23a30, windows: { y: 4.6, h: 1.6, n: 4 } });
  // court markings: boundary, halfway line and centre circle, keys, free-throw circles, three-point lines
  const L = 11.5;
  const Wd = 5.2;
  const white = 0xffffff;
  k.line(-L, -Wd, L, -Wd, white);
  k.line(-L, Wd, L, Wd, white);
  k.line(-L, -Wd, -L, Wd, white);
  k.line(L, -Wd, L, Wd, white);
  k.line(0, -Wd, 0, Wd, white);
  k.ring(0, 0, 1.8, white, floor, 0.12);
  for (const s of [-1, 1]) {
    const hx = s * 11.0;
    k.box(s * 9.25, 0.052, 0, 4.5, 0.012, 4.4, 0xc9543c);
    k.line(s * L, -2.2, s * 7.0, -2.2, white);
    k.line(s * L, 2.2, s * 7.0, 2.2, white);
    k.line(s * 7.0, -2.2, s * 7.0, 2.2, white);
    // free-throw circle (only the half that faces the court)
    if (s < 0) k.arc(-7.0, 0, 1.8, -Math.PI / 2, Math.PI / 2, white, 0.1);
    else k.arc(7.0, 0, 1.8, Math.PI / 2, (3 * Math.PI) / 2, white, 0.1);
    // three-point arc plus the straight bits to the baseline
    const a = 1.0;
    if (s < 0) k.arc(hx, 0, 5.4, -a, a, white, 0.1, 18);
    else k.arc(hx, 0, 5.4, Math.PI - a, Math.PI + a, white, 0.1, 18);
    k.line(s * L, 5.4 * Math.sin(a), hx + s * -5.4 * Math.cos(a), 5.4 * Math.sin(a), white, 0.1);
    k.line(s * L, -5.4 * Math.sin(a), hx + s * -5.4 * Math.cos(a), -5.4 * Math.sin(a), white, 0.1);
    // hoop: pole, arm, backboard, rim and net
    k.cyl(s * 12.55, 1.8, 0, 0.1, 0.12, 3.6, 0x555a66);
    k.box(s * 12.1, 3.05, 0, 0.9, 0.12, 0.12, 0x555a66);
    k.box(s * 11.75, 3.15, 0, 0.08, 1.05, 1.8, white);
    k.box(s * 11.7, 3.0, 0, 0.04, 0.45, 0.6, 0xff5a4a);
    k.cyl(s * 11.35, 2.7, 0, 0.26, 0.26, 0.05, 0xff7a2f);
    k.cyl(s * 11.35, 2.45, 0, 0.24, 0.12, 0.42, 0xeeeeee);
    k.post(s * 12.55, 0, 0.35);
  }
  // bleachers along the north wall (4 tiers) with seated fans
  const people: Person[] = [];
  for (let i = 0; i < 4; i++) {
    const h = (4 - i) * 0.45;
    const zc = -d / 2 + 0.45 + i * 0.8;
    k.box(0, h / 2, zc, 15, h, 0.8, 0x8a8f9a);
    k.box(0, h + 0.02, zc, 15, 0.04, 0.8, 0xc9a56a);
    for (const x of [-4.5, -1.5, 2.0, 5.0])
      if ((i + Math.floor(x)) % 2 === 0) people.push(k.person(x, zc, 0, 'sit', h));
  }
  k.solid(-7.5, 7.5, -d / 2, -d / 2 + 3.2);
  // scoreboard and championship banners
  k.box(0, 5.2, -d / 2 + 0.12, 5.2, 1.5, 0.2, 0x15171c);
  k.box(-1.4, 5.3, -d / 2 + 0.24, 1.2, 0.8, 0.03, 0xff4a4a);
  k.box(1.4, 5.3, -d / 2 + 0.24, 1.2, 0.8, 0.03, 0xffd23a);
  for (const bx of [-9.5, -6.5, 6.5, 9.5]) {
    k.box(bx, 4.2, -d / 2 + 0.1, 1.6, 1.8, 0.05, [0xc23a30, 0xe3b53c][Math.abs(bx) > 8 ? 0 : 1]);
    k.box(bx, 4.2, -d / 2 + 0.14, 1.0, 0.3, 0.02, 0xffffff);
  }
  // lockers and benches (south wall, west of the door)
  for (let i = 0; i < 8; i++) {
    const x = -12.2 + i * 1.05;
    k.box(x, 1.05, d / 2 - 0.4, 0.95, 2.1, 0.55, i % 2 ? 0x3a6ea5 : 0x2f5785);
    k.box(x + 0.25, 1.2, d / 2 - 0.68, 0.06, 0.3, 0.02, 0xdddddd);
  }
  k.solid(-12.7, -3.7, d / 2 - 0.75, d / 2);
  k.box(-8.2, 0.25, d / 2 - 1.5, 8.0, 0.1, 0.5, 0x8a6a4a);
  k.solid(-12.2, -4.2, d / 2 - 1.8, d / 2 - 1.2);
  // ball rack, cones and a stack of mats (south wall, east of the door)
  k.box(4.2, 0.55, d / 2 - 0.8, 2.6, 1.1, 0.8, 0x555a66);
  for (let i = 0; i < 5; i++)
    k.ball(3.2 + i * 0.5, 1.28, d / 2 - 0.8, 0.22, [0xff7a2f, 0xffffff, 0x3d7be0, 0xff7a2f, 0x2fd3a0][i]);
  k.solid(2.8, 5.6, d / 2 - 1.3, d / 2);
  for (let i = 0; i < 3; i++) k.cyl(6.3 + i * 0.45, 0.17, d / 2 - 1.2, 0, 0.17, 0.34, 0xff7a2f);
  for (let i = 0; i < 4; i++)
    k.box(8.2, 0.12 + i * 0.22, d / 2 - 1.2, 2.4, 0.2, 1.4, [0x3d7be0, 0x2f6fd0][i % 2]);
  k.solid(7.0, 9.4, d / 2 - 1.9, d / 2 - 0.5);
  // weights corner (south-east): dumbbell rack, bench press, barbell
  k.box(11.6, 0.6, 6.6, 1.0, 1.2, 2.6, 0x3a3f4a);
  for (let i = 0; i < 4; i++) {
    k.ball(11.4, 1.35, 5.7 + i * 0.6, 0.2, 0x222226);
    k.box(11.4, 1.35, 5.7 + i * 0.6, 0.5, 0.06, 0.06, 0x999999);
  }
  k.solid(11.0, 12.5, 5.2, 8.0);
  k.box(9.6, 0.4, 7.0, 0.5, 0.1, 1.5, 0x16161a);
  k.cyl(9.6, 1.1, 7.0, 0.03, 0.03, 2.2, 0xcfcfcf, 0, Math.PI / 2);
  for (const sz of [-1, 1]) k.cyl(9.6 + sz * 0.95, 1.1, 7.0, 0.22, 0.22, 0.08, 0x222226, 0, Math.PI / 2);
  k.solid(8.5, 10.8, 6.1, 7.9);
  k.plant(-w / 2 + 0.8, -3.8);
  k.plant(w / 2 - 0.8, -3.8);
  // players on court, a coach on the sideline, two lifting weights
  people.push(
    k.person(-6.0, -2.4, Math.PI / 2, 'play'),
    k.person(-5.4, 2.2, Math.PI / 2, 'play'),
    k.person(-8.4, 0.2, Math.PI / 2, 'play'),
    k.person(5.8, -2.2, -Math.PI / 2, 'play'),
    k.person(6.4, 2.4, -Math.PI / 2, 'play'),
    k.person(8.6, -0.4, -Math.PI / 2, 'play'),
    k.person(1.5, 4.2, Math.PI, 'stand'),
    k.person(10.4, 5.0, Math.PI, 'play'),
  );
  const extras: ClubExtras = { club: 'sports', play: k.seat(0, 0.2, Math.PI / 2), people };
  return k.finish('sports', extras, k.seat(1.5, 4.2, Math.PI));
}

/** The lobby and the five club rooms, ready to be added to the scene. */
export function buildClubhouse(): Record<'clubhall' | ClubId, RoomInterior> {
  return {
    clubhall: buildHall(),
    chess: buildChess(),
    music: buildMusic(),
    dance: buildDance(),
    debate: buildDebate(),
    sports: buildSports(),
  };
}
