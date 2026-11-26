// Question generators for the quantitative courses. Each one builds a fresh question from random numbers, so a
// course such as Calculus I can keep asking new questions semester after semester without repeating itself.
import type { Rng } from './util';

export interface RawQ {
  q: string;
  ans: number | string;
  /** For text answers: the correct answer plus hand-made wrong ones. */
  extra?: string[];
}
export type Gen = (tier: number, r: Rng) => RawQ;

const ri = (r: Rng, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));
const pick = <T>(r: Rng, a: readonly T[]): T => a[Math.floor(r() * a.length)];
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const frac = (n: number, d: number): string => {
  const g = gcd(n, d) || 1;
  const nn = n / g;
  const dd = d / g;
  return dd === 1 ? String(nn) : `${nn}/${dd}`;
};
const choose2 = (n: number): number => (n * (n - 1)) / 2;
const C = (n: number, k: number): number => {
  let v = 1;
  for (let i = 1; i <= k; i++) v = (v * (n - k + i)) / i;
  return Math.round(v);
};
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));
const modpow = (b: number, e: number, m: number): number => {
  let out = 1;
  for (let i = 0; i < e; i++) out = (out * b) % m;
  return out;
};

/** A question with a text answer; the wrong answers are de-duplicated and padded to three. */
function strQ(q: string, ans: string, wrong: string[]): RawQ {
  const uniq = [...new Set(wrong.filter((w) => w !== ans))];
  const extra = [ans, ...uniq].slice(0, 4);
  let pad = 1;
  while (extra.length < 4) extra.push(`${ans} (${pad++})`);
  return { q, ans, extra };
}
/** Fractions near n/d, used as wrong answers. */
function nearFracs(n: number, d: number): string[] {
  return [
    frac(n + 1, d),
    frac(Math.max(1, n - 1), d),
    frac(n, d + 1),
    frac(d - n || 1, d),
    frac(n * 2, d * 3),
    frac(n, d * 2),
  ];
}

/* ----------------------------- mathematics ----------------------------- */
const calc: Gen = (t, r) => {
  const a = ri(r, 2, 9);
  const b = ri(r, 1, 9);
  const c = ri(r, 1, 9);
  const x0 = ri(r, 1, 5);
  if (t <= 1) {
    const k = ri(r, 0, 3);
    if (k === 0) return { q: `If f(x) = ${a}x + ${b}, what is f′(x)?`, ans: a };
    if (k === 1) return { q: `What is the limit of (${a}x + ${b}) as x approaches ${x0}?`, ans: a * x0 + b };
    if (k === 2) return { q: `What is the slope of the line y = ${a}x + ${b}?`, ans: a };
    return { q: `What is the derivative of ${a}x² at x = ${x0}?`, ans: 2 * a * x0 };
  }
  if (t === 2) {
    const k = ri(r, 0, 2);
    if (k === 0) return { q: `If f(x) = ${a}x² + ${b}x + ${c}, what is f′(${x0})?`, ans: 2 * a * x0 + b };
    if (k === 1)
      return { q: `What is the slope of the tangent to y = ${a}x² at x = ${x0}?`, ans: 2 * a * x0 };
    return { q: `If f(x) = x³ + ${b}x, what is f′(${x0})?`, ans: 3 * x0 * x0 + b };
  }
  if (t === 3) {
    const k = ri(r, 0, 2);
    if (k === 0)
      return {
        q: `Using the chain rule, if f(x) = (${a}x + ${b})², what is f′(${x0})?`,
        ans: 2 * a * (a * x0 + b),
      };
    if (k === 1) {
      const p = ri(r, 1, 6);
      return { q: `f(x) = x² − ${2 * p}x + ${c}. At what x is f′(x) = 0?`, ans: p };
    }
    return { q: `What is the minimum value of f(x) = x² − ${2 * x0}x + ${c + x0 * x0}?`, ans: c };
  }
  const k = ri(r, 0, 2);
  if (k === 0) return { q: `If f(x) = ${a}x³ + ${b}x², what is f″(${x0})?`, ans: 6 * a * x0 + 2 * b };
  if (k === 1) {
    const m = ri(r, 2, 9);
    return { q: `What is the limit of (x² − ${m * m}) / (x − ${m}) as x approaches ${m}?`, ans: 2 * m };
  }
  return { q: `If f(x) = x·eˣ, what is f′(0)?`, ans: 1 };
};

const integ: Gen = (t, r) => {
  const a = ri(r, 2, 8);
  const b = ri(r, 1, 9);
  const c = 2 * ri(r, 1, 5);
  if (t <= 1) {
    const k = ri(r, 0, 2);
    const x = ri(r, 2, 8);
    if (k === 0) return { q: `What is the integral of ${a} from 0 to ${x}?`, ans: a * x };
    if (k === 1) return { q: `What is the integral of 2x from 0 to ${x}?`, ans: x * x };
    return { q: `What is the area under the line y = ${a} between x = 0 and x = ${x}?`, ans: a * x };
  }
  if (t === 2) {
    const k = ri(r, 0, 1);
    if (k === 0)
      return { q: `What is the integral of (${a}x + ${b}) from 0 to ${c}?`, ans: (a * c * c) / 2 + b * c };
    const x = ri(r, 2, 5);
    return { q: `What is the integral of 3x² from 0 to ${x}?`, ans: x ** 3 };
  }
  if (t === 3) {
    const k = ri(r, 0, 1);
    const x = pick(r, [3, 6]);
    if (k === 0) return { q: `What is the integral of ${a}x² from 0 to ${x}?`, ans: (a * x ** 3) / 3 };
    return { q: `What is the average value of f(x) = ${a}x on the interval [0, ${c}]?`, ans: (a * c) / 2 };
  }
  const k = ri(r, 0, 2);
  if (k === 0) {
    const d0 = ri(r, 1, 5);
    return {
      q: `What is the integral of (${a}x² + ${b}x + ${d0}) from 0 to 6?`,
      ans: a * 72 + b * 18 + d0 * 6,
    };
  }
  if (k === 1) {
    const n = ri(r, 2, 6);
    return strQ(`What does the geometric series 1 + 1/${n} + 1/${n * n} + … add up to?`, frac(n, n - 1), [
      frac(n + 1, n),
      String(n + 1),
      frac(1, n),
      frac(n - 1, n),
      '∞',
      String(n * n),
    ]);
  }
  const m = ri(r, 2, 5);
  return strQ(`In the Maclaurin series of e^(${m}x), what is the coefficient of x³?`, frac(m ** 3, 6), [
    frac(m ** 3, 3),
    frac(m ** 2, 2),
    String(m ** 3),
    frac(m, 6),
  ]);
};

const linalg: Gen = (t, r) => {
  const [a, b, c, d] = [ri(r, 1, 7), ri(r, 1, 7), ri(r, 1, 7), ri(r, 1, 7)];
  if (t <= 1) {
    if (ri(r, 0, 1))
      return { q: `What is the dot product of (${a}, ${b}) and (${c}, ${d})?`, ans: a * c + b * d };
    const [p, q, h] = pick(r, [
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
    ]);
    return { q: `What is the length of the vector (${p}, ${q})?`, ans: h };
  }
  if (t === 2) {
    if (ri(r, 0, 1))
      return { q: `What is the determinant of [[${a}, ${b}], [${c}, ${d}]]?`, ans: a * d - b * c };
    return { q: `What is the trace of [[${a}, ${b}], [${c}, ${d}]]?`, ans: a + d };
  }
  if (t === 3) {
    const x = ri(r, 1, 5);
    const y = ri(r, 1, 5);
    if (ri(r, 0, 1))
      return {
        q: `Multiply [[${a}, ${b}], [${c}, ${d}]] by the vector (${x}, ${y}). What is the first component?`,
        ans: a * x + b * y,
      };
    const da = ri(r, 2, 6);
    const db = ri(r, 2, 6);
    return { q: `If det A = ${da} and det B = ${db}, what is det(AB)?`, ans: da * db };
  }
  const k = ri(r, 0, 2);
  if (k === 0) {
    const s = ri(r, 2, 4);
    const dd = a * d - b * c || 3;
    return { q: `A is a 2×2 matrix with det A = ${dd}. What is det(${s}A)?`, ans: s * s * dd };
  }
  if (k === 1)
    return { q: `What is the sum of the eigenvalues of [[${a}, ${b}], [${c}, ${d}]]?`, ans: a + d };
  return {
    q: `The matrix [[${a}, ${b}], [0, ${d}]] is triangular. What is the product of its eigenvalues?`,
    ans: a * d,
  };
};

const stats1: Gen = (t, r) => {
  const mk = (n: number, lo: number, hi: number): number[] => Array.from({ length: n }, () => ri(r, lo, hi));
  if (t <= 1) {
    const k = ri(r, 0, 2);
    if (k === 0) {
      const m = ri(r, 5, 20);
      const xs = [m - 2, m + 1, m - 1, m + 3, m - 1];
      return { q: `What is the mean of ${xs.join(', ')}?`, ans: m };
    }
    if (k === 1) {
      const xs = mk(5, 1, 30).sort((x, y) => x - y);
      const shuffled = [...xs].sort(() => r() - 0.5);
      return { q: `What is the median of ${shuffled.join(', ')}?`, ans: xs[2] };
    }
    const xs = mk(6, 2, 40);
    return { q: `What is the range of ${xs.join(', ')}?`, ans: Math.max(...xs) - Math.min(...xs) };
  }
  if (t === 2) {
    const k = ri(r, 0, 2);
    if (k === 0) {
      const xs = mk(4, 2, 30).sort((x, y) => x - y);
      const shuffled = [...xs].sort(() => r() - 0.5);
      return { q: `What is the median of ${shuffled.join(', ')}?`, ans: (xs[1] + xs[2]) / 2 };
    }
    if (k === 1) {
      const m = ri(r, 4, 20);
      const kk = ri(r, 1, 4);
      return {
        q: `The mean of 4 numbers is ${m}. A fifth number, ${m + 5 * kk}, is added. What is the new mean?`,
        ans: m + kk,
      };
    }
    const mode = ri(r, 3, 15);
    const rest = [mode + 2, mode - 1, mode + 5, mode + 3];
    const xs = [...rest, mode, mode, mode].sort(() => r() - 0.5);
    return { q: `What is the mode of ${xs.join(', ')}?`, ans: mode };
  }
  if (t === 3) {
    const m1 = ri(r, 4, 12);
    const m2 = m1 + 5 * ri(r, 1, 4);
    return {
      q: `3 students average ${m1} points and 2 students average ${m2}. What is the average of all 5?`,
      ans: (3 * m1 + 2 * m2) / 5,
    };
  }
  const m = ri(r, 10, 30);
  const odd = ri(r, 0, 1);
  const a = 2 * ri(r, 1, 3) + odd;
  const b = 2 * ri(r, 1, 3) + odd;
  if (ri(r, 0, 1)) {
    const data = [m - a, m - b, m + b, m + a];
    return { q: `What is the population variance of ${data.join(', ')}?`, ans: (a * a + b * b) / 2 };
  }
  const s = ri(r, 2, 9);
  return { q: `What is the population standard deviation of ${m - s} and ${m + s}?`, ans: s };
};

const stats2: Gen = (t, r) => {
  const mu = ri(r, 40, 100);
  const sd = ri(r, 4, 12);
  const k = ri(r, -2, 3);
  const n = pick(r, [4, 9, 25, 36]);
  if (t <= 1)
    return {
      q: `Scores have mean ${mu} and standard deviation ${sd}. What is the z-score of ${mu + k * sd}?`,
      ans: k,
    };
  if (t === 2) {
    const sigma = 30 * ri(r, 1, 6);
    return {
      q: `A population has σ = ${sigma}. What is the standard error of the mean for n = ${n}?`,
      ans: sigma / Math.sqrt(n),
    };
  }
  if (t === 3) {
    const rows = pick(r, [30, 40, 60]);
    const cols = pick(r, [20, 50, 25]);
    const total = 100;
    return {
      q: `In a chi-square test, the row total is ${rows}, the column total is ${cols} and the grand total is ${total}. What is the expected count?`,
      ans: (rows * cols) / total,
    };
  }
  const x = mu + sd;
  return {
    q: `A sample of n = ${n} has mean ${x} and s = ${sd * 2}. What is the t-statistic for H₀: μ = ${mu}?`,
    ans: sd / ((sd * 2) / Math.sqrt(n)),
  };
};

const discrete: Gen = (t, r) => {
  const n = ri(r, 5, 12);
  if (t <= 1) {
    const a = ri(r, 8, 20);
    const b = ri(r, 8, 20);
    const both = ri(r, 2, 6);
    if (ri(r, 0, 1))
      return { q: `|A| = ${a}, |B| = ${b} and |A ∩ B| = ${both}. What is |A ∪ B|?`, ans: a + b - both };
    const k = ri(r, 3, 8);
    return { q: `How many subsets does a set with ${k} elements have?`, ans: 2 ** k };
  }
  if (t === 2) {
    if (ri(r, 0, 1))
      return {
        q: `In a group of ${n} people, everyone shakes hands once with everyone else. How many handshakes?`,
        ans: choose2(n),
      };
    const m = ri(r, 4, 6);
    return { q: `In how many orders can ${m} different books be arranged on a shelf?`, ans: fact(m) };
  }
  if (t === 3) {
    const k = ri(r, 0, 2);
    if (k === 0) return { q: `What is C(${n}, 3)?`, ans: C(n, 3) };
    if (k === 1) {
      const m = ri(r, 3, 6);
      return { q: `How many different binary strings of length ${m + 2} are there?`, ans: 2 ** (m + 2) };
    }
    const [x, y] = [ri(r, 2, 4), ri(r, 3, 5)];
    return { q: `How many edges does the complete bipartite graph K(${x}, ${y}) have?`, ans: x * y };
  }
  const k = ri(r, 0, 1);
  if (k === 0) {
    const [word, ways] = pick(r, [
      ['LEVEL', fact(5) / (fact(2) * fact(2))],
      ['APPLE', fact(5) / fact(2)],
      ['BANANA', fact(6) / (fact(3) * fact(2))],
      ['ALLOY', fact(5) / fact(2)],
    ] as [string, number][]);
    return { q: `How many distinct arrangements of the letters of ${word} are there?`, ans: ways };
  }
  const m = ri(r, 4, 9);
  return {
    q: `How many ways are there to choose a committee of 3 from ${m} people, and then pick one of the 3 as chair?`,
    ans: C(m, 3) * 3,
  };
};

const prob: Gen = (t, r) => {
  if (t <= 1) {
    const k = ri(r, 1, 5);
    if (ri(r, 0, 1))
      return strQ(
        `A fair die is rolled. What is the probability of getting more than ${k}?`,
        frac(6 - k, 6),
        nearFracs(6 - k, 6),
      );
    return strQ(`A fair die is rolled. What is the probability of an even number?`, '1/2', [
      '1/3',
      '1/6',
      '2/3',
    ]);
  }
  if (t === 2) {
    const k = ri(r, 0, 1);
    if (k === 0)
      return strQ('Two fair coins are tossed. What is the probability of two heads?', '1/4', [
        '1/2',
        '1/3',
        '3/4',
      ]);
    const s = ri(r, 2, 12);
    const ways = 6 - Math.abs(s - 7);
    return strQ(
      `Two fair dice are rolled. What is the probability that the sum is ${s}?`,
      frac(ways, 36),
      nearFracs(ways, 36),
    );
  }
  if (t === 3) {
    const x = 2 * ri(r, 2, 6) + 2;
    const y = ri(r, 1, 3) * 2;
    return {
      q: `A game pays $${x} with probability 1/2 and costs you $${y} with probability 1/2. What is the expected value, in dollars?`,
      ans: (x - y) / 2,
    };
  }
  const k = ri(r, 0, 2);
  if (k === 0) {
    const n = ri(r, 4, 6);
    const kk = ri(r, 1, n - 1);
    return strQ(
      `A fair coin is tossed ${n} times. What is the probability of exactly ${kk} heads?`,
      frac(C(n, kk), 2 ** n),
      nearFracs(C(n, kk), 2 ** n),
    );
  }
  if (k === 1)
    return strQ('A die is rolled twice. What is the probability of at least one six?', '11/36', [
      '1/3',
      '1/6',
      '5/36',
    ]);
  return strQ(
    'Two cards are drawn without replacement from a standard deck. What is the probability that both are aces?',
    '1/221',
    ['1/169', '1/13', '4/663'],
  );
};

const numtheory: Gen = (t, r) => {
  const a = ri(r, 2, 9) * ri(r, 2, 6);
  if (t <= 1) {
    const g = ri(r, 2, 9);
    const x = g * ri(r, 2, 6);
    const y = g * ri(r, 7, 12);
    if (ri(r, 0, 1)) return { q: `What is the greatest common divisor of ${x} and ${y}?`, ans: gcd(x, y) };
    return { q: `What is ${a * 7 + 3} mod 7?`, ans: 3 };
  }
  if (t === 2) {
    const x = ri(r, 3, 12);
    const y = ri(r, 3, 12);
    if (ri(r, 0, 1))
      return { q: `What is the least common multiple of ${x} and ${y}?`, ans: (x * y) / gcd(x, y) };
    const m = ri(r, 5, 13);
    return { q: `What is (${x} × ${y}) mod ${m}?`, ans: (x * y) % m };
  }
  if (t === 3) {
    const m = pick(r, [7, 11, 13]);
    const x = ri(r, 2, 6);
    const e = ri(r, 2, 5);
    if (ri(r, 0, 1)) return { q: `What is ${x}^${e} mod ${m}?`, ans: modpow(x, e, m) };
    const [p, q] = pick(r, [
      [3, 5],
      [3, 7],
      [5, 7],
      [5, 11],
    ]);
    return { q: `What is Euler’s totient φ(${p * q})?`, ans: (p - 1) * (q - 1) };
  }
  const p = pick(r, [7, 11, 13]);
  if (ri(r, 0, 1)) {
    const a1 = ri(r, 2, p - 1);
    let inv = 1;
    for (let x = 1; x < p; x++) if ((a1 * x) % p === 1) inv = x;
    return { q: `What is the inverse of ${a1} modulo ${p}? (the x with ${a1}x ≡ 1 mod ${p})`, ans: inv };
  }
  const [p1, p2, e1, e2] = [pick(r, [2, 3, 5]), pick(r, [7, 11]), ri(r, 1, 3), ri(r, 1, 2)];
  return { q: `How many positive divisors does ${p1 ** e1 * p2 ** e2} have?`, ans: (e1 + 1) * (e2 + 1) };
};

const crypto: Gen = (t, r) => {
  const words = ['CAT', 'DOG', 'SUN', 'MOON', 'STAR', 'CODE', 'MATH', 'LOCK'];
  const shift = (w: string, k: number) =>
    [...w].map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26) % 26) + 65)).join('');
  const w = pick(r, words);
  const k = ri(r, 1, 9);
  if (t <= 1) {
    const wrong = [shift(w, k + 1), shift(w, k - 1), shift(w, -k), shift(w, k + 2)];
    return strQ(
      `A Caesar cipher shifts every letter forward by ${k}. What is “${w}” after encryption?`,
      shift(w, k),
      wrong,
    );
  }
  if (t === 2) {
    if (ri(r, 0, 1)) {
      const c = shift(w, k);
      const wrong = [shift(c, -k + 1), shift(c, -k - 1), shift(c, k), shift(c, -k + 3), shift(c, -k - 2)];
      return strQ(
        `“${shift(w, k)}” was made with a Caesar shift of ${k}. What was the original word?`,
        w,
        wrong,
      );
    }
    const a = ri(r, 1, 15);
    const b = ri(r, 1, 15);
    const bits = (n: number) => n.toString(2).padStart(4, '0');
    return strQ(`What is ${bits(a)} XOR ${bits(b)}?`, bits(a ^ b), [
      bits(a ^ b ^ 1),
      bits(a ^ b ^ 2),
      bits(a ^ b ^ 4),
      bits(a ^ b ^ 8),
    ]);
  }
  if (t === 3) {
    const [n, e, m] = pick(r, [
      [15, 3, 2],
      [15, 3, 7],
      [21, 5, 2],
      [33, 3, 5],
    ]);
    return {
      q: `A toy RSA system has n = ${n} and e = ${e}. What is the ciphertext of the message ${m}? (c = m^e mod n)`,
      ans: modpow(m, e, n),
    };
  }
  const [p, q, e] = pick(r, [
    [5, 11, 3],
    [3, 11, 3],
    [5, 7, 5],
    [7, 11, 7],
  ]);
  if (ri(r, 0, 1))
    return {
      q: `A toy RSA system uses p = ${p}, q = ${q}, e = ${e}. What is φ(n) = (p − 1)(q − 1)?`,
      ans: (p - 1) * (q - 1),
    };
  const prime = pick(r, [11, 13, 17, 19]);
  const g = pick(r, [2, 3]);
  const a = ri(r, 2, 5);
  const bb = ri(r, 2, 5);
  return {
    q: `In a Diffie–Hellman exchange with p = ${prime} and g = ${g}, Alice picks a = ${a} and Bob sends B = g^${bb} mod ${prime}. What shared secret does Alice compute, B^${a} mod ${prime}?`,
    ans: modpow(modpow(g, bb, prime), a, prime),
  };
};

const numerical: Gen = (t, r) => {
  const a = ri(r, 0, 6);
  const b = a + 2 * ri(r, 1, 6);
  if (t <= 1)
    return {
      q: `The bisection method starts on [${a}, ${b}]. What is the first midpoint?`,
      ans: (a + b) / 2,
    };
  if (t === 2) {
    const fa = ri(r, 2, 10);
    const fb = ri(r, 2, 10);
    return {
      q: `Estimate the integral from ${a} to ${b} by the trapezoid rule using one interval, with f(${a}) = ${fa * 2} and f(${b}) = ${fb * 2}.`,
      ans: ((b - a) * (fa * 2 + fb * 2)) / 2,
    };
  }
  if (t === 3) {
    const k = 4 * ri(r, 1, 3);
    if (ri(r, 0, 1))
      return {
        q: `Newton’s method for x² = ${k * k} starts at x₀ = ${2 * k}. What is x₁ = x₀ − (x₀² − ${k * k}) / (2x₀)?`,
        ans: (5 * k) / 4,
      };
    const y0 = ri(r, 1, 5);
    const h = pick(r, [1, 2]);
    return {
      q: `Euler’s method for y′ = y with y(0) = ${y0} and step h = ${h}: what is y(${h})?`,
      ans: y0 + h * y0,
    };
  }
  const y0 = ri(r, 1, 4);
  return {
    q: `Euler’s method for y′ = x + y with y(0) = ${y0} and step h = 1: what is y(1)?`,
    ans: y0 + 1 * (0 + y0),
  };
};

const algo: Gen = (t, r) => {
  if (t <= 1) {
    const n = ri(r, 4, 12);
    return {
      q: `A loop runs once for each of ${n} items in a list. How many times does the loop body run?`,
      ans: n,
    };
  }
  if (t === 2) {
    const [n, m] = [ri(r, 3, 9), ri(r, 3, 9)];
    if (ri(r, 0, 1))
      return {
        q: `for i in 1..${n} { for j in 1..${m} { work() } }. How many times does work() run?`,
        ans: n * m,
      };
    const k = ri(r, 3, 10);
    return {
      q: `Binary search on a sorted list of ${2 ** k - 1} items takes at most how many comparisons?`,
      ans: k,
    };
  }
  if (t === 3) {
    const n = ri(r, 4, 12);
    return {
      q: `for i in 1..${n} { for j in 1..i { work() } }. How many times does work() run?`,
      ans: (n * (n + 1)) / 2,
    };
  }
  const k = ri(r, 3, 10);
  if (ri(r, 0, 1))
    return {
      q: `How many levels does a perfectly balanced binary tree with ${2 ** k - 1} nodes have?`,
      ans: k,
    };
  const n = 2 ** ri(r, 3, 6);
  return {
    q: `Merge sort on ${n} items splits the list into halves repeatedly. How many levels of splitting are needed to reach single items?`,
    ans: Math.log2(n),
  };
};

const binary: Gen = (t, r) => {
  const n = ri(r, 3, 15);
  if (t <= 1) {
    if (ri(r, 0, 1)) return { q: `What is binary ${n.toString(2).padStart(4, '0')} in decimal?`, ans: n };
    const k = ri(r, 3, 8);
    return { q: `How many different values can ${k} bits represent?`, ans: 2 ** k };
  }
  if (t === 2) {
    const x = ri(r, 16, 255);
    return strQ(`What is decimal ${x} in hexadecimal?`, x.toString(16).toUpperCase(), [
      (x + 1).toString(16).toUpperCase(),
      (x - 1).toString(16).toUpperCase(),
      (x ^ 0x11).toString(16).toUpperCase(),
      (x + 16).toString(16).toUpperCase(),
    ]);
  }
  if (t === 3) {
    const a = ri(r, 16, 255);
    const b = ri(r, 16, 255);
    const bits = (v: number) => v.toString(2).padStart(8, '0');
    return strQ(`What is ${bits(a)} AND ${bits(b)}?`, bits(a & b), [
      bits((a & b) ^ 1),
      bits((a & b) ^ 2),
      bits((a & b) ^ 4),
      bits((a & b) ^ 16),
    ]);
  }
  const k = ri(r, 4, 10);
  if (ri(r, 0, 1))
    return { q: `What is the largest unsigned integer that fits in ${k} bits?`, ans: 2 ** k - 1 };
  const e = ri(r, 10, 32);
  return {
    q: `A computer has 2^${e} bytes of memory, each with its own address. How many address bits are needed?`,
    ans: e + 0 * k,
  };
};

const progOut: Gen = (t, r) => {
  const a = ri(r, 2, 9);
  const b = ri(r, 2, 9);
  if (t <= 1) {
    if (ri(r, 0, 1)) return { q: `x = ${a}; x = x + ${b}; What is x?`, ans: a + b };
    return { q: `x = ${a}; y = x * ${b}; What is y?`, ans: a * b };
  }
  if (t === 2) {
    const n = ri(r, 3, 8);
    if (ri(r, 0, 1))
      return { q: `total = 0; for i in 1..${n}: total = total + i. What is total?`, ans: (n * (n + 1)) / 2 };
    return {
      q: `count = 0; for i in 1..${n}: if i is even: count = count + 1. What is count?`,
      ans: Math.floor(n / 2),
    };
  }
  if (t === 3) {
    const [x, y] = [ri(r, 20, 60), ri(r, 3, 9)];
    if (ri(r, 0, 1))
      return {
        q: `What are ${x} // ${y} (integer division) and ${x} % ${y} added together?`,
        ans: Math.floor(x / y) + (x % y),
      };
    const s = pick(r, ['code', 'campus', 'student', 'library']);
    return { q: `In Python, what does len("${s}" + "${s}") return?`, ans: s.length * 2 };
  }
  const n = ri(r, 5, 9);
  const fib = (k: number): number => (k <= 2 ? 1 : fib(k - 1) + fib(k - 2));
  if (ri(r, 0, 1)) return { q: `f(1) = f(2) = 1 and f(n) = f(n−1) + f(n−2). What is f(${n})?`, ans: fib(n) };
  const m = ri(r, 3, 6);
  return {
    q: `A recursive function g(n) returns 1 if n = 0, otherwise n × g(n − 1). What is g(${m})?`,
    ans: fact(m),
  };
};

const networks: Gen = (t, r) => {
  const bits = pick(r, [24, 25, 26, 27, 28]);
  if (t <= 1) return { q: 'How many bits are in an IPv4 address?', ans: 32 };
  if (t === 2)
    return {
      q: `How many usable host addresses does a /${bits} IPv4 network have?`,
      ans: 2 ** (32 - bits) - 2,
    };
  if (t === 3) {
    const a = ri(r, 24, 28);
    const b = a + ri(r, 1, 3);
    return { q: `How many /${b} subnets fit inside one /${a} network?`, ans: 2 ** (b - a) };
  }
  const octet = pick(r, [128, 192, 224, 240, 248]);
  const lastOctetBits = Math.log2(256 - octet);
  return {
    q: `A subnet mask ends in .${octet}. How many addresses (including network and broadcast) are in each subnet block of that octet?`,
    ans: 2 ** lastOctetBits,
  };
};

/* ----------------------------- economics ----------------------------- */
const econ1: Gen = (t, r) => {
  const a = ri(r, 2, 8);
  const b = ri(r, 2, 8);
  if (t <= 1) {
    const hrs = ri(r, 2, 8);
    return {
      q: `In ${hrs} hours you can bake ${hrs * a} cakes or ${hrs * b} pies. How many cakes do you give up to make one more pie? (answer as cakes per pie, rounded to one decimal)`,
      ans: Math.round((a / b) * 10) / 10,
    };
  }
  if (t === 2) {
    const p = ri(r, 2, 9);
    const q = ri(r, 10, 60);
    return { q: `A shop sells ${q} items at $${p} each. What is its total revenue, in dollars?`, ans: p * q };
  }
  if (t === 3) {
    const pc = pick(r, [5, 10, 20]);
    const e = pick(r, [0.5, 1, 2, 3]);
    return {
      q: `When the price rises ${pc}%, quantity demanded falls ${pc * e}%. What is the price elasticity of demand (absolute value)?`,
      ans: e,
    };
  }
  const maxp = 2 * ri(r, 4, 9);
  const price = ri(r, 1, maxp / 2 - 1) * 2;
  const qty = 2 * ri(r, 3, 12);
  return {
    q: `Buyers are willing to pay at most $${maxp} and the market price is $${price}, with ${qty} units sold along a straight-line demand curve. What is consumer surplus, in dollars? (½ × base × height)`,
    ans: ((maxp - price) * qty) / 2,
  };
};

const accounting: Gen = (t, r) => {
  const a = ri(r, 20, 90) * 10;
  const l = ri(r, 5, 15) * 10;
  if (t <= 1) {
    if (ri(r, 0, 1))
      return { q: `A company has assets of ${a + l} and liabilities of ${l}. What is its equity?`, ans: a };
    const rev = ri(r, 20, 90) * 10;
    const cogs = ri(r, 5, 15) * 10;
    return {
      q: `Revenue is ${rev + cogs} and cost of goods sold is ${cogs}. What is gross profit?`,
      ans: rev,
    };
  }
  if (t === 2) {
    const cost = ri(r, 5, 20) * 1000;
    const life = pick(r, [4, 5, 10]);
    const salv = cost / 5;
    return {
      q: `A machine costs $${cost}, has a salvage value of $${salv} and a life of ${life} years. What is straight-line depreciation per year, in dollars?`,
      ans: (cost - salv) / life,
    };
  }
  if (t === 3) {
    const margin = ri(r, 2, 9);
    const vc = ri(r, 2, 9);
    const units = ri(r, 10, 60) * 5;
    return {
      q: `Fixed costs are $${margin * units}, the price is $${vc + margin} and the variable cost is $${vc} per unit. How many units are needed to break even?`,
      ans: units,
    };
  }
  const liab = ri(r, 2, 9) * 100;
  const ratio = pick(r, [2, 3, 1.5]);
  return {
    q: `Current assets are ${liab * ratio} and the current ratio is ${ratio}. What are the current liabilities?`,
    ans: liab,
  };
};

const finance: Gen = (t, r) => {
  const p = ri(r, 1, 9) * 100;
  const rate = pick(r, [5, 10, 20]);
  const yrs = ri(r, 1, 3);
  if (t <= 1)
    return {
      q: `You deposit $${p} at ${rate}% simple interest per year for ${yrs} year(s). How much interest do you earn, in dollars?`,
      ans: (p * rate * yrs) / 100,
    };
  if (t === 2)
    return {
      q: `$${p} grows at 10% compounded annually for 2 years. What is the final amount, in dollars?`,
      ans: Math.round(p * 1.21 * 100) / 100,
    };
  if (t === 3) {
    const rr = pick(r, [10, 20, 25, 50]);
    const pv = ri(r, 2, 9) * 100;
    return {
      q: `What is the present value of $${pv + (pv * rr) / 100} received in one year at a ${rr}% discount rate, in dollars?`,
      ans: pv,
    };
  }
  const inv = ri(r, 2, 9) * 100;
  const gain = ri(r, 2, 9) * 10;
  return {
    q: `A project costs $${inv} today and pays $${Math.round((inv + gain) * 1.1)} in one year. At a 10% discount rate, what is its NPV, in dollars?`,
    ans: gain,
  };
};

/* ----------------------------- science ----------------------------- */
const physics1: Gen = (t, r) => {
  const m = ri(r, 2, 10);
  const a = ri(r, 2, 9);
  const v = 2 * ri(r, 2, 9);
  if (t <= 1) {
    const k = ri(r, 0, 1);
    if (k === 0) return { q: `A car travels ${v * 5} m in 5 s. What is its average speed in m/s?`, ans: v };
    return { q: `A ${m} kg object accelerates at ${a} m/s². What force acts on it, in newtons?`, ans: m * a };
  }
  if (t === 2) {
    const f = ri(r, 3, 12);
    const d = ri(r, 2, 9);
    if (ri(r, 0, 1))
      return {
        q: `A ${f} N force moves an object ${d} m in its own direction. How much work is done, in joules?`,
        ans: f * d,
      };
    return { q: `What is the momentum of a ${m} kg object moving at ${v} m/s, in kg·m/s?`, ans: m * v };
  }
  if (t === 3) {
    if (ri(r, 0, 1))
      return {
        q: `What is the kinetic energy of a ${m * 2} kg object moving at ${v / 2} m/s, in joules? (½mv²)`,
        ans: 0.5 * m * 2 * (v / 2) ** 2,
      };
    const u = ri(r, 2, 12);
    const tt = ri(r, 2, 6);
    return {
      q: `An object moving at ${u} m/s accelerates at ${a} m/s² for ${tt} s. What is its final speed, in m/s?`,
      ans: u + a * tt,
    };
  }
  const h = ri(r, 2, 9) * 5;
  const mm = ri(r, 1, 8);
  if (ri(r, 0, 1))
    return {
      q: `Taking g = 10 m/s², what is the gravitational potential energy of a ${mm} kg mass raised ${h} m, in joules?`,
      ans: mm * 10 * h,
    };
  const sec = ri(r, 2, 6);
  return {
    q: `A ball is dropped from rest. Taking g = 10 m/s², how fast is it moving after ${sec} s, in m/s?`,
    ans: 10 * sec,
  };
};

const physics2: Gen = (t, r) => {
  const i = ri(r, 2, 9);
  const res = ri(r, 2, 12);
  if (t <= 1)
    return {
      q: `A ${res} Ω resistor carries ${i} A. What is the voltage across it, in volts?`,
      ans: i * res,
    };
  if (t === 2) {
    const v = ri(r, 3, 12) * 2;
    return { q: `A device runs on ${v} V and draws ${i} A. What power does it use, in watts?`, ans: v * i };
  }
  if (t === 3) {
    const [r1, r2, r3] = [ri(r, 2, 9), ri(r, 2, 9), ri(r, 2, 9)];
    if (ri(r, 0, 1))
      return {
        q: `Resistors of ${r1} Ω, ${r2} Ω and ${r3} Ω are connected in series. What is the total resistance, in ohms?`,
        ans: r1 + r2 + r3,
      };
    const rr = 2 * ri(r, 2, 8);
    return {
      q: `Two identical ${rr} Ω resistors are connected in parallel. What is the total resistance, in ohms?`,
      ans: rr / 2,
    };
  }
  if (ri(r, 0, 1)) {
    const f = ri(r, 2, 9) * 50;
    const lam = ri(r, 1, 4);
    return {
      q: `A wave has frequency ${f} Hz and wavelength ${lam} m. What is its speed, in m/s?`,
      ans: f * lam,
    };
  }
  const p = ri(r, 1, 5) * 100;
  const h = ri(r, 2, 6);
  return {
    q: `A ${p} W heater runs for ${h} hours. How much energy does it use, in watt-hours?`,
    ans: p * h,
  };
};

const chem: Gen = (t, r) => {
  if (t <= 1) {
    const [name, formula, mass] = pick(r, [
      ['water', 'H₂O', 18],
      ['carbon dioxide', 'CO₂', 44],
      ['methane', 'CH₄', 16],
      ['ammonia', 'NH₃', 17],
      ['sodium hydroxide', 'NaOH', 40],
      ['glucose', 'C₆H₁₂O₆', 180],
    ] as [string, string, number][]);
    return {
      q: `Using H = 1, C = 12, N = 14, O = 16 and Na = 23, what is the molar mass of ${name} (${formula}) in g/mol?`,
      ans: mass,
    };
  }
  if (t === 2) {
    const molar = pick(r, [18, 44, 16, 40]);
    const moles = ri(r, 2, 6);
    return {
      q: `How many moles are in ${molar * moles} g of a substance with molar mass ${molar} g/mol?`,
      ans: moles,
    };
  }
  if (t === 3) {
    const n = ri(r, 1, 13);
    if (ri(r, 0, 1)) return { q: `What is the pH of a solution with [H⁺] = 10⁻${n} mol/L?`, ans: n };
    const c1 = ri(r, 2, 6);
    const v1 = ri(r, 2, 5);
    const v2 = v1 * ri(r, 2, 4);
    return {
      q: `${v1} L of a ${c1 * (v2 / v1)} M solution is diluted to ${v2} L. What is the new concentration in mol/L? (C₁V₁ = C₂V₂)`,
      ans: c1,
    };
  }
  const a = ri(r, 2, 6);
  return {
    q: `In 2H₂ + O₂ → 2H₂O, how many moles of water form from ${a * 2} moles of H₂ with excess oxygen?`,
    ans: a * 2,
  };
};

const astro: Gen = (t, r) => {
  if (t <= 1) {
    const ly = ri(r, 2, 20);
    return {
      q: `A star ${ly} light-years away shines. How many years does its light take to reach us?`,
      ans: ly,
    };
  }
  if (t === 2) {
    const par = pick(r, [0.5, 0.25, 0.1, 0.2]);
    return {
      q: `A star has a parallax of ${par} arcseconds. What is its distance in parsecs? (d = 1/p)`,
      ans: Math.round((1 / par) * 10) / 10,
    };
  }
  if (t === 3) {
    const a = pick(r, [4, 9, 16, 25]);
    return {
      q: `A planet orbits at ${a} AU from a Sun-like star. By Kepler’s third law (T² = a³), what is its period in years?`,
      ans: Math.round(a ** 1.5),
    };
  }
  const d = ri(r, 2, 15);
  return {
    q: `With Hubble’s constant H₀ = 70 km/s per Mpc, how fast does a galaxy ${d} Mpc away recede, in km/s?`,
    ans: 70 * d,
  };
};

const diffeq: Gen = (t, r) => {
  const k = ri(r, 2, 6);
  const y0 = ri(r, 2, 9);
  if (t <= 1) return { q: `If y′ = ${k} (a constant) and y(0) = ${y0}, what is y(3)?`, ans: y0 + 3 * k };
  if (t === 2) return { q: `If y′ = ${k}y and y(0) = ${y0}, what is y′(0)?`, ans: k * y0 };
  if (t === 3) {
    const h = pick(r, [1, 2]);
    return {
      q: `Euler’s method for y′ = ${k} with y(0) = ${y0} and step ${h}: what is y(${2 * h}) after 2 steps?`,
      ans: y0 + 2 * h * k,
    };
  }
  const a = ri(r, 2, 5);
  return {
    q: `For y″ − ${a * a}y = 0, which value of r satisfies the characteristic equation r² − ${a * a} = 0 and is positive?`,
    ans: a,
  };
};

const ml: Gen = (t, r) => {
  const tp = ri(r, 20, 60);
  const fp = ri(r, 5, 20);
  const fn = ri(r, 5, 20);
  const tn = 100 - tp - fp - fn > 0 ? 100 - tp - fp - fn : 10;
  const total = tp + fp + fn + tn;
  if (t <= 1)
    return strQ(
      `A classifier gets ${tp + tn} of ${total} predictions right. What is its accuracy as a fraction? (give it in lowest terms)`,
      frac(tp + tn, total),
      [
        frac(tp, total),
        frac(tp + tn + 1, total),
        frac(tn, total),
        frac(tp + tn - 1, total),
        frac(fp + fn, total),
      ],
    );
  if (t === 2)
    return strQ(`TP = ${tp}, FP = ${fp}. What is the precision, TP / (TP + FP)?`, frac(tp, tp + fp), [
      frac(tp, tp + fn),
      frac(fp, tp + fp),
      frac(tp + 1, tp + fp),
      frac(tn, tn + fp),
    ]);
  if (t === 3)
    return strQ(`TP = ${tp}, FN = ${fn}. What is the recall, TP / (TP + FN)?`, frac(tp, tp + fn), [
      frac(tp, tp + fp),
      frac(fn, tp + fn),
      frac(tp + 1, tp + fn),
      frac(tp, total),
    ]);
  return strQ(
    `TP = ${tp}, FP = ${fp}, FN = ${fn}. What is the F1 score, 2TP / (2TP + FP + FN)?`,
    frac(2 * tp, 2 * tp + fp + fn),
    [
      frac(tp, tp + fp + fn),
      frac(2 * tp, 2 * tp + fp),
      frac(tp, 2 * tp + fp + fn),
      frac(2 * tp + 1, 2 * tp + fp + fn),
    ],
  );
};

const circuits: Gen = (t, r) => {
  if (t === 1) {
    const i = ri(r, 2, 12);
    const R = ri(r, 2, 20);
    return { q: `A ${R} Ω resistor carries ${i} A. What is the voltage across it, in volts?`, ans: i * R };
  }
  if (t === 2) {
    const a = ri(r, 3, 40);
    const b = ri(r, 3, 40);
    const c = ri(r, 3, 40);
    return {
      q: `Resistors of ${a} Ω, ${b} Ω and ${c} Ω are in series. What is the total resistance in ohms?`,
      ans: a + b + c,
    };
  }
  if (t === 3) {
    // pairs whose parallel combination is a whole number
    const [a, b] = pick(r, [
      [3, 6],
      [4, 12],
      [6, 12],
      [10, 15],
      [12, 24],
      [20, 30],
      [30, 60],
      [8, 24],
    ] as const);
    const k = ri(r, 1, 4);
    return {
      q: `${a * k} Ω and ${b * k} Ω are in parallel. What is the combined resistance in ohms?`,
      ans: (a * k * b * k) / (a * k + b * k),
    };
  }
  const R1 = ri(r, 1, 9);
  const R2 = ri(r, 1, 9);
  const per = ri(r, 2, 6);
  const V = per * (R1 + R2);
  return {
    q: `A ${V} V source feeds ${R1} Ω in series with ${R2} Ω. What power does the ${R2} Ω resistor use, in watts?`,
    ans: per * per * R2,
  };
};

export const GENS = {
  circuits,
  calc,
  integ,
  linalg,
  stats1,
  stats2,
  discrete,
  prob,
  numtheory,
  crypto,
  numerical,
  algo,
  binary,
  progOut,
  networks,
  econ1,
  accounting,
  finance,
  physics1,
  physics2,
  chem,
  astro,
  diffeq,
  ml,
} satisfies Record<string, Gen>;
export type GenId = keyof typeof GENS;

/** Which generators feed which question bank. Banks not listed use their hand-written questions only. */
export const COURSE_GENS: Record<string, GenId[]> = {
  'Calculus I': ['calc'],
  'Calculus II': ['integ'],
  'Linear Algebra': ['linalg'],
  'Statistics I': ['stats1', 'prob'],
  'Statistics II': ['stats2'],
  'Discrete Mathematics': ['discrete'],
  'Number Theory': ['numtheory'],
  Cryptography: ['crypto', 'numtheory'],
  'Numerical Methods': ['numerical'],
  'Differential Equations': ['diffeq', 'calc'],
  'Intro to Programming': ['progOut', 'binary'],
  'Data Structures': ['algo'],
  Algorithms: ['algo'],
  'Computer Architecture': ['binary'],
  'Digital Logic Design': ['binary'],
  'Computer Networks': ['networks', 'binary'],
  'Machine Learning': ['ml'],
  'Circuit Analysis I': ['circuits'],
  'Circuit Analysis II': ['circuits'],
  'Principles of Economics': ['econ1'],
  'Financial Accounting': ['accounting'],
  Entrepreneurship: ['finance', 'accounting'],
  'Physics I': ['physics1'],
  'Physics II': ['physics2'],
  'General Chemistry': ['chem'],
  Astrophysics: ['astro'],
};
