// Low-poly students built from shared primitive meshes.
import { Group, type Mesh, type MeshLambertMaterial } from 'three';
import type { Accessory, HairStyle, Look } from '../core/types';
import { pick, type Rng } from '../core/util';
import { SH, clearGroup, part, setColor } from './parts';

export const SKINS = [0xf8d9bd, 0xedbd96, 0xd49a6a, 0xa8714a, 0x6f4a31];
export const HAIR_COLORS = [0x2a2020, 0x5a3a22, 0xd9b45a, 0xb4472a, 0x4a78d6, 0xe58ab5, 0xc9ccd6];
export const BLAZERS = [0x2f4a8a, 0x2f7a4b, 0x8a2f3f, 0x444b57, 0xd9a520, 0x1aa6a6, 0x7a4fb5];
export const BAGS = [0xd94a3a, 0xf0b429, 0x3d7be0, 0x2a2a30, 0x35d9a0];
export const HAIR_STYLES: HairStyle[] = ['short', 'long', 'pony', 'spiky', 'bun', 'bob'];
export const ACCESSORIES: Accessory[] = ['none', 'glasses', 'cap', 'headphones', 'beanie', 'bow', 'crown'];

interface ArmParts {
  sleeve: Mesh;
  hand: Mesh;
}
interface LegParts {
  leg: Mesh;
}

export class Character {
  readonly root = new Group();
  look: Look;
  yaw = 0;
  private phase = Math.random() * 6;
  private waveT = 0;
  private speed = 0;

  private body = new Group();
  private head = new Group();
  private hairG = new Group();
  private accG = new Group();
  private armL = new Group();
  private armR = new Group();
  private legL = new Group();
  private legR = new Group();
  private torso: Mesh;
  private collar: Mesh;
  private tie: Mesh;
  private bag: Mesh;
  private bagPocket: Mesh;
  private skull: Mesh;
  private armParts: ArmParts[] = [];
  private legParts: LegParts[] = [];

  constructor(look: Look) {
    this.look = look;
    for (const g of [
      this.body,
      this.head,
      this.hairG,
      this.accG,
      this.armL,
      this.armR,
      this.legL,
      this.legR,
    ]) {
      g.rotation.order = 'YXZ';
    }
    const { root, body, head } = this;
    root.add(body);
    body.position.set(0, 0.85, 0);
    this.torso = this.addTo(body, SH.box, { p: [0, 0.3, 0], s: [0.56, 0.58, 0.32] });
    this.collar = this.addTo(body, SH.box, { p: [0, 0.57, 0.01], s: [0.34, 0.1, 0.34], t: 0xffffff });
    this.tie = this.addTo(body, SH.box, { p: [0, 0.38, 0.17], s: [0.07, 0.26, 0.02], t: 0xc23b3b });
    this.bag = this.addTo(body, SH.box, { p: [0, 0.32, -0.26], s: [0.44, 0.5, 0.2] });
    this.bagPocket = this.addTo(body, SH.box, { p: [0, 0.2, -0.37], s: [0.3, 0.2, 0.04], t: 0xffffff });
    body.add(head);
    head.position.set(0, 0.62, 0);
    this.skull = this.addTo(head, SH.sph, { p: [0, 0.3, 0], s: [0.34, 0.34, 0.34] });
    const face = new Group();
    face.position.set(0, 0.3, 0);
    head.add(face);
    for (const x of [-0.12, 0.12])
      this.addTo(face, SH.sph, { p: [x, 0, 0.3], s: [0.048, 0.06, 0.04], t: 0x1c1c28 });
    for (const x of [-0.2, 0.2]) {
      this.addTo(face, SH.sph, { p: [x, -0.1, 0.25], s: [0.06, 0.035, 0.03], t: 0xff9aa8, alpha: 0.7 });
    }
    this.addTo(face, SH.box, { p: [0, -0.12, 0.325], s: [0.07, 0.016, 0.02], t: 0x8a3a3a });
    head.add(this.hairG, this.accG);
    this.hairG.position.set(0, 0.3, 0);
    this.accG.position.set(0, 0.3, 0);
    this.armL.position.set(-0.37, 0.56, 0);
    this.armR.position.set(0.37, 0.56, 0);
    body.add(this.armL, this.armR);
    for (const arm of [this.armL, this.armR]) {
      const sleeve = this.addTo(arm, SH.box, { p: [0, -0.24, 0], s: [0.16, 0.5, 0.16] });
      const hand = this.addTo(arm, SH.sph, { p: [0, -0.54, 0], s: [0.085, 0.085, 0.085] });
      this.armParts.push({ sleeve, hand });
    }
    this.legL.position.set(-0.14, 0.86, 0);
    this.legR.position.set(0.14, 0.86, 0);
    root.add(this.legL, this.legR);
    for (const leg of [this.legL, this.legR]) {
      const l = this.addTo(leg, SH.box, { p: [0, -0.4, 0], s: [0.21, 0.78, 0.22] });
      this.addTo(leg, SH.box, { p: [0, -0.8, 0.04], s: [0.23, 0.12, 0.34], t: 0x25252d });
      this.legParts.push({ leg: l });
    }
    root.scale.setScalar(0.92);
    root.rotation.order = 'YXZ';
    this.setLook(look);
  }

  private addTo(parent: Group, geo: Parameters<typeof part>[0], o: Parameters<typeof part>[1]): Mesh {
    const m = part(geo, o);
    parent.add(m);
    return m;
  }

  setLook(look: Look): void {
    this.look = look;
    setColor(this.skull, look.skin);
    setColor(this.torso, look.blazer);
    setColor(this.bag, look.bag);
    setColor(this.bagPocket, look.bag);
    (this.bagPocket.material as MeshLambertMaterial).color.multiplyScalar(0.7);
    for (const a of this.armParts) {
      setColor(a.sleeve, look.blazer);
      setColor(a.hand, look.skin);
    }
    for (const l of this.legParts) setColor(l.leg, look.pants ?? 0x3a3d4a);
    setColor(this.collar, 0xffffff);
    setColor(this.tie, look.tie ?? 0xc23b3b);
    this.buildHair(look.hair, look.hairStyle);
    this.buildAccessory(look.acc || 'none');
  }

  private buildHair(color: number, style: HairStyle): void {
    clearGroup(this.hairG);
    const hp = (o: Parameters<typeof part>[1]) => this.addTo(this.hairG, SH.sph, { t: color, ...o });
    const hb = (o: Parameters<typeof part>[1]) => this.addTo(this.hairG, SH.box, { t: color, ...o });
    hp({ p: [0, 0.05, -0.07], s: [0.36, 0.36, 0.37] });
    if (style !== 'spiky') hb({ p: [0, 0.2, 0.235], s: [0.5, 0.1, 0.14] });
    if (style === 'long') {
      hb({ p: [0, -0.25, -0.27], s: [0.54, 0.62, 0.16] });
      for (const x of [-0.3, 0.3]) hb({ p: [x, -0.14, -0.05], s: [0.1, 0.5, 0.2] });
    }
    if (style === 'pony') {
      hp({ p: [0, 0.1, -0.46], s: [0.13, 0.13, 0.13] });
      this.addTo(this.hairG, SH.cone, {
        p: [0, -0.12, -0.5],
        s: [0.1, 0.34, 0.1],
        r: [Math.PI, 0, 0],
        t: color,
      });
    }
    if (style === 'bun') hp({ p: [0, 0.45, -0.05], s: [0.17, 0.17, 0.17] });
    if (style === 'bob') for (const x of [-0.3, 0.3]) hb({ p: [x, -0.02, -0.02], s: [0.12, 0.34, 0.4] });
    if (style === 'spiky') {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const rr = i === 0 ? 0 : 0.2;
        this.addTo(this.hairG, SH.cone, {
          p: [Math.cos(a) * rr, 0.38, Math.sin(a) * rr - 0.04],
          s: [0.1, 0.26, 0.1],
          r: [Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4],
          t: color,
        });
      }
      hb({ p: [0, 0.2, 0.22], s: [0.44, 0.08, 0.12] });
    }
  }

  private buildAccessory(acc: Accessory): void {
    clearGroup(this.accG);
    const ag = this.accG;
    const add = (geo: Parameters<typeof part>[0], o: Parameters<typeof part>[1]) => this.addTo(ag, geo, o);
    if (acc === 'glasses') {
      const frame = 0x20202a;
      for (const x of [-0.13, 0.13]) {
        add(SH.box, { p: [x, 0, 0.325], s: [0.2, 0.025, 0.03], t: frame });
        add(SH.box, { p: [x, -0.095, 0.325], s: [0.2, 0.025, 0.03], t: frame });
        add(SH.box, { p: [x - 0.1, -0.045, 0.325], s: [0.025, 0.12, 0.03], t: frame });
        add(SH.box, { p: [x + 0.1, -0.045, 0.325], s: [0.025, 0.12, 0.03], t: frame });
      }
      add(SH.box, { p: [0, 0, 0.33], s: [0.08, 0.02, 0.03], t: frame });
    } else if (acc === 'cap') {
      add(SH.sph, { p: [0, 0.1, -0.03], s: [0.38, 0.3, 0.39], t: 0xd94a3a });
      add(SH.box, { p: [0, 0.08, 0.33], s: [0.4, 0.04, 0.24], t: 0xb23a2c });
    } else if (acc === 'headphones') {
      add(SH.box, { p: [0, 0.38, 0], s: [0.62, 0.05, 0.07], t: 0x2a2a35 });
      for (const x of [-1, 1]) {
        add(SH.box, { p: [x * 0.33, 0.22, 0], s: [0.05, 0.32, 0.07], t: 0x2a2a35, r: [0, 0, x * 0.12] });
        add(SH.cyl, { p: [x * 0.37, 0, 0], s: [0.13, 0.08, 0.13], r: [0, 0, Math.PI / 2], t: 0xe8453c });
      }
    } else if (acc === 'beanie') {
      add(SH.sph, { p: [0, 0.12, -0.03], s: [0.375, 0.32, 0.385], t: 0x3d7be0 });
      add(SH.sph, { p: [0, 0.46, -0.03], s: [0.08, 0.08, 0.08], t: 0xffffff });
      add(SH.cyl, { p: [0, 0.07, -0.02], s: [0.385, 0.07, 0.395], t: 0x2e62b8 });
    } else if (acc === 'bow') {
      for (const s of [-1, 1]) {
        add(SH.cone, {
          p: [0.2 + s * 0.09, 0.34, 0.12],
          s: [0.09, 0.14, 0.05],
          r: [0, 0, (-s * Math.PI) / 2],
          t: 0xff7aa8,
        });
      }
      add(SH.sph, { p: [0.2, 0.34, 0.12], s: [0.05, 0.05, 0.05], t: 0xff4f86 });
    } else if (acc === 'crown') {
      add(SH.cyl, { p: [0, 0.38, 0], s: [0.2, 0.1, 0.2], t: 0xffc933, emi: 0.5 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        add(SH.cone, {
          p: [Math.cos(a) * 0.17, 0.5, Math.sin(a) * 0.17],
          s: [0.05, 0.12, 0.05],
          t: 0xffc933,
          emi: 0.6,
        });
      }
    }
  }

  wave(sec = 1.2): void {
    this.waveT = sec;
  }

  /** Turn smoothly to face the direction (dx, dz). */
  faceDir(dx: number, dz: number, dt: number, rate = 10): void {
    const target = Math.atan2(dx, dz);
    let d = target - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, dt * rate);
    this.root.rotation.y = this.yaw;
  }

  /** Animate walking / idling. `speed` in world units per second, `t` is the global clock. */
  update(dt: number, speed: number, t: number): void {
    this.speed += (speed - this.speed) * Math.min(1, dt * 10);
    const sp = this.speed;
    this.phase += dt * sp * 1.7;
    const moving = sp > 0.3;
    const amp = Math.min(sp / 6.5, 1.5) * 0.85;
    const s = Math.sin(this.phase);
    this.legL.rotation.x = s * amp;
    this.legR.rotation.x = -s * amp;
    this.armL.rotation.x = -s * amp * 0.9;
    this.armR.rotation.x = s * amp * 0.9;
    this.armL.rotation.z = 0.05;
    this.armR.rotation.z = -0.05;
    this.body.position.y =
      0.85 + (moving ? Math.abs(Math.cos(this.phase)) * 0.06 : Math.sin(t * 2.2 + this.phase) * 0.008);
    this.body.rotation.x = moving ? Math.min(sp / 6.5, 1.5) * 0.12 : 0;
    this.head.rotation.x = moving ? -this.body.rotation.x : Math.sin(t * 1.3 + this.phase) * 0.03;
    if (this.waveT > 0) {
      this.waveT -= dt;
      this.armR.rotation.x = -2.7;
      this.armR.rotation.z = -0.3 + Math.sin(t * 12) * 0.35;
    }
  }
}

/** The four friends' fixed outfits. */
export const NPC_LOOKS: Record<'maya' | 'kai' | 'zoe' | 'rin', Look> = {
  maya: {
    skin: SKINS[1],
    hairStyle: 'long',
    hair: 0x5a3a22,
    blazer: 0x7a4fb5,
    bag: 0xf0b429,
    acc: 'glasses',
    pants: 0x3a3d4a,
  },
  kai: {
    skin: SKINS[3],
    hairStyle: 'spiky',
    hair: 0x2a2020,
    blazer: 0xd94a3a,
    bag: 0x2a2a30,
    acc: 'cap',
    pants: 0x2a3550,
  },
  zoe: {
    skin: SKINS[0],
    hairStyle: 'pony',
    hair: 0xe58ab5,
    blazer: 0x1aa6a6,
    bag: 0x3d7be0,
    acc: 'headphones',
    pants: 0x3a3d4a,
  },
  rin: {
    skin: SKINS[2],
    hairStyle: 'bob',
    hair: 0x20243a,
    blazer: 0x1f2433,
    bag: 0xc9ccd6,
    acc: 'none',
    pants: 0x1f2433,
    tie: 0xffc933,
  },
};

export function randomLook(rng: Rng): Look {
  return {
    skin: pick(rng, SKINS),
    hairStyle: pick(rng, HAIR_STYLES),
    hair: pick(rng, HAIR_COLORS.slice(0, 6)),
    blazer: pick(rng, [0x2f4a8a, 0x2f7a4b, 0x8a2f3f, 0x444b57]),
    bag: pick(rng, BAGS),
    acc: pick(rng, ['none', 'none', 'glasses', 'bow', 'beanie'] as Accessory[]),
    pants: 0x3a3d4a,
  };
}
