// Campus layout: pure data shared by the 3D scene, collisions, minimap and game rules.
import type { ZoneId } from '../core/types';

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
export type BuildingId = 'main' | 'math' | 'cs' | 'lab' | 'econ' | 'library' | 'canteen' | 'club';
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
  /** Department buildings are five storeys tall with a staircase inside. */
  floors?: number;
}

export const BOUNDS = { x0: -49, x1: 49, z0: -45.5, z1: 49 };
export const PLAZA = { x: 0, z: 6, r: 14 };
export const BUILDINGS: Building[] = [
  {
    // Hale Hall: Humanities, and the Grand Exam Hall on the ground floor.
    id: 'main',
    name: 'Hale Hall',
    icon: '🏛️',
    cx: 0,
    cz: -31,
    w: 36,
    d: 14,
    h: 21,
    wall: 0xf0e0bd,
    trim: 0xa3433f,
    roof: 0x8a3b3b,
    accent: 0xc23b3b,
    door: { x: 0, z: -24, dx: 0, dz: 1, w: 4.2, h: 4.6 },
    floors: 5,
  },
  {
    id: 'math',
    name: 'Newton Hall',
    icon: '📐',
    cx: -37,
    cz: -33,
    w: 16,
    d: 14,
    h: 21,
    wall: 0xe4ecf7,
    trim: 0x2f5fb8,
    roof: 0x3a5a99,
    accent: 0x3d7be0,
    door: { x: -37, z: -26, dx: 0, dz: 1, w: 3.4, h: 4.2 },
    floors: 5,
  },
  {
    id: 'cs',
    name: 'Lovelace Hall',
    icon: '💻',
    cx: 37,
    cz: -33,
    w: 16,
    d: 14,
    h: 21,
    wall: 0xe3f0f0,
    trim: 0x13867f,
    roof: 0x2a8f8a,
    accent: 0x1aa6a6,
    door: { x: 37, z: -26, dx: 0, dz: 1, w: 3.4, h: 4.2 },
    floors: 5,
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
    name: 'Curie Hall',
    icon: '🧪',
    cx: -33,
    cz: 14,
    w: 16,
    d: 14,
    h: 21,
    wall: 0xdcefee,
    trim: 0x13867f,
    roof: 0x2a8f8a,
    accent: 0x35a85a,
    door: { x: -25, z: 14, dx: 1, dz: 0, w: 3.4, h: 4.2 },
    floors: 5,
  },
  {
    id: 'econ',
    name: 'Smith Hall',
    icon: '📈',
    cx: -33,
    cz: 38,
    w: 16,
    d: 14,
    h: 21,
    wall: 0xf6ecd2,
    trim: 0xb8862b,
    roof: 0x8a6420,
    accent: 0xe0a02a,
    door: { x: -25, z: 38, dx: 1, dz: 0, w: 3.4, h: 4.2 },
    floors: 5,
  },
  {
    // One building holds all five clubs (chess, music, dance, debate and sports), one room each.
    id: 'club',
    name: 'Club House',
    icon: '🎭',
    cx: 32,
    cz: 26,
    w: 16,
    d: 30,
    h: 8.5,
    wall: 0xf6e8dc,
    trim: 0xb23a6a,
    roof: 0x6b3d9c,
    accent: 0xff7a59,
    door: { x: 24, z: 26, dx: -1, dz: 0, w: 3.6, h: 3.9 },
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
/** Open places around campus where friends like to hang about. */
export const GATHERING_SPOTS: XZ[] = [
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
  [-46, 44],
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
/** The patch of campus each member of staff keeps to during the day: its centre and how far they roam. */
export const STAFF_SPOTS: { id: string; x: number; z: number; r: number }[] = [
  { id: 'x_dean', x: 6.5, z: -18.6, r: 5 },
  { id: 'x_clerk', x: -3.8, z: -18.6, r: 3.5 },
  { id: 'x_security', x: 6, z: 43, r: 9 },
];
