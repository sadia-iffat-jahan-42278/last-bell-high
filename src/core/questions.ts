// Question generation: procedural math + curated banks for the other subjects.
import { BANK } from './bank';
import type { Question, SubjectId } from './types';
import { shuffle, type Rng } from './util';

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

const formatNum = (v: number): string => (Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10));

export function mathQuestion(tier: number, rng: Rng): Question {
  const t = randInt(rng, Math.max(1, tier - 1), tier);
  const raw = t === 1 ? mathTier1(rng) : t === 2 ? mathTier2(rng) : t === 3 ? mathTier3(rng) : mathTier4(rng);

  let opts: string[];
  let answer: string;
  if (typeof raw.ans === 'string') {
    answer = raw.ans;
    opts = (raw.extra ?? []).slice(0, 4);
    if (!opts.includes(answer)) opts[0] = answer;
    opts = shuffle(opts, rng);
  } else {
    const ans = raw.ans;
    const distractors = new Set<number>();
    const deltas = [
      1,
      -1,
      2,
      -2,
      10,
      -10,
      3,
      -3,
      Math.round(ans * 0.1) || 4,
      Math.round(ans * -0.1) || -4,
      Math.round(ans * 2) - ans,
      5,
      -5,
    ];
    for (const d of shuffle(deltas, rng)) {
      const v = ans + d;
      if (v !== ans && v > -1 && distractors.size < 3) distractors.add(v);
    }
    let fill = 7;
    while (distractors.size < 3) distractors.add(ans + fill++);
    opts = shuffle([ans, ...distractors].map(formatNum), rng);
    answer = formatNum(ans);
  }
  return { q: raw.q, opts, ans: opts.indexOf(answer), subject: 'math' };
}

/**
 * Build a question for `subject` at difficulty `tier` (1..4).
 * `used` tracks already-asked prompts so a quiz does not repeat itself.
 */
export function makeQuestion(subject: SubjectId, tier: number, rng: Rng, used: Set<string>): Question {
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
