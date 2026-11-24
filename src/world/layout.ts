// Campus layout: pure data shared by the 3D scene, collisions, minimap and game rules.
import { NPC_IDS, type NpcId, type ZoneId } from '../core/types';

export interface Point {
  x: number;
  z: number;
}
export interface Door extends Point {
  /** Outward facing direction of the door. */
  dx: number;
  dz: number;
  w: number;
  h: number;
}
export type BuildingId = 'main' | 'library' | 'canteen' | 'lab' | 'music' | 'gym';
export interface Building {
  id: BuildingId;
  name: string;
  icon: string;
  cx: number;
  cz: number;
  w: number;
  d: number;
  h: number;
  wall: number;
  trim: number;
  roof: number;
  accent: number;
  door: Door;
}

export const BOUNDS = { x0: -49, x1: 49, z0: -45.5, z1: 49 };
export const PLAZA = { x: 0, z: 6, r: 14 };
export const BUILDINGS: Building[] = [
  {
    id: 'main',
    name: 'Hale Hall',
    icon: '🏫',
    cx: 0,
    cz: -30,
    w: 40,
    d: 12,
    h: 11,
    wall: 0xf0e0bd,
    trim: 0xa3433f,
    roof: 0x8a3b3b,
    accent: 0xc23b3b,
    door: { x: 0, z: -24, dx: 0, dz: 1, w: 4.2, h: 4.6 },
  },
  {
    id: 'library',
    name: 'Library',
    icon: '📚',
    cx: -32,
    cz: -8,
    w: 14,
    d: 12,
    h: 7,
    wall: 0xd9c9a8,
    trim: 0x2f5fb8,
    roof: 0x3a5a99,
    accent: 0x3d7be0,
    door: { x: -25, z: -8, dx: 1, dz: 0, w: 2.8, h: 3.6 },
  },
  {
    id: 'canteen',
    name: 'Canteen',
    icon: '🍜',
    cx: 32,
    cz: -8,
    w: 14,
    d: 12,
    h: 6,
    wall: 0xffe2b8,
    trim: 0xe0762a,
    roof: 0xc4552a,
    accent: 0xff9a3c,
    door: { x: 25, z: -8, dx: -1, dz: 0, w: 3, h: 3.6 },
  },
  {
    id: 'lab',
    name: 'Science Labs',
    icon: '🧪',
    cx: -32,
    cz: 14,
    w: 14,
    d: 12,
    h: 7,
    wall: 0xdcefee,
    trim: 0x13867f,
    roof: 0x2a8f8a,
    accent: 0x1aa6a6,
    door: { x: -25, z: 14, dx: 1, dz: 0, w: 2.8, h: 3.6 },
  },
  {
    id: 'music',
    name: 'Music Hall',
    icon: '🎵',
    cx: 32,
    cz: 14,
    w: 14,
    d: 12,
    h: 6.5,
    wall: 0xe9d9f3,
    trim: 0x7a3fb0,
    roof: 0x6b3d9c,
    accent: 0x9b59d6,
    door: { x: 25, z: 14, dx: -1, dz: 0, w: 2.8, h: 3.6 },
  },
  {
    id: 'gym',
    name: 'Gym',
    icon: '🏀',
    cx: 32,
    cz: 38,
    w: 16,
    d: 14,
    h: 8,
    wall: 0xf3d8d4,
    trim: 0xc23a30,
    roof: 0x9a3a36,
    accent: 0xe8453c,
    door: { x: 24, z: 38, dx: -1, dz: 0, w: 3.4, h: 3.8 },
  },
];
export const ROOF_STAIRS = { x: 15, z: -22, door: { x: 15, z: -20, dx: 0, dz: 1 } };
export const GATE = { x: 0, z: 47.5 };
export const NOTICE = { x: -8, z: -21 };

/** Where the player stands to use each door / object. */
export const ZONES = {} as Record<ZoneId, Point>;
for (const b of BUILDINGS) ZONES[b.id] = { x: b.door.x + b.door.dx * 2.4, z: b.door.z + b.door.dz * 2.4 };
ZONES.roof = { x: 15, z: -17.6 };
ZONES.gate = { x: 0, z: 44 };
ZONES.notice = { x: NOTICE.x, z: NOTICE.z + 2.2 };

type XZ = [number, number];
/** Sixteen open standing spots around campus. Each friend takes one at lunch and another after class. */
const SPOTS: XZ[] = [
  [-7.5, 9.5],
  [21.5, -4.8],
  [7.5, 9.5],
  [5.5, -19.5],
  [-21.5, -4.8],
  [21.5, 34.8],
  [21.8, 17.5],
  [-21.8, 17.5],
  [-2.5, -12],
  [2.5, 22],
  [-12.5, 9.5],
  [12.5, 9.5],
  [-17.5, 26],
  [15, 28.5],
  [-9.5, 31],
  [10, 33.5],
];
/** Friends' standing spots at lunch and after class (a shifted permutation of `SPOTS`, so spots never clash). */
export const HANGOUTS = {} as Record<NpcId, { lunch: XZ; after: XZ }>;
NPC_IDS.forEach((id, i) => {
  HANGOUTS[id] = { lunch: SPOTS[i], after: SPOTS[(i + 4) % SPOTS.length] };
});
export const CROWD_POINTS: XZ[] = [
  [-12, 2],
  [12, 2],
  [-6, -14],
  [8, -14],
  [0, 24],
  [-10, 24],
  [10, 26],
  [-14, 31],
  [14, 30],
  [0, -18],
  [-16, -8],
  [16, -8],
  [-16, 14],
  [16, 14],
  [0, 36],
  [-8, 12],
  [9, 12],
];
export const STARS: XZ[] = [
  [-46, -24],
  [46, -26],
  [0, -42],
  [-47, 24],
  [47, 26],
  [-37, 44],
  [36, 47.2],
  [-18, 44],
  [14, -12],
  [-30, 2.5],
];
export const CATS: XZ[] = [
  [-44, -6],
  [44, 4],
  [10, 46.5],
];
export const START = { x: 0, z: 41 };
