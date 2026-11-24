// Game content & balance tables. Pure data, no side effects.
import type {
  AchievementId,
  ClubId,
  EventId,
  ItemId,
  LetterGrade,
  PerkId,
  QuestId,
  StatId,
  SubjectId,
} from './types';

export { BANK } from './bank';
export { NPCS } from './npcs';

export const SUBJECTS: Record<SubjectId, { name: string; icon: string; color: string }> = {
  math: { name: 'Math', icon: '➗', color: '#ff7a59' },
  science: { name: 'Science', icon: '🔬', color: '#2ec4b6' },
  english: { name: 'English', icon: '📖', color: '#9b6bff' },
  history: { name: 'History', icon: '🏛️', color: '#f0b429' },
};
export const SUBJECT_IDS = Object.keys(SUBJECTS) as SubjectId[];

export const TERMS = 3;
export const DAYS_PER_TERM = 6; // Mon-Fri + Finals day
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export type TimetableSlot = SubjectId | 'TEST';
export const TIMETABLE: TimetableSlot[][] = [
  ['math', 'english'],
  ['science', 'history'],
  ['english', 'TEST'],
  ['math', 'science'],
  ['history', 'math'],
];
export const TEST_SUBJECT: SubjectId[] = ['math', 'science', 'history'];

export interface Boss {
  name: string;
  emoji: string;
  color: string;
  phases: SubjectId[];
  blurb: string;
}
export const FINALS: Boss[] = [
  {
    name: 'Professor Pop-Quizzo',
    emoji: '🦉',
    color: '#ff7a59',
    phases: ['math', 'english', 'science'],
    blurb: 'Term 1 Finals',
  },
  {
    name: 'Dr. Deadline',
    emoji: '⏳',
    color: '#9b6bff',
    phases: ['science', 'history', 'math'],
    blurb: 'Term 2 Finals',
  },
  {
    name: 'The Grand Examiner',
    emoji: '👁️',
    color: '#f0b429',
    phases: ['math', 'english', 'science', 'history'],
    blurb: 'Final Exams',
  },
];

export interface Period {
  id: number;
  name: string;
  time: string;
  hour: number;
  icon: string;
}
export const PERIODS: Period[] = [
  { id: 0, name: 'Morning Class', time: '8:00', hour: 8.0, icon: '🔔' },
  { id: 1, name: 'Late Morning', time: '10:15', hour: 10.25, icon: '📘' },
  { id: 2, name: 'Lunch Break', time: '12:30', hour: 12.5, icon: '🍱' },
  { id: 3, name: 'After School', time: '15:30', hour: 15.5, icon: '🎒' },
  { id: 4, name: 'Evening', time: '19:00', hour: 19.0, icon: '🌆' },
];

/* ---------------- items ---------------- */
export interface Item {
  name: string;
  icon: string;
  price: number;
  use: string;
  consumable?: boolean;
  prep?: boolean;
  risky?: boolean;
}
export const ITEMS: Record<ItemId, Item> = {
  drink: {
    name: 'Energy Drink',
    icon: '⚡',
    price: 15,
    use: 'Restores 35 energy anytime.',
    consumable: true,
  },
  snack: {
    name: 'Snack Box',
    icon: '🍙',
    price: 8,
    use: '+15 energy, −8 stress. Also a lovely gift for friends (+10 friendship).',
    consumable: true,
  },
  notes: {
    name: 'Study Notes',
    icon: '📒',
    price: 20,
    use: 'Bring to a test or final: +1 "50:50" power-up.',
    prep: true,
  },
  tea: {
    name: 'Focus Tea',
    icon: '🍵',
    price: 25,
    use: 'Bring to a test or final: +5s on every question.',
    prep: true,
  },
  pen: {
    name: 'Lucky Pen',
    icon: '🖊️',
    price: 30,
    use: 'Bring to a test or final: your first mistake is forgiven.',
    prep: true,
  },
  skip: {
    name: 'Skip Pass',
    icon: '🎫',
    price: 40,
    use: 'Bring to a test or final: skip one question (counts as correct).',
    prep: true,
  },
  cheat: {
    name: 'Cheat Sheet',
    icon: '📄',
    price: 35,
    use: 'Tests only: auto-answers 2 questions. 30% chance you get caught!',
    prep: true,
    risky: true,
  },
};

/* ---------------- perks ---------------- */
export const PERKS: Record<PerkId, { name: string; icon: string; desc: string }> = {
  speed: { name: 'Speed Reader', icon: '⏩', desc: '+3 seconds on every question.' },
  steady: {
    name: 'Steady Hands',
    icon: '🖐️',
    desc: 'Your first mistake in each quiz does not break your combo.',
  },
  teacher: { name: 'Teacher’s Pet', icon: '🍎', desc: '+12% XP from everything.' },
  night: {
    name: 'Night Owl',
    icon: '🦉',
    desc: 'Late-night study gives +50% mastery and costs less energy.',
  },
  combo: { name: 'Combo King', icon: '👑', desc: 'Combo multiplier cap rises from ×2.0 to ×2.6.' },
  calm: { name: 'Calm Under Pressure', icon: '🧘', desc: 'Stress gains are cut by 40%.' },
  social: { name: 'Social Butterfly', icon: '🦋', desc: 'Friendship grows 50% faster.' },
  coupon: { name: 'Coupon Clipper', icon: '🏷️', desc: 'Shop prices are 20% lower.' },
  iron: { name: 'Iron Lungs', icon: '🫁', desc: 'Activities cost 25% less energy.' },
  pitch: { name: 'Perfect Pitch', icon: '🎼', desc: 'Rhythm timing windows are 15% wider.' },
  eureka: { name: 'Eureka!', icon: '💡', desc: 'Science club gives an extra replay and a second chance.' },
  hint: {
    name: 'Hint Hawk',
    icon: '🦅',
    desc: 'Each question has a 25% chance to auto-remove a wrong answer.',
  },
  lucky: { name: 'Lucky Streak', icon: '🍀', desc: 'Loot chests and daily bonuses are 30% bigger.' },
  scholar: { name: 'Scholar', icon: '🎓', desc: 'Mastery grows 30% faster from every lesson.' },
};

/* ---------------- quests, achievements, events ---------------- */
export interface QuestDef {
  id: QuestId;
  text: string;
  need: number;
  coins: number;
  xp: number;
}
export const QUESTS: QuestDef[] = [
  { id: 'classA', text: 'Score an A or better in class', need: 1, coins: 25, xp: 30 },
  { id: 'classes', text: 'Attend 2 lessons', need: 2, coins: 15, xp: 25 },
  { id: 'star', text: 'Collect a gold star', need: 1, coins: 25, xp: 35 },
  { id: 'talk', text: 'Chat with 2 friends', need: 2, coins: 20, xp: 30 },
  { id: 'canteen', text: 'Eat lunch at the canteen', need: 1, coins: 15, xp: 20 },
  { id: 'study', text: 'Study in the library', need: 1, coins: 20, xp: 30 },
  { id: 'club', text: 'Finish a club activity', need: 1, coins: 25, xp: 35 },
  { id: 'streak5', text: 'Get a 5-answer streak', need: 1, coins: 25, xp: 35 },
  { id: 'cat', text: 'Pet a campus cat', need: 1, coins: 15, xp: 20 },
  { id: 'rooftop', text: 'Relax on the rooftop', need: 1, coins: 15, xp: 25 },
  { id: 'spend', text: 'Spend 20 coins at the canteen shop', need: 20, coins: 20, xp: 25 },
  { id: 'perfect', text: 'Finish a quiz with no mistakes', need: 1, coins: 30, xp: 40 },
];

export const ACHIEVEMENTS: { id: AchievementId; icon: string; name: string; desc: string }[] = [
  { id: 'firstA', icon: '🅰️', name: 'Straight A', desc: 'Score an A in any lesson.' },
  { id: 'combo10', icon: '🔥', name: 'On Fire', desc: 'Reach a 10-answer streak.' },
  { id: 'perfectTest', icon: '💯', name: 'Flawless', desc: 'Finish a test with a perfect score.' },
  { id: 'allStars', icon: '⭐', name: 'Star Collector', desc: 'Find all 10 gold stars.' },
  { id: 'cats', icon: '🐱', name: 'Cat Whisperer', desc: 'Pet all 3 campus cats.' },
  { id: 'bff', icon: '💖', name: 'Best Friend', desc: 'Max out a friendship.' },
  { id: 'social', icon: '🦋', name: 'Social Star', desc: 'Reach friendship 50 with all four friends.' },
  { id: 'rich', icon: '💰', name: 'Pocket Money', desc: 'Hold 400 coins at once.' },
  { id: 'lvl5', icon: '🎖️', name: 'Rising Student', desc: 'Reach level 5.' },
  { id: 'lvl10', icon: '🏅', name: 'Campus Legend', desc: 'Reach level 10.' },
  { id: 'boss', icon: '🗡️', name: 'Exam Slayer', desc: 'Defeat a finals boss.' },
  { id: 'rhythmS', icon: '🎵', name: 'Perfect Pitch', desc: 'Earn an S rank at Music Club.' },
  { id: 'dodge', icon: '🏀', name: 'Untouchable', desc: 'Finish Dodgeball Drill without losing a life.' },
  { id: 'eureka', icon: '🧪', name: 'Eureka!', desc: 'Complete 7 rounds in Science Club.' },
  { id: 'caught', icon: '🚨', name: 'Busted', desc: 'Get caught cheating or skipping class.' },
  { id: 'rebel', icon: '😎', name: 'Rebel Genius', desc: 'Cheat successfully and still ace the test.' },
  { id: 'rank1', icon: '🥇', name: 'Top of the Class', desc: 'Reach rank 1 on a term report card.' },
  { id: 'streak3', icon: '📅', name: 'Daily Grind', desc: 'Complete all daily quests 3 days in a row.' },
];

export interface EventDef {
  id: EventId;
  periods: number[];
  weight: number;
  noFinal?: boolean;
  noTestDay?: boolean;
}
export const EVENT_POOL: EventDef[] = [
  { id: 'popquiz', periods: [1, 3], weight: 3, noFinal: true },
  { id: 'wallet', periods: [2, 3], weight: 2 },
  { id: 'note', periods: [0, 1, 2, 3], weight: 3 },
  { id: 'guest', periods: [1], weight: 2, noTestDay: true, noFinal: true },
  { id: 'fire', periods: [0, 1], weight: 1, noTestDay: true, noFinal: true },
  { id: 'blackout', periods: [1], weight: 1, noTestDay: true, noFinal: true },
  { id: 'special', periods: [2], weight: 2 },
  { id: 'fair', periods: [3], weight: 2 },
];

/* ---------------- clubs ---------------- */
export interface Club {
  name: string;
  icon: string;
  game: string;
  building: string;
  stat: StatId;
  color: string;
}
export const CLUBS: Record<ClubId, Club> = {
  sports: {
    name: 'Sports Club',
    icon: '🏀',
    game: 'Dodgeball Drill',
    building: 'gym',
    stat: 'sta',
    color: '#ff7a59',
  },
  music: {
    name: 'Music Club',
    icon: '🎵',
    game: 'Rhythm Rehearsal',
    building: 'music',
    stat: 'cre',
    color: '#9b59d6',
  },
  science: {
    name: 'Science Club',
    icon: '🧪',
    game: 'Lab Sequence',
    building: 'lab',
    stat: 'cre',
    color: '#1aa6a6',
  },
};

/** Colours locked until bought: palette index -> price. */
export const COLOR_PRICES: Record<'hair' | 'blazer' | 'bag', Record<number, number>> = {
  hair: { 4: 50, 5: 50, 6: 80 },
  blazer: { 4: 70, 5: 70, 6: 90 },
  bag: { 4: 40 },
};
export const ACC_PRICE: Partial<Record<string, number>> = { beanie: 60, bow: 40 };
export const ACC_LOCK: Partial<Record<string, string>> = {
  cap: 'Find 3 gold stars',
  headphones: 'Find 6 gold stars',
  crown: 'Find all 10 gold stars',
};

/* ---------------- grades ---------------- */
export interface Grade {
  min: number;
  letter: LetterGrade;
  mult: number;
  text: string;
}
export const GRADES: Grade[] = [
  { min: 0.95, letter: 'S', mult: 1.6, text: 'Flawless!' },
  { min: 0.85, letter: 'A', mult: 1.35, text: 'Excellent!' },
  { min: 0.7, letter: 'B', mult: 1.1, text: 'Nice work!' },
  { min: 0.55, letter: 'C', mult: 0.85, text: 'Not bad.' },
  { min: 0.35, letter: 'D', mult: 0.55, text: 'Keep trying.' },
  { min: 0, letter: 'F', mult: 0.3, text: 'Ouch.' },
];
export const gradeOf = (pct: number): Grade => GRADES.find((g) => pct >= g.min) ?? GRADES[GRADES.length - 1];

export const TEACHER_COMMENTS: Record<LetterGrade, [string, string]> = {
  S: ['A pleasure to teach. Truly.', 'Outstanding work this term!'],
  A: ['Strong work. Keep that momentum!', 'Very impressive effort this term.'],
  B: ['Solid progress. Room to shine!', 'Good effort. A bit more focus and you’ll fly.'],
  C: ['Decent term. Study habits could improve.', 'There is potential here. Keep going.'],
  D: ['Needs more consistent study.', 'Let’s work together on the basics.'],
  F: ['Please see me. We can turn this around.', 'A tough term, but it is not over.'],
};

export const xpForLevel = (lvl: number): number => 70 + lvl * 45;
