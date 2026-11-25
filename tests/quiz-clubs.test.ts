import { describe, expect, it } from 'vitest';
import { CLUBS, CLUB_MAX, COURSES, CURRICULUM, NPC_CLUB, TERMS } from '../src/core/data';
import { COURSE_BANKS } from '../src/core/qbank';
import { COURSE_GENS, GENS, type GenId } from '../src/core/qgen';
import { HISTORY_CAP, courseQuestion, optionsFor, targetTier } from '../src/core/questions';
import * as St from '../src/core/state';
import { CLUB_IDS, NPC_IDS, type GameState } from '../src/core/types';
import { hashStr, mulberry32 } from '../src/core/util';
import { PUZZLES, choosePuzzles } from '../src/minigames/chessPuzzles';
import { ARGUMENTS, FALLACIES, chooseArguments } from '../src/minigames/debateBank';

const fresh = (): GameState => St.newState('Tester', St.defaultLook());
const atDay = (day: number, period = 0): GameState => Object.assign(fresh(), { day, period });

describe('course question banks', () => {
  const courses = Object.values(COURSES);

  it('has a hand-written bank for every one of the 71 courses, and none for courses that do not exist', () => {
    expect(courses.length).toBe(71);
    for (const c of courses) expect(COURSE_BANKS[c.name], c.name).toBeDefined();
    const names = new Set(courses.map((c) => c.name));
    for (const k of Object.keys(COURSE_BANKS))
      expect(names.has(k), `bank for unknown course ${k}`).toBe(true);
  });

  it('gives every course enough questions in all four difficulty tiers', () => {
    for (const c of courses) {
      const rows = COURSE_BANKS[c.name];
      expect(rows.length, c.name).toBeGreaterThanOrEqual(12);
      for (const tier of [1, 2, 3, 4]) {
        expect(rows.filter((r) => r[0] === tier).length, `${c.name} tier ${tier}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('has well-formed rows: four distinct options, a real answer, no duplicate questions in a course', () => {
    for (const c of courses) {
      const rows = COURSE_BANKS[c.name];
      const seen = new Set<string>();
      for (const [tier, q, a, w1, w2, w3] of rows) {
        expect([1, 2, 3, 4], `${c.name}: ${q}`).toContain(tier);
        expect(q.length, `${c.name}: empty question`).toBeGreaterThan(5);
        expect(new Set([a, w1, w2, w3]).size, `${c.name}: duplicate options in "${q}"`).toBe(4);
        for (const o of [a, w1, w2, w3])
          expect(o.trim().length, `${c.name}: empty option in "${q}"`).toBeGreaterThan(0);
        expect(seen.has(q), `${c.name}: repeated question "${q}"`).toBe(false);
        seen.add(q);
      }
    }
  });

  it('only wires generators to courses that exist', () => {
    const names = new Set(courses.map((c) => c.name));
    for (const [name, gens] of Object.entries(COURSE_GENS)) {
      expect(names.has(name), name).toBe(true);
      for (const g of gens) expect(GENS[g], `${name} -> ${g}`).toBeDefined();
    }
  });
});

describe('numeric answer choices', () => {
  it('are distinct, include the answer, and are never negative when the answer is not', () => {
    for (const id of Object.keys(GENS) as GenId[]) {
      for (let tier = 1; tier <= 4; tier++) {
        for (let seed = 1; seed <= 60; seed++) {
          const rng = mulberry32(seed * 977 + tier);
          const raw = GENS[id](tier, rng);
          if (typeof raw.ans !== 'number') continue;
          const { opts, ans } = optionsFor(raw, rng);
          const label = `${id} t${tier}: ${raw.q} -> ${opts.join(' | ')}`;
          expect(opts.length, label).toBe(4);
          expect(new Set(opts).size, label).toBe(4);
          expect(Number(opts[ans]), label).toBeCloseTo(raw.ans, 5);
          if (raw.ans >= 0) for (const o of opts) expect(Number(o), label).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe('question generators', () => {
  it('always produce valid questions at every difficulty', () => {
    for (const id of Object.keys(GENS) as GenId[]) {
      for (let tier = 1; tier <= 4; tier++) {
        for (let seed = 1; seed <= 120; seed++) {
          const raw = GENS[id](tier, mulberry32(seed * 131 + tier * 7 + id.length));
          const label = `${id} t${tier} seed${seed}: ${raw.q}`;
          expect(raw.q.length, label).toBeGreaterThan(8);
          if (typeof raw.ans === 'number') {
            expect(Number.isFinite(raw.ans), label).toBe(true);
            // answers must be displayable exactly with at most two decimal places
            expect(Math.abs(raw.ans * 100 - Math.round(raw.ans * 100)) < 1e-6, `${label} -> ${raw.ans}`).toBe(
              true,
            );
          } else {
            expect(raw.extra, label).toBeDefined();
            expect(raw.extra!.includes(raw.ans), label).toBe(true);
            expect(new Set(raw.extra).size, label).toBe(raw.extra!.length);
            // the wrong answers are real ones, not the "(1)" padding strQ adds when it runs out
            expect(
              raw.extra!.filter((o) => /\(\d\)$/.test(o) && o.startsWith(String(raw.ans))).length,
              label,
            ).toBe(0);
          }
        }
      }
    }
  });
});

describe('course questions are relevant, get harder and do not repeat', () => {
  const calc1 = Object.values(COURSES).find((c) => c.name === 'Calculus I')!;
  const capstone = Object.values(COURSES).find((c) => c.name === 'Capstone Project')!;

  it('tag each question with its course, and ask something about that course', () => {
    const rng = mulberry32(5);
    const hist: number[] = [];
    for (let i = 0; i < 20; i++) {
      const q = courseQuestion(calc1.id, 2, rng, hist, new Set());
      expect(q.course).toBe(calc1.id);
      expect(q.opts.length).toBe(4);
      expect(new Set(q.opts).size).toBe(4);
      expect(q.opts[q.ans]).toBeDefined();
    }
  });

  it('make the targeted tier rise with the level', () => {
    const rng = mulberry32(9);
    const avg = (level: number): number => {
      let sum = 0;
      for (let i = 0; i < 400; i++) sum += targetTier(level, rng);
      return sum / 400;
    };
    expect(avg(1)).toBeCloseTo(1, 1);
    expect(avg(2.5)).toBeGreaterThan(2.3);
    expect(avg(2.5)).toBeLessThan(2.7);
    expect(avg(4.4)).toBeCloseTo(4, 1);
  });

  it('get harder as the semester goes on and as the degree goes on', () => {
    const early = atDay(0);
    const late = atDay(6);
    expect(St.courseLevel(late, calc1)).toBeGreaterThan(St.courseLevel(early, calc1) + 1);
    // the first-year course is easier than the final-year capstone at the same point of the semester
    expect(St.courseLevel(early, capstone)).toBeGreaterThan(St.courseLevel(early, calc1));
    // a midterm is harder than a lecture on the same day
    expect(St.courseLevel(early, calc1, 0.5)).toBeGreaterThan(St.courseLevel(early, calc1));
    for (const c of Object.values(COURSES))
      for (const d of [0, 3, 7]) {
        const v = St.courseLevel(atDay(d), c);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(4.4);
      }
  });

  it('drill into harder questions late in the semester than at the start', () => {
    const tiers = (day: number): number => {
      const s = atDay(day);
      const rng = mulberry32(77 + day);
      let sum = 0;
      for (let i = 0; i < 120; i++) {
        const q = courseQuestion(calc1.id, St.courseLevel(s, calc1), rng, [], new Set());
        sum += q.tier ?? 0;
      }
      return sum / 120;
    };
    expect(tiers(7)).toBeGreaterThan(tiers(0) + 0.5);
  });

  it('never repeat a question until the whole pool is used up', () => {
    // a course with no generator, so every question comes from the written bank
    const course = Object.values(COURSES).find((c) => c.name === 'British Literature')!;
    const bank = COURSE_BANKS[course.name];
    const rng = mulberry32(31);
    const hist: number[] = [];
    const asked = new Set<string>();
    // asking "level 2.5" repeatedly: first every question near that level is used, then neighbours, then review
    for (let i = 0; i < bank.length; i++) {
      const q = courseQuestion(course.id, 2.5, rng, hist, new Set());
      expect(asked.has(q.q), `repeated "${q.q}" after ${i} questions`).toBe(false);
      asked.add(q.q);
    }
    expect(hist.length).toBe(bank.length);
    expect(hist.length).toBeLessThanOrEqual(HISTORY_CAP);
  });

  it('remember what was asked across quizzes through the saved history', () => {
    const s = fresh();
    const course = Object.values(COURSES).find((c) => c.name === 'Ethics & Philosophy')!;
    const first: string[] = [];
    const second: string[] = [];
    const rng = mulberry32(3);
    const hist = (s.seenQ[course.id] ??= []);
    for (let i = 0; i < 5; i++) first.push(courseQuestion(course.id, 2, rng, hist, new Set()).q);
    for (let i = 0; i < 5; i++) second.push(courseQuestion(course.id, 2, rng, hist, new Set()).q);
    for (const q of second) expect(first, `repeated ${q}`).not.toContain(q);
    expect(s.seenQ[course.id].length).toBe(10);
    expect(s.seenQ[course.id].includes(hashStr(first[0]))).toBe(true);
  });

  it('survive a save and load', () => {
    const s = fresh();
    s.seenQ.demo = [1, 2, 3];
    const back = St.migrateSave(JSON.parse(JSON.stringify(s)));
    expect(back?.seenQ.demo).toEqual([1, 2, 3]);
  });
});

describe('clubs: one or two per semester, joining is mandatory', () => {
  it('has exactly the five clubs, each with a room, and every student belongs to one', () => {
    expect([...CLUB_IDS].sort()).toEqual(['chess', 'dance', 'debate', 'music', 'sports']);
    expect(Object.keys(CLUBS).sort()).toEqual([...CLUB_IDS].sort());
    expect(CLUB_MAX).toBe(2);
    for (const id of NPC_IDS) expect(CLUB_IDS, id).toContain(NPC_CLUB[id]);
    for (const club of CLUB_IDS)
      expect(NPC_IDS.filter((n) => NPC_CLUB[n] === club).length, club).toBeGreaterThanOrEqual(3);
  });

  it('starts with no club, so registration is required', () => {
    const s = fresh();
    expect(St.members(s)).toEqual([]);
    expect(St.needsClubs(s)).toBe(true);
  });

  it('lets you join one club or two, but never zero, three or the same one twice', () => {
    expect(St.joinClubs(fresh(), [])).toBe(false);
    expect(St.joinClubs(fresh(), ['chess', 'music', 'dance'])).toBe(false);
    expect(St.joinClubs(fresh(), ['chess', 'chess'])).toBe(false);
    expect(St.joinClubs(fresh(), ['karate' as never])).toBe(false);
    const one = fresh();
    expect(St.joinClubs(one, ['debate'])).toBe(true);
    expect(St.members(one)).toEqual(['debate']);
    const two = fresh();
    expect(St.joinClubs(two, ['dance', 'sports'])).toBe(true);
    expect(St.members(two)).toEqual(['dance', 'sports']);
    expect(St.isMember(two, 'sports')).toBe(true);
    expect(St.isMember(two, 'chess')).toBe(false);
    expect(St.needsClubs(two)).toBe(false);
  });

  it('does not let you change clubs in the middle of a semester', () => {
    const s = fresh();
    expect(St.joinClubs(s, ['chess'])).toBe(true);
    expect(St.joinClubs(s, ['music', 'dance'])).toBe(false);
    expect(St.members(s)).toEqual(['chess']);
  });

  it('asks you to register again every semester, with a fresh choice', () => {
    const s = fresh();
    St.joinClubs(s, ['chess', 'music']);
    s.day = 8; // first day of semester 2
    expect(St.term(s)).toBe(1);
    expect(St.needsClubs(s)).toBe(true);
    expect(St.joinClubs(s, ['sports'])).toBe(true);
    s.day = 0;
    expect(St.members(s)).toEqual(['chess', 'music']);
    expect(s.memberships.length).toBe(TERMS);
  });

  it('counts sessions and flags clubs you joined but never attended', () => {
    const s = fresh();
    St.joinClubs(s, ['chess', 'dance']);
    expect(St.skippedClubs(s)).toEqual(['chess', 'dance']);
    expect(St.addSession(s, 'chess')).toBe(1);
    expect(St.addSession(s, 'chess')).toBe(2);
    expect(St.sessionsOf(s, 'chess')).toBe(2);
    expect(St.skippedClubs(s)).toEqual(['dance']);
    St.addSession(s, 'dance');
    expect(St.skippedClubs(s)).toEqual([]);
  });

  it('starts every club at level 1 and drops the old science club from old saves', () => {
    const s = fresh();
    for (const id of CLUB_IDS) expect(St.clubLevel(s.clubs[id].xp)).toBe(1);
    const old = JSON.parse(JSON.stringify(s));
    old.clubs = { sports: { xp: 120, best: 3 }, music: { xp: 0, best: 0 }, science: { xp: 90, best: 2 } };
    delete old.memberships;
    delete old.sessions;
    delete old.seenQ;
    old.showcase = [
      { term: 0, club: 'science', place: 'S' },
      { term: 1, club: 'sports', place: 'A' },
    ];
    const back = St.migrateSave(old)!;
    expect(Object.keys(back.clubs).sort()).toEqual([...CLUB_IDS].sort());
    expect(back.clubs.sports.xp).toBe(120);
    expect(back.showcase).toEqual([{ term: 1, club: 'sports', place: 'A' }]);
    expect(back.memberships.length).toBe(TERMS);
    expect(St.needsClubs(back)).toBe(true);
    expect(back.sessions.length).toBe(TERMS);
    expect(back.seenQ).toEqual({});
  });
});

describe('club activities', () => {
  it('has a bank of verified chess puzzles in every difficulty tier', () => {
    expect(PUZZLES.length).toBeGreaterThanOrEqual(40);
    for (const tier of [1, 2, 3, 4])
      expect(PUZZLES.filter((p) => p.tier === tier).length, `tier ${tier}`).toBeGreaterThanOrEqual(5);
    const ids = new Set(PUZZLES.map((p) => p.id));
    expect(ids.size).toBe(PUZZLES.length);
    for (const p of PUZZLES) {
      expect(p.first.length, p.id).toBeGreaterThan(0);
      for (const m of p.first) expect(m, p.id).toMatch(/^[a-h][1-8][a-h][1-8]$/);
      if (p.moves === 2) {
        for (const m of p.first) {
          const line = p.line?.[m];
          expect(line, `${p.id} ${m}`).toBeDefined();
          expect(line!.reply, p.id).toMatch(/^[a-h][1-8][a-h][1-8]$/);
          expect(line!.mate.length, p.id).toBeGreaterThan(0);
        }
      }
    }
  });

  it('picks puzzles at the planned difficulty and avoids repeats between sessions', () => {
    const rng = mulberry32(2);
    const history: number[] = [];
    const seenIds = new Set<string>();
    for (let session = 0; session < 5; session++) {
      const picked = choosePuzzles([1, 2, 2, 3, 3, 4], rng, history);
      expect(picked.length).toBe(6);
      expect(new Set(picked.map((p) => p.id)).size, 'duplicate inside a session').toBe(6);
      for (const p of picked) {
        history.push(hashStr(p.id));
        expect(seenIds.has(p.id), `${p.id} repeated in session ${session}`).toBe(false);
        seenIds.add(p.id);
      }
      expect(picked.map((p) => p.tier)).toEqual([1, 2, 2, 3, 3, 4]);
    }
  });

  it('has debate arguments in all four tiers, each naming a real fallacy', () => {
    for (const tier of [1, 2, 3, 4])
      expect(ARGUMENTS.filter((a) => a.tier === tier).length, `tier ${tier}`).toBeGreaterThanOrEqual(8);
    for (const a of ARGUMENTS) {
      expect(FALLACIES[a.flaw], a.line).toBeDefined();
      expect(a.line.length).toBeGreaterThan(20);
    }
    expect(new Set(ARGUMENTS.map((a) => a.line)).size).toBe(ARGUMENTS.length);
  });

  it('serves debate arguments of rising subtlety without repeating them between rounds', () => {
    const rng = mulberry32(8);
    const history: number[] = [];
    const seen = new Set<string>();
    for (let session = 0; session < 4; session++) {
      const picked = chooseArguments([1, 1, 2, 2, 3, 3, 4, 4], rng, history);
      expect(picked.length).toBe(8);
      expect(picked.map((a) => a.tier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
      for (const a of picked) {
        history.push(hashStr(a.line));
        expect(seen.has(a.line), a.line).toBe(false);
        seen.add(a.line);
      }
    }
  });
});

describe('the curriculum still lines up with the question system', () => {
  it('every course in every semester can supply a question at every level of its semester', () => {
    for (let sem = 0; sem < TERMS; sem++) {
      for (const id of CURRICULUM[sem]) {
        for (const level of [1, 2.2, 3.4, 4.4]) {
          const q = courseQuestion(id, level, mulberry32(sem * 97 + level * 13), [], new Set());
          expect(q.course).toBe(id);
          expect(q.subject).toBe(COURSES[id].area);
        }
      }
    }
  });
});
