// Chess Club: tactics puzzles on a real board. Click a piece, then the square to move it to.
// Puzzles get harder with the semester (mate in 1 first, mate in 2 later) and are not repeated until the bank runs out.
import { Sound } from '../audio/sound';
import * as St from '../core/state';
import { clamp, hashStr, mulberry32, sleep } from '../core/util';
import { $, el } from '../ui/dom';
import { ui } from '../ui/ui';
import { choosePuzzles } from './chessPuzzles';
import { intro, type ArcadeConfig, type Rank } from './shared';

export interface ChessResult {
  rank: Rank;
  solved: number;
  total: number;
  bestStreak: number;
  score: number;
}

/** Difficulty of each puzzle in a session, by academic year of the student (two semesters per step). */
const PLANS: (1 | 2 | 3 | 4)[][] = [
  [1, 1, 1, 2, 2, 2],
  [1, 2, 2, 2, 3, 3],
  [2, 2, 3, 3, 3, 4],
  [2, 3, 3, 4, 4, 4],
];
const SECONDS: Record<number, number> = { 1: 24, 2: 28, 3: 38, 4: 44 };
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const HISTORY_KEY = 'club:chess';
const HISTORY_MAX = 44;

type Board = Map<string, string>;

const sq = (file: number, rank: number): string => 'abcdefgh'[file] + (rank + 1);

function parseFen(fen: string): { board: Board; white: boolean } {
  const [rows, side] = fen.split(' ');
  const board: Board = new Map();
  rows.split('/').forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += +ch;
      else board.set(sq(f++, 7 - i), ch);
    }
  });
  return { board, white: side !== 'b' };
}

export async function runChess(cfg: ArcadeConfig): Promise<ChessResult> {
  const s = cfg.state;
  const rng = mulberry32(cfg.seed || 11);
  await intro(
    'chess',
    '♟️ Chess Puzzles',
    'Each puzzle is a real position. <b>Click a piece, then click where it should go</b>: find the move that gives <b>checkmate</b> (in 1 move, or in 2 when the puzzle says so).<br>Later semesters bring harder puzzles. You get 2 tries per move.',
  );
  Sound.init();

  const plan = [...PLANS[Math.min(3, Math.floor(cfg.sem / 2))]];
  if (cfg.hard) plan.push(4);
  const history = (s.seenQ[HISTORY_KEY] ??= []);
  const puzzles = choosePuzzles(plan, rng, history);
  const total = puzzles.length;
  const bonusTime = Math.min(10, (St.stat(s, 'int') + St.stat(s, 'foc')) * 0.25);

  const root = el('div', 'chessgame');
  root.style.cssText =
    'display:flex;flex-direction:column;align-items:center;gap:10px;padding:14px;max-width:96vw;--sq:min(10.4vw,7.6vh,68px)';
  root.innerHTML = `<div class="qtop" style="width:100%"><span class="pill" id="cg-n"></span><span class="pill" id="cg-goal"></span><span class="grow"></span><span class="combo" id="cg-streak"></span><span class="pill">⭐ <b id="cg-score">0</b></span></div>
    <div class="qtimer" style="width:100%"><div id="cg-t"></div></div>
    <div id="cg-board" style="display:grid;grid-template-columns:repeat(8,var(--sq));grid-template-rows:repeat(8,var(--sq));border:4px solid #3a2f2a;border-radius:6px;box-shadow:0 6px 24px #0007;user-select:none"></div>
    <div id="cg-msg" style="min-height:1.6em;font-weight:800;text-align:center"></div>
    <div id="cg-btns" style="display:flex;gap:8px"></div>`;
  const ov = ui.overlay(root, { clear: false });
  const boardEl = $('#cg-board', root);
  const msg = $('#cg-msg', root);
  const timerBar = $('#cg-t', root);
  const offKeys = ui.pushKeys((e) => e.key === 'Escape');
  Sound.startMusic('tense');

  let solved = 0;
  let streak = 0;
  let bestStreak = 0;
  let score = 0;
  let hints = 2;
  const setScore = () => {
    $('#cg-score', root).textContent = String(Math.round(score));
    $('#cg-streak', root).textContent = streak >= 2 ? `🔥 ×${streak}` : '';
  };

  for (let pi = 0; pi < total; pi++) {
    const pz = puzzles[pi];
    history.push(hashStr(pz.id));
    while (history.length > HISTORY_MAX) history.shift();
    const { board, white } = parseFen(pz.fen);
    const mine = (piece: string) => (white ? piece === piece.toUpperCase() : piece === piece.toLowerCase());
    const flip = !white;
    const limit = (SECONDS[pz.tier] + bonusTime) * (cfg.hard ? 0.85 : 1) * St.fatigueMult(s);
    $('#cg-n', root).textContent = `Puzzle ${pi + 1} / ${total}`;
    $('#cg-goal', root).innerHTML =
      `${white ? '⚪ White' : '⚫ Black'} to move · <b>Mate in ${pz.moves}</b>${pz.note ? ` · ${pz.note}` : ''} · ${'★'.repeat(pz.tier)}`;
    msg.textContent = '';
    msg.style.color = '#fff';

    let selected: string | null = null;
    let lastMove: [string, string] | null = null;
    let hintSq: string | null = null;
    let solutionSq: string[] = [];
    let step = 0; // 0 = first move, 1 = the mating move
    let accept = pz.first;
    let firstPlayed = '';
    let wrong = 0;
    let finished: 'solved' | 'failed' | null = null;
    let busyReply = false;
    let t0 = performance.now();

    const draw = () => {
      boardEl.innerHTML = '';
      for (let r = 0; r < 8; r++)
        for (let f = 0; f < 8; f++) {
          const file = flip ? 7 - f : f;
          const rank = flip ? r : 7 - r;
          const name = sq(file, rank);
          const piece = board.get(name);
          const dark = (file + rank) % 2 === 0;
          const cell = el('button', 'cgsq');
          const hot = lastMove && (lastMove[0] === name || lastMove[1] === name);
          const bg =
            selected === name
              ? '#ffd23a'
              : solutionSq.includes(name)
                ? '#2fd3a0'
                : hintSq === name
                  ? '#ffb347'
                  : hot
                    ? dark
                      ? '#8fb86a'
                      : '#c9e0a0'
                    : dark
                      ? '#7f8fb0'
                      : '#eadfc8';
          cell.style.cssText = `border:0;padding:0;margin:0;cursor:pointer;background:${bg};font-size:calc(var(--sq)*0.8);line-height:1;display:flex;align-items:center;justify-content:center;position:relative;`;
          if (piece) {
            const isWhite = piece === piece.toUpperCase();
            const g = el('span', '', GLYPH[piece.toLowerCase()]);
            g.style.cssText = isWhite
              ? 'color:#fff;text-shadow:0 0 2px #000,0 0 2px #000,1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000'
              : 'color:#1d1d24;text-shadow:0 0 1px #fff7';
            cell.appendChild(g);
          }
          if (f === 0) {
            const lab = el('span', '', String(rank + 1));
            lab.style.cssText =
              'position:absolute;left:2px;top:1px;font-size:11px;font-weight:800;color:#0006';
            cell.appendChild(lab);
          }
          if (r === 7) {
            const lab = el('span', '', 'abcdefgh'[file]);
            lab.style.cssText =
              'position:absolute;right:3px;bottom:0;font-size:11px;font-weight:800;color:#0006';
            cell.appendChild(lab);
          }
          cell.onclick = () => click(name);
          boardEl.appendChild(cell);
        }
    };

    const applyMove = (uci: string) => {
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const piece = board.get(from);
      if (!piece) return;
      board.delete(from);
      board.set(to, piece);
      lastMove = [from, to];
    };

    const buttons = () => {
      const b = $('#cg-btns', root);
      b.innerHTML = '';
      const hint = el(
        'button',
        'btn small' + (hints > 0 && !finished ? '' : ' disabled'),
        `💡 Hint (${hints})`,
      );
      hint.onclick = () => {
        if (hints < 1 || finished) return;
        hints--;
        hintSq = accept[0].slice(0, 2);
        Sound.sfx('power');
        draw();
        buttons();
      };
      const skip = el('button', 'btn small' + (finished ? ' disabled' : ''), '⏭ Skip');
      skip.onclick = () => {
        if (!finished) fail('Skipped.');
      };
      b.append(hint, skip);
    };

    let done: (() => void) | null = null;
    const fail = (why: string) => {
      if (finished) return;
      finished = 'failed';
      streak = 0;
      const first = accept[0];
      solutionSq = [first.slice(0, 2), first.slice(2, 4)];
      msg.style.color = '#ff9a9a';
      msg.textContent = `${why} The move was ${first.slice(0, 2)} → ${first.slice(2, 4)}.`;
      Sound.sfx('wrong');
      setScore();
      draw();
      buttons();
      done?.();
    };
    const win = () => {
      finished = 'solved';
      solved++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      const left = clamp(1 - (performance.now() - t0) / 1000 / limit, 0, 1);
      const pts = Math.round(
        100 * pz.tier * (1 + 0.5 * left) * (1 + 0.1 * Math.min(streak - 1, 5)) - wrong * 20,
      );
      score += Math.max(20, pts);
      msg.style.color = '#7dffb8';
      msg.textContent = `✅ Checkmate!${pz.note ? ` ${pz.note}.` : ''} +${Math.max(20, pts)}`;
      Sound.sfx('correct', streak);
      setScore();
      draw();
      buttons();
      done?.();
    };

    const click = (name: string) => {
      if (finished || busyReply) return;
      const piece = board.get(name);
      if (!selected) {
        if (piece && mine(piece)) {
          selected = name;
          hintSq = null;
          Sound.sfx('click');
          draw();
        }
        return;
      }
      if (selected === name) {
        selected = null;
        draw();
        return;
      }
      if (piece && mine(piece)) {
        selected = name;
        draw();
        return;
      }
      const uci = selected + name;
      selected = null;
      if (accept.includes(uci)) {
        applyMove(uci);
        hintSq = null;
        if (pz.moves === 1 || step === 1) {
          win();
          return;
        }
        // mate in 2: the defender replies, then you deliver mate
        firstPlayed = uci;
        const reply = pz.line?.[firstPlayed];
        step = 1;
        wrong = 0;
        msg.style.color = '#fff';
        msg.textContent = 'Good move! The opponent replies…';
        Sound.sfx('ok');
        draw();
        busyReply = true;
        void sleep(700).then(() => {
          if (finished) return;
          if (reply) {
            applyMove(reply.reply);
            accept = reply.mate;
          }
          busyReply = false;
          msg.textContent = 'Now deliver checkmate!';
          Sound.sfx('click');
          draw();
        });
        return;
      }
      wrong++;
      Sound.sfx('wrong');
      if (wrong >= 2) {
        fail('Out of tries.');
        return;
      }
      msg.style.color = '#ffcf6a';
      msg.textContent = 'Not that one. Try again! (1 try left)';
      draw();
    };

    draw();
    buttons();
    setScore();
    t0 = performance.now();
    await new Promise<void>((resolve) => {
      done = resolve;
      const tick = () => {
        if (finished) return;
        const left = clamp(1 - (performance.now() - t0) / 1000 / limit, 0, 1);
        timerBar.style.transform = `scaleX(${left})`;
        timerBar.style.backgroundPosition = `${(1 - left) * 100}% 0`;
        if (left <= 0) {
          fail('Time is up.');
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await sleep(finished === 'solved' ? 1100 : 1900);
  }

  offKeys();
  ov.close();
  Sound.startMusic('explore');
  const ratio = solved / Math.max(1, total);
  const rank: Rank = ratio >= 1 ? 'S' : ratio >= 0.83 ? 'A' : ratio >= 0.66 ? 'B' : ratio >= 0.5 ? 'C' : 'D';
  return { rank, solved, total, bestStreak, score: Math.round(score) };
}
