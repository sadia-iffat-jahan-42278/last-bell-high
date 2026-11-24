// Game controller: day/period flow, activities, rewards, friends, events, recaps and endings.
import { Sound } from './audio/sound';
import {
  ACHIEVEMENTS,
  CLUBS,
  COURSES,
  DAYS_PER_TERM,
  EVENING_PERIOD,
  EXAM_HALL,
  FINALS,
  GRADES,
  ITEMS,
  LAST_PERIOD,
  NPCS,
  PERIODS,
  PERKS,
  PROFESSOR_COMMENTS,
  QUESTS,
  RELATION_TALK,
  ROOM_KIND_NAME,
  SUBJECTS,
  SUBJECT_IDS,
  WEEKDAYS,
  YEAR_NAMES,
  gradeOf,
  xpForLevel,
  type Course,
} from './core/data';
import * as St from './core/state';
import {
  NPC_IDS,
  type ClassBuilding,
  type ClubId,
  type CourseId,
  type Fx,
  type GameState,
  type ItemId,
  type Look,
  type Meta,
  type NpcId,
  type PerkId,
  type QuestId,
  type RoomKind,
  type SubjectId,
  type Weather,
  type ZoneId,
} from './core/types';
import { clamp, hashStr, mulberry32, sleep } from './core/util';
import { runDodge, type DodgeResult } from './minigames/dodge';
import { runLab, type LabResult } from './minigames/lab';
import { runQuiz, type QuizKind, type QuizResult } from './minigames/quiz';
import { runRhythm, type RhythmResult } from './minigames/rhythm';
import type { Rank } from './minigames/shared';
import { esc } from './ui/dom';
import type { HudInfo } from './ui/hud';
import { hud } from './ui/hud';
import { ui, type ChoiceOption } from './ui/ui';
import { STARS } from './world/layout';

/** Describes a classroom the player can walk into. */
export interface RoomSpec {
  kind: RoomKind;
  building: ClassBuilding;
  /** Room label such as `LH-101`. */
  room: string;
  /** Shown while fading in, e.g. "Lecture Hall LH-101". */
  title: string;
  /** The course (or exam) held here. */
  sub: string;
  /** Name of the professor standing at the front. */
  prof: string;
  seed: number;
}

/** What the 3D scene exposes to the rules layer. */
export interface SceneHooks {
  setPeriod(period: number, instant?: boolean): void;
  setWeather(w: Weather): void;
  teleportToStart(): void;
  refreshCollectibles(): void;
  getPlayerPos(): { x: number; z: number };
  setPlayerLook(look: Look): void;
  enterRoom(spec: RoomSpec): void;
  exitRoom(): void;
  /** Move the player into their seat (seated pose); standing up happens when the player leaves the room. */
  sitDown(): void;
}
const noopScene: SceneHooks = {
  setPeriod() {},
  setWeather() {},
  teleportToStart() {},
  refreshCollectibles() {},
  getPlayerPos: () => ({ x: 0, z: 0 }),
  setPlayerLook() {},
  enterRoom() {},
  exitRoom() {},
  sitDown() {},
};

export const game = {
  s: null as GameState | null,
  meta: St.loadMeta() as Meta,
  scene: noopScene,
  muted: false,
  /** Set by main: return to the title screen (optionally straight into a New Game+). */
  onTitle: (() => {}) as (newGamePlus: boolean) => void,
};

/** The active game state. Only call while a game is in progress. */
const S = (): GameState => {
  if (!game.s) throw new Error('No game in progress');
  return game.s;
};

/* ============================== helpers ============================== */
export function save(): void {
  if (game.s) St.saveGame(game.s);
}
const dayLabel = (s: GameState): string => {
  const wd = St.isFinals(s) ? 'Finals' : WEEKDAYS[St.dayInTerm(s)].slice(0, 3);
  return `Sem ${St.term(s) + 1} · Yr ${St.yearOf(s)} · ${wd} · Day ${s.day + 1}/${St.TOTAL_DAYS}`;
};
const WEATHER: Record<Weather, string> = { sunny: '☀️ Sunny', cloudy: '☁️ Cloudy', rain: '🌧️ Rainy' };
const BUILDING_NAME: Record<ClassBuilding, string> = { main: 'Hale Hall', lab: 'Science Labs' };
const courseLabel = (c: Course): string => `${SUBJECTS[c.area].icon} ${c.name}`;

/** The classroom for this period's lecture, midterm or finals, or null when nothing is scheduled. */
export function classroomSpec(s: GameState): RoomSpec | null {
  const k = St.periodKind(s);
  if (k === 'final') {
    const F = FINALS[St.term(s)];
    return {
      kind: EXAM_HALL.kind,
      building: EXAM_HALL.building,
      room: EXAM_HALL.room,
      title: EXAM_HALL.name,
      sub: `${F.emoji} ${F.name}`,
      prof: F.name,
      seed: s.day * 31 + 7,
    };
  }
  const id = St.classCourse(s);
  if (!id) return null;
  const c = COURSES[id];
  return {
    kind: c.kind,
    building: c.building,
    room: c.room,
    title: `${ROOM_KIND_NAME[c.kind]} ${c.room}`,
    sub: `${courseLabel(c)} · ${c.code}`,
    prof: c.prof,
    seed: s.day * 131 + s.period * 17 + c.id.length,
  };
}

export function objective(s: GameState): string {
  const k = St.periodKind(s);
  const spec = classroomSpec(s);
  switch (k) {
    case 'class':
      return `📘 ${COURSES[St.classCourse(s) as CourseId].name}: ${spec?.room} (${BUILDING_NAME[spec?.building ?? 'main']})`;
    case 'test':
      return `📝 Midterm: ${COURSES[St.classCourse(s) as CourseId].name} (${spec?.room}, ${BUILDING_NAME[spec?.building ?? 'main']})`;
    case 'final':
      return '⚔️ Finals! Report to the Grand Exam Hall (Hale Hall)';
    case 'lunch':
      return '🍱 Lunch: eat at the Canteen, or relax';
    case 'after':
      return '🎒 After class: clubs, study, friends…';
    case 'showcase':
      return '🎤 Club Showcase today! Pick a club';
    case 'free':
      return '🎉 Free period! Use it wisely';
    default:
      return '🏠 Head to the Gate to end the day';
  }
}

/** Which door the objective marker should point at, if any. */
export function objectiveTarget(s: GameState): ZoneId | null {
  const k = St.periodKind(s);
  if (k === 'class' || k === 'test') return COURSES[St.classCourse(s) as CourseId].building;
  if (k === 'final') return 'main';
  if (k === 'evening') return 'gate';
  return null;
}

export function hudInfo(): HudInfo {
  const s = S();
  const P = PERIODS[s.period];
  return {
    dayTxt: dayLabel(s),
    periodTxt: `${P.name} · ${P.time}`,
    periodIcon: P.icon,
    period: s.period,
    weather: WEATHER[s.weather],
    objective: objective(s),
    coins: s.coins,
    level: s.level,
    xp: s.xp,
    xpNeed: xpForLevel(s.level),
    energy: s.energy,
    stress: s.stress,
    muted: game.muted,
    quests: s.quests.map((q) => ({ ...q, text: QUESTS.find((d) => d.id === q.id)?.text ?? q.id })),
  };
}
export function refreshHud(): void {
  if (game.s) hud.update(hudInfo());
}
/** Question tier for a course: its own level, a notch harder late in the semester. */
const courseTier = (s: GameState, c: Course, bonus = 0): number =>
  clamp(c.tier + (St.dayInTerm(s) >= 5 ? 1 : 0) + bonus, 1, 4);
/** Tier for study sessions not tied to a course: grows with the academic year. */
const studyTier = (s: GameState, bonus = 0): number =>
  clamp(St.yearOf(s) + (St.dayInTerm(s) >= 4 ? 1 : 0) + bonus - 1, 1, 4);
const nameSeed = (s: GameState): number => hashStr(s.name) & 0xffff;

/* ============================== rewards ============================== */
interface Chip {
  text: string;
  cls: string;
}

function gift(items: Partial<Record<ItemId, number>> | undefined): string[] {
  const s = S();
  const out: string[] = [];
  for (const [k, n] of Object.entries(items ?? {}) as [ItemId, number][]) {
    s.items[k] = (s.items[k] ?? 0) + n;
    out.push(`${ITEMS[k].icon} ${ITEMS[k].name} ×${n}`);
  }
  return out;
}

/** Apply a story / event effect bundle and describe what happened as reward chips. */
export function applyFx(fx: Fx, npc?: NpcId): Chip[] {
  const s = S();
  const chips: Chip[] = [];
  if (fx.coins) {
    St.addCoins(s, fx.coins);
    chips.push({ text: `🪙 +${fx.coins}`, cls: 'coin' });
  }
  if (fx.xp) {
    const r = St.addXP(s, fx.xp);
    chips.push({ text: `✨ +${r.n} XP`, cls: 'xp' });
  }
  for (const t of gift(fx.items)) chips.push({ text: t, cls: 'stat' });
  if (fx.stat) {
    for (const [k, v] of Object.entries(fx.stat) as [keyof typeof s.stats, number][]) {
      St.gainStat(s, k, v);
      chips.push({ text: `${k.toUpperCase()} +${v}`, cls: 'stat' });
    }
  }
  if (fx.rel && npc) {
    const d = St.addRel(s, npc, fx.rel);
    chips.push({ text: `💖 ${NPCS[npc].name} +${Math.round(d)}`, cls: 'stat' });
  }
  if (fx.stress) {
    St.addStress(s, fx.stress);
    chips.push({ text: `😵 ${fx.stress > 0 ? '+' : ''}${fx.stress}`, cls: fx.stress > 0 ? 'bad' : 'stat' });
  }
  if (fx.rep) s.rep = clamp(s.rep + fx.rep, 0, 100);
  if (fx.flag) s.flags[fx.flag] = true;
  return chips;
}
const showChips = (chips: Chip[]): void => {
  for (const c of chips) ui.toast(c.text, c.cls === 'bad' ? 'bad' : 'good', 2600);
};

/** Let the player pick a perk for every level gained since the last call. */
async function resolvePerks(): Promise<void> {
  const s = S();
  while (s.pendingPerks > 0) {
    s.pendingPerks--;
    const available = (Object.keys(PERKS) as PerkId[]).filter((p) => !s.perks.includes(p));
    if (!available.length) {
      St.addCoins(s, 50);
      ui.toast('All perks collected! +50 coins', 'gold');
      continue;
    }
    const options = available.sort(() => Math.random() - 0.5).slice(0, 3);
    const id = await ui.perkPick(options, s.level - s.pendingPerks);
    s.perks.push(id);
    ui.toast(`${PERKS[id].icon} Perk: ${PERKS[id].name}`, 'gold');
  }
  refreshHud();
}

async function achievements(): Promise<void> {
  const got = St.checkAchievements(S());
  for (const a of got) {
    St.addCoins(S(), 30);
    Sound.sfx('star');
    ui.toast(`${a.icon} Achievement: ${a.name} (+30 🪙)`, 'gold', 4200);
    await sleep(400);
  }
  if (got.length) refreshHud();
}

function trackQuest(id: QuestId, n = 1): void {
  const s = S();
  for (const _ of St.track(s, id, n)) {
    const d = QUESTS.find((x) => x.id === id);
    if (!d) continue;
    St.addCoins(s, d.coins);
    const r = St.addXP(s, d.xp);
    Sound.sfx('coin');
    ui.toast(`✅ Quest done: ${d.text} (+${d.coins}🪙 +${r.n}XP)`, 'good', 4200);
  }
  refreshHud();
}

/* ============================== period flow ============================== */
export async function advancePeriod(n = 1): Promise<void> {
  const s = S();
  s.period += n;
  if (s.period > LAST_PERIOD) {
    await endDay();
    return;
  }
  const P = PERIODS[s.period];
  Sound.sfx('bell');
  await ui.fade(true, `${P.icon} ${P.name}`, P.time);
  game.scene.setPeriod(s.period);
  refreshHud();
  await sleep(700);
  await ui.fade(false);
  save();
  await maybeEvent();
}

async function maybeEvent(): Promise<void> {
  const s = S();
  if (s.event && !s.eventDone && s.event.period === s.period) {
    s.eventDone = true;
    await runEvent(s.event.id);
  }
}

/** Pay for an activity, then move time on. */
async function spendPeriod(energy: number, stress: number, n = 1): Promise<void> {
  const s = S();
  St.addEnergy(s, -St.energyCost(s, energy));
  St.addStress(s, stress);
  refreshHud();
  await resolvePerks();
  await achievements();
  await advancePeriod(n);
}

/* ============================== graded quizzes ============================== */
type GradedKind = QuizKind;
interface Base {
  xp: number;
  coins: number;
  mastery: number;
  int: number;
  foc: number;
  energy: number;
  stress: number;
}
const BASE: Record<GradedKind, Base> = {
  class: { xp: 45, coins: 14, mastery: 3.2, int: 0.25, foc: 0.14, energy: 8, stress: 3 },
  pop: { xp: 55, coins: 20, mastery: 2.5, int: 0.2, foc: 0.1, energy: 0, stress: 2 },
  test: { xp: 95, coins: 32, mastery: 4.8, int: 0.4, foc: 0.2, energy: 12, stress: 9 },
  study: { xp: 32, coins: 6, mastery: 4.2, int: 0.2, foc: 0.1, energy: 10, stress: 2 },
  final: { xp: 220, coins: 80, mastery: 6, int: 0.6, foc: 0.3, energy: 22, stress: 14 },
};

async function prepItems(title: string, allowCheat: boolean): Promise<ItemId[]> {
  const s = S();
  const list = (Object.keys(ITEMS) as ItemId[]).filter(
    (k) => ITEMS[k].prep && (s.items[k] ?? 0) > 0 && (allowCheat || k !== 'cheat'),
  );
  if (!list.length) return [];
  const chosen = (await ui.prep({
    title,
    subtitle: 'Bring items to help you. Chosen items are used up.',
    items: list.map((k) => ({
      id: k,
      name: ITEMS[k].name,
      icon: ITEMS[k].icon,
      desc: ITEMS[k].use,
      count: s.items[k] ?? 0,
    })),
  })) as ItemId[];
  for (const k of chosen) s.items[k] = (s.items[k] ?? 1) - 1;
  return chosen;
}

interface GradedOpts {
  title: string;
  spend?: boolean;
  extraChips?: Chip[];
  bonusMult?: number;
}

/** Hand out XP / coins / mastery for a finished quiz and show the report card. */
async function gradedResult(kind: GradedKind, subj: SubjectId | undefined, R: QuizResult, opts: GradedOpts) {
  const { title, spend = true, extraChips = [], bonusMult = 1 } = opts;
  const s = S();
  const B = BASE[kind];
  const g = gradeOf(R.pct);
  const SB = subj ? SUBJECTS[subj] : null;
  const chips = [...extraChips];
  let xpGain = Math.round(
    B.xp * g.mult * bonusMult * (kind === 'study' && St.friendHas(s, 'maya', 3) ? 1.15 : 1),
  );
  if (kind === 'final') xpGain = Math.round(xpGain * (R.won ? 1.5 : 1));
  const coinGain = Math.round(B.coins * g.mult * bonusMult + (R.maxCombo >= 5 ? 5 : 0));
  const xr = St.addXP(s, xpGain);
  St.addCoins(s, coinGain);
  chips.push({ text: `✨ +${xr.n} XP`, cls: 'xp' }, { text: `🪙 +${coinGain}`, cls: 'coin' });
  if (subj && SB) {
    const m = St.addMastery(s, subj, B.mastery * (0.6 + 0.4 * R.pct));
    chips.push({ text: `${SB.icon} Mastery +${m.toFixed(1)}`, cls: 'stat' });
  }
  if (St.gainStat(s, 'int', B.int * R.pct)) ui.toast('📈 INTELLIGENCE up!', 'good');
  St.gainStat(s, 'foc', B.foc * R.pct);
  chips.push({ text: `🧠 INT +${(B.int * R.pct).toFixed(2)}`, cls: 'stat' });
  const t = s.totals;
  t.correct += R.correct;
  t.answered += R.answered;
  t.maxCombo = Math.max(t.maxCombo, R.maxCombo);
  if (g.letter === 'S' || g.letter === 'A') {
    t.aCount++;
    trackQuest('classA');
  }
  if (R.perfect) {
    t.perfects++;
    trackQuest('perfect');
  }
  if (R.streak5) trackQuest('streak5');
  if (kind === 'test' && R.perfect) t.perfectTests++;
  s.daily.grades.push({ kind, subj, letter: g.letter });
  const rows: [string, string | number][] = [
    ['Correct', `${R.correct} / ${R.total}`],
    ['Best streak', `🔥 ${R.maxCombo}`],
    ['Score', `⭐ ${Math.round(R.score).toLocaleString()}`],
  ];
  if (R.forgiven) rows.push(['Lucky Pen', 'Mistake forgiven 🖊️']);
  if (kind === 'final')
    rows.splice(0, 1, ['Boss HP removed', `${Math.round(R.bossPct)}%`], ['Hearts left', R.hearts]);
  const e = St.energyCost(s, B.energy);
  if (spend && B.energy) chips.push({ text: `⚡ −${e}`, cls: 'bad' });
  if (!R.caught) {
    await ui.results({
      title,
      subtitle: SB ? `${SB.icon} ${SB.name}` : '',
      letter: g.letter,
      color: g.min >= 0.7 ? '#2fd3a0' : g.min >= 0.55 ? '#ffb300' : '#ff6b6b',
      rows,
      chips,
      note: g.text,
      confetti: g.min >= 0.85,
    });
  }
  return { g, xr };
}

interface LessonOpts {
  count?: number;
  title?: string;
  items?: ItemId[];
  tier?: number;
  seedAdd?: number;
}
function runLesson(kind: QuizKind, subj: SubjectId, opts: LessonOpts): Promise<QuizResult> {
  const s = S();
  const { count = 5, title, items = [], tier, seedAdd = 0 } = opts;
  const SB = SUBJECTS[subj];
  return runQuiz({
    kind,
    state: s,
    subject: subj,
    count,
    tier: tier ?? studyTier(s, kind === 'test' ? 1 : 0),
    title: title ?? `${SB.icon} ${SB.name}`,
    items,
    seed: s.day * 1009 + s.period * 31 + seedAdd + nameSeed(s),
  });
}

/** Walk through the classroom door: fade in to the interior. The lesson itself starts at the player's seat. */
export async function enterClassroom(): Promise<void> {
  const s = S();
  const spec = classroomSpec(s);
  if (!spec) return;
  await ui.fade(true, spec.title, spec.sub);
  game.scene.enterRoom(spec);
  await sleep(250);
  await ui.fade(false);
  ui.toast('💺 Find the glowing seat and press E to sit down', 'gold', 4200);
}

/** Leave the classroom without attending. */
export async function leaveClassroom(): Promise<void> {
  await ui.fade(true, '🚪 Leaving the room…');
  game.scene.exitRoom();
  await sleep(150);
  await ui.fade(false);
}

/** Sit at your desk and start whatever is scheduled: a lecture, the midterm or finals. */
export async function attendClass(): Promise<void> {
  const s = S();
  const k = St.periodKind(s);
  if (k !== 'class' && k !== 'test' && k !== 'final') return;
  game.scene.sitDown();
  if (k === 'class') await doClass();
  else if (k === 'test') await doTest();
  else await doFinal();
}

/** Chat with the professor before the lesson starts: a study tip once per course per day. */
export async function talkProfessor(): Promise<void> {
  const s = S();
  const id = St.classCourse(s);
  const spec = classroomSpec(s);
  if (!spec) return;
  if (!id) {
    await ui.say([[spec.prof, 'Take your seat when you are ready. Good luck today.']]);
    return;
  }
  const c = COURSES[id];
  if (s.profDay[id] === s.day) {
    await ui.say([[c.prof, 'We already talked today. Save some questions for office hours!']]);
    return;
  }
  await ui.say([[c.prof, `Welcome to ${c.name} (${c.code}). Ask me anything before we begin.`]]);
  const i = await ui.ask(c.prof, 'What do you ask?', [
    'Any study tips?',
    St.isTestDay(s) || St.isFinals(s) ? 'What will the exam cover?' : 'When is the midterm?',
    'Just say hello',
  ]);
  s.profDay[id] = s.day;
  if (i === 0) {
    const m = St.addMastery(s, c.area, 1.6);
    St.addXP(s, 10);
    await ui.say([[c.prof, 'Do a few practice questions every day. Little and often beats cramming.']]);
    ui.toast(`${SUBJECTS[c.area].icon} Study tip: mastery +${m.toFixed(1)}`, 'good');
  } else if (i === 1) {
    const ex = St.isTestDay(s) ? 'this midterm' : 'the semester';
    await ui.say([
      [
        c.prof,
        St.isFinals(s) || St.isTestDay(s)
          ? `Expect ${SUBJECTS[c.area].name.toLowerCase()} questions at about difficulty ${c.tier} out of 4. Stay calm.`
          : `The midterm is on Wednesday of week one, and finals close the semester. Keep up with ${ex}.`,
      ],
    ]);
    St.addStress(s, -3);
    ui.toast('😌 Advice received: −3 stress', 'good');
  } else {
    await ui.say([[c.prof, 'Always nice to see a friendly face. Let’s get started.']]);
    s.rep = clamp(s.rep + 1, 0, 100);
    St.gainStat(s, 'cha', 0.1);
  }
  refreshHud();
}

export async function doClass(): Promise<void> {
  const s = S();
  const id = St.classCourse(s);
  if (!id) return;
  const c = COURSES[id];
  const subj = c.area;
  await ui.banner(courseLabel(c), `${c.room} · ${c.prof} · Lecture`, 1500);
  const R = await runLesson('class', subj, {
    count: 5,
    title: `${SUBJECTS[subj].icon} ${c.name}`,
    tier: courseTier(s, c),
  });
  St.recordScore(s, 'class', id, R.pct);
  s.totals.classes++;
  trackQuest('classes');
  await gradedResult('class', subj, R, { title: 'Lecture quiz graded!' });
  await spendPeriod(BASE.class.energy, BASE.class.stress * (1 - R.pct));
}

export async function doTest(): Promise<void> {
  const s = S();
  const id = St.testCourse(s);
  const c = COURSES[id];
  const subj = c.area;
  await ui.banner('📝 MIDTERM EXAM', `${courseLabel(c)} · counts toward your grade`, 1800);
  await ui.say([
    [c.prof, `Pencils ready. Eyes on your own paper. ${c.name} midterm: begin when you’re ready.`],
  ]);
  const items = await prepItems('Midterm prep', true);
  const R = await runLesson('test', subj, {
    count: 8,
    title: `📝 ${c.name} Midterm`,
    items,
    tier: courseTier(s, c, 1),
  });
  if (R.cheatUsed && R.caught) {
    s.caught++;
    s.rep = clamp(s.rep - 20, 0, 100);
    s.detention = true;
    St.addStress(s, 20);
    St.recordScore(s, 'test', id, 0);
    Sound.sfx('lose');
    await ui.say([
      [
        c.prof,
        'What is THAT hidden in your sleeve? …A cheat sheet. Academic misconduct. The exam is a zero.',
      ],
      ['You', 'Oh no.'],
    ]);
    await ui.results({
      title: 'Caught cheating!',
      subtitle: 'The midterm counts as 0',
      letter: 'F',
      rows: [
        ['Disciplinary hearing', 'No clubs today'],
        ['Reputation', '−20'],
      ],
      chips: [{ text: '😵 +20 stress', cls: 'bad' }],
      note: 'Honesty is the better strategy… usually.',
    });
    await achievements();
    await spendPeriod(BASE.test.energy, 0);
    return;
  }
  St.recordScore(s, 'test', id, R.pct);
  s.totals.tests++;
  if (R.cheatUsed && !R.caught) {
    s.cheated++;
    if (R.pct >= 0.85) s.flags.rebel = true;
    ui.toast('😏 Nobody noticed the cheat sheet…', 'gold');
  }
  await gradedResult('test', subj, R, { title: 'Midterm results' });
  if (s.flags.rinWager) {
    // Rin's rival wager resolves on the next midterm.
    const roll = mulberry32(s.day * 71 + 5)();
    const rin = clamp(0.74 + St.term(s) * 0.02 + roll * 0.16, 0.6, 0.98);
    const win = R.pct > rin;
    s.flags.rinWager = false;
    await ui.say([
      [
        'Rin',
        `Midterm results are out. I got ${Math.round(rin * 100)}%. You got ${Math.round(R.pct * 100)}%.`,
      ],
      [
        'Rin',
        win ? 'Tch. You won. Here — lunch money. Don’t gloat.' : 'My win. Lunch is on you. Don’t sulk.',
      ],
    ]);
    if (win) {
      St.addCoins(s, 50);
      St.addRel(s, 'rin', 10);
      ui.toast('🏆 Won the wager! +50 🪙', 'gold');
    } else {
      St.addCoins(s, -20);
      St.addRel(s, 'rin', 3);
      ui.toast('Lost the wager. −20 🪙', 'bad');
    }
  }
  await spendPeriod(BASE.test.energy, BASE.test.stress * (1 - R.pct) + 3);
}

export async function doFinal(): Promise<void> {
  const s = S();
  const F = FINALS[St.term(s)];
  const phases = St.finalsPhases(s);
  Sound.sfx('boss');
  await ui.banner('⚔️ FINALS DAY', F.blurb, 1900);
  await ui.say([
    ['Dean Hale', `Today is the day. ${F.name} awaits in the exam hall.`],
    [F.name, `${F.emoji} Mwahaha! Show me what you’ve learned this semester!`],
  ]);
  const items = await prepItems('Finals prep', false);
  const R = await runQuiz({
    kind: 'final',
    state: s,
    phases,
    perPhase: 5,
    tier: clamp(2 + Math.floor(St.term(s) / 2), 2, 4),
    title: `${F.emoji} ${F.name}`,
    items,
    boss: F,
    seed: s.day * 7919,
  });
  // The comprehensive final counts toward every course this semester.
  for (const id of St.courses(s)) St.recordScore(s, 'final', id, R.pct);
  const extra: Chip[] = [];
  if (R.won) {
    s.totals.bosses++;
    const c = 80 + 20 * St.term(s);
    St.addCoins(s, c);
    extra.push({ text: `🏆 Boss bonus 🪙 +${c}`, cls: 'coin' });
    Sound.sfx('win');
  } else Sound.sfx('lose');
  await gradedResult('final', phases[0], R, {
    title: R.won ? `${F.name} defeated!` : 'Exams complete',
    extraChips: extra,
  });
  ui.toast(`${phases.map((x) => SUBJECTS[x].icon).join(' ')} marks recorded for every course`, 'good');
  await spendPeriod(BASE.final.energy, BASE.final.stress * (1 - R.pct) + 4, 2);
}

async function pickSubject(title: string, sub: string): Promise<SubjectId | null> {
  const s = S();
  const i = await ui.choice({
    title,
    sub,
    options: SUBJECT_IDS.map((id) => ({
      icon: SUBJECTS[id].icon,
      label: SUBJECTS[id].name,
      sub: `Mastery Lv ${St.masteryLevel(s, id)} · ${Math.floor(s.mastery[id])}/100`,
      tag: St.masteryLevel(s, id) >= 4 ? 'MAX' : '',
    })),
  });
  return i < 0 ? null : SUBJECT_IDS[i];
}

export async function doLibrary(): Promise<void> {
  const s = S();
  const subj = await pickSubject('📚 Library', 'Pick a subject to study. Costs this period.');
  if (!subj) return;
  if (St.friendHas(s, 'maya', 1) && Math.random() < 0.4) {
    await ui.say([['Maya', 'Shhh! …Oh, hi. Good choice. Quiet zone rules apply!']]);
  }
  const SB = SUBJECTS[subj];
  await ui.banner(`${SB.icon} Study session`, SB.name, 1100);
  const R = await runLesson('study', subj, { count: 6, title: `📚 ${SB.name} Study`, tier: studyTier(s, 0) });
  trackQuest('study');
  await gradedResult('study', subj, R, { title: 'Study session done' });
  await spendPeriod(BASE.study.energy, -4);
}

/** Late-night study at home. Returns false if the player backed out. */
async function doEveningStudy(): Promise<boolean> {
  const s = S();
  const subj = await pickSubject(
    '🌙 Late-night study',
    'Burn the midnight oil: big mastery, but you will sleep less.',
  );
  if (!subj) return false;
  const SB = SUBJECTS[subj];
  const owl = St.has(s, 'night');
  const R = await runLesson('study', subj, {
    count: 6,
    title: `🌙 ${SB.name} Late Study`,
    tier: studyTier(s, 1),
  });
  await gradedResult('study', subj, R, { title: 'Late-night study', bonusMult: owl ? 1.5 : 1.15 });
  if (owl) St.addMastery(s, subj, 2.5);
  St.addEnergy(s, -St.energyCost(s, owl ? 5 : 10));
  trackQuest('study');
  s.flags.sleep = 'late';
  return true;
}

/* ============================== clubs ============================== */
const RANK_MULT: Record<Rank, number> = { S: 1.6, A: 1.3, B: 1.0, C: 0.75, D: 0.5 };
const RANK_INDEX: Rank[] = ['D', 'C', 'B', 'A', 'S'];

interface ClubRun {
  rank: Rank;
  rows: [string, string | number][];
  /** Achievement flags to set when the run was good enough. */
  award(): void;
}

async function playClub(clubId: ClubId, cfg: Parameters<typeof runRhythm>[0]): Promise<ClubRun> {
  const s = S();
  if (clubId === 'music') {
    const R: RhythmResult = await runRhythm(cfg);
    return {
      rank: R.rank,
      rows: [
        ['Score', R.score.toLocaleString()],
        ['Max combo', `🔥 ${R.maxCombo}`],
        ['Accuracy', Math.round(R.acc * 100) + '%'],
      ],
      award: () => {
        if (R.rank === 'S') s.flags.rhythmS = true;
      },
    };
  }
  if (clubId === 'sports') {
    const R: DodgeResult = await runDodge(cfg);
    return {
      rank: R.rank,
      rows: [
        ['Score', R.score],
        ['Stars collected', `⭐ ${R.collected}`],
        ['Result', R.survived ? 'Survived!' : 'Knocked out'],
      ],
      award: () => {
        if (R.flawless) s.flags.dodgeFlawless = true;
      },
    };
  }
  const R: LabResult = await runLab(cfg);
  return {
    rank: R.rank,
    rows: [
      ['Rounds cleared', `${R.rounds} / 8`],
      ['Score', R.score],
      ['Perfect rounds', R.perfectRounds],
    ],
    award: () => {
      if (R.rounds >= 7) s.flags.lab7 = true;
    },
  };
}

export async function doClub(clubId: ClubId): Promise<void> {
  const s = S();
  const C = CLUBS[clubId];
  const showcase = St.periodKind(s) === 'showcase';
  const t = St.term(s);
  await ui.banner(`${C.icon} ${C.name}`, showcase ? '🎤 SHOWCASE DAY (×1.5 rewards)' : C.game, 1400);
  Sound.startMusic('tense');
  const run = await playClub(clubId, {
    state: s,
    seed: s.day * 31 + clubId.length,
    hard: showcase,
    // The club games were tuned for three difficulty steps; spread the 8 semesters over them.
    term: Math.min(2, Math.floor(t / 3)),
    look: s.look,
  });
  Sound.startMusic('explore');

  const m = RANK_MULT[run.rank] * (showcase ? 1.5 : 1) * (s.clubBoost ? 1.25 : 1);
  s.clubBoost = false;
  const cl = s.clubs[clubId];
  const levelBefore = St.clubLevel(cl.xp);
  const xp = Math.round(60 * m * (clubId === 'music' && St.friendHas(s, 'zoe', 3) ? 1.3 : 1));
  const coins = Math.round(22 * m);
  const clubXp = Math.round(30 * m + 8);
  const xr = St.addXP(s, xp);
  St.addCoins(s, coins);
  cl.xp += clubXp;
  cl.best = Math.max(cl.best, RANK_INDEX.indexOf(run.rank));
  const statGain = (clubId === 'sports' ? 0.5 : clubId === 'music' ? 0.45 : 0.35) * m;
  St.gainStat(s, C.stat, statGain);
  if (clubId === 'science') St.gainStat(s, 'int', 0.2 * m);
  St.addStress(s, -10);
  trackQuest('club');
  const chips: Chip[] = [
    { text: `✨ +${xr.n} XP`, cls: 'xp' },
    { text: `🪙 +${coins}`, cls: 'coin' },
    { text: `${C.stat.toUpperCase()} +${statGain.toFixed(2)}`, cls: 'stat' },
    { text: `${C.icon} Club XP +${clubXp}`, cls: 'stat' },
    { text: '😌 Stress −10', cls: 'stat' },
    { text: `⚡ −${St.energyCost(s, 14)}`, cls: 'bad' },
  ];
  if (St.clubLevel(cl.xp) > levelBefore)
    chips.push({ text: `🎉 Club level ${St.clubLevel(cl.xp)}!`, cls: 'xp' });
  run.award();
  let note = '';
  if (showcase) {
    const place = {
      S: '🥇 1st place!',
      A: '🥈 2nd place!',
      B: '🥉 3rd place!',
      C: 'Finalist',
      D: 'Participant',
    }[run.rank];
    s.showcase.push({ term: t, club: clubId, place: run.rank });
    note = `Showcase result: ${place}`;
    if (run.rank === 'S') {
      St.addCoins(s, 40);
      chips.push({ text: '🏆 Trophy +40 🪙', cls: 'coin' });
    }
  }
  const color =
    run.rank === 'S' ? '#ffb300' : run.rank === 'A' ? '#2fd3a0' : run.rank === 'B' ? '#4aa8ff' : '#ff6b6b';
  await ui.results({
    title: `${C.name} · Rank ${run.rank}`,
    subtitle: showcase ? 'Club Showcase' : C.game,
    letter: run.rank,
    color,
    rows: run.rows,
    chips,
    note,
    confetti: run.rank === 'S' || run.rank === 'A',
  });
  await spendPeriod(14, 0);
}

/* ============================== lunch / shop / rooftop ============================== */
export async function shop(): Promise<void> {
  const s = S();
  let spent = 0;
  const keys = Object.keys(ITEMS) as ItemId[];
  for (;;) {
    const i = await ui.choice({
      title: '🛒 Canteen Shop',
      sub: `You have 🪙 ${s.coins}. Tests & finals are easier with the right items!`,
      options: keys.map((k) => ({
        icon: ITEMS[k].icon,
        label: ITEMS[k].name,
        sub: ITEMS[k].use,
        tag: `🪙 ${St.shopPrice(s, ITEMS[k].price)}`,
        tagCls: 'gold',
        disabled: s.coins < St.shopPrice(s, ITEMS[k].price),
      })),
      cancelLabel: 'Done shopping',
    });
    if (i < 0) break;
    const k = keys[i];
    const p = St.shopPrice(s, ITEMS[k].price);
    s.coins -= p;
    spent += p;
    s.items[k] = (s.items[k] ?? 0) + 1;
    Sound.sfx('coin');
    ui.toast(`Bought ${ITEMS[k].icon} ${ITEMS[k].name}`, 'good');
    refreshHud();
  }
  if (spent) trackQuest('spend', spent);
}

export async function doCanteen(): Promise<void> {
  const s = S();
  const k = St.periodKind(s);
  const dishes = [
    { icon: '🍛', name: 'Curry rice', price: 8, en: 34, st: -6 },
    { icon: '🥪', name: 'Sandwich', price: 5, en: 22, st: -3 },
    { icon: '🍞', name: 'Bread & water', price: 0, en: 12, st: 0 },
  ];
  const options: ChoiceOption[] = [{ icon: '🛒', label: 'Shop', sub: 'Buy items (does not use time)' }];
  if (k === 'lunch' || k === 'free') {
    for (const d of dishes) {
      options.push({
        icon: d.icon,
        label: `Eat ${d.name}`,
        sub: `+${d.en + (s.canteenSpecial ? 20 : 0)} energy · ${d.st} stress · uses this period`,
        tag: s.canteenSpecial ? 'FREE' : d.price ? `🪙 ${St.shopPrice(s, d.price)}` : 'free',
        tagCls: 'gold',
        disabled: !s.canteenSpecial && s.coins < St.shopPrice(s, d.price),
      });
    }
  }
  const i = await ui.choice({
    title: '🍜 Canteen',
    sub: k === 'lunch' ? 'Lunch time! Eating restores energy.' : 'Meals are only served at lunch.',
    options,
  });
  if (i < 0) return;
  if (i === 0) {
    await shop();
    return;
  }
  const d = dishes[i - 1];
  const price = s.canteenSpecial ? 0 : St.shopPrice(s, d.price);
  s.coins -= price;
  trackQuest('spend', price);
  const gain = d.en + (s.canteenSpecial ? 20 : 0);
  St.addEnergy(s, gain);
  St.addStress(s, d.st);
  St.gainStat(s, 'cha', 0.12);
  trackQuest('canteen');
  s.canteenSpecial = false;
  Sound.sfx('ok');
  ui.toast(`${d.icon} Yum! +${gain} energy`, 'good');
  await spendPeriod(0, 0);
}

export async function doRooftop(): Promise<void> {
  const s = S();
  const k = St.periodKind(s);
  const classTime = k === 'class' || k === 'test' || k === 'final';
  if (k === 'final') {
    ui.toast('No sneaking out of finals!', 'bad');
    return;
  }
  if (classTime) {
    const ok = await ui.confirm(
      'Skipping a lecture is risky: if campus security catches you, you face a disciplinary hearing and lose reputation. Nobody gets credit for the lecture.',
      'Skip class 😏',
      'Go to class instead',
      'Skip class?',
    );
    if (!ok) return;
    Sound.sfx('whoosh');
    if (Math.random() < 0.4) {
      s.caught++;
      s.rep = clamp(s.rep - 12, 0, 100);
      s.detention = true;
      St.addStress(s, 12);
      Sound.sfx('lose');
      await ui.say([['Campus Security', 'Caught you! Skipping lectures? That’s a disciplinary hearing.']]);
      ui.toast('🚨 Busted! No clubs today.', 'bad');
    } else {
      St.addEnergy(s, 20);
      St.addStress(s, -18);
      s.rep = clamp(s.rep - 3, 0, 100);
      ui.toast('😴 Nap success. Nobody noticed.', 'good');
      trackQuest('rooftop');
    }
    if (k === 'test') {
      St.recordScore(s, 'test', St.testCourse(s), 0);
      ui.toast('Missed midterm: recorded as 0', 'bad');
    }
    await spendPeriod(0, 0);
    return;
  }
  const i = await ui.choice({
    title: '🌤️ Rooftop',
    sub: 'A quiet spot above the campus. Costs this period.',
    options: [
      { icon: '😌', label: 'Relax and watch the clouds', sub: '−18 stress · +12 energy' },
      { icon: '🎧', label: 'Listen to music', sub: '−12 stress · +CRE' },
    ],
  });
  if (i < 0) return;
  if (i === 0) {
    St.addStress(s, -18);
    St.addEnergy(s, 12);
  } else {
    St.addStress(s, -12);
    St.addEnergy(s, 8);
    St.gainStat(s, 'cre', 0.2);
  }
  St.gainStat(s, 'cha', 0.1);
  trackQuest('rooftop');
  Sound.sfx('ok');
  const who = NPC_IDS[Math.floor(Math.random() * NPC_IDS.length)];
  if (Math.random() < 0.5) {
    St.addRel(s, who, 4);
    ui.toast(`${NPCS[who].emoji} ${NPCS[who].name} dropped by. +friendship`, 'good');
  }
  await spendPeriod(0, 0);
}

export async function doNotice(): Promise<void> {
  const s = S();
  const t = St.term(s);
  const d = St.dayInTerm(s);
  const upcoming: string[] = [];
  if (d < 2) upcoming.push(`📝 Midterm on Wednesday: ${COURSES[St.testCourse(s)].name}`);
  if (d < 4) upcoming.push('🎤 Club Showcase on Friday after class');
  upcoming.push(
    d < DAYS_PER_TERM - 1 ? `⚔️ Finals vs ${FINALS[t].name} on the last day` : '⚔️ Finals today!',
  );
  const timetable = St.timetable(s)
    .map((x, i) => {
      if (i === 2) return `${PERIODS[i].time}: 🍱 Lunch`;
      if (i > 3 || x === null) return '';
      let label: string;
      if (x === 'FINAL') label = '⚔️ Finals · Grand Exam Hall';
      else {
        const c = COURSES[x === 'TEST' ? St.testCourse(s) : x];
        label = `${x === 'TEST' ? '📝 Midterm: ' : ''}${courseLabel(c)} · ${c.room} (${BUILDING_NAME[c.building]})`;
      }
      return `${PERIODS[i].time}: ${label}`;
    })
    .filter(Boolean)
    .join('<br>');
  const quests = s.quests
    .map((q) => {
      const def = QUESTS.find((x) => x.id === q.id);
      return `${q.done ? '✅' : '🔸'} ${def?.text ?? q.id} <b>(${def?.coins ?? 0}🪙)</b>`;
    })
    .join('<br>');
  const rank = St.rankOf(s, t);
  await ui.info(
    '📌 Notice Board',
    `<b>Today’s timetable</b><br>${timetable}<br><br><b>Coming up</b><br>${upcoming.join('<br>')}<br><br><b>Daily quests</b> (streak ${s.questStreak}🔥)<br>${quests}<br><br><b>Cohort rank this semester:</b> ${rank ? `#${rank.rank} of ${rank.total}` : 'no grades yet'}`,
  );
}

/* ============================== friends ============================== */
/** "Sophomore · 🎓 a year above you" style description of how a friend relates to the player right now. */
export function relationText(s: GameState, npc: NpcId): string {
  const N = NPCS[npc];
  const rel = St.relationTo(s, npc);
  const diff = Math.abs(N.year - St.yearOf(s));
  const yrs = `${diff} year${diff === 1 ? '' : 's'}`;
  const how =
    rel === 'senior' ? `🎓 ${yrs} above you` : rel === 'junior' ? `🌱 ${yrs} below you` : '🤝 Your year';
  return `${YEAR_NAMES[N.year - 1]} · ${how}`;
}

async function runBeat(npc: NpcId, beat: (typeof NPCS)[NpcId]['beats'][number]): Promise<void> {
  const s = S();
  const N = NPCS[npc];
  const f = s.friends[npc];
  await ui.say(beat.scene);
  const i = await ui.ask(
    N.name,
    beat.prompt,
    beat.options.map((o) => o.label),
  );
  const o = beat.options[i];
  await ui.say(o.result.map((text): [string, string] => [N.name, text]));
  f.story++;
  showChips(applyFx(o.fx, npc));
  Sound.sfx('star');
  ui.confetti(innerWidth / 2, innerHeight * 0.4, 50);
  const perk = N.perks.find((p) => p.need === f.story);
  if (perk) ui.toast(`💫 ${N.name}: ${perk.text}`, 'gold', 5200);
  if (npc === 'kai' && f.story === 1) St.gainStat(s, 'sta', 0.5);
  await resolvePerks();
  await achievements();
  refreshHud();
}

export async function talkTo(npc: NpcId): Promise<void> {
  const s = S();
  const N = NPCS[npc];
  const f = s.friends[npc];
  const beat = N.beats[f.story];
  if (beat && f.rel >= beat.at) {
    await runBeat(npc, beat);
    return;
  }
  const canGift = f.gift !== s.day && ((s.items.snack ?? 0) > 0 || (s.items.drink ?? 0) > 0);
  const i = await ui.choice({
    title: `${N.emoji} ${N.name}`,
    sub: `${relationText(s, npc)}<br>${N.role} · ${N.major} · Friendship ${Math.round(f.rel)}/100${beat ? ` (next story at ${beat.at})` : ''}`,
    options: [
      {
        icon: '💬',
        label: 'Chat',
        sub: f.talked === s.day ? 'You already chatted today' : 'Once per day · builds friendship',
        tag: f.talked === s.day ? 'done' : 'new',
      },
      {
        icon: '🎁',
        label: 'Give a gift',
        sub: canGift
          ? 'Snack Box (+10) or Energy Drink (+12)'
          : f.gift === s.day
            ? 'Already gifted today'
            : 'You have no snacks or drinks',
        disabled: !canGift,
      },
    ],
  });
  if (i === 0) await chat(npc);
  else if (i === 1) await giveGift(npc);
}

async function chat(npc: NpcId): Promise<void> {
  const s = S();
  const N = NPCS[npc];
  const f = s.friends[npc];
  if (f.talked === s.day) {
    await ui.say([
      [N.name, 'Good to see you again! We already caught up today, but I’ll never turn down a wave.'],
    ]);
    return;
  }
  // Every other chat is about being a senior, peer or junior; the rest are the friend's own lines.
  const rel = St.relationTo(s, npc);
  const pickN = s.day + npc.length;
  const T =
    pickN % 2 === 0
      ? RELATION_TALK[rel][(s.day + f.story) % RELATION_TALK[rel].length]
      : N.talk[pickN % N.talk.length];
  await ui.say([[N.name, T.line]]);
  const i = await ui.ask(s.name, 'How do you reply?', [T.a, T.b]);
  await ui.say([[N.name, i === 0 ? T.ra : T.rb]]);
  f.talked = s.day;
  const d = St.addRel(s, npc, i === 0 ? 6 : 5);
  if (i === 1) St.addStress(s, -4);
  St.gainStat(s, 'cha', 0.2);
  const r = St.addXP(s, 10);
  ui.toast(`💖 ${N.name} +${Math.round(d)} · ✨ +${r.n} XP`, 'good');
  if (rel === 'senior') {
    // An older student shares what they have learned about one of this semester's subjects.
    const ids = St.courses(s);
    const c = COURSES[ids[(s.day + npc.length) % ids.length]];
    const m = St.addMastery(s, c.area, 1.2);
    ui.toast(
      `🎓 Upperclassman tip for ${c.name}: ${SUBJECTS[c.area].icon} mastery +${m.toFixed(1)}`,
      'good',
      4200,
    );
  } else if (rel === 'junior') {
    s.rep = clamp(s.rep + 2, 0, 100);
    St.gainStat(s, 'cha', 0.15);
    ui.toast(`🌱 ${N.name} is a younger student and looks up to you: +reputation`, 'good', 3600);
  } else {
    St.addStress(s, -3);
    ui.toast(`🤝 Chatting with a classmate: −3 stress`, 'good', 3000);
  }
  trackQuest('talk');
  await resolvePerks();
  await achievements();
  refreshHud();
}

async function giveGift(npc: NpcId): Promise<void> {
  const s = S();
  const N = NPCS[npc];
  const f = s.friends[npc];
  const options: ('snack' | 'drink')[] = [];
  if ((s.items.snack ?? 0) > 0) options.push('snack');
  if ((s.items.drink ?? 0) > 0) options.push('drink');
  const i = await ui.choice({
    title: `Give ${N.name} a gift`,
    options: options.map((k) => ({ icon: ITEMS[k].icon, label: ITEMS[k].name, tag: `×${s.items[k]}` })),
  });
  if (i < 0) return;
  const k = options[i];
  s.items[k] = (s.items[k] ?? 1) - 1;
  f.gift = s.day;
  const d = St.addRel(s, npc, k === 'snack' ? 10 : 12);
  Sound.sfx('star');
  ui.confetti(innerWidth / 2, innerHeight / 2, 25);
  await ui.say([
    [
      N.name,
      k === 'snack'
        ? 'For me? You’re too kind! This is exactly what I needed.'
        : 'An energy drink! You’re a lifesaver!',
    ],
  ]);
  ui.toast(`🎁 ${N.name} +${Math.round(d)} friendship`, 'good');
  await achievements();
  refreshHud();
}

/* ============================== collectibles ============================== */
export async function collectStar(idx: number): Promise<void> {
  const s = S();
  if (s.stars.includes(idx)) return;
  s.stars.push(idx);
  if (s.revealedStar === idx) s.revealedStar = -1;
  Sound.sfx('star');
  St.addCoins(s, 10);
  const r = St.addXP(s, 15);
  trackQuest('star');
  ui.toast(`⭐ Gold star ${s.stars.length}/10 (+10🪙 +${r.n}XP)`, 'gold');
  ui.confetti(innerWidth / 2, innerHeight / 2, 30);
  const n = s.stars.length;
  const unlocks = s.unlocks.acc;
  if (n === 3) {
    unlocks.push('cap');
    ui.toast('🧢 Unlocked: Cap!', 'gold', 5000);
  }
  if (n === 6) {
    unlocks.push('headphones');
    gift({ tea: 2 });
    ui.toast('🎧 Unlocked: Headphones + 2 Focus Tea!', 'gold', 5000);
  }
  if (n === 10) {
    unlocks.push('crown');
    St.addXP(s, 150);
    ui.toast('👑 All stars! Crown unlocked (+150 XP)', 'gold', 6000);
  }
  game.scene.refreshCollectibles();
  await resolvePerks();
  await achievements();
  refreshHud();
  save();
}

export async function petCat(idx: number): Promise<void> {
  const s = S();
  if (s.catDay[idx] === s.day) {
    ui.toast('😸 The cat is napping happily.', '');
    return;
  }
  s.catDay[idx] = s.day;
  Sound.sfx('meow');
  if (!s.cats.includes(idx)) s.cats.push(idx);
  St.addStress(s, -8);
  St.gainStat(s, 'cha', 0.1);
  trackQuest('cat');
  ui.toast(`🐱 Purr… (${s.cats.length}/3 cats met) −8 stress`, 'good');
  await achievements();
  refreshHud();
}

/* ============================== events ============================== */
const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

async function runEvent(id: NonNullable<GameState['event']>['id']): Promise<void> {
  const s = S();
  Sound.sfx('whoosh');
  if (id === 'popquiz') {
    const ids = St.courses(s);
    const c = COURSES[ids[Math.floor(Math.random() * ids.length)]];
    const subj = c.area;
    await ui.banner('❗ POP QUIZ', `${c.name}: surprise! No warning…`, 1300);
    await ui.say([[c.prof, `Everyone, clear your desks. Pop quiz in ${c.name}!`]]);
    const R = await runLesson('pop', subj, {
      count: 4,
      title: `❗ Pop Quiz: ${c.name}`,
      tier: courseTier(s, c),
    });
    St.recordScore(s, 'class', c.id, R.pct);
    await gradedResult('pop', subj, R, { title: 'Pop quiz graded!', spend: false });
  } else if (id === 'wallet') {
    const i = await ui.ask('You', 'You spot a wallet on the ground. Inside: an ID card and 60 coins.', [
      'Return it to the registrar',
      'Keep the cash',
    ]);
    if (i === 0) {
      await ui.say([['Registrar Clerk', 'The owner will be so relieved. Here’s a little thank-you!']]);
      St.addCoins(s, 15);
      s.rep = clamp(s.rep + 8, 0, 100);
      St.gainStat(s, 'cha', 0.5);
      ui.toast('😇 +15🪙, +CHA, +reputation', 'good');
    } else {
      St.addCoins(s, 60);
      s.rep = clamp(s.rep - 10, 0, 100);
      ui.toast('😬 +60🪙 but your conscience nags (−reputation)', 'bad');
    }
  } else if (id === 'note') {
    const left = STARS.map((_, i) => i).filter((i) => !s.stars.includes(i));
    if (!left.length) {
      St.addCoins(s, 25);
      ui.toast('A note says "Thanks for finding every star!" +25🪙', 'gold');
    } else {
      const idx = left[Math.floor(Math.random() * left.length)];
      s.revealedStar = idx;
      const p = game.scene.getPlayerPos();
      const [x, z] = STARS[idx];
      const angle = Math.atan2(x - p.x, -(z - p.z));
      const dir = COMPASS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
      await ui.say([
        [
          'You',
          `A folded note in your pocket: “Something golden is hiding to the ${dir}… follow the light.”`,
        ],
      ]);
      game.scene.refreshCollectibles();
      ui.toast('⭐ A beam of light marks the star!', 'gold');
    }
  } else if (id === 'guest') {
    await ui.say([
      ['Guest Speaker', 'I once failed my first exam. Then I tried again. Persistence beats talent, always.'],
    ]);
    const i = await ui.ask(s.name, 'Do you ask a question?', [
      'Ask how to stay focused',
      'Ask how to be creative',
    ]);
    const r = St.addXP(s, 40);
    if (i === 0) {
      St.gainStat(s, 'foc', 0.8);
      ui.toast(`🎯 +0.8 FOCUS · ✨ +${r.n} XP`, 'good');
    } else {
      St.gainStat(s, 'cre', 0.8);
      ui.toast(`🎨 +0.8 CREATIVITY · ✨ +${r.n} XP`, 'good');
    }
  } else if (id === 'fire' || id === 'blackout') {
    s.cancelled[s.period] = true;
    await ui.banner(
      id === 'fire' ? '🚨 FIRE DRILL' : '🔌 POWER OUTAGE',
      'Class is cancelled — free period!',
      1800,
    );
    St.addEnergy(s, 8);
    ui.toast('Free period! Use it however you like.', 'good', 4000);
  } else if (id === 'special') {
    s.canteenSpecial = true;
    await ui.say([['Café Manager', 'Today’s special is on the house! Come eat, everyone!']]);
    ui.toast('🍛 Free lunch + bonus energy at the canteen!', 'gold', 4500);
  } else if (id === 'fair') {
    s.clubBoost = true;
    await ui.say([
      ['Club Captain', 'Club fair day! Join an activity and we’ll cheer extra loud (+25% rewards).'],
    ]);
    ui.toast('📣 Next club activity: +25% rewards', 'gold', 4500);
  }
  refreshHud();
}

/* ============================== evening / home ============================== */
export async function doHome(): Promise<void> {
  const s = S();
  const k = St.periodKind(s);
  if (k !== 'evening') {
    const ok = await ui.confirm(
      'Go home now? You will skip the rest of the day’s activities.',
      'Go home',
      'Stay on campus',
    );
    if (!ok) return;
    s.period = EVENING_PERIOD - 1;
    await advancePeriod();
    return;
  }
  const i = await ui.choice({
    title: '🏠 Home',
    sub: 'How do you spend the evening?',
    options: [
      {
        icon: '😴',
        label: 'Sleep early',
        sub: 'Full rest: +70 energy · −15 stress · "Well rested" buff (+2s per question tomorrow)',
      },
      { icon: '🌙', label: 'Study late', sub: 'A big mastery boost, but a shorter sleep (+35 energy)' },
      { icon: '🎮', label: 'Game night', sub: '−35 stress · +CRE · normal sleep (+50 energy)' },
    ],
    cancelLabel: 'Not yet',
  });
  if (i < 0) return;
  s.flags.sleep = i === 0 ? 'early' : i === 2 ? 'game' : 'late';
  if (i === 1) {
    if (!(await doEveningStudy())) return;
  } else if (i === 2) {
    St.addStress(s, -35);
    St.gainStat(s, 'cre', 0.35);
    ui.toast('🎮 So much fun. −35 stress', 'good');
  }
  await endDay();
}

/* ============================== end of day ============================== */
function lootChest(): { coins: number; item: ItemId } {
  const s = S();
  const lucky = St.has(s, 'lucky') ? 1.3 : 1;
  const coins = Math.round((20 + Math.random() * 30) * lucky);
  const pool: [ItemId, number][] = [
    ['snack', 30],
    ['drink', 25],
    ['notes', 15],
    ['tea', 10],
    ['pen', 8],
    ['skip', 7],
    ['cheat', 5],
  ];
  let x = Math.random() * 100;
  let item: ItemId = 'snack';
  for (const [k, w] of pool) {
    x -= w;
    if (x <= 0) {
      item = k;
      break;
    }
  }
  St.addCoins(s, coins);
  gift({ [item]: 1 });
  return { coins, item };
}

export async function endDay(): Promise<void> {
  const s = S();
  const dayNo = s.day + 1;
  const sleepKind = s.flags.sleep ?? 'normal';
  delete s.flags.sleep;
  Sound.sfx('bell');
  await ui.fade(true, '🌙 Day complete', `Day ${dayNo}`);
  game.scene.setPeriod(LAST_PERIOD + 1, true);
  const rest = sleepKind === 'early' ? 70 : sleepKind === 'late' ? 35 : sleepKind === 'game' ? 50 : 55;
  St.addEnergy(s, rest + St.friendBonus(s, 'restPlus'));
  St.addStress(s, (sleepKind === 'early' ? -15 : -8) - St.friendBonus(s, 'stressRelief'));
  s.rested = sleepKind === 'early';
  // Subjects you did not touch today get rusty.
  const decayed: string[] = [];
  for (const sj of SUBJECT_IDS) {
    if (!s.touched[sj] && s.mastery[sj] > 0) {
      s.mastery[sj] = Math.max(0, s.mastery[sj] - 0.8);
      decayed.push(SUBJECTS[sj].icon);
    }
  }
  const allDone = s.quests.length > 0 && s.quests.every((q) => q.done);
  let chest: ReturnType<typeof lootChest> | null = null;
  if (allDone) {
    s.questStreak++;
    chest = lootChest();
    if (s.questStreak > 1) St.addCoins(s, Math.min(60, s.questStreak * 8));
  } else s.questStreak = 0;
  s.totals.daysPlayed++;
  const rankNow = St.rankOf(s, St.term(s));
  await achievements();
  const wasFinals = St.isFinals(s);
  const last = s.day >= St.TOTAL_DAYS - 1;
  await ui.fade(false);

  const gr = s.daily.grades;
  const chips: Chip[] = [
    { text: `✨ ${s.daily.xp} XP`, cls: 'xp' },
    { text: `🪙 ${s.daily.coins >= 0 ? '+' : ''}${s.daily.coins}`, cls: 'coin' },
  ];
  for (const [k, v] of Object.entries(s.daily.stats))
    if (v >= 0.1) chips.push({ text: `${k.toUpperCase()} +${v.toFixed(1)}`, cls: 'stat' });
  if (chest)
    chips.push({ text: `🎁 Quest chest: 🪙${chest.coins} + ${ITEMS[chest.item].icon}`, cls: 'coin' });
  if (allDone && s.questStreak > 1) chips.push({ text: `🔥 ${s.questStreak}-day quest streak`, cls: 'coin' });
  if (decayed.length) chips.push({ text: `📉 Rusty: ${decayed.join(' ')}`, cls: 'bad' });

  const nextDay: GameState = { ...s, day: s.day + 1 };
  let tease = 'Another day at Last Bell University.';
  if (!last) {
    if (St.isFinals(nextDay))
      tease = `⚔️ Tomorrow is FINALS DAY vs ${FINALS[St.term(nextDay)].name}! Rest well.`;
    else if (St.isTestDay(nextDay))
      tease = `📝 Tomorrow: midterm in ${COURSES[St.testCourse(nextDay)].name}.`;
    else if (St.isShowcase(nextDay)) tease = '🎤 Tomorrow: Club Showcase after class!';
    else if (St.dayInTerm(nextDay) === 0 && s.day > 0)
      tease =
        St.term(nextDay) % 2 === 0
          ? `🎓 Next up: ${YEAR_NAMES[St.yearOf(nextDay) - 1]} year begins tomorrow!`
          : '🌸 A fresh new semester begins tomorrow!';
  }
  const trend =
    !rankNow || !s.daily.rankFrom
      ? ''
      : rankNow.rank < s.daily.rankFrom
        ? ' ▲'
        : rankNow.rank > s.daily.rankFrom
          ? ' ▼'
          : ' ＝';
  const rows: [string, string][] = [
    ['Lectures & quizzes', gr.length ? gr.map((x) => x.letter).join(' ') : '—'],
    ['Cohort rank', rankNow ? `#${rankNow.rank} of ${rankNow.total}${trend}` : '—'],
    ['Energy', `${Math.round(s.energy)} / 100`],
  ];
  await ui.results({
    title: `Day ${dayNo} recap`,
    subtitle: dayLabel(s),
    rows,
    chips,
    note: tease,
    buttons: [{ label: last || wasFinals ? 'Continue ▶' : 'Sleep 💤', primary: true }],
  });
  if (wasFinals) await termReport();
  if (last) {
    await ending();
    return;
  }
  s.day++;
  await beginDay(true);
}

async function termReport(): Promise<void> {
  const s = S();
  const t = St.term(s);
  // Lectures you never attended count as a zero for the participation part of the grade.
  for (const id of St.courses(s)) if (!s.records[t].class[id]?.length) St.recordScore(s, 'class', id, 0);
  const rk = St.rankOf(s, t);
  const rows: [string, string][] = [];
  for (const id of St.courses(s)) {
    const c = COURSES[id];
    const sc = St.courseScore(s, t, id);
    rows.push([
      courseLabel(c),
      sc === null ? '—' : `${GRADES.find((g) => sc / 100 >= g.min)?.letter} · ${Math.round(sc)}%`,
    ]);
  }
  const overall = rk ? rk.score : 0;
  const g = gradeOf(overall / 100);
  const gpa = St.gpaOf(overall);
  const comment = PROFESSOR_COMMENTS[g.letter][t % 2];
  const bonus = rk ? (rk.rank === 1 ? 150 : rk.rank <= 3 ? 100 : rk.rank <= 8 ? 60 : 25) : 0;
  St.addCoins(s, bonus);
  s.termReports.push({ term: t, score: overall, rank: rk ? rk.rank : null });
  if (rk && rk.rank === 1) s.flags.rank1 = true;
  const podium = rk
    ? rk.list
        .concat([{ name: s.name, score: overall }])
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((x, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(x.name)} ${Math.round(x.score)}%`)
        .join(' &nbsp; ')
    : '';
  rows.push(['GPA', `${gpa.toFixed(2)} / 4.00`]);
  rows.push(['Overall', `${Math.round(overall)}% · rank #${rk ? rk.rank : '—'} / ${rk ? rk.total : '—'}`]);
  await ui.results({
    title: `📜 Semester ${t + 1} Transcript`,
    subtitle: `${esc(s.name)} · ${YEAR_NAMES[St.yearOf(s) - 1]} year`,
    letter: g.letter,
    color: g.min >= 0.7 ? '#2fd3a0' : '#ffb300',
    rows,
    chips: [{ text: `🪙 Rank bonus +${bonus}`, cls: 'coin' }],
    note: `“${comment}” — Academic Advisor<br>${podium}`,
    confetti: g.min >= 0.85,
  });
  await achievements();
}

/** Pick the graduation ending from the final stats. */
/** Mean friendship across all sixteen students. */
export function averageFriendship(s: GameState): number {
  const all = Object.values(s.friends);
  return all.reduce((a, f) => a + f.rel, 0) / Math.max(1, all.length);
}

export function pickEnding(s: GameState): { title: string; text: string } {
  const ov = St.overallRank(s);
  const avgRel = averageFriendship(s);
  const goldCount = s.showcase.filter((x) => x.place === 'S').length;
  const rank = ov ? ov.rank : 25;
  const score = ov ? ov.score : 0;
  const clubTop = Math.max(...Object.values(s.clubs).map((c) => St.clubLevel(c.xp)));
  if (rank === 1 && score >= 85) {
    return {
      title: '🎓 Valedictorian',
      text: 'Top of the graduating class! The Dean calls your name first, Rin shakes your hand, and the whole university applauds.',
    };
  }
  if (s.cheated >= 2 && rank <= 5) {
    return {
      title: '😎 Rebel Genius',
      text: 'Rules were more like suggestions. Somehow, you still graduated near the top. The professors are baffled.',
    };
  }
  if (rank <= 3)
    return {
      title: '🏅 Summa Cum Laude',
      text: 'Honours all round! Grad schools are already writing letters. Maya cries happy tears.',
    };
  if (clubTop >= 7 && goldCount >= 2) {
    return {
      title: '🏆 Club Champion',
      text: 'The gym, the stage, and the lab all chant your name. Legends are made after class.',
    };
  }
  if (avgRel >= 45)
    return {
      title: '💖 Social Star',
      text: 'Freshmen and seniors alike sign your graduation cap. Friendships were your greatest score.',
    };
  const first = s.termReports[0]?.rank;
  const lastRank = s.termReports[s.termReports.length - 1]?.rank;
  if (first && lastRank && first - lastRank >= 8) {
    return {
      title: '🚀 Late Bloomer',
      text: 'You climbed rank after rank over four years. Nobody saw it coming except you.',
    };
  }
  return {
    title: '🌱 Survivor',
    text: 'You made it through four years. Not every story needs a trophy — you grew, and that counts.',
  };
}

async function ending(): Promise<void> {
  const s = S();
  const ov = St.overallRank(s);
  const meta = game.meta;
  const avgRel = averageFriendship(s);
  const rank = ov ? ov.rank : 25;
  const score = ov ? ov.score : 0;
  const { title, text } = pickEnding(s);
  meta.endings = [...new Set([...meta.endings, title])];
  meta.bestRank = Math.min(meta.bestRank || 99, rank);
  for (const a of s.unlocks.acc) {
    if (!meta.unlockedAcc.includes(a) && a !== 'none' && a !== 'glasses')
      meta.unlockedAcc = [...meta.unlockedAcc, a];
  }
  St.saveMeta(meta);
  St.clearSave();
  Sound.sfx('win');
  Sound.startMusic('explore');
  const rows: [string, string | number][] = [
    ['Final rank', `#${rank} of ${ov ? ov.total : 25}`],
    ['Overall average', `${Math.round(score)}% · GPA ${St.gpaOf(score).toFixed(2)}`],
    ['Level', s.level],
    ['Gold stars', `${s.stars.length} / 10`],
    ['Friends (avg)', `${Math.round(avgRel)} / 100`],
    ['Achievements', `${Object.keys(s.ach).length} / ${ACHIEVEMENTS.length}`],
  ];
  const pick = await ui.results({
    title: '🎓 Graduation Day',
    subtitle: `${esc(s.name)} · Class of Last Bell University`,
    letter: title.split(' ')[0],
    color: '#ffb300',
    rows,
    chips: [{ text: title, cls: 'coin' }],
    note: text,
    confetti: true,
    buttons: [
      { label: '✨ New Game+ (keep cosmetics, bonus perk)', primary: true },
      { label: 'Title screen' },
    ],
  });
  meta.ngPlus += pick === 0 ? 1 : 0;
  St.saveMeta(meta);
  game.s = null;
  game.onTitle(pick === 0);
}

/* ============================== day start ============================== */
export async function beginDay(fresh: boolean): Promise<void> {
  const s = S();
  s.period = 0;
  s.touched = {};
  s.cancelled = {};
  s.eventDone = false;
  s.canteenSpecial = false;
  s.detention = false;
  s.weather = St.rollWeather(s);
  s.daily = St.freshDaily();
  const rk = St.rankOf(s, St.term(s));
  s.daily.rankFrom = rk ? rk.rank : null;
  if (s.questsDay !== s.day) St.rollQuests(s);
  s.event = St.pickEvent(s, mulberry32(s.day * 4177 + 3 + nameSeed(s)));
  if (fresh) await ui.fade(true, `🌅 Day ${s.day + 1}`, dayLabel(s));
  game.scene.setWeather(s.weather);
  game.scene.teleportToStart();
  game.scene.setPeriod(0, true);
  game.scene.refreshCollectibles();
  refreshHud();
  save();
  await sleep(fresh ? 600 : 100);
  await ui.fade(false);
  Sound.startMusic('explore');
  const newYear = St.dayInTerm(s) === 0 && St.term(s) % 2 === 0;
  await ui.banner(
    St.isFinals(s)
      ? '⚔️ FINALS DAY'
      : newYear
        ? `🎓 ${YEAR_NAMES[St.yearOf(s) - 1]} Year`
        : WEEKDAYS[St.dayInTerm(s)],
    `Semester ${St.term(s) + 1} · ${WEATHER[s.weather]}`,
    1700,
  );
  if (s.day === 0) {
    await ui.say([
      [
        'Dean Hale',
        `Welcome to Last Bell University, ${s.name}! Four years, eight semesters, and a final exam at the end of each one.`,
      ],
      [
        'Dean Hale',
        'Each lecture meets in its own classroom. Walk to the building, step inside, find your seat and press E to sit down.',
      ],
      [
        'Dean Hale',
        'Between lectures you are free: study, join a club, eat lunch, make friends. Watch your energy!',
      ],
      [
        'Dean Hale',
        'Students from every year hang around campus. Seniors give advice, juniors look up to you. Say hello to everyone!',
      ],
      ['Dean Hale', 'And between us… there are gold stars hidden all over campus. Good luck!'],
    ]);
  } else if (newYear) {
    await ui.say([
      [
        'Dean Hale',
        `Welcome back! You are a ${YEAR_NAMES[St.yearOf(s) - 1].toLowerCase()} now. New courses, new professors, new juniors looking up to you.`,
      ],
    ]);
  } else if (s.questStreak >= 2) {
    ui.toast(`🔥 ${s.questStreak}-day quest streak! Finish all quests again for a bonus.`, 'gold', 4200);
  }
  if (St.isTestDay(s))
    ui.toast(`📝 Midterm today: ${COURSES[St.testCourse(s)].name} (period 2)`, 'bad', 5000);
  if (s.rested) ui.toast('😊 Well rested: +2s per question today', 'good', 4200);
  await maybeEvent();
}

/* ============================== interactions (buildings) ============================== */
export interface Interaction {
  label: string;
  run: () => Promise<void>;
  enabled: boolean;
  why: string;
}

/** What each door / object offers right now (label, whether it is usable, and why not). */
export function buildingInteractions(): Record<ZoneId, Interaction> {
  const s = S();
  const k = St.periodKind(s);
  const inClass = k === 'class' || k === 'test' || k === 'final';
  const free = St.isFreeKind(k);
  const tired = s.energy < 15;
  const E = (label: string, run: () => Promise<void>, enabled = true, why = ''): Interaction => ({
    label,
    run,
    enabled,
    why,
  });
  const club = (id: ClubId): Interaction => {
    const C = CLUBS[id];
    const ok = (k === 'after' || k === 'showcase' || k === 'free') && !s.detention && !tired;
    const why = ok
      ? ''
      : s.detention
        ? 'You are on a disciplinary hold today.'
        : tired
          ? 'Too tired for club. Eat or rest first.'
          : inClass
            ? 'Class is in session!'
            : k === 'lunch'
              ? 'Clubs start after class.'
              : 'Closed for the evening.';
    return E(`Join ${C.name}: ${C.game}`, () => doClub(id), ok, why);
  };
  // Which building holds the current lecture (the exam hall for finals), if any.
  const spec = inClass ? classroomSpec(s) : null;
  const here = (b: ClassBuilding): boolean => !!spec && spec.building === b;
  const enterLabel = spec
    ? k === 'final'
      ? `Enter the ${spec.title}`
      : `${k === 'test' ? 'Midterm: ' : ''}Enter ${spec.title} (${spec.sub.replace(/ · .*/, '')})`
    : '';
  const enterWhy = (b: ClassBuilding): string =>
    spec
      ? `Your lecture is in ${BUILDING_NAME[spec.building]} (${spec.room}), not here.`
      : free
        ? 'Lectures are over for now.'
        : b === 'main'
          ? 'Not time for class yet.'
          : 'Closed for the evening.';
  return {
    main: E(
      here('main') ? enterLabel : 'Hale Hall (lecture halls)',
      enterClassroom,
      here('main'),
      enterWhy('main'),
    ),
    library: E(
      'Study in the Library',
      doLibrary,
      free,
      inClass ? 'Class is in session!' : 'The library has closed.',
    ),
    canteen: E(
      k === 'lunch' ? 'Eat lunch / shop' : 'Canteen & shop',
      doCanteen,
      free || k === 'evening',
      'Class is in session!',
    ),
    lab: here('lab') ? E(enterLabel, enterClassroom, true) : club('science'),
    music: club('music'),
    gym: club('sports'),
    roof: E(
      inClass ? 'Sneak to the rooftop…' : 'Relax on the rooftop',
      doRooftop,
      k !== 'evening' && k !== 'final',
      k === 'final' ? 'No sneaking out of finals!' : 'The roof is locked at night.',
    ),
    gate: E(
      k === 'evening' ? 'Go home & end the day' : 'Go home early',
      doHome,
      !inClass,
      'You can’t leave during class.',
    ),
    notice: E('Check the notice board', doNotice),
  };
}

/** Things the player can use inside a classroom. */
export function roomInteractions(): { seat: Interaction; exit: Interaction; prof: Interaction } {
  const s = S();
  const k = St.periodKind(s);
  const inClass = k === 'class' || k === 'test' || k === 'final';
  const spec = classroomSpec(s);
  const name = (() => {
    const id = St.classCourse(s);
    return id ? COURSES[id].name : 'the exam';
  })();
  return {
    seat: {
      label:
        k === 'test'
          ? 'Sit down for the midterm'
          : k === 'final'
            ? 'Take your seat for finals'
            : `Sit down: ${name}`,
      run: attendClass,
      enabled: inClass,
      why: 'No lecture is scheduled right now.',
    },
    exit: { label: 'Leave the room', run: leaveClassroom, enabled: true, why: '' },
    prof: {
      label: `Talk to ${spec?.prof ?? 'the professor'}`,
      run: talkProfessor,
      enabled: true,
      why: '',
    },
  };
}

/** Resume a saved game exactly where it was (mid-day, mid-period). */
export async function resume(): Promise<void> {
  const s = S();
  game.scene.setWeather(s.weather);
  game.scene.teleportToStart();
  game.scene.setPeriod(s.period, true);
  game.scene.refreshCollectibles();
  refreshHud();
  await ui.fade(false);
  Sound.startMusic('explore');
  await ui.banner(`Welcome back, ${esc(s.name)}!`, `${dayLabel(s)} · ${PERIODS[s.period].name}`, 1700);
  await maybeEvent();
}
