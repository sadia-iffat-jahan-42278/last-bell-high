// Dance Club: arrows rise to the line on the beat. Hit ← ↓ ↑ → (or W A S D, or tap) in time and your dancer strikes the pose.
import { Sound } from '../audio/sound';
import * as St from '../core/state';
import { clamp, hexCss, mulberry32 } from '../core/util';
import { ui } from '../ui/ui';
import {
  canvasWithHint,
  context2d,
  intro,
  makeCanvas,
  roundRect,
  type ArcadeConfig,
  type Rank,
} from './shared';

export interface DanceResult {
  rank: Rank;
  acc: number;
  score: number;
  maxCombo: number;
  counts: { perfect: number; great: number; good: number; miss: number };
  total: number;
}

interface Step {
  t: number;
  lane: number;
  /** 0 = pending, 1 = hit, -1 = missed */
  state: 0 | 1 | -1;
}
type Judgement = 'perfect' | 'great' | 'good';
interface Pop {
  txt: string;
  c: string;
  t: number;
  x: number;
}

const W = 560;
const H = 760;
const LANE_W = 100;
const X0 = (W - LANE_W * 4) / 2;
const REC = 150;
const TRAVEL = 1.6;
const COLORS = ['#ff5fa2', '#4aa8ff', '#2fd3a0', '#ffb300'];
/** Lane 0..3 = left, down, up, right. */
const KEYS = [
  ['arrowleft', 'a'],
  ['arrowdown', 's'],
  ['arrowup', 'w'],
  ['arrowright', 'd'],
];
const TONES = [392, 440, 523.25, 587.33];
const BARS = 16;

/** An arrow pointing `lane` (0 left, 1 down, 2 up, 3 right). */
function arrow(g: CanvasRenderingContext2D, cx: number, cy: number, lane: number, size: number): void {
  g.save();
  g.translate(cx, cy);
  // the base shape points up: lane 2 = up, 0 = left, 1 = down, 3 = right
  g.rotate([-Math.PI / 2, Math.PI, 0, Math.PI / 2][lane]);
  g.beginPath();
  g.moveTo(0, -size);
  g.lineTo(size, 0.05 * size);
  g.lineTo(size * 0.4, 0.05 * size);
  g.lineTo(size * 0.4, size);
  g.lineTo(-size * 0.4, size);
  g.lineTo(-size * 0.4, 0.05 * size);
  g.lineTo(-size, 0.05 * size);
  g.closePath();
  g.restore();
}

/** A simple dancer in the student's colours; `pose` is the last lane pressed (-1 = idle). */
function dancer(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  pose: number,
  amount: number,
  t: number,
  look: ArcadeConfig['look'],
  stumble: number,
): void {
  const bob = Math.abs(Math.sin(t * 6)) * 6;
  const crouch = pose === 1 ? 26 * amount : 0;
  const lean = pose === 0 ? -0.22 * amount : pose === 3 ? 0.22 * amount : 0;
  g.save();
  g.translate(x, y - bob + crouch);
  g.rotate(lean + Math.sin(t * 24) * 0.05 * stumble);
  const skin = hexCss(look.skin);
  const cloth = hexCss(look.blazer);
  const pants = hexCss(look.pants ?? 0x3a3d4a);
  // legs
  g.strokeStyle = pants;
  g.lineWidth = 16;
  g.lineCap = 'round';
  const spread = pose === 1 ? 26 : 14 + Math.sin(t * 6) * 6;
  g.beginPath();
  g.moveTo(-8, -28);
  g.lineTo(-spread, 0 - crouch * 0.6);
  g.moveTo(8, -28);
  g.lineTo(spread, 0 - crouch * 0.6);
  g.stroke();
  // body
  g.fillStyle = cloth;
  roundRect(g, -24, -98, 48, 74, 14);
  g.fill();
  // arms
  g.strokeStyle = cloth;
  g.lineWidth = 13;
  const hand = (side: -1 | 1): [number, number] => {
    const idle: [number, number] = [side * 40, -50 + Math.sin(t * 6 + side) * 10];
    if (pose === 2) return [side * 34, -150];
    if (pose === 0) return side < 0 ? [-62, -118] : [30, -48];
    if (pose === 3) return side > 0 ? [62, -118] : [-30, -48];
    if (pose === 1) return [side * 52, -34];
    return idle;
  };
  for (const side of [-1, 1] as const) {
    const [hx, hy] = hand(side);
    g.beginPath();
    g.moveTo(side * 22, -90);
    g.lineTo(hx, hy);
    g.stroke();
    g.fillStyle = skin;
    g.beginPath();
    g.arc(hx, hy, 8, 0, 7);
    g.fill();
  }
  // head
  g.fillStyle = skin;
  g.beginPath();
  g.arc(0, -122, 22, 0, 7);
  g.fill();
  g.fillStyle = hexCss(look.hair);
  g.beginPath();
  g.arc(0, -128, 22, Math.PI, 0);
  g.fill();
  g.fillStyle = '#222';
  g.beginPath();
  g.arc(-8, -120, 2.6, 0, 7);
  g.arc(8, -120, 2.6, 0, 7);
  g.fill();
  g.restore();
}

export async function runDance(cfg: ArcadeConfig): Promise<DanceResult> {
  const s = cfg.state;
  const rng = mulberry32(cfg.seed || 9);
  const hard = cfg.hard;
  const sem = cfg.sem;
  await intro(
    'dance',
    '💃 Dance Battle',
    'Arrows rise up the screen. Press <b>← ↓ ↑ →</b> (or <b>A S W D</b>, or tap the lanes) exactly when they reach the line.<br>Hit them on the beat to keep the combo going and your dancer will copy every move!',
  );
  Sound.init();

  // --- choreography: later semesters are faster, denser and use longer move sequences ---
  const bpm = 106 + sem * 4 + (hard ? 8 : 0);
  const beat = 60 / bpm;
  const density = 0.36 + sem * 0.045 + (hard ? 0.08 : 0);
  const runProb = 0.1 + sem * 0.03;
  const notes: Step[] = [];
  let lastLane = -1;
  for (let b = 4; b < BARS * 4 - 1; b += 0.5) {
    if (rng() > density * (Math.floor(b) % 2 === 0 ? 1.1 : 0.85)) continue;
    if (rng() < runProb && b < BARS * 4 - 3) {
      // a little move: three or four arrows in a row, either spinning round or ping-ponging
      const len = sem >= 4 && rng() < 0.5 ? 4 : 3;
      const dir = rng() < 0.5 ? 1 : -1;
      let lane = Math.floor(rng() * 4);
      for (let k = 0; k < len; k++) {
        notes.push({ t: (b + k * 0.5) * beat, lane, state: 0 });
        lane = (lane + dir + 4) % 4;
        lastLane = lane;
      }
      b += len * 0.5;
      continue;
    }
    let lane = Math.floor(rng() * 4);
    if (lane === lastLane) lane = (lane + 1 + Math.floor(rng() * 3)) % 4;
    lastLane = lane;
    notes.push({ t: b * beat, lane, state: 0 });
    // jumps: two arrows at once
    if (sem >= 2 && rng() < 0.05 + sem * 0.012 && b % 1 === 0)
      notes.push({ t: b * beat, lane: (lane + 2) % 4, state: 0 });
  }
  const endT = BARS * 4 * beat + 1.2;
  const total = notes.length;
  const wide = 1 + St.stat(s, 'sta') * 0.01 + St.stat(s, 'cha') * 0.01 + (St.has(s, 'pitch') ? 0.1 : 0);
  const WIN = { perfect: 0.055 * wide, great: 0.095 * wide, good: 0.14 * wide };

  const canvas = makeCanvas(W, H);
  const g = context2d(canvas);
  const ov = ui.overlay(canvasWithHint(canvas, '← ↓ ↑ →  or  A S W D  or tap the lanes'));
  const T0 = Sound.now() + 2.6;

  // --- backing track: a bouncy bass line, chords and a four-on-the-floor kick ---
  const prog: [number, 'm' | 'M'][] = [
    [43, 'm'],
    [39, 'M'],
    [46, 'M'],
    [41, 'M'],
  ];
  const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
  if (Sound.ctx && Sound.musicG) {
    const bus = Sound.musicG;
    for (let bar = 0; bar < BARS; bar++) {
      const [root, quality] = prog[bar % 4];
      const bt = T0 + bar * 4 * beat;
      for (const iv of quality === 'm' ? [0, 3, 7] : [0, 4, 7]) {
        Sound.osc(hz(root + 24 + iv), bt, 4 * beat * 0.9, 'triangle', 0.03, { attack: 0.1, bus });
      }
      for (let k = 0; k < 8; k++) {
        if (bar >= 1 || k >= 4)
          Sound.osc(
            hz(root - 12 + (k % 4 === 3 ? 7 : 0)),
            bt + (k * beat) / 2,
            beat * 0.4,
            'sawtooth',
            0.07,
            { bus },
          );
      }
      for (let k = 0; k < 4 && bar >= 1; k++) {
        Sound.kick(bt + k * beat);
        Sound.hat(bt + k * beat + beat / 2, undefined, 0.06);
        if (k % 2 === 1) Sound.hat(bt + k * beat, undefined, 0.1);
      }
    }
  }

  // --- play state ---
  let combo = 0;
  let maxCombo = 0;
  let score = 0;
  let pose = -1;
  let poseAmt = 0;
  let stumble = 0;
  const counts = { perfect: 0, great: 0, good: 0, miss: 0 };
  let pops: Pop[] = [];
  const flashes = [0, 0, 0, 0];
  const now = () => Sound.now() - T0;

  const judge = (n: Step, d: number) => {
    const a = Math.abs(d);
    const j: Judgement = a <= WIN.perfect ? 'perfect' : a <= WIN.great ? 'great' : 'good';
    n.state = 1;
    counts[j]++;
    combo++;
    maxCombo = Math.max(maxCombo, combo);
    score += { perfect: 300, great: 200, good: 100 }[j] * (1 + Math.min(combo, 50) / 50);
    pops.push({
      txt: j.toUpperCase(),
      c: j === 'perfect' ? '#ffd23a' : j === 'great' ? '#2fd3a0' : '#9ad0ff',
      t: 0,
      x: X0 + n.lane * LANE_W + LANE_W / 2,
    });
  };
  const press = (lane: number) => {
    flashes[lane] = 1;
    pose = lane;
    poseAmt = 1;
    const tn = now();
    let best: Step | null = null;
    for (const n of notes) {
      if (
        n.state === 0 &&
        n.lane === lane &&
        Math.abs(n.t - tn) <= WIN.good &&
        (!best || Math.abs(n.t - tn) < Math.abs(best.t - tn))
      )
        best = n;
    }
    if (best) {
      judge(best, best.t - tn);
      Sound.osc(TONES[lane] * 2, Sound.now(), 0.22, 'triangle', 0.15);
    } else Sound.osc(TONES[lane] / 2, Sound.now(), 0.08, 'square', 0.03);
  };
  const offKeys = ui.pushKeys((e) => {
    const k = e.key.toLowerCase();
    const i = KEYS.findIndex((ks) => ks.includes(k));
    if (i >= 0 && !e.repeat) {
      press(i);
      return true;
    }
    return e.key === 'Escape';
  });
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const lane = Math.floor((x - X0) / LANE_W);
    if (lane >= 0 && lane < 4) press(lane);
  });

  await new Promise<void>((resolve) => {
    const draw = () => {
      const tn = now();
      g.clearRect(0, 0, W, H);
      // stage: dark gradient with a pulsing disco floor
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#2a1245');
      bg.addColorStop(1, '#0f1a3a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const pulse = 1 - ((Math.max(0, tn) / beat) % 1);
      const fever = combo >= 10 ? 0.15 : 0;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 4; j++) {
          const on = (i + j + Math.floor(Math.max(0, tn) / beat)) % 3 === 0;
          g.fillStyle = on ? `rgba(255,95,162,${0.1 + pulse * 0.1 + fever})` : 'rgba(255,255,255,0.03)';
          g.fillRect(i * 70 + 2, H - 160 + j * 40 + 2, 66, 36);
        }
      }
      for (let l = 0; l < 4; l++) {
        g.fillStyle = `rgba(255,255,255,${0.04 + flashes[l] * 0.2})`;
        g.fillRect(X0 + l * LANE_W + 2, 0, LANE_W - 4, H);
        flashes[l] *= 0.86;
        // receptors
        arrow(g, X0 + l * LANE_W + LANE_W / 2, REC, l, 32);
        g.lineWidth = 4;
        g.strokeStyle = COLORS[l];
        g.globalAlpha = 0.45 + flashes[l] * 0.55;
        g.stroke();
        g.globalAlpha = 1;
      }
      for (const n of notes) {
        if (n.state === 0 && tn - n.t > WIN.good) {
          n.state = -1;
          counts.miss++;
          combo = 0;
          stumble = 1;
          pops.push({ txt: 'MISS', c: '#ff6b6b', t: 0, x: X0 + n.lane * LANE_W + LANE_W / 2 });
        }
        if (n.state !== 0) continue;
        const y = REC + ((n.t - tn) / TRAVEL) * (H - REC + 30);
        if (y > H + 40 || y < -40) continue;
        arrow(g, X0 + n.lane * LANE_W + LANE_W / 2, y, n.lane, 32);
        g.fillStyle = COLORS[n.lane];
        g.fill();
        g.lineWidth = 3;
        g.strokeStyle = '#fff';
        g.stroke();
      }
      poseAmt *= 0.93;
      stumble *= 0.94;
      dancer(g, W / 2, H - 30, poseAmt > 0.15 ? pose : -1, poseAmt, Math.max(0, tn), cfg.look, stumble);
      pops = pops.filter((p) => p.t < 1);
      for (const p of pops) {
        p.t += 0.04;
        g.globalAlpha = 1 - p.t;
        g.fillStyle = p.c;
        g.font = '900 22px sans-serif';
        g.textAlign = 'center';
        g.fillText(p.txt, p.x, REC + 70 + p.t * 40);
        g.globalAlpha = 1;
      }
      g.fillStyle = '#fff';
      g.textAlign = 'left';
      g.font = '900 26px sans-serif';
      g.fillText(`${Math.round(score).toLocaleString()}`, 18, 38);
      g.textAlign = 'right';
      g.fillText(combo > 1 ? `${combo} combo` : '', W - 18, 38);
      g.fillStyle = 'rgba(255,255,255,.2)';
      g.fillRect(18, 52, W - 36, 8);
      g.fillStyle = '#ff5fa2';
      g.fillRect(18, 52, (W - 36) * clamp(tn / endT, 0, 1), 8);
      if (tn < 0) {
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.font = '900 90px sans-serif';
        g.fillText(String(Math.ceil(-tn)), W / 2, H / 2);
      }
      if (tn >= endT) {
        resolve();
        return;
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
  });

  offKeys();
  ov.close();
  const acc = (counts.perfect + counts.great * 0.75 + counts.good * 0.4) / Math.max(1, total);
  const rank: Rank = acc >= 0.95 ? 'S' : acc >= 0.85 ? 'A' : acc >= 0.7 ? 'B' : acc >= 0.5 ? 'C' : 'D';
  return { rank, acc, score: Math.round(score), maxCombo, counts, total };
}
