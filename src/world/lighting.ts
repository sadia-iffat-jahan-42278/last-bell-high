// Time-of-day lighting. Pure maths: produces plain RGB triples that the renderer applies.
import type { Weather } from '../core/types';

export type RGB = [number, number, number];

/** Hex colour -> "linear" RGB using the game's cheap gamma-2 curve. */
export const lin = (hex: number): RGB =>
  [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((v) => v * v) as RGB;

const mix = (a: number, b: number, t: number): number => a + (b - a) * t;
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];
const scaleRGB = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];

interface Keyframe {
  h: number;
  sunCol: RGB;
  sky: RGB;
  ground: RGB;
  top: number;
  bot: number;
  fog: number;
  night: number;
  glow: RGB;
}

const KEYS: Keyframe[] = [
  {
    h: 5,
    sunCol: [0.1, 0.12, 0.22],
    sky: [0.07, 0.09, 0.18],
    ground: [0.04, 0.04, 0.07],
    top: 0x080c26,
    bot: 0x20295a,
    fog: 0x1a2145,
    night: 1,
    glow: [0, 0, 0],
  },
  {
    h: 6.5,
    sunCol: [0.75, 0.42, 0.22],
    sky: [0.24, 0.26, 0.4],
    ground: [0.15, 0.12, 0.12],
    top: 0x6a82bd,
    bot: 0xffb98a,
    fog: 0xf0b79b,
    night: 0.25,
    glow: [0.55, 0.3, 0.1],
  },
  {
    h: 8,
    sunCol: [0.85, 0.74, 0.58],
    sky: [0.36, 0.42, 0.55],
    ground: [0.24, 0.22, 0.19],
    top: 0x58a0ea,
    bot: 0xd3e9ff,
    fog: 0xcfe4f5,
    night: 0,
    glow: [0.5, 0.4, 0.2],
  },
  {
    h: 12.5,
    sunCol: [0.95, 0.9, 0.8],
    sky: [0.44, 0.52, 0.64],
    ground: [0.3, 0.28, 0.24],
    top: 0x3f90e8,
    bot: 0xc4e2ff,
    fog: 0xd0e6f7,
    night: 0,
    glow: [0.5, 0.45, 0.3],
  },
  {
    h: 15.5,
    sunCol: [0.95, 0.82, 0.62],
    sky: [0.42, 0.48, 0.58],
    ground: [0.28, 0.25, 0.2],
    top: 0x4a94e0,
    bot: 0xcfe0f0,
    fog: 0xd8e2ea,
    night: 0,
    glow: [0.5, 0.4, 0.25],
  },
  {
    h: 18.5,
    sunCol: [0.9, 0.45, 0.24],
    sky: [0.34, 0.28, 0.38],
    ground: [0.19, 0.15, 0.15],
    top: 0x4d5fa6,
    bot: 0xff9a6b,
    fog: 0xe0a08a,
    night: 0.15,
    glow: [0.8, 0.4, 0.15],
  },
  {
    h: 21,
    sunCol: [0.1, 0.13, 0.26],
    sky: [0.08, 0.1, 0.2],
    ground: [0.04, 0.04, 0.07],
    top: 0x070b24,
    bot: 0x1d2750,
    fog: 0x151c3a,
    night: 1,
    glow: [0, 0, 0],
  },
  {
    h: 29,
    sunCol: [0.1, 0.12, 0.22],
    sky: [0.07, 0.09, 0.18],
    ground: [0.04, 0.04, 0.07],
    top: 0x080c26,
    bot: 0x20295a,
    fog: 0x1a2145,
    night: 1,
    glow: [0, 0, 0],
  },
];

type Vec3 = [number, number, number];

function sunPosAt(hour: number): Vec3 {
  const day = (hh: number): Vec3 => {
    const t = ((hh - 6) / 13) * Math.PI;
    return [Math.cos(t), Math.sin(t) * 0.95 + 0.06, -0.35];
  };
  const moon: Vec3 = [-0.3, 0.75, 0.35];
  const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
    mix(a[0], b[0], t),
    mix(a[1], b[1], t),
    mix(a[2], b[2], t),
  ];
  const hh = hour < 5 ? hour + 24 : hour;
  if (hh >= 6 && hh <= 19) return day(hh);
  if (hh > 19 && hh < 21) return lerp3(day(19), moon, (hh - 19) / 2);
  if (hh >= 21 && hh <= 29) return hh < 28 ? moon : lerp3(moon, day(6), hh - 28);
  return lerp3(moon, day(6), hh - 5); // 5..6
}

export interface LightState {
  sunCol: RGB;
  sky: RGB;
  ground: RGB;
  skyTop: RGB;
  skyBot: RGB;
  fogCol: RGB;
  night: number;
  sunGlow: RGB;
  fogDen: number;
  /** Unit vector pointing from the world towards the sun (or moon). */
  toSun: Vec3;
  /** 0..1: how strongly lamps and lit windows should glow. */
  lamps: number;
}

export function lightAt(hour: number, weather: Weather = 'sunny'): LightState {
  const hh = hour < 5 ? hour + 24 : hour;
  let a = KEYS[0];
  let b = KEYS[1];
  for (let i = 0; i < KEYS.length - 1; i++) {
    if (hh >= KEYS[i].h && hh <= KEYS[i + 1].h) {
      a = KEYS[i];
      b = KEYS[i + 1];
      break;
    }
  }
  const t = Math.max(0, Math.min(1, (hh - a.h) / (b.h - a.h || 1)));
  const v = sunPosAt(hh);
  const len = Math.hypot(...v) || 1;
  const L: LightState = {
    sunCol: mixRGB(a.sunCol, b.sunCol, t),
    sky: mixRGB(a.sky, b.sky, t),
    ground: mixRGB(a.ground, b.ground, t),
    skyTop: mixRGB(lin(a.top), lin(b.top), t),
    skyBot: mixRGB(lin(a.bot), lin(b.bot), t),
    fogCol: mixRGB(lin(a.fog), lin(b.fog), t),
    night: mix(a.night, b.night, t),
    sunGlow: mixRGB(a.glow, b.glow, t),
    fogDen: 0.0075,
    toSun: [v[0] / len, v[1] / len, v[2] / len],
    lamps: 0,
  };
  const dayF = 1 - L.night;
  if (weather === 'cloudy' || weather === 'rain') {
    const k = weather === 'rain' ? 1 : 0.55;
    const grey = scaleRGB([0.42 * 0.42, 0.47 * 0.47, 0.53 * 0.53], 0.35 + 0.65 * dayF);
    L.sunCol = scaleRGB(L.sunCol, 1 - 0.7 * k);
    L.sunGlow = scaleRGB(L.sunGlow, 1 - 0.8 * k);
    const brighter = L.sky.map((x) => x * 1.1 + 0.03 * dayF) as RGB;
    L.sky = mixRGB(L.sky, brighter, 0.5 * k);
    L.skyTop = mixRGB(L.skyTop, scaleRGB(grey, 0.9), 0.65 * k);
    L.skyBot = mixRGB(L.skyBot, scaleRGB(grey, 1.25), 0.7 * k);
    L.fogCol = mixRGB(L.fogCol, scaleRGB(grey, 1.2), 0.6 * k);
    L.fogDen = 0.0075 + 0.0065 * k;
  }
  L.lamps = Math.max(0, Math.min(1, L.night * 1.4 + (weather === 'rain' ? 0.3 * dayF : 0)));
  return L;
}
