// Pure game state + rules (no DOM / WebGL). Everything here is unit-testable in Node.
import {
  ACHIEVEMENTS,
  DAYS_PER_TERM,
  EVENT_POOL,
  NPCS,
  PERKS,
  QUESTS,
  SUBJECT_IDS,
  TERMS,
  TEST_SUBJECT,
  TIMETABLE,
  gradeOf,
  xpForLevel,
} from './data';
import type {
  AchievementId,
  ActiveEvent,
  Daily,
  GameState,
  Look,
  Meta,
  NpcId,
  PeriodKind,
  PerkId,
  QuestId,
  RecordKind,
  StatId,
  SubjectId,
  Weather,
} from './types';
import { clamp, hashStr, mulberry32, type Rng } from './util';

export const SAVE_KEY = 'lastbell.save.v1';
export const META_KEY = 'lastbell.meta.v1';
export const TOTAL_DAYS = TERMS * DAYS_PER_TERM;

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
    settings: { music: 0.5, sfx: 0.8, quality: 1 },
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

export function newState(name: string, look: Look, meta: Meta = defaultMeta()): GameState {
  const npcIds = Object.keys(NPCS) as NpcId[];
  const s: GameState = {
    v: 1,
    name: name || 'Student',
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
    mastery: { math: 0, science: 0, english: 0, history: 0 },
    touched: {},
    records: Array.from({ length: TERMS }, () => ({ class: {}, test: {}, final: {} })),
    clubs: { sports: { xp: 0, best: 0 }, music: { xp: 0, best: 0 }, science: { xp: 0, best: 0 } },
    showcase: [],
    friends: Object.fromEntries(
      npcIds.map((k) => [k, { rel: 0, story: 0, talked: -1, gift: -1 }]),
    ) as GameState['friends'],
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
export type TimetableEntry = SubjectId | 'TEST' | 'FINAL';

export const term = (s: GameState): number => Math.min(TERMS - 1, Math.floor(s.day / DAYS_PER_TERM));
export const dayInTerm = (s: GameState): number => s.day % DAYS_PER_TERM;
export const isFinals = (s: GameState): boolean => dayInTerm(s) === DAYS_PER_TERM - 1;
export const isTestDay = (s: GameState): boolean => dayInTerm(s) === 2;
export const isShowcase = (s: GameState): boolean => dayInTerm(s) === 4;
export const timetable = (s: GameState): TimetableEntry[] =>
  isFinals(s) ? ['FINAL', 'FINAL'] : [...TIMETABLE[dayInTerm(s)]];
export const testSubject = (s: GameState): SubjectId => TEST_SUBJECT[term(s)];

export function periodKind(s: GameState): PeriodKind {
  if (s.period === 2) return 'lunch';
  if (s.period === 3) return isShowcase(s) ? 'showcase' : 'after';
  if (s.period === 4) return 'evening';
  if (isFinals(s)) return 'final';
  if (s.cancelled[s.period]) return 'free';
  if (isTestDay(s) && s.period === 1) return 'test';
  return 'class';
}

/** The subject being taught this period, or `undefined` outside lessons (lunch, finals, ...). */
export function classSubject(s: GameState): SubjectId | undefined {
  const t = timetable(s)[s.period];
  if (t === 'TEST') return testSubject(s);
  if (t === 'FINAL') return undefined;
  return t;
}
export const isFreeKind = (k: PeriodKind): boolean =>
  k === 'lunch' || k === 'after' || k === 'showcase' || k === 'free';

/* ---------- perks / effects ---------- */
export const has = (s: GameState, p: PerkId): boolean => s.perks.includes(p);
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
  let t = stat(s, 'foc') * 0.35 + s.mastery[subject] / 22;
  if (has(s, 'speed')) t += 3;
  if (s.rested) t += 2;
  return t;
}

export const fatigueMult = (s: GameState): number => (s.energy < 25 ? 0.78 : 1) * (s.stress > 75 ? 0.88 : 1);
export const hintChance = (s: GameState, subject: SubjectId): number =>
  clamp(stat(s, 'int') * 0.015 + s.mastery[subject] / 500 + (has(s, 'hint') ? 0.25 : 0), 0, 0.6);
export const comboCap = (s: GameState): number => (has(s, 'combo') ? 2.6 : 2.0);
export const shopPrice = (s: GameState, base: number): number =>
  Math.max(1, Math.round(base * (has(s, 'coupon') ? 0.8 : 1) * (1 - Math.min(0.2, stat(s, 'cha') * 0.01))));

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
  n = Math.round(n);
  s.coins = Math.max(0, s.coins + n);
  s.daily.coins += n;
  return n;
}
export function addXP(s: GameState, n: number): { n: number; up: number } {
  n = Math.round(n * (has(s, 'teacher') ? 1.12 : 1) * (s.energy < 25 ? 0.9 : 1));
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
  v *= has(s, 'scholar') ? 1.3 : 1;
  s.mastery[subj] = clamp(s.mastery[subj] + v, 0, 100);
  s.touched[subj] = true;
  return v;
}
export function addRel(s: GameState, npc: NpcId, v: number): number {
  v *= (1 + stat(s, 'cha') * 0.04) * (has(s, 'social') ? 1.5 : 1);
  const f = s.friends[npc];
  const o = f.rel;
  f.rel = clamp(f.rel + v, 0, 100);
  return f.rel - o;
}
export const clubLevel = (xp: number): number => Math.min(10, 1 + Math.floor(xp / 60));
export const clubProgress = (xp: number): number => (clubLevel(xp) >= 10 ? 1 : (xp % 60) / 60);

/* ---------- grades & rank ---------- */
export function recordScore(s: GameState, kind: RecordKind, subject: SubjectId, pct: number): void {
  const r = s.records[term(s)][kind];
  (r[subject] ??= []).push(pct);
}
const avg = (a: number[]): number => a.reduce((x, y) => x + y, 0) / a.length;

/** Weighted subject score for term `t` as a percentage, or null if nothing is recorded yet. */
export function subjectScore(s: GameState, t: number, subj: SubjectId): number | null {
  const r = s.records[t];
  const parts: [number, number][] = [];
  const cls = r.class[subj];
  const tst = r.test[subj];
  const fin = r.final[subj];
  if (cls?.length) parts.push([avg(cls), 0.3]);
  if (tst?.length) parts.push([avg(tst), 0.3]);
  if (fin?.length) parts.push([avg(fin), 0.4]);
  if (!parts.length) return null;
  const w = parts.reduce((a, [, k]) => a + k, 0);
  return (parts.reduce((a, [v, k]) => a + v * k, 0) / w) * 100;
}
export function playerScore(s: GameState, t: number): number | null {
  const vals = SUBJECT_IDS.map((x) => subjectScore(s, t, x)).filter((v): v is number => v !== null);
  return vals.length ? avg(vals) : null;
}

const NAMES = [
  'Aiko',
  'Ben',
  'Chloe',
  'Dev',
  'Elena',
  'Farid',
  'Grace',
  'Hana',
  'Ivan',
  'Jade',
  'Karim',
  'Lena',
  'Milo',
  'Nadia',
  'Omar',
  'Priya',
  'Quinn',
  'Ravi',
  'Sofia',
  'Tariq',
];
export interface Classmate {
  name: string;
  ability: number;
}
let classmateCache: Classmate[] | null = null;
export function classmates(): Classmate[] {
  if (classmateCache) return classmateCache;
  const r = mulberry32(99);
  classmateCache = NAMES.map((name) => ({ name, ability: 50 + r() * 30 }));
  classmateCache.push(
    { name: 'Rin', ability: 87 },
    { name: 'Maya', ability: 79 },
    { name: 'Kai', ability: 62 },
    { name: 'Zoe', ability: 69 },
  );
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
  const ts = [0, 1, 2].filter((t) => playerScore(s, t) !== null);
  if (!ts.length) return null;
  const ps = avg(ts.map((t) => playerScore(s, t) as number));
  const list = classmates().map((n) => ({ name: n.name, score: avg(ts.map((t) => npcTerm(n, t))) }));
  return { rank: 1 + list.filter((x) => x.score > ps).length, total: list.length + 1, score: ps, list };
}
export const letterOf = (score: number) => gradeOf(score / 100).letter;

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
    social: Object.values(s.friends).every((x) => x.rel >= 50),
    rich: s.coins >= 400,
    lvl5: s.level >= 5,
    lvl10: s.level >= 10,
    boss: t.bosses > 0,
    rhythmS: !!f.rhythmS,
    dodge: !!f.dodgeFlawless,
    eureka: !!f.lab7,
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
 * Returns null when the data is not a usable v1 save.
 */
export function migrateSave(raw: unknown): GameState | null {
  if (!isRecord(raw) || raw.v !== 1) return null;
  if (typeof raw.day !== 'number' || !isRecord(raw.look) || !isRecord(raw.friends)) return null;
  const base = newState(
    typeof raw.name === 'string' ? raw.name : 'Student',
    defaultLook(),
  ) as unknown as Json;
  const out: Json = { ...base, ...raw };
  for (const k of NESTED_KEYS) {
    if (isRecord(raw[k])) out[k] = { ...(base[k] as Json), ...(raw[k] as Json) };
  }
  return out as unknown as GameState;
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
export function loadMeta(): Meta {
  try {
    const r = localStorage.getItem(META_KEY);
    return r ? { ...defaultMeta(), ...JSON.parse(r) } : defaultMeta();
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
