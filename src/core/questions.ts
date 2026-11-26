// Quiz questions: hand-written course banks plus generators for number-based courses.
import { COURSES } from './courses';
import { COURSE_BANKS, type QRow } from './qbank';
import { COURSE_GENS, GENS, type RawQ } from './qgen';
import type { CourseId, Question, SubjectId } from './types';
import { clamp, hashStr, shuffle, type Rng } from './util';

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

/** Every hand-written question of a department, from all the courses it teaches (each bank once). */
export function departmentBank(subject: SubjectId): QRow[] {
  const banks = new Set(
    Object.values(COURSES)
      .filter((c) => c.area === subject)
      .map((c) => c.bank),
  );
  return [...banks].flatMap((b) => COURSE_BANKS[b] ?? []);
}

/**
 * Build a general question for a department at difficulty `tier` (1..4).
 * `used` tracks already-asked prompts so a quiz does not repeat itself.
 */
export function makeQuestion(subject: SubjectId, tier: number, rng: Rng, used: Set<string>): Question {
  tier = clamp(Math.round(tier), 1, 4);
  const pool = departmentBank(subject);
  const lo = Math.max(1, tier - 1);
  let cands = pool.filter((r) => r[0] >= lo && r[0] <= tier && !used.has(r[1]));
  if (!cands.length) cands = pool.filter((r) => r[0] <= tier && !used.has(r[1]));
  if (!cands.length) {
    used.clear();
    cands = pool.filter((r) => r[0] <= tier);
  }
  const row = cands[Math.floor(rng() * cands.length)];
  used.add(row[1]);
  const opts = shuffle(row.slice(2) as string[], rng);
  return { q: row[1], opts, ans: opts.indexOf(row[2]), subject };
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

/** How many hand-written questions a question bank holds, for tests and tools. */
export function courseBankSize(bank: string): number {
  return COURSE_BANKS[bank]?.length ?? 0;
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
  const gens = COURSE_GENS[course.bank];
  if (gens && rng() < 0.5) {
    for (let i = 0; i < 10; i++) {
      const raw = GENS[gens[Math.floor(rng() * gens.length)]](target, rng);
      if (!raw.q || used.has(raw.q) || seen.has(hashStr(raw.q))) continue;
      return remember(fromRaw(raw, rng, courseId, target));
    }
  }

  // 2. A hand-written question from this course, near the target difficulty, not asked recently.
  const rows = COURSE_BANKS[course.bank] ?? [];
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
    .filter(
      (c) => c.area === course.area && c.sem < course.sem && c.majors.some((m) => course.majors.includes(m)),
    )
    .sort((a, b) => b.sem - a.sem);
  for (const c of review) {
    const bank = COURSE_BANKS[c.bank] ?? [];
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
