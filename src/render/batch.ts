// Bakes many primitives (with transform + vertex colour) into one merged BufferGeometry.
// Only touches BufferGeometry, so it also runs in Node (tests) without WebGL.
import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

type V3 = [number, number, number];

/** Non-indexed geometry with flat per-face normals, wound counter-clockwise as seen from outside. */
export function flatGeometry(tris: V3[][]): BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  for (const [a, b0, c0] of tris) {
    let b = b0;
    let c = c0;
    const normalOf = (p: V3, q: V3, r: V3): V3 => {
      const ux = q[0] - p[0],
        uy = q[1] - p[1],
        uz = q[2] - p[2];
      const vx = r[0] - p[0],
        vy = r[1] - p[1],
        vz = r[2] - p[2];
      const n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
      const l = Math.hypot(...n) || 1;
      return [n[0] / l, n[1] / l, n[2] / l];
    };
    let n = normalOf(a, b, c);
    const cx = (a[0] + b[0] + c[0]) / 3,
      cy = (a[1] + b[1] + c[1]) / 3,
      cz = (a[2] + b[2] + c[2]) / 3;
    if (n[0] * cx + n[1] * cy + n[2] * cz < 0) {
      // Winding points inward: swap two vertices so the face is front-facing.
      [b, c] = [c, b];
      n = normalOf(a, b, c);
    }
    for (const v of [a, b, c]) {
      pos.push(...v);
      nor.push(...n);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  return g;
}

const cache = new Map<string, BufferGeometry>();
const memo = (key: string, make: () => BufferGeometry): BufferGeometry => {
  let g = cache.get(key);
  if (!g) cache.set(key, (g = make()));
  return g;
};

/** Shared unit primitives. Smooth ones keep their normals, flat ones get per-face normals. */
export const prim = {
  box: () => memo('box', () => new BoxGeometry(1, 1, 1).toNonIndexed()),
  cyl: (rt: number, rb: number, h: number, seg = 10, smooth = true) =>
    memo(`c${rt},${rb},${h},${seg},${smooth}`, () => {
      const g = new CylinderGeometry(rt, rb, h, seg).toNonIndexed();
      if (!smooth) g.computeVertexNormals();
      return g;
    }),
  sphere: (ws = 10, hs = 7, smooth = true) =>
    memo(`s${ws},${hs},${smooth}`, () => {
      const g = new SphereGeometry(1, ws, hs).toNonIndexed();
      if (!smooth) g.computeVertexNormals();
      return g;
    }),
  /** Gabled prism, unit size, ridge along z. */
  roof: () =>
    memo('roof', () => {
      const L0: V3 = [-0.5, -0.5, -0.5],
        L1: V3 = [-0.5, -0.5, 0.5];
      const R0: V3 = [0.5, -0.5, -0.5],
        R1: V3 = [0.5, -0.5, 0.5];
      const T0: V3 = [0, 0.5, -0.5],
        T1: V3 = [0, 0.5, 0.5];
      return flatGeometry([
        [L0, L1, T1],
        [L0, T1, T0],
        [R1, R0, T0],
        [R1, T0, T1],
        [L1, R1, T1],
        [R0, L0, T0],
        [L0, R0, R1],
        [L0, R1, L1],
      ]);
    }),
  /** Ramp-like awning, unit size, slope descends towards +z. */
  wedge: () =>
    memo('wedge', () => {
      const a: V3 = [-0.5, 0.5, -0.5],
        b: V3 = [0.5, 0.5, -0.5];
      const c: V3 = [-0.5, -0.5, 0.5],
        d: V3 = [0.5, -0.5, 0.5];
      const e: V3 = [-0.5, -0.5, -0.5],
        f: V3 = [0.5, -0.5, -0.5];
      return flatGeometry([
        [a, b, d],
        [a, d, c],
        [e, a, c],
        [f, d, b],
        [e, f, b],
        [e, b, a],
        [e, c, d],
        [e, d, f],
      ]);
    }),
};

const _m = new Matrix4();
const _q = new Quaternion();
const _e = new Euler(0, 0, 0, 'YXZ'); // model = T * Ry * Rx * Rz * S
const _c = new Color();

export class Batch {
  private parts: BufferGeometry[] = [];

  add(geo: BufferGeometry, pos: V3, rot: V3, scl: V3, col: number): this {
    const g = geo.clone();
    g.deleteAttribute('uv');
    _e.set(rot[0], rot[1], rot[2], 'YXZ');
    _q.setFromEuler(_e);
    _m.compose(new Vector3(...pos), _q, new Vector3(...scl));
    g.applyMatrix4(_m);
    _c.setHex(col);
    const n = g.getAttribute('position').count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = _c.r;
      colors[i * 3 + 1] = _c.g;
      colors[i * 3 + 2] = _c.b;
    }
    g.setAttribute('color', new Float32BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    col: number,
    ry = 0,
    rx = 0,
    rz = 0,
  ): this {
    return this.add(prim.box(), [x, y, z], [rx, ry, rz], [w, h, d], col);
  }
  cyl(
    x: number,
    y: number,
    z: number,
    rt: number,
    rb: number,
    h: number,
    col: number,
    seg = 10,
    smooth = true,
    rx = 0,
    rz = 0,
    ry = 0,
  ): this {
    return this.add(prim.cyl(rt, rb, h, seg, smooth), [x, y, z], [rx, ry, rz], [1, 1, 1], col);
  }
  sphere(
    x: number,
    y: number,
    z: number,
    r: number,
    col: number,
    ws = 10,
    hs = 7,
    sy = 1,
    smooth = true,
  ): this {
    return this.add(prim.sphere(ws, hs, smooth), [x, y, z], [0, 0, 0], [r, r * sy, r], col);
  }
  roof(x: number, y: number, z: number, w: number, h: number, d: number, col: number, ry = 0): this {
    return this.add(prim.roof(), [x, y, z], [0, ry, 0], [w, h, d], col);
  }
  wedge(x: number, y: number, z: number, w: number, h: number, d: number, col: number, ry = 0): this {
    return this.add(prim.wedge(), [x, y, z], [0, ry, 0], [w, h, d], col);
  }

  get count(): number {
    return this.parts.length;
  }

  /** Merge everything added so far. Returns an empty geometry if nothing was added. */
  build(): BufferGeometry {
    if (!this.parts.length) return new BufferGeometry();
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!merged) throw new Error('Batch: geometries have mismatched attributes');
    return merged;
  }
}
