// Science Club: a Simon-style memory game. Repeat the flask sequence; each round adds one.
import { Sound } from '../audio/sound';
import * as St from '../core/state';
import { mulberry32, sleep } from '../core/util';
import { $, el } from '../ui/dom';
import { ui } from '../ui/ui';
import { intro, type ArcadeConfig, type Rank } from './shared';

export interface LabResult {
  rank: Rank;
  rounds: number;
  score: number;
  lives: number;
  perfectRounds: number;
}

const FLASK_COLORS = ['#ff6b6b', '#ff9a3c', '#ffd23a', '#2fd3a0', '#4aa8ff', '#9b6bff'];
const TONES = [262, 294, 330, 392, 440, 523];
const FINAL_ROUND = 8;

export async function runLab(cfg: ArcadeConfig): Promise<LabResult> {
  const s = cfg.state;
  const hard = cfg.hard;
  const t = cfg.term;
  const rng = mulberry32(cfg.seed || 11);
  await intro(
    'lab',
    '🧪 Lab Sequence',
    'Watch the flasks light up, then repeat the sequence in the same order with the mouse / touch or keys <b>1–6</b>.<br>Each round adds one more flask. Reach round 8 for an S rank!',
  );

  const card = el('div', 'card lab-card');
  card.innerHTML = `<h2>🧪 Lab Sequence</h2><div class="sub" id="l-sub">Watch closely…</div><div class="flasks"></div><div class="statrow"><span class="nm">Round</span><b id="l-r" class="auto">1</b><span class="grow"></span><span id="l-lives"></span></div><div class="btnrow"><button class="btn small" id="l-replay">🔁 Replay</button></div>`;
  const flaskHost = $('.flasks', card);
  const buttons = FLASK_COLORS.map((c, i) => {
    const b = el('button', 'flask', `<span class="k">${i + 1}</span>🧪`);
    b.style.background = c;
    b.style.color = c;
    b.onclick = () => void tap(i);
    flaskHost.appendChild(b);
    return b;
  });
  const ov = ui.overlay(card);
  const sub = $('#l-sub', card);

  const eureka = St.has(s, 'eureka');
  const maxLives = 2 + (eureka ? 1 : 0);
  let lives = maxLives;
  let replays = 1 + (eureka ? 1 : 0);
  let round = 1;
  const seq: number[] = [];
  let input: number[] = [];
  let accepting = false;
  let rounds = 0;
  let perfectRounds = 0;
  let mistakeThisRound = false;
  let finish: () => void = () => {};

  const refresh = () => {
    $('#l-r', card).textContent = `${round} / ${FINAL_ROUND}`;
    $('#l-lives', card).textContent = '🧪'.repeat(lives) + '💥'.repeat(maxLives - lives);
    const rb = $<HTMLButtonElement>('#l-replay', card);
    rb.textContent = `🔁 Replay (${replays})`;
    rb.disabled = replays <= 0 || !accepting;
  };
  const flash = async (i: number, ms: number) => {
    buttons[i].classList.add('lit');
    Sound.osc(TONES[i] * 2, Sound.now(), ms / 1000, 'triangle', 0.18);
    await sleep(ms);
    buttons[i].classList.remove('lit');
    await sleep(110);
  };
  const playSequence = async () => {
    accepting = false;
    refresh();
    sub.textContent = 'Watch closely…';
    await sleep(600);
    const ms = Math.max(260, 600 - round * 40);
    for (const i of seq) await flash(i, ms);
    accepting = true;
    input = [];
    sub.textContent = 'Your turn!';
    refresh();
  };

  async function tap(i: number): Promise<void> {
    if (!accepting) return;
    buttons[i].classList.add('lit');
    setTimeout(() => buttons[i].classList.remove('lit'), 160);
    Sound.osc(TONES[i] * 2, Sound.now(), 0.2, 'triangle', 0.16);
    if (seq[input.length] === i) {
      input.push(i);
      if (input.length === seq.length) {
        accepting = false;
        rounds = round;
        if (!mistakeThisRound) perfectRounds++;
        Sound.sfx('ok');
        sub.textContent = '✅ Perfect!';
        await sleep(700);
        if (round >= FINAL_ROUND) {
          finish();
          return;
        }
        round++;
        mistakeThisRound = false;
        seq.push(Math.floor(rng() * 6));
        await playSequence();
      }
    } else {
      accepting = false;
      lives--;
      mistakeThisRound = true;
      Sound.sfx('wrong');
      sub.textContent = lives > 0 ? '💥 Wrong! Watch again…' : '💥 The experiment exploded!';
      refresh();
      await sleep(900);
      if (lives <= 0) {
        finish();
        return;
      }
      await playSequence();
    }
  }

  const offKeys = ui.pushKeys((e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 6) {
      void tap(n - 1);
      return true;
    }
    return e.key === 'Escape';
  });
  $('#l-replay', card).onclick = async () => {
    if (replays > 0 && accepting) {
      replays--;
      await playSequence();
    }
  };

  const startLength = 3 + (hard ? 1 : 0) + Math.min(t, 1);
  for (let i = 0; i < startLength; i++) seq.push(Math.floor(rng() * 6));
  await new Promise<void>((resolve) => {
    finish = resolve;
    void playSequence();
  });
  offKeys();
  ov.close();
  const rank: Rank = rounds >= 8 ? 'S' : rounds >= 7 ? 'A' : rounds >= 5 ? 'B' : rounds >= 3 ? 'C' : 'D';
  return { rank, rounds, score: rounds * 100 + perfectRounds * 25, lives, perfectRounds };
}
