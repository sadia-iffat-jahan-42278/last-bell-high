// Builds the 3D campus: static geometry (merged for speed), collision shapes and animated props.
import { Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, type BufferGeometry } from 'three';
import { Batch } from './batch';
import { SH, part } from './parts';
import { mulberry32 } from '../core/util';
import type { Collider } from '../world/collision';
import {
  BUILDINGS,
  CATS,
  CROWD_POINTS,
  HANGOUTS,
  NOTICE,
  PLAZA,
  ROOF_STAIRS,
  STARS,
  ZONES,
  type Building,
} from '../world/layout';
import type { LightState } from '../world/lighting';
import { lin } from '../world/lighting';

/** Areas where random decoration (trees) must not be placed: a circle or a rectangle. */
type Keepout =
  | { c: true; x: number; z: number; r: number }
  | { c?: false; x0: number; x1: number; z0: number; z1: number };

/** The static campus geometry in four merged layers, plus the colliders produced alongside it. */
export function buildCampusGeometry() {
  const Gd = new Batch(); // ground & paths
  const S = new Batch(); // solid scenery
  const W = new Batch(); // windows (lit at night)
  const LG = new Batch(); // lamp glass (glows at night)
  const rng = mulberry32(2024);
  const colliders: Collider[] = [];
  const box = (x0: number, x1: number, z0: number, z1: number) => colliders.push({ t: 'b', x0, x1, z0, z1 });
  const circ = (x: number, z: number, r: number) => colliders.push({ t: 'c', x, z, r });
  const keepout: Keepout[] = []; // circles/rects where random decoration must not be placed

  // ground
  Gd.box(0, -0.25, 0, 520, 0.5, 520, 0x86c36e);
  for (let i = 0; i < 260; i++) {
    const x = (rng() - 0.5) * 130,
      z = (rng() - 0.5) * 130,
      w = 3 + rng() * 9,
      d = 3 + rng() * 9;
    Gd.box(x, 0.012 + rng() * 0.012, z, w, 0.02, d, [0x7dbb66, 0x90cc78, 0x78b860, 0x8bc873][i % 4]);
  }
  // pavement
  const paveC = 0xe2dac9,
    paveEdge = 0xb9b09e;
  const path = (x0: number, x1: number, z0: number, z1: number, y = 0.04) => {
    Gd.box((x0 + x1) / 2, y - 0.01, (z0 + z1) / 2, x1 - x0 + 0.5, 0.04, z1 - z0 + 0.5, paveEdge);
    Gd.box((x0 + x1) / 2, y, (z0 + z1) / 2, x1 - x0, 0.05, z1 - z0, paveC);
    keepout.push({ x0: x0 - 1, x1: x1 + 1, z0: z0 - 1, z1: z1 + 1 });
  };
  path(-4.5, 4.5, -24, 49);
  path(-25, -4.5, -9.8, -6.2);
  path(4.5, 25, -9.8, -6.2);
  path(-25, -4.5, 12.2, 15.8);
  path(4.5, 24, 24.2, 27.8); // to the Club House
  path(-12, 12, -25, -20.5); // front steps area
  path(12.5, 17.5, -21, -16); // roof tower landing
  path(-25, -4.5, 36.2, 39.8); // Smith Hall
  path(-38.8, -35.2, -26, -17.2); // Newton Hall
  path(-38.8, -4.5, -20.8, -17.2);
  path(35.2, 38.8, -26, -17.2); // Lovelace Hall
  path(4.5, 38.8, -20.8, -17.2);
  Gd.cyl(PLAZA.x, 0.03, PLAZA.z, PLAZA.r + 0.5, PLAZA.r + 0.5, 0.05, paveEdge, 40);
  Gd.cyl(PLAZA.x, 0.06, PLAZA.z, PLAZA.r, PLAZA.r, 0.05, paveC, 40);
  Gd.cyl(PLAZA.x, 0.09, PLAZA.z, 7.2, 7.2, 0.04, 0xd2c8b2, 40);
  Gd.cyl(PLAZA.x, 0.1, PLAZA.z, 6.6, 6.6, 0.04, 0xe9e2d3, 40);
  keepout.push({ c: true, x: PLAZA.x, z: PLAZA.z, r: PLAZA.r + 1 });
  /* --- buildings --- */
  const darker = (hex: number, f: number) => {
    const r = ((hex >> 16) & 255) * f,
      g = ((hex >> 8) & 255) * f,
      b = (hex & 255) * f;
    return (r << 16) | (g << 8) | b;
  };
  function windowsFor(b: Building) {
    const faces = [
      { nx: 0, nz: 1 },
      { nx: 0, nz: -1 },
      { nx: 1, nz: 0 },
      { nx: -1, nz: 0 },
    ];
    const ww = 1.5,
      wh = 1.8,
      rows = b.floors ?? Math.max(1, Math.floor((b.h - 2) / 3.6));
    for (const f of faces) {
      const alongX = f.nz !== 0,
        len = alongX ? b.w : b.d,
        n = Math.max(1, Math.floor((len - 3) / 3.8));
      for (let r = 0; r < rows; r++) {
        const y = b.floors ? 0.7 + (r + 0.5) * ((b.h - 0.7) / rows) : 2.5 + r * 3.7;
        for (let i = 0; i < n; i++) {
          const t = ((i + 0.5) / n) * len - len / 2;
          const x = alongX ? b.cx + t : b.cx + f.nx * (b.w / 2),
            z = alongX ? b.cz + f.nz * (b.d / 2) : b.cz + t;
          if (
            b.door.dx === f.nx &&
            b.door.dz === f.nz &&
            Math.abs(alongX ? x - b.door.x : z - b.door.z) < b.door.w / 2 + 1.6 &&
            y < b.door.h + 2.8
          )
            continue;
          if (b.id === 'main' && f.nz === 1 && Math.abs(x - ROOF_STAIRS.x) < 3.4 && y < 12) continue;
          const px = x + f.nx * 0.05,
            pz = z + f.nz * 0.05;
          if (alongX) {
            S.box(px, y, pz, ww + 0.35, wh + 0.35, 0.1, 0xffffff);
            W.box(px, y, pz + f.nz * 0.05, ww, wh, 0.1, 0xffffff);
            S.box(px, y - wh / 2 - 0.25, pz + f.nz * 0.1, ww + 0.7, 0.14, 0.4, 0xeeeeee);
          } else {
            S.box(px, y, pz, 0.1, wh + 0.35, ww + 0.35, 0xffffff);
            W.box(px + f.nx * 0.05, y, pz, 0.1, wh, ww, 0xffffff);
            S.box(px + f.nx * 0.1, y - wh / 2 - 0.25, pz, 0.4, 0.14, ww + 0.7, 0xeeeeee);
          }
        }
      }
    }
  }
  function building(b: Building) {
    const { cx, cz, w, d, h } = b;
    S.box(cx, 0.25, cz, w + 0.8, 0.5, d + 0.8, 0x9a9388);
    S.box(cx, h / 2 + 0.2, cz, w, h - 0.4, d, b.wall);
    S.box(cx, 0.9, cz, w + 0.25, 0.8, d + 0.25, darker(b.wall, 0.82));
    S.box(cx, h - 0.35, cz, w + 0.5, 0.5, d + 0.5, b.trim);
    // a band of trim between every pair of storeys
    if (b.floors)
      for (let f = 1; f < b.floors; f++) S.box(cx, (f * h) / b.floors, cz, w + 0.4, 0.28, d + 0.4, b.trim);
    windowsFor(b);
    const dr = b.door,
      dw = dr.w,
      dh = dr.h,
      alongZ = dr.dz !== 0;
    const dxp = dr.x + dr.dx * 0.06,
      dzp = dr.z + dr.dz * 0.06;
    const sz = (a: number, bb: number): [number, number, number] => (alongZ ? [a, bb, 0.35] : [0.35, bb, a]);
    const fr = sz(dw + 0.7, dh + 0.5),
      dd = sz(dw, dh);
    S.box(dxp, dh / 2 + 0.25, dzp, fr[0], fr[1], fr[2], b.accent);
    S.box(dxp + dr.dx * 0.08, dh / 2 + 0.1, dzp + dr.dz * 0.08, dd[0], dd[1], dd[2], 0x5a3a24);
    S.box(
      dxp + dr.dx * 0.3,
      dh / 2 + 0.1,
      dzp + dr.dz * 0.3,
      alongZ ? 0.06 : 0.1,
      dh,
      alongZ ? 0.1 : 0.06,
      0x3e2716,
    );
    S.box(
      dxp + dr.dx * 0.3 + (alongZ ? 0.5 : 0),
      1.8,
      dzp + dr.dz * 0.3 + (alongZ ? 0 : 0.5),
      0.14,
      0.14,
      0.14,
      0xffd24a,
    );
    for (let s = 0; s < 3; s++) {
      const o = 0.7 + s * 0.65,
        sw = dw + 1.6 + s * 1.2;
      const q = alongZ ? [sw, 0.16 - s * 0.04 + 0.05, 0.7] : [0.7, 0.16 - s * 0.04 + 0.05, sw];
      S.box(dr.x + dr.dx * (o + 0.1), 0.1, dr.z + dr.dz * (o + 0.1), q[0], q[1], q[2], 0xc9c1b0);
    }
    const sg = sz(dw + 2.4, 1.0);
    S.box(dxp + dr.dx * 0.1, dh + 1.15, dzp + dr.dz * 0.1, sg[0], sg[1], sg[2], b.accent);
    box(cx - w / 2 - 0.1, cx + w / 2 + 0.1, cz - d / 2 - 0.1, cz + d / 2 + 0.1);
    keepout.push({ x0: cx - w / 2 - 3, x1: cx + w / 2 + 3, z0: cz - d / 2 - 3, z1: cz + d / 2 + 3 });
    // roofs & signature details
    const ridgeAlongX = w >= d,
      span = ridgeAlongX ? d : w,
      len = ridgeAlongX ? w : d;
    const pitched = (rh: number, col: number) =>
      S.roof(cx, h + rh / 2 - 0.1, cz, span + 1.6, rh, len + 1.6, col, ridgeAlongX ? Math.PI / 2 : 0);
    if (b.id === 'main') {
      S.box(cx, h + 0.15, cz, w + 0.8, 0.5, d + 0.8, b.roof);
      for (const [px, pz, pw, pd] of [
        [0, d / 2 + 0.2, w + 1, 0.4],
        [0, -d / 2 - 0.2, w + 1, 0.4],
        [w / 2 + 0.2, 0, 0.4, d + 1],
        [-w / 2 - 0.2, 0, 0.4, d + 1],
      ])
        S.box(cx + px, h + 0.75, cz + pz, pw, 0.8, pd, b.trim);
      S.box(cx, h + 4.6, cz, 6.4, 9, 6.4, b.wall);
      S.box(cx, h + 9, cz, 7, 0.7, 7, b.trim);
      S.cyl(cx, h + 12, cz, 0, 4.9, 5.4, b.roof, 4, false, 0, 0, Math.PI / 4);
      S.cyl(cx, h + 15.2, cz, 0.06, 0.06, 1.6, 0xd9b44a, 6);
      for (const [dx, dz] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const px = cx + dx * 3.25,
          pz = cz + dz * 3.25,
          y = h + 6.2;
        S.cyl(px, y, pz, 1.5, 1.5, 0.15, 0xfffdf4, 20, true, dz ? Math.PI / 2 : 0, dx ? Math.PI / 2 : 0);
        S.box(px + dx * 0.12, y + 0.3, pz + dz * 0.12, dz ? 0.1 : 0.06, 0.8, dx ? 0.1 : 0.06, 0x222222);
        S.box(
          px + dx * 0.12 + dz * 0.4 * 0,
          y,
          pz + dz * 0.12,
          dz ? 0.6 : 0.06,
          0.1,
          dx ? 0.6 : 0.06,
          0x222222,
        );
        for (let k = 0; k < 4; k++)
          S.box(
            px + dx * 0.1 + (dz ? Math.cos(k * 1.57) * 1.25 : 0),
            y + Math.sin(k * 1.57) * 1.25,
            pz + dz * 0.1 + (dx ? Math.cos(k * 1.57) * 1.25 : 0),
            0.14,
            0.14,
            0.14,
            0x555555,
          );
      }
      // rooftop stair tower
      const TH = h + 1;
      S.box(ROOF_STAIRS.x, TH / 2, ROOF_STAIRS.z, 4, TH, 4, b.wall);
      S.box(ROOF_STAIRS.x, TH + 0.2, ROOF_STAIRS.z, 5, 0.5, 5, b.roof);
      S.box(ROOF_STAIRS.x, 2.1, ROOF_STAIRS.door.z + 0.05, 2.2, 3.4, 0.3, 0x3e5f8a);
      S.box(ROOF_STAIRS.x, 3.9, ROOF_STAIRS.door.z + 0.1, 3.0, 0.9, 0.3, 0x3d7be0);
      S.box(ROOF_STAIRS.x, 0.1, ROOF_STAIRS.door.z + 1.2, 3.6, 0.16, 1.4, 0xc9c1b0);
      for (const y of [6, 9.5, 13, 16.5, 20].filter((v) => v < TH - 1))
        (S.box(ROOF_STAIRS.x, y, ROOF_STAIRS.door.z + 0.04, 1, 1.2, 0.1, 0xffffff),
          W.box(ROOF_STAIRS.x, y, ROOF_STAIRS.door.z + 0.1, 0.8, 1, 0.1, 0xffffff));
      box(ROOF_STAIRS.x - 2.1, ROOF_STAIRS.x + 2.1, ROOF_STAIRS.z - 2.1, ROOF_STAIRS.z + 2.1);
      // flag
      S.cyl(-14, 4.5, -20, 0.08, 0.1, 9, 0xcccccc, 6);
      S.box(-13.1, 8.4, -20, 1.8, 1.1, 0.06, 0xd94a3a);
      circ(-14, -20, 0.4);
    } else if (b.id === 'canteen') {
      pitched(2.6, b.roof);
      S.box(cx + 4, h + 2.2, cz - 2, 1.2, 2.6, 1.2, 0x9a6a50);
      // striped awning above the door
      for (let k = -3; k <= 3; k++)
        S.wedge(
          b.door.x + b.door.dx * 1.5,
          4.6,
          b.door.z + k * 0.9,
          3,
          0.9,
          0.9,
          k % 2 ? 0xffffff : 0xff7a2f,
          (Math.PI / 2) * (b.door.dx > 0 ? -1 : 1),
        );
      for (const tz of [-3.6, 3.6]) {
        const tx = b.door.x + b.door.dx * 4.5;
        S.cyl(tx, 0.45, cz + tz, 0.08, 0.08, 0.9, 0x555555, 6);
        S.cyl(tx, 0.92, cz + tz, 0.9, 0.9, 0.08, 0xffd9a8, 14);
        for (let k = 0; k < 4; k++) {
          const a = k * 1.57 + 0.7;
          S.cyl(tx + Math.cos(a) * 1.3, 0.3, cz + tz + Math.sin(a) * 1.3, 0.28, 0.28, 0.6, 0xe0762a, 8);
        }
        circ(tx, cz + tz, 1.7);
      }
    } else if (b.id === 'library') {
      pitched(2.8, b.roof);
      S.box(cx, h + 3.1, cz, 3, 1.6, 3, b.wall);
      S.cyl(cx, h + 4.6, cz, 0, 2.4, 1.6, b.trim, 4, false, 0, 0, Math.PI / 4);
      for (const o of [-1, 1])
        for (let k = 0; k < 2; k++)
          S.cyl(
            b.door.x + b.door.dx * 1.2,
            2.2,
            b.door.z + o * (2.3 + k * 0.01),
            0.25,
            0.25,
            4.4,
            0xf4ecda,
            10,
          );
    } else if (b.id === 'lab') {
      pitched(2.2, b.roof);
      const fy = h + 2.4;
      S.cyl(cx, fy + 1.1, cz, 0.45, 1.5, 2.2, 0xbfeeee, 14);
      S.cyl(cx, fy + 2.8, cz, 0.42, 0.42, 1.2, 0xbfeeee, 12);
      S.cyl(cx, fy + 0.9, cz, 0.38, 1.35, 1.6, 0x35e0a0, 14);
      LG.cyl(cx, fy + 0.8, cz, 0.3, 1.25, 1.4, 0x6dffc0, 12);
      S.cyl(cx - 4.5, h + 3, cz - 2, 0.1, 0.1, 5, 0x777777, 6);
      S.cyl(cx - 4.5, h + 5.6, cz - 2, 1.0, 0.05, 0.5, 0xdddddd, 12, true, 0.6, 0);
    } else if (b.id === 'math' || b.id === 'cs' || b.id === 'econ') {
      // flat roof with a parapet and a landmark: a golden pi, a radio mast and dish, or a stack of coins
      S.box(cx, h + 0.35, cz, w + 0.8, 0.7, d + 0.8, b.roof);
      for (const [px, pz, pw, pd] of [
        [0, d / 2 + 0.4, w + 1, 0.4],
        [0, -d / 2 - 0.4, w + 1, 0.4],
        [w / 2 + 0.4, 0, 0.4, d + 1],
        [-w / 2 - 0.4, 0, 0.4, d + 1],
      ])
        S.box(cx + px, h + 1.0, cz + pz, pw, 0.7, pd, b.trim);
      if (b.id === 'math') {
        S.box(cx, h + 4.6, cz, 5.4, 0.7, 0.7, 0xe3b53c);
        S.box(cx - 1.7, h + 2.8, cz, 0.7, 3.6, 0.7, 0xe3b53c);
        S.box(cx + 1.7, h + 2.8, cz, 0.7, 3.6, 0.7, 0xe3b53c);
      } else if (b.id === 'cs') {
        S.cyl(cx + 4, h + 4.5, cz, 0.12, 0.16, 7.6, 0xcccccc, 6);
        LG.cyl(cx + 4, h + 8.4, cz, 0.3, 0.3, 0.5, 0xff5a4a, 8);
        S.cyl(cx - 3, h + 2.2, cz, 2.2, 0.4, 0.5, 0xe8eef0, 14, true, 0.9, 0);
        S.cyl(cx - 3, h + 1.2, cz, 0.12, 0.12, 1.4, 0x888888, 6);
      } else {
        for (let i = 0; i < 4; i++) S.cyl(cx, h + 1.3 + i * 0.45, cz, 1.9, 1.9, 0.4, 0xe3b53c, 18);
        S.cyl(cx, h + 3.3, cz, 1.9, 1.9, 0.12, 0xfff2b8, 18);
      }
    } else if (b.id === 'club') {
      pitched(2.4, b.roof);
      // One coloured wing per club along the front: chess, music, dance, debate, sports.
      const wings = [0x5b6577, 0x9b59d6, 0xff5fa2, 0x3d7be0, 0xff7a59];
      wings.forEach((col, i) => {
        const z = cz - d / 2 + (i + 0.5) * (d / 5);
        S.box(cx + b.door.dx * (w / 2 + 0.2), 6.5, z, 0.22, 1.1, d / 5 - 0.8, col);
        S.box(cx + b.door.dx * (w / 2 + 0.34), 6.5, z, 0.08, 0.5, 2.2, 0xffffff);
        S.box(cx, h + 2.5, z, 1.4, 0.55, d / 5 - 0.6, col);
        // a tall banner pole beside each wing sign
        S.cyl(b.door.x - 1.4, 2.4, z, 0.07, 0.09, 4.8, 0xcccccc, 6);
        S.box(b.door.x - 1.4 + 0.45, 3.9, z, 0.9, 1.1, 0.05, col, Math.PI / 2);
      });
      // chess-board stripe above the entrance
      for (let k = 0; k < 8; k++)
        S.box(b.door.x - 0.12, 5.9, b.door.z - 3.5 + k * 1.0, 0.16, 0.5, 1.0, k % 2 ? 0x222222 : 0xffffff);
      for (const o of [-1, 1])
        S.box(b.door.x + b.door.dx * 1.3, 0.8, b.door.z + o * 4.2, 1, 1.6, 0.9, 0x2a2a35);
    }
    if (b.id !== 'main') S.box(cx, h + 0.1, cz, w + 0.9, 0.35, d + 0.9, b.trim);
  }
  for (const b of BUILDINGS) building(b);

  /* --- fountain --- */
  S.cyl(PLAZA.x, 0.45, PLAZA.z, 3.6, 3.7, 0.9, 0xc9c1b0, 22);
  S.cyl(PLAZA.x, 0.85, PLAZA.z, 3.0, 3.0, 0.3, 0x6cc6ff, 22);
  S.cyl(PLAZA.x, 1.2, PLAZA.z, 0.5, 0.7, 2.4, 0xd7d0bf, 12);
  S.cyl(PLAZA.x, 2.5, PLAZA.z, 1.5, 0.8, 0.35, 0xc9c1b0, 16);
  S.cyl(PLAZA.x, 2.75, PLAZA.z, 1.25, 1.25, 0.12, 0x6cc6ff, 16);
  circ(PLAZA.x, PLAZA.z, 3.9);

  /* --- fence, gate --- */
  const fenceCol = 0x8a6a4a;
  const post = (x: number, z: number) => S.box(x, 0.8, z, 0.25, 1.6, 0.25, fenceCol);
  for (let x = -50; x <= 50; x += 2.5) {
    if (Math.abs(x) > 6) post(x, 50);
    post(x, -47);
  }
  for (let z = -47; z <= 50; z += 2.5) {
    post(50, z);
    post(-50, z);
  }
  for (const y of [0.6, 1.2]) {
    S.box(0, y, -47, 100, 0.12, 0.1, fenceCol);
    S.box(-28, y, 50, 44, 0.12, 0.1, fenceCol);
    S.box(28, y, 50, 44, 0.12, 0.1, fenceCol);
    S.box(50, y, 1.5, 0.1, 0.12, 97, fenceCol);
    S.box(-50, y, 1.5, 0.1, 0.12, 97, fenceCol);
  }
  for (const s of [-1, 1]) {
    S.box(s * 5.8, 2.2, 50, 1.4, 4.4, 1.4, 0xb36a4a);
    S.box(s * 5.8, 4.6, 50, 1.8, 0.4, 1.8, 0x8a4a34);
  }
  S.box(0, 4.3, 50, 12.4, 0.9, 1.0, 0xc23b3b);
  S.box(0, 3.5, 50, 11, 0.2, 0.3, 0x8a4a34);
  box(-6.6, -5.1, 49.2, 50.8);
  box(5.1, 6.6, 49.2, 50.8);
  // bus stop
  S.box(10, 1.1, 46.5, 4, 0.12, 1.4, 0x3d7be0);
  S.box(10, 2.3, 47.1, 4, 2.4, 0.1, 0xbfe0ff);
  S.box(8.1, 1.15, 46.8, 0.12, 2.3, 0.12, 0x3d7be0);
  S.box(11.9, 1.15, 46.8, 0.12, 2.3, 0.12, 0x3d7be0);
  S.box(10, 0.55, 46.2, 3, 0.1, 0.5, 0x7a5a3a);
  box(8, 12, 45.8, 47.4);
  // notice board
  S.box(NOTICE.x - 1.6, 1.1, NOTICE.z, 0.15, 2.2, 0.15, 0x6b4a2f);
  S.box(NOTICE.x + 1.6, 1.1, NOTICE.z, 0.15, 2.2, 0.15, 0x6b4a2f);
  S.box(NOTICE.x, 1.7, NOTICE.z, 3.6, 1.8, 0.18, 0x8a6a4a);
  S.box(NOTICE.x, 1.7, NOTICE.z + 0.08, 3.3, 1.5, 0.08, 0xc9a56a);
  [
    [-1, 2.1, 0xffffff],
    [0, 1.5, 0xffe58a],
    [1, 2.0, 0xffc2d6],
    [-0.5, 1.3, 0xc2e5ff],
    [0.9, 1.35, 0xffffff],
  ].forEach(([x, y, c], i) =>
    S.box(NOTICE.x + x, y, NOTICE.z + 0.15, 0.7, 0.6, 0.03, c, 0, 0, (i - 2) * 0.06),
  );
  box(NOTICE.x - 1.8, NOTICE.x + 1.8, NOTICE.z - 0.3, NOTICE.z + 0.3);
  // basketball hoop near gym
  S.cyl(19.5, 2.2, 42.5, 0.1, 0.12, 4.4, 0x555555, 8);
  S.box(19.5, 4.3, 42.5, 0.1, 1.2, 1.8, 0xffffff);
  S.cyl(19.9, 3.8, 42.5, 0.4, 0.4, 0.05, 0xff6a2a, 12);
  circ(19.5, 42.5, 0.4);
  keepout.push({ c: true, x: 19.5, z: 42.5, r: 3 });

  /* --- benches, lamps, bins --- */
  const bench = (x: number, z: number, ry: number) => {
    const c = Math.cos(ry),
      s = Math.sin(ry),
      at = (a: number, b: number): [number, number] => [x + c * a + s * b, z - s * a + c * b];
    S.box(
      x,
      0.5,
      z,
      2.2 * Math.abs(c) + 0.7 * Math.abs(s),
      0.14,
      0.7 * Math.abs(c) + 2.2 * Math.abs(s),
      0x9a6a3a,
    );
    const [bx, bz] = at(0, -0.3);
    S.box(
      bx,
      0.95,
      bz,
      2.2 * Math.abs(c) + 0.1 * Math.abs(s),
      0.5,
      0.1 * Math.abs(c) + 2.2 * Math.abs(s),
      0x9a6a3a,
    );
    for (const o of [-0.9, 0.9]) {
      const [lx, lz] = at(o, 0);
      S.box(lx, 0.25, lz, 0.14, 0.5, 0.5, 0x333333);
    }
    circ(x, z, 1.1);
  };
  bench(-9.5, 6, Math.PI / 2);
  bench(9.5, 6, -Math.PI / 2);
  bench(0, 15.5, 0);
  bench(-8, 1, 0.3);
  bench(8, 11.5, 0);
  bench(-24, -3, (Math.PI / 2) * 0);
  bench(24, -3, 0);
  const lamp = (x: number, z: number) => {
    S.cyl(x, 2.1, z, 0.08, 0.12, 4.2, 0x3a3f4a, 8);
    S.box(x, 4.3, z, 0.5, 0.12, 0.5, 0x3a3f4a);
    LG.sphere(x, 4.1, z, 0.28, 0xfff1b8, 8, 6);
    circ(x, z, 0.3);
  };
  for (const z of [-18, -6, 10, 22, 30, 41]) {
    lamp(-5.6, z);
    lamp(5.6, z);
  }
  for (const [x, z] of [
    [-20, -4],
    [20, -4],
    [-20, 18],
    [20, 18],
    [20, 32],
    [-12, -22],
    [12, -22],
  ])
    lamp(x, z);
  for (const [x, z] of [
    [-3.6, -15],
    [3.6, 28],
    [-22, 5],
    [22, 24],
  ]) {
    S.cyl(x, 0.45, z, 0.32, 0.28, 0.9, 0x3d8a5a, 8);
    circ(x, z, 0.4);
    keepout.push({ c: true, x, z, r: 1.5 });
  }
  // bike rack
  for (let i = 0; i < 5; i++) S.box(-22 + i * 0.8, 0.45, 3, 0.08, 0.9, 0.6, 0x666666);
  // flower beds
  const flowers = (x: number, z: number, w: number, d: number, seed: number) => {
    const r = mulberry32(seed);
    S.box(x, 0.2, z, w, 0.4, d, 0x8a6a4a);
    S.box(x, 0.42, z, w - 0.3, 0.1, d - 0.3, 0x5a3f2a);
    for (let i = 0; i < Math.floor(w * d * 1.1); i++) {
      const fx = x + (r() - 0.5) * (w - 0.7),
        fz = z + (r() - 0.5) * (d - 0.7);
      S.cyl(fx, 0.75, fz, 0.02, 0.02, 0.5, 0x3e8a3a, 4);
      S.sphere(fx, 1.05, fz, 0.16, [0xff6a8a, 0xffd23a, 0xffffff, 0xb07aff][i % 4], 6, 4);
    }
    keepout.push({ x0: x - w / 2 - 1, x1: x + w / 2 + 1, z0: z - d / 2 - 1, z1: z + d / 2 + 1 });
    box(x - w / 2, x + w / 2, z - d / 2, z + d / 2);
  };
  flowers(-10, -20, 5, 2, 11);
  flowers(10.5, -20, 5, 2, 12);
  flowers(-14, 22, 4, 2, 13);
  flowers(14, 22, 4, 2, 14);

  /* --- trees --- */
  const free = (x: number, z: number, r = 0) => {
    for (const k of keepout) {
      if (
        k.c
          ? Math.hypot(x - k.x, z - k.z) < k.r + r
          : x > k.x0 - r && x < k.x1 + r && z > k.z0 - r && z < k.z1 + r
      )
        return false;
    }
    for (const h of Object.values(HANGOUTS))
      for (const p of Object.values(h)) if (Math.hypot(x - p[0], z - p[1]) < 3.2) return false;
    for (const p of [...STARS, ...CATS, ...CROWD_POINTS])
      if (Math.hypot(x - p[0], z - p[1]) < 2.4) return false;
    for (const zn of Object.values(ZONES)) if (Math.hypot(x - zn.x, z - zn.z) < 4) return false;
    return true;
  };
  const tree = (x: number, z: number, kind: number, sc = 1) => {
    S.cyl(x, 0.9 * sc, z, 0.22 * sc, 0.36 * sc, 1.8 * sc, 0x6b4a2f, 7);
    if (kind === 0) {
      S.sphere(
        x,
        3.0 * sc,
        z,
        1.7 * sc,
        [0x4fae52, 0x5bb85a, 0x469f4c][Math.floor(rng() * 3)],
        7,
        5,
        0.9,
        false,
      );
      S.sphere(x + 0.7 * sc, 3.7 * sc, z - 0.3 * sc, 1.1 * sc, 0x66c466, 7, 5, 0.9, false);
    } else if (kind === 1) {
      for (let i = 0; i < 3; i++)
        S.cyl(
          x,
          (2.2 + i * 1.3) * sc,
          z,
          0.05,
          (1.7 - i * 0.4) * sc,
          1.8 * sc,
          [0x2f7d4a, 0x38904f, 0x2a6e42][i],
          8,
          false,
        );
    } else {
      S.sphere(x, 3.1 * sc, z, 1.8 * sc, 0xf6aac4, 7, 5, 0.85, false);
      S.sphere(x - 0.8 * sc, 3.6 * sc, z + 0.4 * sc, 1.2 * sc, 0xffc3d6, 7, 5, 0.85, false);
      S.sphere(x + 0.9 * sc, 2.8 * sc, z + 0.3 * sc, 1.1 * sc, 0xf09cb8, 7, 5, 0.85, false);
    }
    circ(x, z, 0.55 * sc);
  };
  // avenue of sakura on the main path
  for (const z of [-17, -1, 18, 27, 36])
    for (const s of [-1, 1])
      if (Math.abs(z - 6) > 15 || true) {
        const x = s * 7.3;
        if (free(x, z, 0.6)) tree(x, z, 2, 1.1);
      }
  // border trees
  for (let i = 0; i < 70; i++) {
    const side = Math.floor(rng() * 4),
      t = rng();
    let x: number, z: number;
    const m = 1.5 + rng() * 5;
    if (side === 0) {
      x = -48 + t * 96;
      z = -46 + m;
    } else if (side === 1) {
      x = -48 + t * 96;
      z = 48 - m;
    } else if (side === 2) {
      x = -48 + m;
      z = -44 + t * 90;
    } else {
      x = 48 - m;
      z = -44 + t * 90;
    }
    if (free(x, z, 1)) tree(x, z, Math.floor(rng() * 3), 0.9 + rng() * 0.5);
  }
  for (let i = 0; i < 90; i++) {
    const x = (rng() - 0.5) * 94,
      z = -44 + rng() * 90;
    if (free(x, z, 1.2)) tree(x, z, Math.floor(rng() * 3), 0.8 + rng() * 0.5);
  }
  // outside the fence
  for (let i = 0; i < 90; i++) {
    const a = rng() * Math.PI * 2,
      r = 62 + rng() * 40,
      x = Math.cos(a) * r,
      z = Math.sin(a) * r;
    if (Math.abs(x) > 52 || Math.abs(z) > 52)
      (S.cyl(x, 1.2, z, 0.3, 0.4, 2.4, 0x6b4a2f, 6), S.sphere(x, 3.6, z, 2.6, 0x4a9f55, 6, 4, 0.9, false));
  }
  // distant town and hills
  for (let i = 0; i < 46; i++) {
    const a = (i / 46) * Math.PI * 2 + rng() * 0.1,
      r = 112 + rng() * 22,
      hh = 8 + rng() * 26,
      w = 8 + rng() * 10;
    S.box(
      Math.cos(a) * r,
      hh / 2,
      Math.sin(a) * r,
      w,
      hh,
      w,
      [0xb7bfd0, 0xc6c3d2, 0xaab4c8, 0xd0c8c0][i % 4],
      a,
    );
    if (rng() > 0.5) S.box(Math.cos(a) * r, hh + 1, Math.sin(a) * r, w * 0.5, 2, w * 0.5, 0x8a93a8, a);
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2,
      r = 150;
    S.sphere(
      Math.cos(a) * r,
      0,
      Math.sin(a) * r,
      34 + (i % 3) * 8,
      i % 2 ? 0x6fa56a : 0x7db477,
      8,
      5,
      0.55,
      false,
    );
  }

  return { ground: Gd.build(), solid: S.build(), windows: W.build(), lamps: LG.build(), colliders, rng };
}

export interface Campus {
  group: Group;
  colliders: Collider[];
  update(dt: number, t: number, light: LightState): void;
}

/** Set a Lambert material to a tint with a self-lit glow of strength `emi` (0..1). */
function setGlow(mat: MeshLambertMaterial, rgb: [number, number, number], emi: number): void {
  mat.color.setRGB(rgb[0] * (1 - emi), rgb[1] * (1 - emi), rgb[2] * (1 - emi));
  mat.emissive.setRGB(rgb[0] * 1.25 * emi, rgb[1] * 1.25 * emi, rgb[2] * 1.25 * emi);
}

const mixRGB = (a: number[], b: number[], t: number): [number, number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Build the whole campus as Three.js objects, with a per-frame `update` for the animated bits. */
export function createCampus(): Campus {
  const geo = buildCampusGeometry();
  const group = new Group();
  const layer = (
    g: BufferGeometry,
    mat: MeshLambertMaterial | MeshBasicMaterial,
    cast: boolean,
    recv = true,
  ): Mesh => {
    const m = new Mesh(g, mat);
    m.castShadow = cast;
    m.receiveShadow = recv;
    m.matrixAutoUpdate = false;
    group.add(m);
    return m;
  };
  layer(geo.ground, new MeshLambertMaterial({ vertexColors: true }), false);
  layer(geo.solid, new MeshLambertMaterial({ vertexColors: true }), true);
  const winMat = new MeshLambertMaterial({ vertexColors: true });
  const lampMat = new MeshBasicMaterial({ vertexColors: true });
  layer(geo.windows, winMat, false);
  layer(geo.lamps, lampMat, false, false);

  // fountain spray
  const fountain = new Group();
  fountain.position.set(PLAZA.x, 2.9, PLAZA.z);
  const drops = Array.from({ length: 8 }, () => {
    const d = part(SH.sph, { s: 0.14, t: 0xbfe8ff, emi: 0.4, alpha: 0.9 });
    fountain.add(d);
    return d;
  });
  group.add(fountain);

  // clouds (continue the campus RNG stream so the sky layout is stable)
  const rng = geo.rng;
  const clouds: Group[] = [];
  for (let i = 0; i < 9; i++) {
    const c = new Group();
    c.position.set(-170 + rng() * 340, 55 + rng() * 22, -150 + rng() * 300);
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      c.add(
        part(SH.fsph, {
          p: [(k - n / 2) * 7 + rng() * 3, rng() * 2, rng() * 6 - 3],
          s: [8 + rng() * 5, 3.2 + rng() * 1.5, 6 + rng() * 3],
          t: 0xffffff,
          alpha: 0.92,
        }),
      ).castShadow = false;
    }
    clouds.push(c);
    group.add(c);
  }

  const winDay = lin(0x5a7f9f);
  const winLit = lin(0xffd98a);
  const lampDay = lin(0xe8e4d0);
  const lampLit = lin(0xffe9a8);

  return {
    group,
    colliders: geo.colliders,
    update(dt, t, light) {
      drops.forEach((d, i) => {
        const a = (i / drops.length) * Math.PI * 2 + t * 1.2;
        const k = (Math.sin(t * 3 + i * 1.7) + 1) / 2;
        d.position.set(
          Math.cos(a) * (0.5 + k * 1.5),
          -k * 1.6 + 0.4 + (1 - k) * 0.5,
          Math.sin(a) * (0.5 + k * 1.5),
        );
      });
      const shade = 0.35 + 0.65 * (1 - light.night);
      for (const c of clouds) {
        c.position.x += dt * 1.4;
        if (c.position.x > 180) c.position.x = -180;
        for (const ch of c.children)
          (ch as Mesh<BufferGeometry, MeshLambertMaterial>).material.color.setRGB(
            shade,
            shade,
            shade * (1 + 0.1 * light.night),
          );
      }
      const dayTint = winDay.map((v) => v * (0.6 + 0.4 * (1 - light.night)));
      setGlow(winMat, mixRGB(dayTint, winLit, light.lamps), light.lamps * 0.95);
      const lampTint = mixRGB(lampDay, lampLit, light.lamps);
      const lampK = 0.55 + 0.45 * light.lamps;
      lampMat.color.setRGB(lampTint[0] * lampK, lampTint[1] * lampK, lampTint[2] * lampK);
    },
  };
}
