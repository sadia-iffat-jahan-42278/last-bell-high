// Question generation: procedural math + curated banks for the other subjects.
import { BANK } from './bank';
import { COURSES } from './courses';
import { COURSE_BANKS } from './qbank';
import { COURSE_GENS, GENS, type RawQ } from './qgen';
import type { CourseId, Question, SubjectId } from './types';
import { clamp, hashStr, shuffle, type Rng } from './util';

/** Inclusive random integer. */
const randInt = (rng: Rng, a: number, b: number): number => a + Math.floor(rng() * (b - a + 1));
const choose = <T>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

interface RawMath {
  q: string;
  ans: number | string;
  /** Hand-written distractors for non-numeric answers. */
  extra?: string[];
}

function mathTier1(rng: Rng): RawMath {
  const kind = choose(rng, ['add', 'sub', 'mul', 'div'] as const);
  if (kind === 'add') {
    const a = randInt(rng, 12, 89);
    const b = randInt(rng, 11, 60);
    return { q: `${a} + ${b} = ?`, ans: a + b };
  }
  if (kind === 'sub') {
    const a = randInt(rng, 40, 99);
    const b = randInt(rng, 10, a - 5);
    return { q: `${a} − ${b} = ?`, ans: a - b };
  }
  if (kind === 'mul') {
    const a = randInt(rng, 3, 12);
    const b = randInt(rng, 3, 12);
    return { q: `${a} × ${b} = ?`, ans: a * b };
  }
  const b = randInt(rng, 2, 10);
  const r = randInt(rng, 2, 12);
  return { q: `${b * r} ÷ ${b} = ?`, ans: r };
}

function mathTier2(rng: Rng): RawMath {
  const kind = choose(rng, ['mul2', 'pct', 'frac', 'solve', 'order'] as const);
  if (kind === 'mul2') {
    const a = randInt(rng, 12, 25);
    const b = randInt(rng, 3, 9);
    return { q: `${a} × ${b} = ?`, ans: a * b };
  }
  if (kind === 'pct') {
    const p = choose(rng, [10, 20, 25, 50]);
    const n = randInt(rng, 2, 20) * 20;
    return { q: `What is ${p}% of ${n}?`, ans: (p * n) / 100 };
  }
  if (kind === 'frac') {
    const d = choose(rng, [2, 3, 4, 5]);
    const n = randInt(rng, 1, d - 1);
    const m = d * randInt(rng, 4, 12);
    return { q: `What is ${n}/${d} of ${m}?`, ans: (n * m) / d };
  }
  if (kind === 'solve') {
    const x = randInt(rng, 5, 40);
    const b = randInt(rng, 6, 40);
    return { q: `If x + ${b} = ${x + b}, what is x?`, ans: x };
  }
  const a = randInt(rng, 5, 20);
  const b = randInt(rng, 2, 9);
  const c = randInt(rng, 2, 9);
  return { q: `${a} + ${b} × ${c} = ?`, ans: a + b * c };
}

function mathTier3(rng: Rng): RawMath {
  const kind = choose(rng, ['lin', 'sq', 'sqrt', 'area', 'exp', 'avg'] as const);
  if (kind === 'lin') {
    const x = randInt(rng, 2, 15);
    const a = randInt(rng, 2, 9);
    const b = randInt(rng, 1, 20);
    return { q: `Solve for x: ${a}x + ${b} = ${a * x + b}`, ans: x };
  }
  if (kind === 'sq') {
    const a = randInt(rng, 11, 19);
    return { q: `What is ${a}² ?`, ans: a * a };
  }
  if (kind === 'sqrt') {
    const a = randInt(rng, 6, 20);
    return { q: `What is √${a * a} ?`, ans: a };
  }
  if (kind === 'area') {
    const a = randInt(rng, 6, 20);
    const b = randInt(rng, 5, 15);
    return { q: `A rectangle is ${a} cm by ${b} cm. What is its area in cm²?`, ans: a * b };
  }
  if (kind === 'exp') {
    const base = choose(rng, [2, 3, 5]);
    const e = base === 2 ? randInt(rng, 5, 10) : base === 3 ? randInt(rng, 3, 5) : randInt(rng, 3, 4);
    return { q: `What is ${base}^${e} ?`, ans: Math.pow(base, e) };
  }
  const s = randInt(rng, 5, 30);
  const d = randInt(rng, 2, 8);
  return { q: `What is the average of ${s}, ${s + d}, ${s + 2 * d}, ${s + 3 * d}?`, ans: s + 1.5 * d };
}

function mathTier4(rng: Rng): RawMath {
  const kind = choose(rng, [
    'quad',
    'sys',
    'seq',
    'pyth',
    'sum',
    'log',
    'deriv',
    'det',
    'comb',
    'integ',
  ] as const);
  if (kind === 'quad') {
    const r1 = randInt(rng, 1, 7);
    const r2 = randInt(rng, r1 + 1, 9);
    const ans = `${r1} and ${r2}`;
    return {
      q: `Solve x² − ${r1 + r2}x + ${r1 * r2} = 0. The roots are…`,
      ans,
      extra: shuffle(
        [ans, `${r1 + 1} and ${r2}`, `${r1} and ${r2 + 1}`, `−${r1} and −${r2}`, `${r1 + r2} and ${r1 * r2}`],
        rng,
      ),
    };
  }
  if (kind === 'sys') {
    const x = randInt(rng, 4, 14);
    const y = randInt(rng, 1, x - 1);
    return { q: `If x + y = ${x + y} and x − y = ${x - y}, what is x?`, ans: x };
  }
  if (kind === 'seq') {
    const a = randInt(rng, 2, 4);
    const r = randInt(rng, 2, 3);
    return { q: `Next term: ${a}, ${a * r}, ${a * r * r}, ${a * r ** 3}, …`, ans: a * r ** 4 };
  }
  if (kind === 'pyth') {
    const [a, b, c] = choose(rng, [
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
      [8, 15, 17],
      [9, 12, 15],
      [7, 24, 25],
    ]);
    return { q: `A right triangle has legs ${a} and ${b}. How long is the hypotenuse?`, ans: c };
  }
  if (kind === 'sum') {
    const n = choose(rng, [10, 12, 15, 20, 25]);
    return { q: `What is the sum of the integers from 1 to ${n}?`, ans: (n * (n + 1)) / 2 };
  }
  if (kind === 'deriv') {
    const a = randInt(rng, 2, 6);
    const b = randInt(rng, 1, 9);
    const c = randInt(rng, 1, 5);
    return { q: `If f(x) = ${a}x² + ${b}x, what is f′(${c}) ?`, ans: 2 * a * c + b };
  }
  if (kind === 'det') {
    const a = randInt(rng, 3, 9);
    const d = randInt(rng, 3, 9);
    const b = randInt(rng, 1, 4);
    const c = randInt(rng, 1, 4);
    return { q: `What is the determinant of [[${a}, ${b}], [${c}, ${d}]] ?`, ans: a * d - b * c };
  }
  if (kind === 'comb') {
    const n = randInt(rng, 5, 12);
    return { q: `In how many ways can you choose 2 items from ${n}? (C(${n}, 2))`, ans: (n * (n - 1)) / 2 };
  }
  if (kind === 'integ') {
    const k = randInt(rng, 2, 6);
    const c = randInt(rng, 2, 5);
    return { q: `What is the integral of ${2 * k}x from 0 to ${c} ?`, ans: k * c * c };
  }
  const e = randInt(rng, 2, 5);
  return { q: `What is log₁₀(${10 ** e}) ?`, ans: e };
}

const formatNum = (v: number): string =>
  Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100);

/** Four shuffled options for a numeric or text answer, with the index of the right one. */
export function optionsFor(
  raw: { ans: number | string; extra?: string[] },
  rng: Rng,
): { opts: string[]; ans: number } {
  if (typeof raw.ans === 'string') {
    const answer = raw.ans;
    let opts = (raw.extra ?? []).slice(0, 4);
    if (!opts.includes(answer)) opts[0] = answer;
    opts = shuffle(opts, rng);
    return { opts, ans: opts.indexOf(answer) };
  }
  const ans = raw.ans;
  const mag = Math.abs(ans);
  // Wrong answers should look plausible: close to the right one, never negative when the answer is not.
  const steps = Number.isInteger(ans)
    ? mag <= 10
      ? [1, 2, 3, 4, 5]
      : mag <= 100
        ? [1, 2, 3, 5, 10, Math.round(mag * 0.1), Math.round(mag * 0.25)]
        : [1, 5, 10, Math.round(mag * 0.05), Math.round(mag * 0.1), Math.round(mag * 0.25)]
    : [0.5, 1, 1.5, 2, 3];
  const cands = new Set<number>();
  for (const st of steps) {
    if (st <= 0) continue;
    cands.add(ans + st);
    cands.add(ans - st);
  }
  if (ans !== 0 && mag <= 10) cands.add(-ans); // a sign slip
  if (Number.isInteger(ans) && mag > 10) {
    cands.add(ans * 2);
    if (ans % 2 === 0) cands.add(ans / 2);
  }
  const ok = [...cands].filter(
    (v) => v !== ans && Math.abs(v * 100 - Math.round(v * 100)) < 1e-9 && (ans < 0 || v >= 0),
  );
  const found = shuffle(ok, rng).slice(0, 3);
  let fill = mag <= 10 ? 6 : 7;
  while (found.length < 3) {
    const v = ans + fill++;
    if (!found.includes(v)) found.push(v);
  }
  const opts = shuffle([ans, ...found].map(formatNum), rng);
  return { opts, ans: opts.indexOf(formatNum(ans)) };
}

export function mathQuestion(tier: number, rng: Rng): Question {
  const t = randInt(rng, Math.max(1, tier - 1), tier);
  const raw = t === 1 ? mathTier1(rng) : t === 2 ? mathTier2(rng) : t === 3 ? mathTier3(rng) : mathTier4(rng);
  const { opts, ans } = optionsFor(raw, rng);
  return { q: raw.q, opts, ans, subject: 'math' };
}

/**
 * Build a question for `subject` at difficulty `tier` (1..4).
 * `used` tracks already-asked prompts so a quiz does not repeat itself.
 */
export function makeQuestion(subject: SubjectId, tier: number, rng: Rng, used: Set<string>): Question {
  tier = clamp(Math.round(tier), 1, 4);
  if (subject === 'math') return mathQuestion(tier, rng);
  const pool = BANK[subject];
  const lo = Math.max(1, tier - 1);
  let cands = pool.filter((x) => x.t >= lo && x.t <= tier && !used.has(x.q));
  if (!cands.length) cands = pool.filter((x) => x.t <= tier && !used.has(x.q));
  if (!cands.length) {
    used.clear();
    cands = pool.filter((x) => x.t <= tier);
  }
  const item = cands[Math.floor(rng() * cands.length)];
  used.add(item.q);
  const wrong = shuffle(item.w.slice(), rng).slice(0, 3);
  const opts = shuffle([item.a, ...wrong], rng);
  return { q: item.q, opts, ans: opts.indexOf(item.a), subject };
}

/* ------------------------------------------------------------------------------------------ */
/* Course questions: relevant to the course being taught, harder as the semester goes on, and   */
/* never repeated until the course's whole pool has been used.                                  */
/* ------------------------------------------------------------------------------------------ */
/** How many asked questions are remembered per course. */
export const HISTORY_CAP = 160;

/** The 1..4 difficulty tier to draw from for a fractional difficulty `level`. */
export function targetTier(level: number, rng: Rng): number {
  const base = Math.floor(level);
  return clamp(base + (rng() < level - base ? 1 : 0), 1, 4);
}

/** Questions the course could ask (hand-written plus generated) at each tier, for tests and tools. */
export function courseBankSize(courseName: string): number {
  return COURSE_BANKS[courseName]?.length ?? 0;
}

function fromRaw(raw: RawQ, rng: Rng, courseId: CourseId, tier: number): Question {
  const { opts, ans } = optionsFor(raw, rng);
  return { q: raw.q, opts, ans, subject: COURSES[courseId].area, course: courseId, tier };
}

/**
 * Draw one question for course `courseId` at difficulty `level` (fractional, 1..4.4).
 * `history` is the course's list of already-asked question hashes; it is updated here.
 * `used` holds the prompts asked in the current quiz.
 */
export function courseQuestion(
  courseId: CourseId,
  level: number,
  rng: Rng,
  history: number[],
  used: Set<string>,
): Question {
  const course = COURSES[courseId];
  if (!course) throw new Error(`Unknown course ${courseId}`);
  const target = targetTier(level, rng);
  const seen = new Set(history);
  const remember = (q: Question): Question => {
    used.add(q.q);
    history.push(hashStr(q.q));
    while (history.length > HISTORY_CAP) history.shift();
    return q;
  };

  // 1. A freshly generated question for number-based courses (about half of the time).
  const gens = COURSE_GENS[course.name];
  if (gens && rng() < 0.5) {
    for (let i = 0; i < 10; i++) {
      const raw = GENS[gens[Math.floor(rng() * gens.length)]](target, rng);
      if (!raw.q || used.has(raw.q) || seen.has(hashStr(raw.q))) continue;
      return remember(fromRaw(raw, rng, courseId, target));
    }
  }

  // 2. A hand-written question from this course, near the target difficulty, not asked recently.
  const rows = COURSE_BANKS[course.name] ?? [];
  const take = (lo: number, hi: number, fresh: boolean, bank = rows) =>
    bank.filter((r) => r[0] >= lo && r[0] <= hi && !used.has(r[1]) && (!fresh || !seen.has(hashStr(r[1]))));
  const fromRow = (r: (typeof rows)[number]): Question => {
    const wrong = shuffle(r.slice(3) as string[], rng);
    const opts = shuffle([r[2], ...wrong], rng);
    return remember({
      q: r[1],
      opts,
      ans: opts.indexOf(r[2]),
      subject: course.area,
      course: courseId,
      tier: r[0],
    });
  };
  let cands = take(target, target, true);
  if (cands.length && rng() < 0.7) return fromRow(cands[Math.floor(rng() * cands.length)]);
  cands = take(target - 1, target, true);
  if (!cands.length) cands = take(target - 2, target + 1, true);
  if (cands.length) return fromRow(cands[Math.floor(rng() * cands.length)]);

  // 3. Review questions from earlier courses in the same area (the student has been taught these).
  const review = Object.values(COURSES)
    .filter((c) => c.area === course.area && c.sem < course.sem)
    .sort((a, b) => b.sem - a.sem);
  for (const c of review) {
    const bank = COURSE_BANKS[c.name] ?? [];
    const pool = take(1, Math.min(4, target + 1), true, bank);
    if (pool.length) return fromRow(pool[Math.floor(rng() * pool.length)]);
  }

  // 4. Everything has been asked: start the course over, avoiding only this quiz's questions.
  cands = take(target - 1, target + 1, false);
  if (!cands.length) cands = take(1, 4, false);
  if (cands.length) {
    history.length = 0;
    return fromRow(cands[Math.floor(rng() * cands.length)]);
  }
  return remember({ ...makeQuestion(course.area, target, rng, used), course: courseId });
}
