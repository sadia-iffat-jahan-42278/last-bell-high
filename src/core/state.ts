// Pure game state + rules (no DOM / WebGL). Everything here is unit-testable in Node.
import {
  ACHIEVEMENTS,
  AFTER_PERIOD,
  CLUB_MAX,
  COURSES,
  CURRICULUM,
  DAYS_PER_TERM,
  EVENING_PERIOD,
  EVENT_POOL,
  LUNCH_PERIOD,
  NPCS,
  PERKS,
  QUESTS,
  SUBJECT_IDS,
  TERMS,
  finalPhases,
  gradeOf,
  midtermCourse,
  semesterTimetable,
  xpForLevel,
  yearOfTerm,
  type Course,
  type TimetableEntry,
} from './data';
import type {
  AchievementId,
  ActiveEvent,
  Bond,
  BonusKey,
  ClubId,
  CourseId,
  Daily,
  Gender,
  MajorId,
  GameState,
  Look,
  Meta,
  NpcId,
  PeriodKind,
  PerkId,
  PersonId,
  QuestId,
  RecordKind,
  Relation,
  StatId,
  SubjectId,
  Weather,
} from './types';
import {
  PEOPLE,
  PERSONALITY_AT,
  RELATION_CHANGE,
  STUDENTS,
  moodFor,
  type Mood,
  type ReplyTone,
} from './people';
import { CLUB_IDS, MAJOR_IDS } from './types';
import { clamp, hashStr, mulberry32, type Rng } from './util';

export const SAVE_KEY = 'lastbell.save.v3';
export const META_KEY = 'lastbell.meta.v1';
export const TOTAL_DAYS = TERMS * DAYS_PER_TERM;
/** The student's name when neither the player nor their gender chooses one. */
export const DEFAULT_NAME = 'Sophie';

export function defaultLook(): Look {
  return {
    skin: 0xedbd96,
    hairStyle: 'short',
    hair: 0x2a2020,
    blazer: 0x2f4a8a,
    bag: 0xd94a3a,
    acc: 'none',
    pants: 0x3a3d4a,
    tie: 0xc23b3b,
  };
}

export function defaultMeta(): Meta {
  return {
    settings: { music: 0.5, sfx: 0.8, quality: 1.2 },
    ngPlus: 0,
    endings: [],
    bestRank: 99,
    unlockedAcc: [],
    seenHelp: false,
  };
}

export const freshDaily = (): Daily => ({
  xp: 0,
  coins: 0,
  stats: {},
  grades: [],
  rankFrom: null,
  notes: [],
});

/** The genders you can pick, with the name a new student gets if they do not type one. */
export const GENDERS: { id: Gender; name: string; defaultName: string }[] = [
  { id: 'female', name: 'Female', defaultName: DEFAULT_NAME },
  { id: 'male', name: 'Male', defaultName: 'Daniel' },
];
export const defaultName = (gender: Gender): string =>
  GENDERS.find((g) => g.id === gender)?.defaultName ?? DEFAULT_NAME;

export function newState(
  name: string,
  look: Look,
  meta: Meta = defaultMeta(),
  gender: Gender = 'female',
  major: MajorId = 'cse',
): GameState {
  const npcIds = Object.keys(NPCS) as NpcId[];
  const s: GameState = {
    v: 3,
    name: name || defaultName(gender),
    gender,
    major,
    look: { ...look },
    day: 0,
    period: 0,
    coins: 30 + meta.ngPlus * 40,
    energy: 100,
    stress: 8,
    xp: 0,
    level: 1,
    perks: [],
    pendingPerks: 0,
    stats: { int: 1, foc: 1, sta: 1, cha: 1, cre: 1 },
    mastery: Object.fromEntries(SUBJECT_IDS.map((k) => [k, 0])) as GameState['mastery'],
    touched: {},
    records: Array.from({ length: TERMS }, () => ({ class: {}, test: {}, final: {} })),
    clubs: Object.fromEntries(CLUB_IDS.map((k) => [k, { xp: 0, best: 0 }])) as GameState['clubs'],
    memberships: Array.from({ length: TERMS }, () => []),
    sessions: Array.from({ length: TERMS }, () => ({})),
    seenQ: {},
    showcase: [],
    friends: Object.fromEntries(
      npcIds.map((k) => [k, { interaction: 0, rel: 0, story: 0, talked: -1, gift: -1 }]),
    ) as GameState['friends'],
    people: {},
    items: { snack: 2, drink: 1 },
    stars: [],
    cats: [],
    catDay: {},
    unlocks: { hair: [0, 1, 2, 3], blazer: [0, 1, 2, 3], bag: [0, 1, 2, 3], acc: ['none', 'glasses'] },
    quests: [],
    questsDay: -1,
    questStreak: 0,
    flags: {},
    ach: {},
    daily: freshDaily(),
    weather: 'sunny',
    event: null,
    eventDone: false,
    cancelled: {},
    rep: 50,
    cheated: 0,
    caught: 0,
    totals: {
      correct: 0,
      answered: 0,
      maxCombo: 0,
      perfects: 0,
      classes: 0,
      tests: 0,
      aCount: 0,
      perfectTests: 0,
      bosses: 0,
      daysPlayed: 0,
    },
    termReports: [],
    rested: false,
    detention: false,
    canteenSpecial: false,
    clubBoost: false,
    revealedStar: -1,
    profDay: {},
    created: Date.now(),
  };
  if (meta.ngPlus > 0) {
    const ids = Object.keys(PERKS) as PerkId[];
    s.perks.push(ids[Math.floor(Math.random() * ids.length)]);
  }
  for (const a of meta.unlockedAcc) if (!s.unlocks.acc.includes(a)) s.unlocks.acc.push(a);
  return s;
}

/* ---------- calendar helpers ---------- */
export type { TimetableEntry };

/** Semester index 0..7. */
export const term = (s: GameState): number => Math.min(TERMS - 1, Math.floor(s.day / DAYS_PER_TERM));
export const dayInTerm = (s: GameState): number => s.day % DAYS_PER_TERM;
/** Academic year 1 (freshman) .. 4 (senior). */
export const yearOf = (s: GameState): number => yearOfTerm(term(s));
export const isFinals = (s: GameState): boolean => dayInTerm(s) === DAYS_PER_TERM - 1;
export const isTestDay = (s: GameState): boolean => dayInTerm(s) === 2;
export const isShowcase = (s: GameState): boolean => dayInTerm(s) === 4;
/** The courses the player is enrolled in this semester. */
export const courses = (s: GameState): CourseId[] => CURRICULUM[s.major][term(s)];
/** Today's lecture slots indexed by period (null where there is no lecture). */
export const timetable = (s: GameState): TimetableEntry[] =>
  semesterTimetable(s.major, term(s))[dayInTerm(s)];
export const testCourse = (s: GameState): CourseId => midtermCourse(s.major, term(s));
export const testSubject = (s: GameState): SubjectId => COURSES[testCourse(s)].area;
/** Subject areas the finals boss tests this semester. */
export const finalsPhases = (s: GameState): SubjectId[] => finalPhases(s.major, term(s));

export function periodKind(s: GameState): PeriodKind {
  const p = s.period;
  if (p === LUNCH_PERIOD) return 'lunch';
  if (p === AFTER_PERIOD) return isShowcase(s) ? 'showcase' : 'after';
  if (p === EVENING_PERIOD) return 'evening';
  // Lecture periods 0, 1 and 3.
  if (isFinals(s)) return p <= 1 ? 'final' : 'free';
  if (s.cancelled[p]) return 'free';
  if (isTestDay(s) && p === 1) return 'test';
  return 'class';
}

/** The course taught this period (the midterm course on test slots), or `undefined` outside lectures and finals. */
export function classCourse(s: GameState): CourseId | undefined {
  const t = timetable(s)[s.period];
  if (t === 'TEST') return testCourse(s);
  if (!t || t === 'FINAL') return undefined;
  return t;
}
/** The subject area of this period's course, or `undefined` outside lectures. */
export function classSubject(s: GameState): SubjectId | undefined {
  const c = classCourse(s);
  return c ? COURSES[c].area : undefined;
}
export const isFreeKind = (k: PeriodKind): boolean =>
  k === 'lunch' || k === 'after' || k === 'showcase' || k === 'free';

/* ---------- perks / effects ---------- */
export const has = (s: GameState, p: PerkId): boolean => s.perks.includes(p);

/** Sum of a numeric friend perk across every friend whose story has unlocked it. */
export function friendBonus(s: GameState, key: BonusKey): number {
  let total = 0;
  for (const [id, N] of Object.entries(NPCS) as [NpcId, (typeof NPCS)[NpcId]][]) {
    const story = s.friends[id]?.story ?? 0;
    for (const p of N.perks) if (p.bonus && story >= p.need) total += p.bonus[key] ?? 0;
  }
  return total;
}

/** Whether `npc` is older (senior), the same year (peer) or younger (junior) than the player right now. */
export function relationTo(s: GameState, npc: NpcId): Relation {
  const y = NPCS[npc].year;
  const mine = yearOf(s);
  return y > mine ? 'senior' : y < mine ? 'junior' : 'peer';
}

/** Is `npc` hanging out on campus this period? Deterministic per day and period, about 65% of the time. */
export function npcPresent(s: GameState, npc: NpcId, period = s.period): boolean {
  return hashStr(`${npc}|${s.day}|${period}`) % 100 < 65;
}
export const friendHas = (s: GameState, npc: NpcId, need: number): boolean => s.friends[npc].story >= need;
export const stat = (s: GameState, k: StatId): number => Math.floor(s.stats[k] + 1e-6);
export const masteryLevel = (s: GameState, subj: SubjectId): number => Math.floor(s.mastery[subj] / 20);

export function energyCost(s: GameState, base: number): number {
  let m = 1 - Math.min(0.4, stat(s, 'sta') * 0.02);
  if (has(s, 'iron')) m *= 0.75;
  if (friendHas(s, 'kai', 2)) m *= 0.85;
  return Math.max(1, Math.round(base * m));
}

export function timeBonus(s: GameState, subject: SubjectId): number {
  let t = stat(s, 'foc') * 0.35 + s.mastery[subject] / 22 + friendBonus(s, 'timePlus');
  if (has(s, 'speed')) t += 3;
  if (s.rested) t += 2;
  return t;
}

export const fatigueMult = (s: GameState): number => (s.energy < 25 ? 0.78 : 1) * (s.stress > 75 ? 0.88 : 1);
export const hintChance = (s: GameState, subject: SubjectId): number =>
  clamp(
    stat(s, 'int') * 0.015 +
      s.mastery[subject] / 500 +
      (has(s, 'hint') ? 0.25 : 0) +
      friendBonus(s, 'hintPlus'),
    0,
    0.75,
  );
export const comboCap = (s: GameState): number => (has(s, 'combo') ? 2.6 : 2.0);
export const shopPrice = (s: GameState, base: number): number =>
  Math.max(
    1,
    Math.round(
      base *
        (has(s, 'coupon') ? 0.8 : 1) *
        (1 - Math.min(0.2, stat(s, 'cha') * 0.01)) *
        (1 - Math.min(0.25, friendBonus(s, 'shopPct'))),
    ),
  );

export function addEnergy(s: GameState, v: number): number {
  const o = s.energy;
  s.energy = clamp(s.energy + v, 0, 100);
  return s.energy - o;
}
export function addStress(s: GameState, v: number): number {
  if (v > 0 && has(s, 'calm')) v *= 0.6;
  const o = s.stress;
  s.stress = clamp(s.stress + v, 0, 100);
  return s.stress - o;
}
export function addCoins(s: GameState, n: number): number {
  n = Math.round(n > 0 ? n * (1 + friendBonus(s, 'coinPct')) : n);
  s.coins = Math.max(0, s.coins + n);
  s.daily.coins += n;
  return n;
}
export function addXP(s: GameState, n: number): { n: number; up: number } {
  n = Math.round(
    n * (has(s, 'teacher') ? 1.12 : 1) * (1 + friendBonus(s, 'xpPct')) * (s.energy < 25 ? 0.9 : 1),
  );
  s.xp += n;
  s.daily.xp += n;
  let up = 0;
  while (s.xp >= xpForLevel(s.level)) {
    s.xp -= xpForLevel(s.level);
    s.level++;
    s.pendingPerks++;
    up++;
  }
  return { n, up };
}
/** Returns true when the whole-number stat level went up. */
export function gainStat(s: GameState, k: StatId, v: number): boolean {
  const before = Math.floor(s.stats[k] + 1e-6);
  s.stats[k] = Math.min(30, s.stats[k] + v);
  s.daily.stats[k] = (s.daily.stats[k] ?? 0) + v;
  return Math.floor(s.stats[k] + 1e-6) > before;
}
export function addMastery(s: GameState, subj: SubjectId, v: number): number {
  v *= (has(s, 'scholar') ? 1.3 : 1) * (1 + friendBonus(s, 'masteryPct'));
  s.mastery[subj] = clamp(s.mastery[subj] + v, 0, 100);
  s.touched[subj] = true;
  return v;
}
/* ---------- the two scores you have with every person ---------- */
/** Your scores with a person (created on first use for people who are not one of the sixteen friends). */
export function bondOf(s: GameState, id: PersonId): Bond {
  if (Object.prototype.hasOwnProperty.call(s.friends, id)) return s.friends[id as NpcId];
  return (s.people[id] ??= { interaction: 0, rel: 0, talked: -1 });
}
/** Interaction points only ever go up. Returns the points added. */
export function addInteraction(s: GameState, id: PersonId, points: number): number {
  const added = Math.max(0, Math.round(points));
  bondOf(s, id).interaction += added;
  return added;
}
/**
 * Relationship points move both ways, between -100 and +100. Charisma and the Social Butterfly perk make good
 * impressions stronger; they do not soften bad ones. Returns the actual change.
 */
export function addRel(s: GameState, id: PersonId, v: number): number {
  if (v > 0) v *= (1 + stat(s, 'cha') * 0.04) * (has(s, 'social') ? 1.5 : 1);
  const b = bondOf(s, id);
  const o = b.rel;
  b.rel = clamp(b.rel + v, -100, 100);
  return b.rel - o;
}
/** A person's personality stays hidden until you have interacted with them enough. */
export const knowsPersonality = (s: GameState, id: PersonId): boolean =>
  bondOf(s, id).interaction >= PERSONALITY_AT;

export interface Conversation {
  mood: Mood;
  /** Interaction points gained (always positive). */
  interaction: number;
  /** Change in relationship (positive or negative). */
  relation: number;
  /** This conversation revealed their personality. */
  unlocked: boolean;
}
/** Have a conversation in which you answer in a certain tone. */
export function converse(s: GameState, id: PersonId, tone: ReplyTone): Conversation {
  const knew = knowsPersonality(s, id);
  const mood = moodFor(PEOPLE[id], tone);
  const interaction = addInteraction(s, id, 10);
  const relation = addRel(s, id, RELATION_CHANGE[mood]);
  bondOf(s, id).talked = s.day;
  return { mood, interaction, relation, unlocked: !knew && knowsPersonality(s, id) };
}
export const clubLevel = (xp: number): number => Math.min(10, 1 + Math.floor(xp / 60));
export const clubProgress = (xp: number): number => (clubLevel(xp) >= 10 ? 1 : (xp % 60) / 60);

/**
 * How hard the questions for a course are right now, from 1 (first-week) to 4.4 (hardest). A harder course, a later
 * day in the semester and a later semester in the degree all raise it.
 */
export const courseLevel = (s: GameState, c: Course, bonus = 0): number =>
  clamp(0.6 * c.tier + 0.4 + 1.4 * (dayInTerm(s) / (DAYS_PER_TERM - 1)) + 0.05 * c.sem + bonus, 1, 4.4);

/* ---------- club membership: one or two clubs per semester, and joining is mandatory ---------- */
/** The clubs the player belongs to this semester (empty until they register). */
export const members = (s: GameState, t = term(s)): ClubId[] => s.memberships[t] ?? [];
export const isMember = (s: GameState, club: ClubId): boolean => members(s).includes(club);
/** True while the player still has to register for this semester's clubs. */
export const needsClubs = (s: GameState): boolean => members(s).length === 0;
/** Register for this semester. Rejects an empty choice, duplicates and more than `CLUB_MAX` clubs. */
export function joinClubs(s: GameState, ids: ClubId[]): boolean {
  const uniq = [...new Set(ids)].filter((id) => (CLUB_IDS as readonly string[]).includes(id));
  if (uniq.length < 1 || uniq.length > CLUB_MAX || uniq.length !== ids.length) return false;
  const t = term(s);
  if (!s.memberships[t]) s.memberships[t] = [];
  if (s.memberships[t].length) return false; // already registered this semester
  s.memberships[t] = uniq;
  s.sessions[t] = {};
  return true;
}
/** Count one club session this semester. */
export function addSession(s: GameState, club: ClubId): number {
  const t = term(s);
  const row = (s.sessions[t] ??= {});
  return (row[club] = (row[club] ?? 0) + 1);
}
export const sessionsOf = (s: GameState, club: ClubId, t = term(s)): number => s.sessions[t]?.[club] ?? 0;
/** Clubs the player joined this semester but never attended. */
export const skippedClubs = (s: GameState, t = term(s)): ClubId[] =>
  members(s, t).filter((c) => sessionsOf(s, c, t) === 0);

/* ---------- grades & rank ---------- */
export function recordScore(s: GameState, kind: RecordKind, course: CourseId, pct: number): void {
  const r = s.records[term(s)][kind];
  (r[course] ??= []).push(pct);
}
const avg = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;

/** Weighted course score for semester `t` as a percentage, or null if nothing is recorded yet. */
export function courseScore(s: GameState, t: number, course: CourseId): number | null {
  const r = s.records[t];
  const parts: [number, number][] = [];
  const cls = r.class[course];
  const tst = r.test[course];
  const fin = r.final[course];
  if (cls?.length) parts.push([avg(cls), 0.3]);
  if (tst?.length) parts.push([avg(tst), 0.3]);
  if (fin?.length) parts.push([avg(fin), 0.4]);
  if (!parts.length) return null;
  const w = parts.reduce((a, [, k]) => a + k, 0);
  return (parts.reduce((a, [v, k]) => a + v * k, 0) / w) * 100;
}
/** Average of the player's course scores in semester `t` (a GPA-style percentage). */
export function playerScore(s: GameState, t: number): number | null {
  const vals = CURRICULUM[s.major][t].map((x) => courseScore(s, t, x)).filter((v): v is number => v !== null);
  return vals.length ? avg(vals) : null;
}

/** The rest of your cohort: the same forty classmates you meet around campus. */
const NAMES = STUDENTS.map((p) => p.name);
export interface Classmate {
  name: string;
  ability: number;
}
let classmateCache: Classmate[] | null = null;
export function classmates(): Classmate[] {
  if (classmateCache) return classmateCache;
  const r = mulberry32(99);
  classmateCache = NAMES.map((name) => ({ name, ability: 50 + r() * 30 }));
  // A few are the cohort's high flyers.
  const stars: Record<string, number> = { Zara: 87, Chen: 79, Ines: 76, Pia: 72 };
  for (const c of classmateCache) c.ability = stars[c.name] ?? c.ability;
  return classmateCache;
}
export function npcTerm(n: Classmate, t: number): number {
  const r = mulberry32(hashStr(n.name) + t * 97);
  return clamp(n.ability + t * 1.5 + (r() - 0.5) * 10, 35, 98);
}

export interface RankResult {
  rank: number;
  total: number;
  score: number;
  list: { name: string; score: number }[];
}
export function rankOf(s: GameState, t: number): RankResult | null {
  const ps = playerScore(s, t);
  if (ps === null) return null;
  const list = classmates().map((n) => ({ name: n.name, score: npcTerm(n, t) }));
  return { rank: 1 + list.filter((x) => x.score > ps).length, total: list.length + 1, score: ps, list };
}
export function overallRank(s: GameState): RankResult | null {
  const ts = Array.from({ length: TERMS }, (_, t) => t).filter((t) => playerScore(s, t) !== null);
  if (!ts.length) return null;
  const ps = avg(ts.map((t) => playerScore(s, t) as number));
  const list = classmates().map((n) => ({ name: n.name, score: avg(ts.map((t) => npcTerm(n, t))) }));
  return { rank: 1 + list.filter((x) => x.score > ps).length, total: list.length + 1, score: ps, list };
}
export const letterOf = (score: number) => gradeOf(score / 100).letter;
/** Map a percentage score to a 4.0 GPA scale (60% is a 2.0, 95% and above is a 4.0). */
export const gpaOf = (score: number): number => clamp(2 + (score - 60) * (2 / 35), 0, 4);

/* ---------- quests / achievements / events ---------- */
export function rollQuests(s: GameState): void {
  const r = mulberry32(s.day * 131 + 7 + hashStr(s.name));
  const pool = QUESTS.slice();
  const out: GameState['quests'] = [];
  while (out.length < 3 && pool.length) {
    const i = Math.floor(r() * pool.length);
    const q = pool.splice(i, 1)[0];
    out.push({ id: q.id, need: q.need, prog: 0, done: false });
  }
  s.quests = out;
  s.questsDay = s.day;
}

/** Advance progress on quest `id`; returns the quests this call completed. */
export function track(s: GameState, id: QuestId, n = 1): GameState['quests'] {
  const done: GameState['quests'] = [];
  for (const q of s.quests) {
    if (q.id === id && !q.done) {
      q.prog = Math.min(q.need, q.prog + n);
      if (q.prog >= q.need) {
        q.done = true;
        done.push(q);
      }
    }
  }
  return done;
}

export function checkAchievements(s: GameState): (typeof ACHIEVEMENTS)[number][] {
  const t = s.totals;
  const f = s.flags;
  const conds: Record<AchievementId, boolean> = {
    firstA: t.aCount > 0,
    combo10: t.maxCombo >= 10,
    perfectTest: t.perfectTests > 0,
    allStars: s.stars.length >= 10,
    cats: s.cats.length >= 3,
    bff: Object.values(s.friends).some((x) => x.rel >= 99.5),
    social: Object.values(s.friends).filter((x) => x.rel >= 50).length >= 8,
    rich: s.coins >= 400,
    lvl5: s.level >= 5,
    lvl10: s.level >= 10,
    boss: t.bosses > 0,
    rhythmS: !!f.rhythmS,
    dodge: !!f.dodgeFlawless,
    chessAce: !!f.chessAce,
    danceS: !!f.danceS,
    debateS: !!f.debateS,
    caught: s.caught > 0,
    rebel: !!f.rebel,
    rank1: !!f.rank1,
    streak3: s.questStreak >= 3,
  };
  const got: (typeof ACHIEVEMENTS)[number][] = [];
  for (const a of ACHIEVEMENTS) {
    if (conds[a.id] && !s.ach[a.id]) {
      s.ach[a.id] = s.day + 1;
      got.push(a);
    }
  }
  return got;
}

export function pickEvent(s: GameState, rng: Rng): ActiveEvent | null {
  if (s.day === 0 || rng() > 0.6) return null;
  const fin = isFinals(s);
  const td = isTestDay(s);
  const pool = EVENT_POOL.filter(
    (e) => !(fin && e.noFinal) && !(td && e.noTestDay) && e.periods.some((p) => !fin || p >= 2),
  );
  const total = pool.reduce((a, e) => a + e.weight, 0);
  let x = rng() * total;
  let ev = pool[0];
  for (const e of pool) {
    x -= e.weight;
    if (x <= 0) {
      ev = e;
      break;
    }
  }
  const periods = ev.periods.filter((p) => !fin || p >= 2);
  return { id: ev.id, period: periods[Math.floor(rng() * periods.length)] };
}

export function rollWeather(s: GameState): Weather {
  const r = mulberry32(s.day * 977 + 13)();
  return r < 0.6 ? 'sunny' : r < 0.85 ? 'cloudy' : 'rain';
}

/* ---------- persistence ---------- */
type Json = Record<string, unknown>;
const isRecord = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const NESTED_KEYS = ['stats', 'mastery', 'clubs', 'friends', 'totals', 'unlocks', 'daily'] as const;

/**
 * Validate a parsed save and fill in any fields added since it was written.
 * Returns null when the data is not a usable v3 save: earlier saves followed a different set of courses and cannot
 * be converted.
 */
export function migrateSave(raw: unknown): GameState | null {
  if (!isRecord(raw) || raw.v !== 3) return null;
  if (typeof raw.day !== 'number' || !isRecord(raw.look) || !isRecord(raw.friends)) return null;
  const base = newState(
    typeof raw.name === 'string' ? raw.name : DEFAULT_NAME,
    defaultLook(),
  ) as unknown as Json;
  const out: Json = { ...base, ...raw, people: raw.people ?? {} };
  for (const k of NESTED_KEYS) {
    if (isRecord(raw[k])) out[k] = { ...(base[k] as Json), ...(raw[k] as Json) };
  }
  const s = out as unknown as GameState;
  // Drop anything that does not belong to one of the clubs, and keep the per-semester lists the right length.
  const valid = (id: unknown): id is ClubId => (CLUB_IDS as readonly unknown[]).includes(id);
  for (const k of Object.keys(s.clubs)) if (!valid(k)) delete (s.clubs as Record<string, unknown>)[k];
  s.showcase = (Array.isArray(s.showcase) ? s.showcase : []).filter((x) => valid(x?.club));
  if (!Array.isArray(s.memberships) || s.memberships.length !== TERMS)
    s.memberships = Array.from({ length: TERMS }, (_, t) =>
      Array.isArray(s.memberships?.[t]) ? s.memberships[t].filter(valid).slice(0, CLUB_MAX) : [],
    );
  if (!Array.isArray(s.sessions) || s.sessions.length !== TERMS)
    s.sessions = Array.from({ length: TERMS }, (_, t) => (isRecord(s.sessions?.[t]) ? s.sessions[t] : {}));
  if (!isRecord(s.seenQ)) s.seenQ = {};
  if (!isRecord(s.people)) s.people = {};
  if (!GENDERS.some((g) => g.id === s.gender)) s.gender = 'female';
  if (!MAJOR_IDS.includes(s.major)) s.major = 'cse';
  return s;
}

export function saveGame(s: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}
export function loadGame(): GameState | null {
  try {
    const r = localStorage.getItem(SAVE_KEY);
    return r ? migrateSave(JSON.parse(r)) : null;
  } catch {
    return null;
  }
}
export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}
/** Fill in missing fields and update values saved by earlier versions. */
export function migrateMeta(raw: Partial<Meta>): Meta {
  const base = defaultMeta();
  const meta: Meta = { ...base, ...raw, settings: { ...base.settings, ...raw.settings } };
  // 1 was the old default graphics quality and matches no button, so those players move to High.
  if (meta.settings.quality === 1) meta.settings.quality = base.settings.quality;
  return meta;
}
export function loadMeta(): Meta {
  try {
    const r = localStorage.getItem(META_KEY);
    return r ? migrateMeta(JSON.parse(r)) : defaultMeta();
  } catch {
    return defaultMeta();
  }
}
export function saveMeta(m: Meta): void {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m));
  } catch {
    /* storage unavailable */
  }
}
