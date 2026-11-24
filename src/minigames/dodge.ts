// Sports Club: dodge falling balls, grab stars and shields for 35 seconds.
import { Sound } from '../audio/sound';
import * as St from '../core/state';
import { clamp, hexCss, mulberry32 } from '../core/util';
import { ui } from '../ui/ui';
import { canvasWithHint, context2d, intro, makeCanvas, type ArcadeConfig, type Rank } from './shared';

export interface DodgeResult {
  rank: Rank;
  score: number;
  collected: number;
  survived: boolean;
  flawless: boolean;
  lives: number;
}

type Falling =
  | { k: 'ball'; x: number; y: number; v: number; r: number; rot: number; dead?: boolean }
  | { k: 'star' | 'shield'; x: number; y: number; v: number; r: number; rot: number; dead?: boolean };

interface Pop {
  t: number;
  x: number;
  y: number;
  txt: string;
  c: string;
}

const W = 560;
const H = 760;
const DURATION = 35;

export async function runDodge(cfg: ArcadeConfig): Promise<DodgeResult> {
  const s = cfg.state;
  const hard = cfg.hard;
  const t = cfg.term;
  await intro(
    'dodge',
    '🏀 Dodgeball Drill',
    'Move with <b>← →</b> / <b>A D</b> (or drag on touch). Dodge the balls, grab ⭐ for points and 🛡️ for a shield.<br>Survive 35 seconds!',
  );
  const canvas = makeCanvas(W, H);
  const g = context2d(canvas);
  const ov = ui.overlay(canvasWithHint(canvas, '← → or A D to move · drag on touch'));

  const maxLives = 3 + (St.friendHas(s, 'kai', 3) ? 1 : 0) + Math.floor(St.stat(s, 'sta') / 8);
  let lives = maxLives;
  let lost = 0;
  const P = { x: W / 2, y: H - 90, r: 26 };
  const keys: Record<string, boolean> = {};
  const objs: Falling[] = [];
  let targetX: number | null = null;
  let time = -2; // negative = countdown
  let score = 0;
  let collected = 0;
  let shield = 0;
  let spawnT = 0;
  let hitFlash = 0;
  let pops: Pop[] = [];
  const speedMul = 1 + t * 0.12 + (hard ? 0.15 : 0);
  const speed = 330 + St.stat(s, 'sta') * 6;
  const rng = mulberry32(cfg.seed || 3);

  const MOVE_KEYS = ['arrowleft', 'a', 'arrowright', 'd'];
  const offKeys = ui.pushKeys((e) => {
    const k = e.key.toLowerCase();
    if (MOVE_KEYS.includes(k)) {
      keys[k] = true;
      return true;
    }
    return e.key === 'Escape';
  });
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.key.toLowerCase()] = false;
  };
  document.addEventListener('keyup', onKeyUp);
  const steer = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width) * W;
  };
  canvas.addEventListener('pointerdown', steer);
  canvas.addEventListener('pointermove', (e) => {
    if (e.buttons || e.pointerType === 'touch') steer(e);
  });

  const spawn = () => {
    const prog = time / DURATION;
    spawnT = (0.62 - prog * 0.28) / (1 + t * 0.12 + (hard ? 0.2 : 0));
    const roll = rng();
    const x = 30 + rng() * (W - 60);
    if (roll < 0.62) {
      objs.push({
        k: 'ball',
        x,
        y: -30,
        v: (230 + prog * 190 + rng() * 80) * speedMul,
        r: 20 + rng() * 8,
        rot: 0,
      });
    } else if (roll < 0.93) objs.push({ k: 'star', x, y: -30, v: 200 * speedMul, r: 16, rot: 0 });
    else objs.push({ k: 'shield', x, y: -30, v: 190, r: 18, rot: 0 });
  };

  const drawObject = (o: Falling) => {
    g.save();
    g.translate(o.x, o.y);
    g.rotate(o.rot);
    if (o.k === 'ball') {
      g.fillStyle = '#ff7a2f';
      g.beginPath();
      g.arc(0, 0, o.r, 0, 7);
      g.fill();
      g.strokeStyle = '#7a2f0a';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-o.r, 0);
      g.lineTo(o.r, 0);
      g.moveTo(0, -o.r);
      g.lineTo(0, o.r);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, o.r, 0, 7);
      g.stroke();
    } else {
      g.font = `${o.r * 2}px serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(o.k === 'star' ? '⭐' : '🛡️', 0, 2);
    }
    g.restore();
  };

  const drawPlayer = () => {
    g.save();
    g.translate(P.x, P.y);
    if (shield > 0) {
      g.strokeStyle = `rgba(120,200,255,${0.5 + 0.4 * Math.sin(time * 12)})`;
      g.lineWidth = 6;
      g.beginPath();
      g.arc(0, 0, P.r + 10, 0, 7);
      g.stroke();
    }
    g.globalAlpha = hitFlash > 0 && Math.floor(hitFlash * 20) % 2 ? 0.35 : 1;
    g.fillStyle = hexCss(cfg.look.blazer);
    g.beginPath();
    g.arc(0, 8, P.r, 0, 7);
    g.fill();
    g.fillStyle = hexCss(cfg.look.skin);
    g.beginPath();
    g.arc(0, -12, 17, 0, 7);
    g.fill();
    g.fillStyle = hexCss(cfg.look.hair);
    g.beginPath();
    g.arc(0, -17, 17, Math.PI, 0);
    g.fill();
    g.fillStyle = '#222';
    g.fillRect(-8, -13, 4, 5);
    g.fillRect(4, -13, 4, 5);
    g.restore();
  };

  await new Promise<void>((resolve) => {
    let last = performance.now();
    const loop = (nowMs: number) => {
      const dt = Math.min(0.04, (nowMs - last) / 1000);
      last = nowMs;
      time += dt;
      if (time > 0) {
        const dir = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0);
        if (dir) {
          P.x += dir * speed * dt;
          targetX = null;
        } else if (targetX !== null) P.x += clamp(targetX - P.x, -speed * 1.3 * dt, speed * 1.3 * dt);
        P.x = clamp(P.x, P.r, W - P.r);
        spawnT -= dt;
        if (spawnT <= 0) spawn();
        shield = Math.max(0, shield - dt);
        hitFlash = Math.max(0, hitFlash - dt);
        for (const o of objs) {
          o.y += o.v * dt;
          o.rot += dt * 5;
          if (!o.dead && Math.hypot(o.x - P.x, o.y - P.y) < o.r + P.r - 4) {
            o.dead = true;
            if (o.k === 'star') {
              collected++;
              score += 10;
              Sound.sfx('coin');
              pops.push({ t: 0, x: o.x, y: o.y, txt: '+10', c: '#ffd23a' });
            } else if (o.k === 'shield') {
              shield = 3;
              Sound.sfx('power');
            } else if (shield <= 0) {
              lives--;
              lost++;
              hitFlash = 0.4;
              Sound.sfx('hit');
            } else Sound.sfx('click');
          }
        }
        for (let i = objs.length - 1; i >= 0; i--) if (objs[i].dead || objs[i].y > H + 40) objs.splice(i, 1);
        score += dt * 5;
      }

      // --- draw ---
      const bg = g.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#2a3b7a');
      bg.addColorStop(1, '#c78a4a');
      g.fillStyle = bg;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#d9a566';
      g.fillRect(0, H - 60, W, 60);
      g.strokeStyle = 'rgba(255,255,255,.6)';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(0, H - 60);
      g.lineTo(W, H - 60);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.25)';
      g.beginPath();
      g.arc(W / 2, H - 60, 120, Math.PI, 0);
      g.stroke();
      objs.forEach(drawObject);
      drawPlayer();
      pops = pops.filter((p) => p.t < 1);
      for (const p of pops) {
        p.t += 0.03;
        g.globalAlpha = 1 - p.t;
        g.fillStyle = p.c;
        g.font = '900 22px sans-serif';
        g.textAlign = 'center';
        g.fillText(p.txt, p.x, p.y - p.t * 30);
        g.globalAlpha = 1;
      }
      g.fillStyle = '#fff';
      g.textAlign = 'left';
      g.font = '900 26px sans-serif';
      g.fillText(`${Math.round(score)}`, 18, 38);
      g.textAlign = 'right';
      g.fillText('❤️'.repeat(Math.max(0, lives)) + '🖤'.repeat(Math.max(0, maxLives - lives)), W - 14, 38);
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(18, 52, W - 36, 8);
      g.fillStyle = '#2fd3a0';
      g.fillRect(18, 52, (W - 36) * clamp(time / DURATION, 0, 1), 8);
      if (time < 0) {
        g.fillStyle = '#fff';
        g.textAlign = 'center';
        g.font = '900 90px sans-serif';
        g.fillText(String(Math.ceil(-time)), W / 2, H / 2);
      }
      if (lives <= 0 || time >= DURATION) {
        resolve();
        return;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });

  document.removeEventListener('keyup', onKeyUp);
  offKeys();
  ov.close();
  const survived = lives > 0;
  const sc = Math.round(score + (survived ? 20 : 0));
  const rank: Rank = sc >= 380 ? 'S' : sc >= 300 ? 'A' : sc >= 220 ? 'B' : sc >= 140 ? 'C' : 'D';
  return { rank, score: sc, collected, survived, flawless: survived && lost === 0, lives };
}
