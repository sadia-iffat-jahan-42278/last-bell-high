import { describe, expect, it } from 'vitest';
import { GRADES, SUBJECT_IDS, TERMS, DAYS_PER_TERM, gradeOf, QUESTS, NPCS, BANK } from '../src/core/data';
import { makeQuestion } from '../src/core/questions';
import * as St from '../src/core/state';
import type { GameState } from '../src/core/types';
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
    for (let i = 0; i < 6; i++) seen.add(makeQuestion('science', 1, rng, used).q);
    expect(seen.size).toBe(6);
  });

  it('every bank question has the right answer outside its wrong list', () => {
    for (const pool of Object.values(BANK)) {
      for (const it of pool) {
        expect(it.w.includes(it.a), it.q).toBe(false);
        expect(it.w.length, it.q).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('calendar', () => {
  it('splits days into terms and flags finals / test / showcase days', () => {
    expect(St.TOTAL_DAYS).toBe(TERMS * DAYS_PER_TERM);
    expect(St.term(atDay(0))).toBe(0);
    expect(St.term(atDay(6))).toBe(1);
    expect(St.term(atDay(17))).toBe(2);
    expect(St.isFinals(atDay(5))).toBe(true);
    expect(St.isFinals(atDay(4))).toBe(false);
    expect(St.isTestDay(atDay(2))).toBe(true);
    expect(St.isShowcase(atDay(4))).toBe(true);
  });

  it('maps periods to kinds', () => {
    expect(St.periodKind(atDay(0, 0))).toBe('class');
    expect(St.periodKind(atDay(0, 2))).toBe('lunch');
    expect(St.periodKind(atDay(0, 3))).toBe('after');
    expect(St.periodKind(atDay(4, 3))).toBe('showcase');
    expect(St.periodKind(atDay(0, 4))).toBe('evening');
    expect(St.periodKind(atDay(2, 1))).toBe('test');
    expect(St.periodKind(atDay(5, 0))).toBe('final');
    const s = atDay(0, 1);
    s.cancelled[1] = true;
    expect(St.periodKind(s)).toBe('free');
  });

  it('reports the lesson subject, and undefined outside lessons', () => {
    expect(St.classSubject(atDay(0, 0))).toBe('math');
    expect(St.classSubject(atDay(2, 1))).toBe(St.testSubject(atDay(2, 1)));
    expect(St.classSubject(atDay(5, 0))).toBeUndefined();
    expect(St.classSubject(atDay(0, 2))).toBeUndefined();
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

  it('weights class 30 / test 30 / final 40 and renormalises missing parts', () => {
    const s = fresh();
    St.recordScore(s, 'class', 'math', 1);
    expect(St.subjectScore(s, 0, 'math')).toBeCloseTo(100);
    St.recordScore(s, 'test', 'math', 0);
    expect(St.subjectScore(s, 0, 'math')).toBeCloseTo(50);
    St.recordScore(s, 'final', 'math', 1);
    expect(St.subjectScore(s, 0, 'math')).toBeCloseTo(70);
    expect(St.subjectScore(s, 0, 'science')).toBeNull();
  });

  it('has no rank until something is graded, then ranks against 24 classmates', () => {
    const s = fresh();
    expect(St.rankOf(s, 0)).toBeNull();
    for (const subj of SUBJECT_IDS) St.recordScore(s, 'class', subj, 1);
    const top = St.rankOf(s, 0);
    expect(top).not.toBeNull();
    expect(top!.total).toBe(25);
    expect(top!.rank).toBe(1);
    const s2 = fresh();
    for (const subj of SUBJECT_IDS) St.recordScore(s2, 'class', subj, 0);
    expect(St.rankOf(s2, 0)!.rank).toBe(25);
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
      const fin = St.pickEvent(atDay(5), mulberry32(seed));
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

describe('saves', () => {
  it('rejects junk and wrong versions', () => {
    expect(St.migrateSave(null)).toBeNull();
    expect(St.migrateSave('hi')).toBeNull();
    expect(St.migrateSave({ v: 2 })).toBeNull();
    expect(St.migrateSave({ v: 1 })).toBeNull();
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
