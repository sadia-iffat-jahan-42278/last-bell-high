// Walk-in canteen interior: serving counter and kitchen, long dining tables with benches, vending machines,
// a campus store corner and a tray return. Built once, far outside the campus, as one merged mesh.
import { Group, Mesh, MeshLambertMaterial } from 'three';
import type { Bounds, Collider } from '../world/collision';
import type { Point } from '../world/layout';
import { Batch } from './batch';
import type { RoomInterior, Seat } from './rooms';

export const CANTEEN_AT: [number, number] = [125, 225];
const W = 26;
const D = 20;
const H = 4.4;

const C = {
  floorA: 0xefe6d2,
  floorB: 0xd9ccb0,
  wall: 0xfbf0d8,
  trim: 0xc9742f,
  tile: 0xe6efe9,
  steel: 0xc3c9cf,
  steelDark: 0x7d858e,
  counter: 0xd96a28,
  counterTop: 0xf3ead7,
  table: 0xe2c79a,
  tableEdge: 0xa9794a,
  bench: 0x2f7d86,
  metal: 0x3a3f4a,
  sky: 0x9fd2ff,
  door: 0x6b4a2f,
  plant: 0x3e8a3a,
  pot: 0xb36a4a,
  dark: 0x20242a,
  screen: 0x7fd0ff,
};

export function buildCanteen(): RoomInterior {
  const [ox, oz] = CANTEEN_AT;
  const B = new Batch();
  const colliders: Collider[] = [];
  const box = (x: number, y: number, z: number, bw: number, bh: number, bd: number, col: number, ry = 0) =>
    B.box(ox + x, y, oz + z, bw, bh, bd, col, ry);
  const cyl = (x: number, y: number, z: number, rt: number, rb: number, h: number, col: number, rx = 0) =>
    B.cyl(ox + x, y, oz + z, rt, rb, h, col, 12, true, rx);
  const solid = (x0: number, x1: number, z0: number, z1: number) =>
    colliders.push({ t: 'b', x0: ox + x0, x1: ox + x1, z0: oz + z0, z1: oz + z1 });
  const post = (x: number, z: number, r: number) => colliders.push({ t: 'c', x: ox + x, z: oz + z, r });
  const world = (x: number, z: number, yaw: number): Seat => ({ x: ox + x, z: oz + z, yaw });

  /* ---- shell: checkered floor, walls, door, windows ---- */
  box(0, -0.03, 0, W + 0.6, 0.12, D + 0.6, C.floorA);
  for (let i = 0; i < W / 2; i++)
    for (let j = 0; j < D / 2; j++)
      if ((i + j) % 2 === 0) box(-W / 2 + 1 + i * 2, 0.04, -D / 2 + 1 + j * 2, 2, 0.02, 2, C.floorB);
  box(0, H / 2, -D / 2 - 0.15, W + 0.6, H, 0.3, C.wall); // north (kitchen wall)
  box(0, H / 2, D / 2 + 0.15, W + 0.6, H, 0.3, C.wall); // south (door wall)
  box(-W / 2 - 0.15, H / 2, 0, 0.3, H, D, C.wall);
  box(W / 2 + 0.15, H / 2, 0, 0.3, H, D, C.wall);
  for (const sz of [-1, 1]) box(0, 0.18, sz * (D / 2 - 0.02), W, 0.36, 0.06, C.trim); // skirting
  for (const sx of [-1, 1]) box(sx * (W / 2 - 0.02), 0.18, 0, 0.06, 0.36, D, C.trim);
  box(0, H + 0.08, -D / 2 - 0.15, W + 0.8, 0.16, 0.46, C.trim); // wall caps
  box(0, H + 0.08, D / 2 + 0.15, W + 0.8, 0.16, 0.46, C.trim);
  box(-W / 2 - 0.15, H + 0.08, 0, 0.46, 0.16, D + 0.4, C.trim);
  box(W / 2 + 0.15, H + 0.08, 0, 0.46, 0.16, D + 0.4, C.trim);
  box(0, 0.9, -D / 2 + 0.03, W, 1.8, 0.05, C.tile); // tiled kitchen wall
  // tall windows high on both side walls (above the vending machines and store shelves)
  for (const sx of [-1, 1])
    for (const z of [-6.5, -3, 0.5, 4, 7.5]) {
      box(sx * (W / 2 - 0.02), 2.9, z, 0.1, 1.5, 2.2, 0xffffff);
      box(sx * (W / 2 - 0.08), 2.9, z, 0.1, 1.3, 2.0, C.sky);
      box(sx * (W / 2 - 0.1), 2.9, z, 0.1, 1.3, 0.07, 0xffffff);
    }
  // entrance door
  box(0, 1.35, D / 2 - 0.03, 2.2, 2.7, 0.1, 0xffffff);
  box(-0.5, 1.3, D / 2 - 0.08, 0.95, 2.6, 0.1, C.door);
  box(0.5, 1.3, D / 2 - 0.08, 0.95, 2.6, 0.1, C.door);
  box(0, 3.0, D / 2 - 0.1, 1.1, 0.3, 0.1, 0x2fd3a0); // EXIT sign
  // wall clock over the dining room
  cyl(7.5, 3.5, -D / 2 + 0.12, 0.38, 0.38, 0.06, 0xffffff, Math.PI / 2);
  box(7.5, 3.58, -D / 2 + 0.17, 0.04, 0.28, 0.02, 0x222222);
  box(7.58, 3.5, -D / 2 + 0.17, 0.2, 0.04, 0.02, 0x222222);

  /* ---- kitchen (behind the counter) ---- */
  // menu board with item and price bars
  box(0, 3.3, -D / 2 + 0.1, 14.4, 1.7, 0.1, C.dark);
  box(0, 3.3, -D / 2 + 0.16, 14, 1.4, 0.04, 0x25382f);
  box(0, 3.85, -D / 2 + 0.2, 5, 0.2, 0.02, 0xffb347); // title bar
  for (let i = 0; i < 5; i++) {
    const y = 3.5 - i * 0.22;
    for (const sx of [-1, 1]) {
      box(sx * 3.7 - 0.6, y, -D / 2 + 0.2, 2.4 - (i % 3) * 0.3, 0.1, 0.02, 0xf4f1e8); // dish name
      box(sx * 3.7 + 1.9, y, -D / 2 + 0.2, 0.6, 0.1, 0.02, 0xffd23a); // price
    }
  }
  // stove with extractor hood
  box(-10.2, 0.5, -D / 2 + 0.9, 3.2, 1.0, 1.4, C.steel);
  box(-10.2, 1.02, -D / 2 + 0.9, 3.2, 0.06, 1.4, C.steelDark);
  for (const [px, col] of [
    [-11, 0xb0b6bd],
    [-9.4, 0xd96a28],
  ] as [number, number][])
    cyl(px, 1.28, -D / 2 + 0.9, 0.38, 0.34, 0.45, col);
  box(-10.2, 3.0, -D / 2 + 0.85, 3.4, 1.0, 1.3, C.steel);
  box(-10.2, 3.9, -D / 2 + 0.6, 0.9, 1.0, 0.8, C.steelDark);
  solid(-11.9, -8.5, -D / 2, -D / 2 + 1.7);
  // steel prep table
  box(2.5, 0.45, -D / 2 + 1.6, 5.4, 0.9, 1.4, C.steel);
  box(2.5, 0.93, -D / 2 + 1.6, 5.5, 0.06, 1.5, C.steelDark);
  for (let i = 0; i < 4; i++)
    box(0.5 + i * 1.3, 1.05, -D / 2 + 1.6, 0.8, 0.18, 0.6, [0xe55d4a, 0x4aa84a, 0xffd23a, 0xf4f1e8][i]);
  // tall fridge and shelf
  box(10.6, 1.1, -D / 2 + 0.75, 1.7, 2.2, 1.3, 0xe8eef0);
  box(9.85, 1.2, -D / 2 + 1.42, 0.06, 0.8, 0.06, C.steelDark);
  box(7.3, 1.6, -D / 2 + 0.3, 2.6, 0.08, 0.5, 0x7a5232);
  for (let i = 0; i < 5; i++)
    cyl(
      6.4 + i * 0.45,
      1.85,
      -D / 2 + 0.3,
      0.14,
      0.14,
      0.4,
      [0xc23b3b, 0xd9a520, 0x2f7a4b, 0xf4f1e8, 0x7a4fb5][i],
    );

  /* ---- serving counter ---- */
  box(0, 0.55, -5.3, 21, 1.1, 1.2, C.counter);
  box(0, 1.13, -5.3, 21.3, 0.08, 1.4, C.counterTop);
  box(0, 0.12, -4.66, 21, 0.24, 0.1, C.steelDark); // kick rail
  // tray slide rail in front of the counter
  box(-3.5, 0.96, -4.4, 13, 0.05, 0.5, C.steel);
  for (const x of [-9.8, -3.5, 2.8]) box(x, 0.5, -4.4, 0.07, 1.0, 0.07, C.steelDark);
  // hot food wells with sneeze-guard frames
  const pans: [number, number][] = [
    [-9.2, 0xf4f1e8], // rice
    [-6.9, 0xe0a020], // curry
    [-4.6, 0xe8c070], // noodles
    [-2.3, 0x4aa84a], // salad
    [0, 0xd99a5a], // sandwiches
  ];
  for (const [x, col] of pans) {
    box(x, 1.2, -5.3, 2.1, 0.1, 0.95, C.steel);
    box(x, 1.28, -5.3, 1.8, 0.06, 0.7, col);
    for (const sx of [-1, 1]) box(x + sx * 1.0, 1.55, -4.88, 0.05, 0.6, 0.05, C.steelDark);
    box(x, 1.85, -4.88, 2.1, 0.05, 0.05, C.steelDark);
  }
  // sandwich and pastry display, cashier till, coffee machine, tray stack
  for (let i = 0; i < 4; i++)
    box(1.7 + i * 0.5, 1.3, -5.3, 0.4, 0.14, 0.3, [0xd99a5a, 0xf0d28a, 0xc97a3a, 0xf0d28a][i]);
  box(5.2, 1.4, -5.3, 1.0, 0.36, 0.7, C.dark); // register
  box(5.2, 1.5, -5.18, 0.8, 0.3, 0.04, C.screen);
  box(5.2, 1.22, -4.85, 0.35, 0.05, 0.22, 0x4a4f5a); // card reader
  box(7.6, 1.5, -5.3, 0.8, 0.8, 0.8, C.dark); // coffee machine
  box(7.6, 1.6, -4.88, 0.5, 0.1, 0.04, 0xff5a4a);
  cyl(7.6, 1.2, -4.98, 0.12, 0.1, 0.2, 0xffffff);
  box(9.5, 1.5, -5.3, 0.7, 0.6, 0.5, 0xc2c7cc); // tray stack
  for (let i = 0; i < 4; i++) box(9.5, 1.3 + i * 0.1, -5.3, 0.7, 0.05, 0.5, 0x8e949c);
  solid(-W / 2, W / 2, -D / 2, -4.7); // kitchen and counter

  /* ---- dining: three long tables per row, two rows, benches on both sides ---- */
  const seats: Seat[] = [];
  const bench = (x: number, z: number, yaw: number): void => {
    box(x, 0.46, z, 3.8, 0.1, 0.5, C.bench);
    for (const sx of [-1, 1]) box(x + sx * 1.7, 0.22, z, 0.08, 0.44, 0.4, C.metal);
    solid(x - 1.9, x + 1.9, z - 0.28, z + 0.28);
    for (const k of [-1.2, 0, 1.2]) seats.push(world(x + k, z, yaw));
  };
  for (const tz of [-0.8, 3.6])
    for (const tx of [-6.2, -0.9, 4.4]) {
      box(tx, 0.76, tz, 4.1, 0.08, 1.1, C.table);
      box(tx, 0.7, tz, 4.1, 0.05, 1.1, C.tableEdge);
      for (const sx of [-1, 1]) box(tx + sx * 1.8, 0.38, tz, 0.1, 0.76, 0.9, C.metal);
      solid(tx - 2.05, tx + 2.05, tz - 0.55, tz + 0.55);
      // napkin holder, salt and a tiny vase
      box(tx - 0.8, 0.88, tz, 0.16, 0.16, 0.12, 0xc9ccd6);
      cyl(tx + 0.6, 0.88, tz + 0.1, 0.05, 0.05, 0.16, 0xffffff);
      cyl(tx + 1.3, 0.9, tz - 0.1, 0.06, 0.05, 0.2, 0x4aa8ff);
      B.sphere(ox + tx + 1.3, 1.08, oz + tz - 0.1, 0.1, 0xff7aa8, 6, 5);
      bench(tx, tz - 1.15, 0); // north bench: sitters face +z
      bench(tx, tz + 1.15, Math.PI);
    }

  /* ---- vending machines (west wall) ---- */
  for (const [z, col, panel] of [
    [-1.5, 0xc23a30, 0xffe1dc],
    [0, 0x2f6fd0, 0xd9e8ff],
  ] as [number, number, number][]) {
    box(-12.1, 0.95, z, 1.0, 1.9, 1.3, col);
    box(-11.57, 1.2, z, 0.06, 1.1, 1.0, panel);
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3; k++)
        box(
          -11.52,
          0.95 + r * 0.3,
          z - 0.32 + k * 0.32,
          0.04,
          0.18,
          0.18,
          [0xff5a4a, 0xffd23a, 0x4aa8ff, 0x2fd3a0][(r + k) % 4],
        );
    box(-11.55, 0.3, z, 0.06, 0.3, 0.8, C.dark); // pickup flap
  }
  solid(-12.7, -11.5, -2.2, 0.7);

  /* ---- campus store corner (east wall) ---- */
  box(12.2, 1.0, 0.6, 1.0, 2.0, 5.2, 0x7a5232);
  for (let s = 0; s < 4; s++)
    for (let k = 0; k < 8; k++)
      box(
        11.65,
        0.35 + s * 0.45,
        -1.6 + k * 0.62,
        0.3,
        0.32,
        0.42,
        [0xffd23a, 0x4aa8ff, 0xff7aa8, 0x2fd3a0, 0xc23b3b][(s * 3 + k) % 5],
      );
  solid(11.5, 12.9, -2.2, 3.4);
  box(9.7, 0.55, 0.5, 1.0, 1.1, 3.6, C.counter); // shop counter
  box(9.7, 1.13, 0.5, 1.2, 0.08, 3.8, C.counterTop);
  box(9.7, 1.4, 1.2, 0.7, 0.34, 0.6, C.dark);
  box(9.55, 1.5, 1.2, 0.04, 0.26, 0.5, C.screen);
  for (let i = 0; i < 3; i++)
    box(9.7, 1.3, -0.6 + i * 0.5, 0.4, 0.18, 0.3, [0xffd23a, 0xff7aa8, 0x4aa8ff][i]);
  solid(9.1, 10.3, -1.5, 2.6);
  box(12.9, 3.3, 0.6, 0.1, 0.7, 3.8, 0xff9a3c); // CAMPUS STORE sign
  box(12.82, 3.3, 0.6, 0.06, 0.4, 2.8, 0xfff2cf);

  /* ---- tray return, bins, water cooler, plants, posters ---- */
  box(-12.1, 0.6, 6.4, 1.0, 1.2, 2.2, C.steel);
  for (let s = 0; s < 3; s++) box(-11.95, 0.35 + s * 0.38, 6.4, 0.7, 0.05, 1.9, 0x9aa1a9);
  box(-12.9, 1.55, 6.4, 0.1, 0.35, 1.6, 0x2f7d86); // TRAYS sign
  solid(-12.7, -11.5, 5.2, 7.6);
  for (const [z, col] of [
    [8.2, 0x3a8a4a],
    [8.9, 0x3a6fd0],
    [9.5, 0x6b6f7a],
  ] as [number, number][]) {
    cyl(-12.2, 0.45, z, 0.28, 0.24, 0.9, col);
    post(-12.2, z, 0.34);
  }
  box(-12.2, 0.8, 3.7, 0.5, 1.6, 0.5, 0xe8eef0); // water cooler
  cyl(-12.2, 1.75, 3.7, 0.2, 0.2, 0.5, 0x7fc8ff);
  solid(-12.5, -11.9, 3.4, 4.0);
  for (const sx of [-1, 1]) {
    cyl(sx * (W / 2 - 0.8), 0.3, D / 2 - 0.8, 0.32, 0.26, 0.6, C.pot);
    B.sphere(ox + sx * (W / 2 - 0.8), 1.05, oz + D / 2 - 0.8, 0.55, C.plant, 8, 6);
    post(sx * (W / 2 - 0.8), D / 2 - 0.8, 0.42);
  }
  for (const [x, col] of [
    [-6, 0xffc2d6],
    [-3.2, 0xc2e5ff],
    [3.2, 0xffe58a],
    [6, 0xd8ffd0],
  ] as [number, number][])
    box(x, 2.0, D / 2 - 0.05, 0.9, 1.2, 0.05, col);

  const geo = B.build();
  const mesh = new Mesh(geo, new MeshLambertMaterial({ vertexColors: true }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.matrixAutoUpdate = false;
  const group = new Group();
  group.add(mesh);
  group.visible = false;

  const point = (x: number, z: number): Point => ({ x: ox + x, z: oz + z });
  const bounds: Bounds = {
    x0: ox - W / 2 + 0.6,
    x1: ox + W / 2 - 0.6,
    z0: oz - D / 2 + 0.6,
    z1: oz + D / 2 - 0.5,
  };
  return {
    kind: 'canteen',
    group,
    colliders,
    bounds,
    spawn: point(0, D / 2 - 3),
    door: point(0, D / 2 - 0.7),
    prof: world(-4.5, -6.9, 0), // the server at the hot-food counter
    seats,
    playerSeat: -1,
    centre: point(0, 0),
    size: { w: W, d: D },
    extras: {
      order: point(-4.5, -3.6),
      store: point(8.4, 0.5),
      vending: point(-10.7, -0.7),
      staff: [world(-4.5, -6.9, 0), world(5.2, -6.9, 0), world(-10.2, -7.9, Math.PI)],
    },
  };
}
