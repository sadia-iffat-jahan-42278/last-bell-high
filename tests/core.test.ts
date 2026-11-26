import { describe, expect, it } from 'vitest';
import {
  COURSES,
  CURRICULUM,
  DAYS_PER_TERM,
  DEPARTMENTS,
  EXAM_HALL,
  GRADES,
  LECTURE_DAYS,
  LECTURE_PERIODS,
  MIDTERM_DAY,
  MIDTERM_PERIOD,
  NPCS,
  QUESTS,
  SUBJECT_IDS,
  TERMS,
  TOTAL_COURSES,
  courseInRoom,
  finalPhases,
  gradeOf,
  roomCode,
  semesterTimetable,
} from '../src/core/data';
import { makeQuestion } from '../src/core/questions';
import * as St from '../src/core/state';
import { DEPT_IDS, MAJOR_IDS, type GameState } from '../src/core/types';
import { mulberry32 } from '../src/core/util';

const fresh = (): GameState => St.newState('Tester', St.defaultLook());
const atDay = (day: number, period = 0): GameState => Object.assign(fresh(), { day, period });

describe('question generation', () => {
  it('always produces a well-formed question (all subjects, all tiers, many seeds)', () => {
    for (const subject of SUBJECT_IDS) {
      for (let tier = 1; tier <= 4; tier++) {
        for (let seed = 1; seed <= 300; seed++) {
          const rng = mulberry32(seed * 7919 + tier);
          const q = makeQuestion(subject, tier, rng, new Set());
          expect(q.opts.length, `${subject} t${tier} seed${seed}: ${q.q}`).toBe(4);
          expect(new Set(q.opts).size, `duplicate options: ${q.q} ${q.opts}`).toBe(4);
          expect(q.ans).toBeGreaterThanOrEqual(0);
          expect(q.ans).toBeLessThan(4);
          expect(q.subject).toBe(subject);
        }
      }
    }
  });

  it('is deterministic for a given seed', () => {
    const a = makeQuestion('math', 3, mulberry32(42), new Set());
    const b = makeQuestion('math', 3, mulberry32(42), new Set());
    expect(a).toEqual(b);
  });

  it('does not repeat a prompt within one quiz until the pool is exhausted', () => {
    const rng = mulberry32(5);
    const used = new Set<string>();
    const seen = new Set<string>();
    for (let i = 0; i < 6; i++) seen.add(makeQuestion('phy', 1, rng, used).q);
    expect(seen.size).toBe(6);
  });
});

describe('calendar', () => {
  it('has 4 years of 2 semesters and splits days into semesters with finals / midterm / showcase days', () => {
    expect(TERMS).toBe(8);
    expect(St.TOTAL_DAYS).toBe(TERMS * DAYS_PER_TERM);
    expect(St.TOTAL_DAYS).toBe(64);
    expect(St.term(atDay(0))).toBe(0);
    expect(St.term(atDay(8))).toBe(1);
    expect(St.term(atDay(63))).toBe(7);
    expect(St.yearOf(atDay(0))).toBe(1);
    expect(St.yearOf(atDay(15))).toBe(1);
    expect(St.yearOf(atDay(16))).toBe(2);
    expect(St.yearOf(atDay(63))).toBe(4);
    expect(St.isFinals(atDay(7))).toBe(true);
    expect(St.isFinals(atDay(6))).toBe(false);
    expect(St.isFinals(atDay(15))).toBe(true);
    expect(St.isTestDay(atDay(2))).toBe(true);
    expect(St.isShowcase(atDay(4))).toBe(true);
  });

  it('maps the six periods to kinds', () => {
    expect(St.periodKind(atDay(0, 0))).toBe('class');
    expect(St.periodKind(atDay(0, 1))).toBe('class');
    expect(St.periodKind(atDay(0, 2))).toBe('lunch');
    expect(St.periodKind(atDay(0, 3))).toBe('class');
    expect(St.periodKind(atDay(0, 4))).toBe('after');
    expect(St.periodKind(atDay(4, 4))).toBe('showcase');
    expect(St.periodKind(atDay(0, 5))).toBe('evening');
    expect(St.periodKind(atDay(2, MIDTERM_PERIOD))).toBe('test');
    expect(St.periodKind(atDay(7, 0))).toBe('final');
    expect(St.periodKind(atDay(7, 1))).toBe('final');
    expect(St.periodKind(atDay(7, 3))).toBe('free');
    const s = atDay(0, 1);
    s.cancelled[1] = true;
    expect(St.periodKind(s)).toBe('free');
  });

  it('reports the lecture course and its area, and undefined outside lectures', () => {
    const s = atDay(0, 0);
    const id = St.classCourse(s)!;
    expect(CURRICULUM.cse[0]).toContain(id);
    expect(St.classSubject(s)).toBe(COURSES[id].area);
    const mid = atDay(MIDTERM_DAY, MIDTERM_PERIOD);
    expect(St.classCourse(mid)).toBe(St.testCourse(mid));
    expect(St.classCourse(atDay(7, 0))).toBeUndefined();
    expect(St.classCourse(atDay(0, 2))).toBeUndefined();
    expect(St.classSubject(atDay(0, 4))).toBeUndefined();
  });
});

describe('departments and curricula', () => {
  it('has six departments, five of which students can join', () => {
    expect([...DEPT_IDS]).toEqual(['cse', 'eee', 'math', 'phy', 'chem', 'hum']);
    expect([...MAJOR_IDS]).toEqual(['cse', 'eee', 'math', 'phy', 'chem']);
    expect(DEPT_IDS.map((d) => DEPARTMENTS[d].hall)).toEqual([
      'CSE Hall',
      'EEE Hall',
      'Math Hall',
      'Physics Hall',
      'Chemistry Hall',
      'Humanities Hall',
    ]);
  });

  it('gives each major eight courses in each of the eight semesters, with none taken twice', () => {
    for (const major of MAJOR_IDS) {
      expect(CURRICULUM[major]).toHaveLength(TERMS);
      for (const [sem, ids] of CURRICULUM[major].entries()) {
        expect(ids.length, `${major} semester ${sem + 1}`).toBe(8);
        for (const id of ids) {
          expect(COURSES[id].sem).toBe(sem);
          expect(COURSES[id].year).toBe(Math.floor(sem / 2) + 1);
          expect(COURSES[id].majors).toContain(major);
          expect(COURSES[id].tier).toBeGreaterThanOrEqual(1);
          expect(COURSES[id].tier).toBeLessThanOrEqual(4);
        }
      }
      const all = CURRICULUM[major].flat();
      expect(new Set(all).size, major).toBe(all.length);
    }
  });

  it('gives different departments different curricula', () => {
    for (const a of MAJOR_IDS)
      for (const b of MAJOR_IDS) {
        if (a >= b) continue;
        const mine = new Set(CURRICULUM[a].flat());
        const shared = CURRICULUM[b].flat().filter((id) => mine.has(id)).length;
        // maths, basic science and humanities are shared; at least 22 of the 64 courses must differ
        expect(shared, `${a} and ${b} share ${shared} courses`).toBeLessThanOrEqual(42);
        for (let sem = 0; sem < TERMS; sem++)
          expect([...CURRICULUM[a][sem]].sort(), `${a}/${b} semester ${sem + 1}`).not.toEqual(
            [...CURRICULUM[b][sem]].sort(),
          );
      }
  });

  it('makes every student attend other departments, and Humanities teach everyone', () => {
    for (const major of MAJOR_IDS) {
      const courses = CURRICULUM[major].flat().map((id) => COURSES[id]);
      const own = courses.filter((c) => c.area === major);
      expect(own.length, `${major} own courses`).toBeGreaterThanOrEqual(18);
      expect(new Set(courses.map((c) => c.area)).size, `${major} departments`).toBeGreaterThanOrEqual(5);
      expect(courses.filter((c) => c.area === 'hum').length, `${major} humanities`).toBeGreaterThanOrEqual(8);
      // every course of a department's final-year project belongs to it
      for (const c of courses.filter((x) => / Thesis /.test(x.name))) expect(c.area).toBe(major);
    }
  });

  it('has no course that nobody takes', () => {
    for (const c of Object.values(COURSES)) expect(c.majors.length, c.name).toBeGreaterThan(0);
    expect(TOTAL_COURSES).toBe(new Set(MAJOR_IDS.flatMap((m) => CURRICULUM[m].flat())).size);
  });

  it('gives every course a unique id, name and code, and a professor of its own department', () => {
    const list = Object.values(COURSES);
    for (const key of ['id', 'name', 'code'] as const)
      expect(new Set(list.map((c) => c[key])).size, key).toBe(list.length);
    for (const c of list) {
      expect(c.prof.startsWith('Prof.'), c.id).toBe(true);
      expect(c.code.startsWith(DEPARTMENTS[c.area].code + ' '), c.code).toBe(true);
    }
  });

  it('meets every course at least twice, never twice in one day, with a midterm and finals', () => {
    for (const major of MAJOR_IDS)
      for (let sem = 0; sem < TERMS; sem++) {
        const t = semesterTimetable(major, sem);
        expect(t).toHaveLength(LECTURE_DAYS + 1);
        const meets: Record<string, number> = {};
        for (let d = 0; d < LECTURE_DAYS; d++) {
          const today: string[] = [];
          for (const p of LECTURE_PERIODS) {
            const e = t[d][p];
            expect(e, `${major} sem ${sem} day ${d} period ${p}`).not.toBeNull();
            if (e === 'TEST') {
              expect(d).toBe(MIDTERM_DAY);
              expect(p).toBe(MIDTERM_PERIOD);
            } else {
              expect(CURRICULUM[major][sem]).toContain(e);
              today.push(e as string);
              meets[e as string] = (meets[e as string] ?? 0) + 1;
            }
          }
          expect(new Set(today).size, `${major} sem ${sem} day ${d}`).toBe(today.length);
          expect(t[d][2]).toBeNull(); // lunch
        }
        for (const id of CURRICULUM[major][sem])
          expect(meets[id], `${id} for ${major}`).toBeGreaterThanOrEqual(2);
        expect(t[LECTURE_DAYS][0]).toBe('FINAL');
        expect(t[LECTURE_DAYS][1]).toBe('FINAL');
      }
  });

  it('is deterministic and the finals boss tests up to four of the semester’s departments', () => {
    expect(semesterTimetable('eee', 3)).toEqual(semesterTimetable('eee', 3));
    for (const major of MAJOR_IDS)
      for (let sem = 0; sem < TERMS; sem++) {
        const phases = finalPhases(major, sem);
        expect(phases.length).toBeGreaterThanOrEqual(2);
        expect(phases.length).toBeLessThanOrEqual(4);
        for (const a of phases)
          expect(CURRICULUM[major][sem].some((id) => COURSES[id].area === a)).toBe(true);
      }
  });

  it('follows the player’s own department', () => {
    const s = St.newState('Tester', St.defaultLook(), St.defaultMeta(), 'male', 'chem');
    expect(St.courses(s)).toEqual(CURRICULUM.chem[0]);
    expect(CURRICULUM.chem[0]).toContain(St.classCourse(s));
    expect(St.courses(s)).not.toEqual(CURRICULUM.cse[0]);
  });
});

describe('friends from every year', () => {
  it('has 16 students, four in each academic year', () => {
    const ids = Object.keys(NPCS);
    expect(ids).toHaveLength(16);
    for (const y of [1, 2, 3, 4]) expect(Object.values(NPCS).filter((n) => n.year === y)).toHaveLength(4);
    for (const n of Object.values(NPCS)) {
      expect(n.beats, n.name).toHaveLength(3);
      expect(n.talk.length, n.name).toBeGreaterThanOrEqual(3);
      expect(n.perks.length, n.name).toBeGreaterThanOrEqual(2);
    }
  });

  it('describes each student as above, level with, or below the player as the years go by', () => {
    const s = fresh();
    expect(St.relationTo(s, 'maya')).toBe('peer'); // freshman
    expect(St.relationTo(s, 'kai')).toBe('senior'); // sophomore, above a freshman
    expect(St.relationTo(s, 'rin')).toBe('senior');
    s.day = 3 * 16; // senior year
    expect(St.yearOf(s)).toBe(4);
    expect(St.relationTo(s, 'rin')).toBe('peer');
    expect(St.relationTo(s, 'maya')).toBe('junior'); // a freshman is below a senior
    expect(St.relationTo(s, 'zoe')).toBe('junior');
  });

  it('only shows some friends on campus at a time, deterministically', () => {
    const s = atDay(5, 2);
    const here = (Object.keys(NPCS) as (keyof typeof NPCS)[]).filter((id) => St.npcPresent(s, id));
    expect(here.length).toBeGreaterThan(0);
    expect(here.length).toBeLessThan(16);
    expect(here).toEqual((Object.keys(NPCS) as (keyof typeof NPCS)[]).filter((id) => St.npcPresent(s, id)));
  });

  it('stacks friend perks only once their story is unlocked', () => {
    const s = fresh();
    expect(St.friendBonus(s, 'xpPct')).toBe(0);
    s.friends.lina.story = 2;
    expect(St.friendBonus(s, 'xpPct')).toBeCloseTo(0.05);
    s.friends.yuki.story = 3;
    expect(St.friendBonus(s, 'xpPct')).toBeCloseTo(0.1);
    expect(St.friendBonus(s, 'timePlus')).toBeCloseTo(1);
    s.friends.sam.story = 2;
    expect(St.shopPrice(s, 100)).toBeLessThan(99);
  });
});

describe('effects and economy', () => {
  it('clamps energy and stress to 0..100', () => {
    const s = fresh();
    St.addEnergy(s, 500);
    expect(s.energy).toBe(100);
    St.addEnergy(s, -500);
    expect(s.energy).toBe(0);
    St.addStress(s, 500);
    expect(s.stress).toBe(100);
  });

  it('Calm perk reduces stress gains but not relief', () => {
    const s = fresh();
    s.perks.push('calm');
    s.stress = 0;
    St.addStress(s, 10);
    expect(s.stress).toBeCloseTo(6);
    St.addStress(s, -3);
    expect(s.stress).toBeCloseTo(3);
  });

  it('levels up and queues one perk pick per level', () => {
    const s = fresh();
    const r = St.addXP(s, 10_000);
    expect(r.up).toBe(s.level - 1);
    expect(s.pendingPerks).toBe(r.up);
    expect(s.xp).toBeLessThan(70 + s.level * 45);
  });

  it('never lets coins go negative', () => {
    const s = fresh();
    St.addCoins(s, -9999);
    expect(s.coins).toBe(0);
  });

  it('shop prices respect the coupon perk and charisma discount', () => {
    const s = fresh();
    expect(St.shopPrice(s, 100)).toBe(99);
    s.perks.push('coupon');
    expect(St.shopPrice(s, 100)).toBeLessThan(99);
    expect(St.shopPrice(s, 1)).toBeGreaterThanOrEqual(1);
  });

  it('energy cost never drops below 1', () => {
    const s = fresh();
    s.stats.sta = 30;
    s.perks.push('iron');
    s.friends.kai.story = 3;
    expect(St.energyCost(s, 1)).toBe(1);
  });

  it('stat gains report when a whole level is crossed', () => {
    const s = fresh();
    expect(St.gainStat(s, 'int', 0.5)).toBe(false);
    expect(St.gainStat(s, 'int', 0.6)).toBe(true);
    s.stats.int = 29.9;
    St.gainStat(s, 'int', 5);
    expect(s.stats.int).toBe(30);
  });
});

describe('grades and rank', () => {
  it('maps percentages to letters at the boundaries', () => {
    expect(gradeOf(1).letter).toBe('S');
    expect(gradeOf(0.95).letter).toBe('S');
    expect(gradeOf(0.949).letter).toBe('A');
    expect(gradeOf(0.7).letter).toBe('B');
    expect(gradeOf(0).letter).toBe('F');
    expect(GRADES.map((g) => g.min)).toEqual([...GRADES.map((g) => g.min)].sort((a, b) => b - a));
  });

  it('weights lecture 30 / midterm 30 / final 40 and renormalises missing parts', () => {
    const s = fresh();
    const [a, b] = CURRICULUM.cse[0];
    St.recordScore(s, 'class', a, 1);
    expect(St.courseScore(s, 0, a)).toBeCloseTo(100);
    St.recordScore(s, 'test', a, 0);
    expect(St.courseScore(s, 0, a)).toBeCloseTo(50);
    St.recordScore(s, 'final', a, 1);
    expect(St.courseScore(s, 0, a)).toBeCloseTo(70);
    expect(St.courseScore(s, 0, b)).toBeNull();
  });

  it('has no rank until something is graded, then ranks against 40 classmates', () => {
    const s = fresh();
    expect(St.rankOf(s, 0)).toBeNull();
    for (const id of CURRICULUM.cse[0]) St.recordScore(s, 'class', id, 1);
    const top = St.rankOf(s, 0);
    expect(top).not.toBeNull();
    expect(top!.total).toBe(41);
    expect(top!.rank).toBe(1);
    const s2 = fresh();
    for (const id of CURRICULUM.cse[0]) St.recordScore(s2, 'class', id, 0);
    expect(St.rankOf(s2, 0)!.rank).toBe(41);
  });

  it('maps scores to a 4.0 GPA', () => {
    expect(St.gpaOf(100)).toBe(4);
    expect(St.gpaOf(60)).toBeCloseTo(2);
    expect(St.gpaOf(0)).toBe(0);
    expect(St.gpaOf(80)).toBeGreaterThan(St.gpaOf(70));
  });

  it('ranks the overall result across all eight semesters', () => {
    const s = fresh();
    for (let t = 0; t < TERMS; t++) {
      s.day = t * DAYS_PER_TERM;
      for (const id of CURRICULUM.cse[t]) St.recordScore(s, 'final', id, 1);
    }
    const o = St.overallRank(s);
    expect(o).not.toBeNull();
    expect(o!.rank).toBe(1);
  });

  it('classmate scores are stable between calls', () => {
    const c = St.classmates()[0];
    expect(St.npcTerm(c, 1)).toBe(St.npcTerm(c, 1));
  });
});

describe('quests, events, weather', () => {
  it('rolls 3 distinct quests deterministically per day and name', () => {
    const a = atDay(3);
    const b = atDay(3);
    St.rollQuests(a);
    St.rollQuests(b);
    expect(a.quests).toEqual(b.quests);
    expect(new Set(a.quests.map((q) => q.id)).size).toBe(3);
    expect(a.quests.every((q) => QUESTS.some((d) => d.id === q.id))).toBe(true);
  });

  it('tracks quest progress and reports completion once', () => {
    const s = fresh();
    s.quests = [{ id: 'talk', need: 2, prog: 0, done: false }];
    expect(St.track(s, 'talk')).toHaveLength(0);
    expect(St.track(s, 'talk')).toHaveLength(1);
    expect(St.track(s, 'talk')).toHaveLength(0);
    expect(s.quests[0].prog).toBe(2);
  });

  it('never schedules events on day 1 and respects finals/test-day restrictions', () => {
    expect(St.pickEvent(atDay(0), () => 0)).toBeNull();
    for (let seed = 0; seed < 200; seed++) {
      const fin = St.pickEvent(atDay(7), mulberry32(seed));
      if (fin) {
        expect(fin.period).toBeGreaterThanOrEqual(2);
        expect(['popquiz', 'guest', 'fire', 'blackout']).not.toContain(fin.id);
      }
      const td = St.pickEvent(atDay(2), mulberry32(seed));
      if (td) expect(['guest', 'fire', 'blackout']).not.toContain(td.id);
    }
  });

  it('weather is deterministic per day', () => {
    expect(St.rollWeather(atDay(7))).toBe(St.rollWeather(atDay(7)));
    const kinds = new Set(Array.from({ length: 60 }, (_, d) => St.rollWeather(atDay(d))));
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('awards each achievement only once', () => {
    const s = fresh();
    s.totals.aCount = 1;
    expect(St.checkAchievements(s).map((a) => a.id)).toContain('firstA');
    expect(St.checkAchievements(s)).toHaveLength(0);
  });
});

describe('settings', () => {
  it('starts new players on High graphics quality', () => {
    expect(St.defaultMeta().settings.quality).toBe(1.2);
  });

  it('moves the old default quality to High but keeps a player’s own choice', () => {
    const saved = (quality: number) =>
      St.migrateMeta({ settings: { music: 0.2, sfx: 0.3, quality } }).settings;
    expect(saved(1)).toEqual({ music: 0.2, sfx: 0.3, quality: 1.2 });
    for (const quality of [0.6, 0.85, 1.2]) expect(saved(quality).quality).toBe(quality);
  });

  it('fills in missing fields', () => {
    expect(St.migrateMeta({ ngPlus: 2 })).toEqual({ ...St.defaultMeta(), ngPlus: 2 });
  });
});

describe('saves', () => {
  it('rejects junk and wrong versions', () => {
    expect(St.migrateSave(null)).toBeNull();
    expect(St.migrateSave('hi')).toBeNull();
    expect(St.migrateSave({ v: 3 })).toBeNull();
    expect(St.migrateSave({ v: 1 })).toBeNull(); // old high-school saves are not usable
    expect(St.migrateSave({ ...fresh(), v: 2 })).toBeNull(); // saves from the old set of courses
  });

  it('starts with mastery for every subject area and 16 friends', () => {
    const s = fresh();
    expect(Object.keys(s.mastery).sort()).toEqual([...SUBJECT_IDS].sort());
    expect(Object.keys(s.friends)).toHaveLength(16);
    expect(s.v).toBe(3);
  });

  it('round-trips a full save unchanged', () => {
    const s = fresh();
    s.day = 9;
    s.coins = 123;
    const back = St.migrateSave(JSON.parse(JSON.stringify(s)));
    expect(back).toEqual(s);
  });

  it('fills in fields that older saves lack', () => {
    const s = JSON.parse(JSON.stringify(fresh()));
    delete s.totals.bosses;
    delete s.revealedStar;
    delete s.friends.rin;
    s.friends = { maya: s.friends.maya };
    const back = St.migrateSave(s)!;
    expect(back.totals.bosses).toBe(0);
    expect(back.revealedStar).toBe(-1);
    expect(back.friends.maya).toBeDefined();
    expect(Object.keys(back.friends).sort()).toEqual(Object.keys(NPCS).sort());
  });
});

describe('department halls', () => {
  const courses = Object.values(COURSES);

  it('holds every course in the hall of the department that teaches it', () => {
    for (const c of courses) expect(c.building, c.name).toBe(c.area);
    expect(new Set(courses.map((c) => c.building)).size).toBe(DEPT_IDS.length);
  });

  it('gives each course a classroom that no other course of its semester uses', () => {
    const seen = new Set<string>();
    for (const c of courses) {
      expect(c.floor, c.name).toBeGreaterThanOrEqual(1);
      expect(c.floor, c.name).toBeLessThanOrEqual(5);
      expect(c.slot, c.name).toBeGreaterThanOrEqual(0);
      expect(c.slot, c.name).toBeLessThanOrEqual(4); // slot 5 is the staff room (the exam hall in Humanities)
      const key = `${c.sem}/${c.building}/${c.floor}/${c.slot}`;
      expect(seen.has(key), `${c.name} shares a room (${key})`).toBe(false);
      seen.add(key);
      expect(c.room).toBe(roomCode(c.building, c.floor, c.slot));
      expect(c.room, c.name).toMatch(/^[A-Z]{3,4}-\d{3}$/);
    }
  });

  it('puts lower-year courses on lower floors', () => {
    for (const d of DEPT_IDS) {
      const list = courses.filter((c) => c.building === d);
      for (const a of list)
        for (const b of list)
          if (a.year < b.year) expect(a.floor, `${a.name} / ${b.name}`).toBeLessThanOrEqual(b.floor);
    }
  });

  it('shows the player their own course in a shared room, and keeps the exam hall free', () => {
    for (const major of MAJOR_IDS)
      for (const id of CURRICULUM[major].flat()) {
        const c = COURSES[id];
        expect(courseInRoom(c.building, c.floor, c.slot, major, c.sem)?.id).toBe(id);
      }
    for (const major of MAJOR_IDS)
      for (let sem = 0; sem < TERMS; sem++)
        expect(courseInRoom('hum', EXAM_HALL.floor, EXAM_HALL.slot, major, sem)).toBeNull();
    expect(EXAM_HALL.building).toBe('hum');
    expect(EXAM_HALL.floor).toBe(1);
  });
});
