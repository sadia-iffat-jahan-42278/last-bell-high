// Music Club: falling notes in four lanes (keys D F J K, or tap).
import { Sound } from '../audio/sound';
import * as St from '../core/state';
import { clamp, mulberry32 } from '../core/util';
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

export interface RhythmResult {
  rank: Rank;
  acc: number;
  score: number;
  maxCombo: number;
  counts: { perfect: number; great: number; good: number; miss: number };
  total: number;
}

interface Note {
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
const HIT = H - 150;
const TRAVEL = 1.55;
const COLORS = ['#ff6b6b', '#ffb300', '#2fd3a0', '#4aa8ff'];
const KEYS = ['d', 'f', 'j', 'k'];
const TONES = [440, 523.25, 659.25, 783.99];
const BARS = 16;

export async function runRhythm(cfg: ArcadeConfig): Promise<RhythmResult> {
  const s = cfg.state;
  const rng = mulberry32(cfg.seed || 7);
  const hard = cfg.hard;
  const t = cfg.term;
  await intro(
    'rhythm',
    '🎵 Rhythm Rehearsal',
    'Notes fall down four lanes. Hit <b>D F J K</b> (or tap the lanes) exactly when they reach the line.<br>Perfect hits build your combo and score!',
  );
  Sound.init();

  // --- chart ---
  const bpm = 104 + t * 8 + (hard ? 8 : 0);
  const beat = 60 / bpm;
  const density = 0.42 + t * 0.1 + (hard ? 0.1 : 0);
  const notes: Note[] = [];
  let lastLane = -1;
  let repeats = 0;
  for (let b = 4; b < BARS * 4; b += 0.5) {
    if (rng() < density * (Math.floor(b) % 2 === 0 ? 1.1 : 0.85)) {
      let lane = Math.floor(rng() * 4);
      if (lane === lastLane && ++repeats >= 2) {
        lane = (lane + 1 + Math.floor(rng() * 3)) % 4;
        repeats = 0;
      }
      if (lane !== lastLane) repeats = 0;
      lastLane = lane;
      notes.push({ t: b * beat, lane, state: 0 });
      if (t >= 1 && rng() < 0.08 && b % 1 === 0) notes.push({ t: b * beat, lane: (lane + 2) % 4, state: 0 });
    }
  }
  const endT = BARS * 4 * beat + 1.2;
  const total = notes.length;
  const wide =
    1 + (St.has(s, 'pitch') ? 0.15 : 0) + (St.friendHas(s, 'zoe', 2) ? 0.12 : 0) + St.stat(s, 'cre') * 0.012;
  const WIN = { perfect: 0.055 * wide, great: 0.095 * wide, good: 0.14 * wide };

  const canvas = makeCanvas(W, H);
  const g = context2d(canvas);
  const ov = ui.overlay(canvasWithHint(canvas, 'D · F · J · K  or tap the lanes'));
  const T0 = Sound.now() + 2.6; // song start

  // --- backing track ---
  const prog: [number, 'm' | 'M'][] = [
    [45, 'm'],
    [41, 'M'],
    [48, 'M'],
    [43, 'M'],
  ];
  const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
  if (Sound.ctx && Sound.musicG) {
    const bus = Sound.musicG;
    for (let bar = 0; bar < BARS; bar++) {
      const [root, quality] = prog[bar % 4];
      const bt = T0 + bar * 4 * beat;
      for (const iv of quality === 'm' ? [0, 3, 7, 10] : [0, 4, 7, 11]) {
        Sound.osc(hz(root + 12 + iv), bt, 4 * beat * 0.95, 'triangle', 0.035, { attack: 0.2, bus });
      }
      for (let k = 0; k < 8; k++) {
        const tt = bt + (k * beat) / 2;
        if ((bar >= 1 || k >= 4) && k % 2 === 0)
          Sound.osc(hz(root - 12), tt, beat * 0.6, 'sine', 0.2, { bus });
      }
      for (let k = 0; k < 4 && bar >= 1; k++) {
        Sound.kick(bt + k * beat);
        Sound.hat(bt + k * beat + beat / 2, undefined, 0.05);
      }
    }
  }

  // --- play state ---
  let combo = 0;
  let maxCombo = 0;
  let score = 0;
  const counts = { perfect: 0, great: 0, good: 0, miss: 0 };
  let pops: Pop[] = [];
  const flashes = [0, 0, 0, 0];
  const now = () => Sound.now() - T0;

  const judge = (n: Note, d: number) => {
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
    const tn = now();
    let best: Note | null = null;
    for (const n of notes) {
      if (
        n.state === 0 &&
        n.lane === lane &&
        Math.abs(n.t - tn) <= WIN.good &&
        (!best || Math.abs(n.t - tn) < Math.abs(best.t - tn))
      ) {
        best = n;
      }
    }
    if (best) {
      judge(best, best.t - tn);
      Sound.osc(TONES[lane] * 2, Sound.now(), 0.25, 'triangle', 0.16);
    } else Sound.osc(TONES[lane], Sound.now(), 0.08, 'square', 0.03);
  };
  const offKeys = ui.pushKeys((e) => {
    const i = KEYS.indexOf(e.key.toLowerCase());
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
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#1d1f4d');
      bg.addColorStop(1, '#3b1f55');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      const pulse = 1 - ((tn / beat) % 1);
      g.fillStyle = `rgba(255,255,255,${0.03 + pulse * 0.05})`;
      g.fillRect(0, 0, W, H);
      for (let l = 0; l < 4; l++) {
        g.fillStyle = `rgba(255,255,255,${0.05 + flashes[l] * 0.22})`;
        g.fillRect(X0 + l * LANE_W + 2, 0, LANE_W - 4, H);
        flashes[l] *= 0.86;
        g.globalAlpha = 0.9;
        roundRect(g, X0 + l * LANE_W + 8, HIT - 22, LANE_W - 16, 44, 14);
        g.lineWidth = 4;
        g.strokeStyle = COLORS[l];
        g.stroke();
        g.globalAlpha = 1;
        g.fillStyle = '#fff';
        g.font = '900 20px sans-serif';
        g.textAlign = 'center';
        g.fillText(KEYS[l].toUpperCase(), X0 + l * LANE_W + LANE_W / 2, HIT + 7);
      }
      for (const n of notes) {
        if (n.state === 0 && tn - n.t > WIN.good) {
          n.state = -1;
          counts.miss++;
          combo = 0;
          pops.push({ txt: 'MISS', c: '#ff6b6b', t: 0, x: X0 + n.lane * LANE_W + LANE_W / 2 });
        }
        if (n.state !== 0) continue;
        const y = HIT - ((n.t - tn) / TRAVEL) * (HIT + 20);
        if (y < -30 || y > H + 30) continue;
        g.fillStyle = COLORS[n.lane];
        roundRect(g, X0 + n.lane * LANE_W + 10, y - 16, LANE_W - 20, 32, 12);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.55)';
        roundRect(g, X0 + n.lane * LANE_W + 16, y - 11, LANE_W - 32, 8, 4);
        g.fill();
      }
      pops = pops.filter((p) => p.t < 1);
      for (const p of pops) {
        p.t += 0.04;
        g.globalAlpha = 1 - p.t;
        g.fillStyle = p.c;
        g.font = '900 22px sans-serif';
        g.fillText(p.txt, p.x, HIT - 50 - p.t * 40);
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
      g.fillStyle = '#ffb300';
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
