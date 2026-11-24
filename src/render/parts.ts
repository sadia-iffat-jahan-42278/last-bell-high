// Shared unit geometries and a tiny "part" factory for building props out of primitives.
import {
  AdditiveBlending,
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshLambertMaterial,
  RingGeometry,
  SphereGeometry,
  type BufferGeometry,
  type Object3D,
} from 'three';

type V3 = [number, number, number];

const flat = (g: BufferGeometry): BufferGeometry => {
  const n = g.toNonIndexed();
  n.computeVertexNormals();
  return n;
};

/** Shared unit meshes (scale them per part). */
export const SH = {
  box: new BoxGeometry(1, 1, 1),
  sph: new SphereGeometry(1, 14, 10),
  /** Low-poly faceted sphere. */
  fsph: flat(new SphereGeometry(1, 7, 5)),
  cyl: new CylinderGeometry(1, 1, 1, 16),
  /** Apex up, base at the bottom. */
  cone: new CylinderGeometry(0, 1, 1, 10),
  disc: new CylinderGeometry(1, 1, 0.02, 28),
  /** Flat ring on the ground, lying in the XZ plane. */
  ring: new RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2).translate(0, 0.01, 0),
};

export interface PartOpts {
  /** position */
  p?: V3;
  /** scale: uniform or per-axis */
  s?: number | V3;
  /** rotation (Euler YXZ, radians) */
  r?: V3;
  /** hex colour */
  t?: number;
  alpha?: number;
  /** emissive amount 0..1 (self-lit, ignores scene lighting) */
  emi?: number;
  /** additive blending (glows) */
  add?: boolean;
}

/** Create a mesh from a shared geometry with its own material. */
export function part(geo: BufferGeometry, o: PartOpts = {}): Mesh {
  const mat = new MeshLambertMaterial({ color: 0xffffff });
  const m = new Mesh(geo, mat);
  m.rotation.order = 'YXZ';
  if (o.p) m.position.set(...o.p);
  if (o.s !== undefined) {
    if (Array.isArray(o.s)) m.scale.set(...o.s);
    else m.scale.setScalar(o.s);
  }
  if (o.r) m.rotation.set(...o.r);
  setColor(m, o.t ?? 0xffffff, o.emi ?? 0);
  if (o.alpha !== undefined && o.alpha < 1) {
    mat.transparent = true;
    mat.opacity = o.alpha;
  }
  if (o.add) {
    mat.blending = AdditiveBlending;
    mat.transparent = true;
    mat.depthWrite = false;
  }
  m.castShadow = !o.add && !(o.alpha !== undefined && o.alpha < 1);
  m.receiveShadow = true;
  return m;
}

/** Recolour a part. `emi` blends towards a self-lit brightened colour, like a glow. */
export function setColor(m: Mesh, hex: number, emi = 0): void {
  const mat = m.material as MeshLambertMaterial;
  mat.color.setHex(hex);
  mat.emissive.copy(mat.color).multiplyScalar(1.25 * emi);
  mat.color.multiplyScalar(1 - emi);
}

/** Remove and dispose everything under `g` (geometries are shared, so only materials are freed). */
export function clearGroup(g: Group | Object3D): void {
  for (const c of [...g.children]) {
    g.remove(c);
    c.traverse((o) => {
      const mat = (o as Mesh).material;
      if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
    });
  }
}
