// Debate Club: your opponent makes a flawed argument. Name the flaw before time runs out and the judges swing your way.
// Arguments get subtler with each semester and are not repeated until the whole bank has been used.
import { Sound } from '../audio/sound';
import * as St from '../core/state';
import { clamp, hashStr, mulberry32, shuffle, sleep } from '../core/util';
import { $, el, esc } from '../ui/dom';
import { ui } from '../ui/ui';
import { FALLACIES, chooseArguments, type FallacyId } from './debateBank';
import { intro, type ArcadeConfig, type Rank } from './shared';

export interface DebateResult {
  rank: Rank;
  won: number;
  total: number;
  bestStreak: number;
  score: number;
}

const PLANS: (1 | 2 | 3 | 4)[][] = [
  [1, 1, 1, 1, 2, 2, 2, 2],
  [1, 2, 2, 2, 2, 3, 3, 3],
  [2, 2, 3, 3, 3, 3, 4, 4],
  [3, 3, 3, 4, 4, 4, 4, 4],
];
const SECONDS: Record<number, number> = { 1: 16, 2: 15, 3: 14, 4: 13 };
const OPPONENTS = [
  'Brad Holloway',
  'Dr. Voss',
  'Priya Nair',
  'Coach Dunn',
  'Lucía Romero',
  'Prof. Ames',
  'Tobias Finch',
];
const HISTORY_KEY = 'club:debate';
const HISTORY_MAX = 30;

export async function runDebate(cfg: ArcadeConfig): Promise<DebateResult> {
  const s = cfg.state;
  const rng = mulberry32(cfg.seed || 5);
  await intro(
    'debate',
    '🎤 Debate Round',
    'Your opponent speaks with a <b>flawed argument</b>. Pick the <b>logical fallacy</b> in what they said before the timer runs out.<br>Every correct call swings the judges your way. Later semesters bring subtler fallacies.',
  );
  Sound.init();

  const plan = [...PLANS[Math.min(3, Math.floor(cfg.sem / 2))]];
  if (cfg.hard) plan.push(4, 4);
  const history = (s.seenQ[HISTORY_KEY] ??= []);
  const args = chooseArguments(plan, rng, history);
  const total = args.length;
  const bonus = Math.min(6, (St.stat(s, 'cha') + St.stat(s, 'int')) * 0.15);

  const root = el('div', 'quiz');
  root.innerHTML = `<div class="qtop"><span class="pill" id="db-n"></span><span class="pill" id="db-motion" style="max-width:60%"></span><span class="grow"></span><span class="combo" id="db-streak"></span><span class="pill">⭐ <b id="db-score">0</b></span></div>
    <div class="qtimer"><div id="db-t"></div></div>
    <div id="db-judges" style="display:flex;align-items:center;gap:8px;margin:6px 4px"><span style="font-weight:900;color:#7fb2ff">YOU</span><div style="flex:1;height:14px;border-radius:8px;background:#d94a4a;overflow:hidden;position:relative"><div id="db-bar" style="width:50%;height:100%;background:#3d7be0;transition:width .5s"></div></div><span style="font-weight:900;color:#ff9a9a" id="db-opp">OPPONENT</span></div>
    <div class="qbox"><span class="subj" id="db-who"></span><div id="db-text"></div></div>
    <div id="db-ask" style="text-align:center;font-weight:800;margin:4px 0">Which flaw is in that argument?</div>
    <div class="qopts" id="db-opts"></div>
    <div id="db-msg" style="min-height:3em;text-align:center;font-weight:700;margin-top:6px"></div>`;
  const ov = ui.overlay(root, { clear: false });
  const offKeys = ui.pushKeys((e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && pending) {
      pending(n - 1);
      return true;
    }
    return e.key === 'Escape';
  });
  let pending: ((i: number) => void) | null = null;
  Sound.startMusic('tense');

  let won = 0;
  let streak = 0;
  let bestStreak = 0;
  let score = 0;
  let judges = 50;
  const setBar = () => {
    $('#db-bar', root).style.width = judges + '%';
    $('#db-score', root).textContent = String(Math.round(score));
    $('#db-streak', root).textContent = streak >= 2 ? `🔥 ×${streak}` : '';
  };
  setBar();

  for (let i = 0; i < total; i++) {
    const a = args[i];
    history.push(hashStr(a.line));
    while (history.length > HISTORY_MAX) history.shift();
    const opp = OPPONENTS[(hashStr(a.line) + i) % OPPONENTS.length];
    $('#db-n', root).textContent = `Round ${i + 1} / ${total}`;
    $('#db-motion', root).textContent = `Motion: ${a.motion}`;
    $('#db-who', root).textContent = `🗣️ ${opp}`;
    $('#db-opp', root).textContent = opp.split(' ')[0].toUpperCase();
    $('#db-text', root).textContent = `“${a.line}”`;
    $('#db-msg', root).textContent = '';

    // the right fallacy plus three others
    const others = shuffle(
      (Object.keys(FALLACIES) as FallacyId[]).filter((f) => f !== a.flaw),
      rng,
    ).slice(0, 3);
    const options = shuffle([a.flaw, ...others], rng);
    const optsEl = $('#db-opts', root);
    optsEl.innerHTML = '';
    const btns = options.map((f, k) => {
      const b = el(
        'button',
        'qopt',
        `<span class="k">${k + 1}</span><span class="t">${esc(FALLACIES[f].name)}</span>`,
      );
      b.onclick = () => pending?.(k);
      optsEl.appendChild(b);
      return b;
    });

    const limit = (SECONDS[a.tier] + bonus) * (cfg.hard ? 0.85 : 1) * St.fatigueMult(s);
    const t0 = performance.now();
    let raf = 0;
    const timer = $('#db-t', root);
    const choice = await new Promise<number>((resolve) => {
      pending = (k) => {
        pending = null;
        cancelAnimationFrame(raf);
        resolve(k);
      };
      const tick = () => {
        const left = clamp(1 - (performance.now() - t0) / 1000 / limit, 0, 1);
        timer.style.transform = `scaleX(${left})`;
        timer.style.backgroundPosition = `${(1 - left) * 100}% 0`;
        if (left <= 0) {
          pending?.(-1);
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    const left = clamp(1 - (performance.now() - t0) / 1000 / limit, 0, 1);
    const right = choice >= 0 && options[choice] === a.flaw;
    btns[options.indexOf(a.flaw)].classList.add('ok');
    if (!right && choice >= 0) btns[choice].classList.add('bad');
    btns.forEach((b) => b.classList.add('locked'));
    const F = FALLACIES[a.flaw];
    const msg = $('#db-msg', root);
    if (right) {
      won++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      const pts = Math.round(100 * a.tier * (1 + 0.5 * left) * (1 + 0.1 * Math.min(streak - 1, 5)));
      score += pts;
      judges = clamp(judges + 100 / total, 0, 100);
      msg.style.color = '#7dffb8';
      msg.innerHTML = `✅ <b>${esc(F.name)}!</b> ${esc(F.explain)} +${pts}`;
      Sound.sfx('correct', streak);
    } else {
      streak = 0;
      judges = clamp(judges - 100 / total, 0, 100);
      msg.style.color = '#ff9a9a';
      msg.innerHTML = `${choice < 0 ? '⏱️ Time is up.' : '❌ Not quite.'} It was <b>${esc(F.name)}</b>. ${esc(F.explain)}`;
      Sound.sfx('wrong');
    }
    setBar();
    await sleep(right ? 1700 : 2400);
  }

  offKeys();
  ov.close();
  Sound.startMusic('explore');
  const ratio = won / Math.max(1, total);
  const rank: Rank =
    ratio >= 0.95 ? 'S' : ratio >= 0.8 ? 'A' : ratio >= 0.62 ? 'B' : ratio >= 0.45 ? 'C' : 'D';
  return { rank, won, total, bestStreak, score: Math.round(score) };
}
