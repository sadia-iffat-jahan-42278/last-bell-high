// Quiz engine: class work, tests, study sessions, pop quizzes and the finals boss fight.
import { Sound } from '../audio/sound';
import { SUBJECTS, type Boss } from '../core/data';
import { makeQuestion } from '../core/questions';
import * as St from '../core/state';
import type { GameState, ItemId, Question, SubjectId } from '../core/types';
import { clamp, mulberry32, sleep } from '../core/util';
import { $, el, esc } from '../ui/dom';
import { ui } from '../ui/ui';

export type QuizKind = 'class' | 'study' | 'test' | 'final' | 'pop';

export interface QuizConfig {
  kind: QuizKind;
  state: GameState;
  /** Subject for single-subject quizzes. */
  subject?: SubjectId;
  count?: number;
  /** Finals: one phase per subject. */
  phases?: SubjectId[];
  perPhase?: number;
  tier: number;
  title: string;
  items: ItemId[];
  seed: number;
  boss?: Boss;
}

export interface QuizResult {
  total: number;
  answered: number;
  correct: number;
  mistakes: number;
  score: number;
  maxCombo: number;
  /** A cheat sheet was brought and the teacher noticed. */
  caught: boolean;
  cheatUsed: boolean;
  perfect: boolean;
  /** Mistakes forgiven by the Lucky Pen. */
  forgiven: number;
  won: boolean;
  hearts: number;
  bossPct: number;
  streak5: boolean;
  /** Final 0..1 result used for grading. */
  pct: number;
}

/** How a question ended. */
type Via = 'click' | 'time' | 'skip' | 'brain' | 'cheat';
interface Answer {
  i: number;
  via: Via;
}

const BASE_TIME: Record<QuizKind, number> = { class: 15, study: 18, test: 12, final: 11, pop: 11 };

export async function runQuiz(cfg: QuizConfig): Promise<QuizResult> {
  const s = cfg.state;
  const rng = mulberry32(cfg.seed || Date.now() & 0xffffff);
  const used = new Set<string>();
  const kind = cfg.kind;
  const isFinal = kind === 'final';
  const boss = cfg.boss;
  const phases = isFinal
    ? (cfg.phases ?? []).map((subject) => ({ subject, count: cfg.perPhase ?? 5 }))
    : [{ subject: cfg.subject as SubjectId, count: cfg.count ?? 5 }];
  const total = phases.reduce((a, p) => a + p.count, 0);
  const items = new Set<ItemId>(cfg.items);

  const R: QuizResult = {
    total,
    answered: 0,
    correct: 0,
    mistakes: 0,
    score: 0,
    maxCombo: 0,
    caught: false,
    cheatUsed: false,
    perfect: false,
    forgiven: 0,
    won: false,
    hearts: 0,
    bossPct: 0,
    streak5: false,
    pct: 0,
  };
  const cap = St.comboCap(s);
  let combo = 0;
  let steadyUsed = false;
  let penUsed = !items.has('pen');
  let fifty = items.has('notes') ? 1 : 0;
  let skips = items.has('skip') ? 1 : 0;
  let meter = 0;
  let hp = 100;
  const hearts0 = isFinal ? 3 + Math.floor(St.stat(s, 'sta') / 6) + (St.friendHas(s, 'rin', 3) ? 1 : 0) : 0;
  let hearts = hearts0;
  R.hearts = hearts;

  // The cheat sheet auto-answers two random questions, with a 30% chance of being caught.
  const cheatIdx = new Set<number>();
  if (items.has('cheat') && !isFinal) {
    while (cheatIdx.size < Math.min(2, total)) cheatIdx.add(Math.floor(rng() * total));
    R.cheatUsed = true;
    R.caught = rng() < 0.3;
  }

  const root = el('div', 'quiz');
  root.innerHTML = `${
    isFinal && boss
      ? `<div class="bossbar"><div class="face" id="q-face">${boss.emoji}</div><div class="hpwrap"><div class="hpname"><span>${esc(boss.name)}</span><span id="q-hearts" class="hearts"></span></div><div class="hpbar"><div id="q-hp" style="width:100%"></div></div><div class="supermeter" id="q-sm"><div id="q-smf" style="width:0%"></div></div></div></div>`
      : ''
  }
    <div class="qtop"><span class="pill" id="q-title">${cfg.title}</span><span class="pill" id="q-n"></span><span class="grow"></span><span class="combo" id="q-combo"></span><span class="pill">⭐ <b id="q-score">0</b></span></div>
    <div class="qtimer"><div id="q-t"></div></div><div class="qbox"><span class="subj" id="q-subj"></span><div id="q-text"></div></div><div class="qopts" id="q-opts"></div><div class="qpow" id="q-pow"></div>`;
  const ov = ui.overlay(root, { clear: false });
  const q$ = (id: string) => $('#' + id, root);
  const heartsText = () => '❤️'.repeat(Math.max(0, hearts)) + '🖤'.repeat(Math.max(0, hearts0 - hearts));
  if (isFinal) {
    q$('q-hearts').textContent = heartsText();
    Sound.startMusic('boss');
  } else Sound.startMusic('tense');

  let qi = 0;
  let active = false;
  let locked = false;
  let resolver: ((a: Answer) => void) | null = null;
  let t0 = 0;
  let limit = 10;
  let raf = 0;
  let curQ: Question = { q: '', opts: [], ans: 0, subject: 'math' };
  let curBtns: HTMLElement[] = [];

  const answer = (i: number, via: Via) => {
    if (!resolver || locked) return;
    locked = true;
    const r = resolver;
    resolver = null;
    r({ i, via });
  };
  const offKeys = ui.pushKeys((e) => {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4 && active && !locked) {
      answer(n - 1, 'click');
      return true;
    }
    if (e.key === ' ' && isFinal && meter >= 1 && active && !locked) {
      answer(-2, 'brain');
      return true;
    }
    return e.key === 'Escape';
  });

  const drawTimer = () => {
    const left = clamp(1 - (performance.now() - t0) / 1000 / limit, 0, 1);
    const bar = q$('q-t');
    bar.style.transform = `scaleX(${left})`;
    bar.style.backgroundPosition = `${(1 - left) * 100}% 0`;
    if (left <= 0 && active && !locked) {
      answer(-1, 'time');
      return;
    }
    if (active) raf = requestAnimationFrame(drawTimer);
  };
  const updateTop = () => {
    q$('q-n').textContent = `Question ${Math.min(qi + 1, total)} / ${total}`;
    q$('q-score').textContent = String(Math.round(R.score));
    const c = q$('q-combo');
    const mult = Math.min(cap, 1 + 0.15 * combo);
    c.textContent = combo >= 2 ? `🔥 ×${mult.toFixed(2)}` : '';
    c.classList.toggle('hot', combo >= 5);
  };
  const buildPowerups = () => {
    const p = q$('q-pow');
    p.innerHTML = '';
    if (fifty > 0) {
      const b = el('button', 'btn small', `✂️ 50:50 (${fifty})`);
      b.onclick = () => {
        if (!active || locked || fifty < 1) return;
        fifty--;
        Sound.sfx('power');
        const wrong = curBtns
          .map((_, k) => k)
          .filter((k) => k !== curQ.ans && !curBtns[k].classList.contains('gone'));
        wrong
          .sort(() => rng() - 0.5)
          .slice(0, 2)
          .forEach((k) => curBtns[k].classList.add('gone'));
        buildPowerups();
      };
      p.appendChild(b);
    }
    if (skips > 0) {
      const b = el('button', 'btn small', `🎫 Skip (${skips})`);
      b.onclick = () => {
        if (!active || locked || skips < 1) return;
        skips--;
        Sound.sfx('power');
        answer(-3, 'skip');
      };
      p.appendChild(b);
    }
    if (isFinal) {
      const b = el('button', 'btn small' + (meter >= 1 ? ' good' : ' disabled'), '💡 Brainstorm [Space]');
      b.onclick = () => {
        if (active && !locked && meter >= 1) answer(-2, 'brain');
      };
      p.appendChild(b);
    }
  };
  const floatAt = (txt: string, node: HTMLElement, color: string) => {
    const r = node.getBoundingClientRect();
    ui.floatText(txt, r.left + r.width / 2 - 20, r.top, color);
  };
  const flashFace = (cls: 'atk' | 'hit') => {
    const f = q$('q-face');
    f.classList.add(cls);
    setTimeout(() => f.classList.remove(cls), 450);
  };

  let phaseIdx = 0;
  let phaseLeft = phases[0].count;
  for (qi = 0; qi < total; qi++) {
    if (phaseLeft === 0) {
      phaseIdx++;
      phaseLeft = phases[phaseIdx].count;
    }
    const ph = phases[phaseIdx];
    const subj = ph.subject;
    const SB = SUBJECTS[subj];
    if (isFinal && phaseLeft === ph.count) {
      Sound.sfx('boss');
      flashFace('atk');
      q$('q-text').innerHTML =
        `<span class="phase-title">Phase ${phaseIdx + 1}: <span style="color:${SB.color}">${SB.icon} ${SB.name}</span></span>`;
      q$('q-opts').innerHTML = '';
      q$('q-subj').textContent = 'Get ready';
      q$('q-subj').style.setProperty('--c', SB.color);
      await sleep(1100);
    }
    phaseLeft--;

    const q = (curQ = makeQuestion(subj, cfg.tier, rng, used));
    limit =
      (BASE_TIME[kind] +
        St.timeBonus(s, subj) +
        (items.has('tea') ? 5 : 0) +
        ((kind === 'test' || isFinal) && St.friendHas(s, 'rin', 2) ? 3 : 0)) *
      St.fatigueMult(s);
    q$('q-subj').textContent = `${SB.icon} ${SB.name}`;
    q$('q-subj').style.setProperty('--c', SB.color);
    q$('q-text').textContent = q.q;
    const opts = q$('q-opts');
    opts.innerHTML = '';
    curBtns = [];
    q.opts.forEach((text, k) => {
      const b = el('button', 'qopt', `<span class="k">${k + 1}</span><span class="t">${esc(text)}</span>`);
      b.onclick = () => answer(k, 'click');
      opts.appendChild(b);
      curBtns.push(b);
    });
    const autoHint = Math.random() < St.hintChance(s, subj) || (qi === 0 && St.friendHas(s, 'maya', 2));
    if (autoHint) {
      const wrong = curBtns.map((_, k) => k).filter((k) => k !== q.ans);
      curBtns[wrong[Math.floor(rng() * wrong.length)]].classList.add('gone');
    }
    const isCheat = cheatIdx.has(qi);
    if (isCheat) curBtns[q.ans].classList.add('cheat');
    updateTop();
    buildPowerups();
    locked = false;
    active = true;
    t0 = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(drawTimer);

    const res = await new Promise<Answer>((resolve) => {
      resolver = resolve;
      if (isCheat) setTimeout(() => answer(-4, 'cheat'), 1100);
    });
    active = false;
    cancelAnimationFrame(raf);
    R.answered++;
    const remain = clamp(1 - (performance.now() - t0) / 1000 / limit, 0, 1);
    let ok = false;
    let dmg = 100 / total;
    const qText = $('#q-text', root);

    if (res.via === 'skip') {
      ok = true;
      R.correct++;
      floatAt('Skipped!', qText, '#ffd23a');
    } else if (res.via === 'brain') {
      ok = true;
      R.correct++;
      combo++;
      R.maxCombo = Math.max(R.maxCombo, combo);
      meter = 0;
      dmg *= 2;
      R.score += 200;
      curBtns[q.ans].classList.add('ok');
      Sound.sfx('level');
      floatAt('💡 BRAINSTORM!', qText, '#c8a6ff');
    } else if (res.via === 'cheat') {
      ok = true;
      R.correct++;
      curBtns[q.ans].classList.add('ok');
      floatAt('📄 …', curBtns[q.ans], '#ffd23a');
    } else if (res.i === q.ans) {
      ok = true;
      R.correct++;
      combo++;
      R.maxCombo = Math.max(R.maxCombo, combo);
      if (combo >= 5) R.streak5 = true;
      const pts = Math.round(100 * (1 + 0.5 * remain) * Math.min(cap, 1 + 0.15 * (combo - 1)));
      R.score += pts;
      curBtns[q.ans].classList.add('ok');
      Sound.sfx('correct', combo);
      floatAt(`+${pts}`, curBtns[q.ans], '#fff');
      if (isFinal) meter = Math.min(1, meter + 0.3 + (combo >= 3 ? 0.08 : 0));
    } else {
      curBtns[q.ans].classList.add('ok');
      if (res.i >= 0) curBtns[res.i].classList.add('bad');
      Sound.sfx('wrong');
      R.mistakes++;
      if (!penUsed) {
        penUsed = true;
        R.forgiven++;
        R.correct++;
        ok = true;
        dmg = 100 / total;
        floatAt('🖊️ Forgiven!', qText, '#ffd23a');
      } else if (St.has(s, 'steady') && !steadyUsed) {
        steadyUsed = true;
        floatAt('🖐️ Combo saved', qText, '#ffd23a');
      } else combo = 0;
      if (isFinal && !ok) {
        hearts--;
        q$('q-hearts').textContent = heartsText();
        flashFace('atk');
        Sound.sfx('hit');
      }
    }
    curBtns.forEach((b) => b.classList.add('locked'));
    if (isFinal && ok) {
      hp = Math.max(0, hp - dmg);
      q$('q-hp').style.width = hp + '%';
      flashFace('hit');
      Sound.sfx('hit');
    }
    if (isFinal) {
      q$('q-smf').style.width = meter * 100 + '%';
      q$('q-sm').classList.toggle('full', meter >= 1);
    }
    updateTop();
    buildPowerups();
    await sleep(res.via === 'cheat' ? 500 : ok ? 650 : 1000);
    if (isFinal && hearts <= 0) break;
  }

  offKeys();
  cancelAnimationFrame(raf);
  ov.close();
  R.hearts = hearts;
  R.bossPct = isFinal ? 100 - hp : 0;
  R.won = isFinal && hp <= 0.5;
  R.pct = isFinal ? clamp((100 - hp) / 100, 0, 1) * (hearts > 0 ? 1 : 0.85) : R.correct / total;
  R.perfect = !isFinal && R.mistakes === 0 && R.total === R.answered;
  if (R.caught) {
    R.pct = 0;
    R.perfect = false;
  }
  Sound.startMusic('explore');
  return R;
}
