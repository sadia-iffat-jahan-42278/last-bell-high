// Game content & balance tables. Pure data, no side effects.
import type {
  Relation,
  TalkLine,
  AchievementId,
  ClubId,
  EventId,
  ItemId,
  LetterGrade,
  NpcId,
  PerkId,
  QuestId,
  StatId,
  SubjectId,
} from './types';

export { NPCS } from './npcs';
export * from './courses';

export const SUBJECTS: Record<SubjectId, { name: string; icon: string; color: string }> = {
  cse: { name: 'Computing', icon: '💻', color: '#1aa6a6' },
  eee: { name: 'Electrical', icon: '⚡', color: '#e0a02a' },
  math: { name: 'Mathematics', icon: '📐', color: '#3d7be0' },
  phy: { name: 'Physics', icon: '🔭', color: '#7a4fb5' },
  chem: { name: 'Chemistry', icon: '🧪', color: '#35a85a' },
  hum: { name: 'Humanities', icon: '🏛️', color: '#c23b3b' },
};
export const SUBJECT_IDS = Object.keys(SUBJECTS) as SubjectId[];

/** 4 academic years of 2 semesters each. */
export const TERMS = 8;
/** Mon-Fri, Mon-Tue of the next week, then Finals day. */
export const DAYS_PER_TERM = 8;
export const WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Monday (wk 2)',
  'Tuesday (wk 2)',
  'Finals Day',
];
export const YEAR_NAMES = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
/** The player's academic year (1..4) for semester index `t`. */
export const yearOfTerm = (t: number): number => Math.min(4, Math.floor(t / 2) + 1);

export interface Boss {
  name: string;
  emoji: string;
  color: string;
  blurb: string;
}
/** One finals boss per semester. The subject phases come from that semester's courses (`finalPhases`). */
export const FINALS: Boss[] = [
  { name: 'Professor Pop-Quizzo', emoji: '🦉', color: '#ff7a59', blurb: 'Semester 1 Finals' },
  { name: 'Dr. Deadline', emoji: '⏳', color: '#9b6bff', blurb: 'Semester 2 Finals' },
  { name: 'The Midterm Hydra', emoji: '🐉', color: '#2ec4b6', blurb: 'Semester 3 Finals' },
  { name: 'Count Cram', emoji: '🧛', color: '#c23b3b', blurb: 'Semester 4 Finals' },
  { name: 'The Citation Sphinx', emoji: '🦁', color: '#f0b429', blurb: 'Semester 5 Finals' },
  { name: 'Baron von Bibliography', emoji: '🧐', color: '#3d7be0', blurb: 'Semester 6 Finals' },
  { name: 'The Thesis Titan', emoji: '🗿', color: '#8a8f9a', blurb: 'Semester 7 Finals' },
  { name: 'The Grand Examiner', emoji: '👁️', color: '#ffb300', blurb: 'Graduation Exams' },
];

export interface Period {
  id: number;
  name: string;
  time: string;
  hour: number;
  icon: string;
}
export const PERIODS: Period[] = [
  { id: 0, name: 'Morning Lecture', time: '8:30', hour: 8.5, icon: '🔔' },
  { id: 1, name: 'Late Morning Lecture', time: '10:30', hour: 10.5, icon: '📘' },
  { id: 2, name: 'Lunch Break', time: '12:30', hour: 12.5, icon: '🍱' },
  { id: 3, name: 'Afternoon Lecture', time: '14:00', hour: 14.0, icon: '📗' },
  { id: 4, name: 'After Class', time: '16:30', hour: 16.5, icon: '🎒' },
  { id: 5, name: 'Evening', time: '19:00', hour: 19.0, icon: '🌆' },
];
export const LUNCH_PERIOD = 2;
export const AFTER_PERIOD = 4;
export const EVENING_PERIOD = 5;
export const LAST_PERIOD = 5;

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
  spotlight: { name: 'Spotlight', icon: '🌟', desc: 'All club rewards are 20% bigger.' },
  hint: {
    name: 'Hint Hawk',
    icon: '🦅',
    desc: 'Each question has a 25% chance to auto-remove a wrong answer.',
  },
  lucky: { name: 'Lucky Streak', icon: '🍀', desc: 'Loot chests and daily bonuses are 30% bigger.' },
  scholar: { name: 'Scholar', icon: '🎓', desc: 'Mastery grows 30% faster from every lecture.' },
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
  { id: 'classA', text: 'Score an A or better in a lecture', need: 1, coins: 25, xp: 30 },
  { id: 'classes', text: 'Attend 2 lectures', need: 2, coins: 15, xp: 25 },
  { id: 'star', text: 'Collect a gold star', need: 1, coins: 25, xp: 35 },
  { id: 'talk', text: 'Chat with 2 students', need: 2, coins: 20, xp: 30 },
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
  { id: 'firstA', icon: '🅰️', name: 'Straight A', desc: 'Score an A in any lecture.' },
  { id: 'combo10', icon: '🔥', name: 'On Fire', desc: 'Reach a 10-answer streak.' },
  { id: 'perfectTest', icon: '💯', name: 'Flawless', desc: 'Finish a test with a perfect score.' },
  { id: 'allStars', icon: '⭐', name: 'Star Collector', desc: 'Find all 10 gold stars.' },
  { id: 'cats', icon: '🐱', name: 'Cat Whisperer', desc: 'Pet all 3 campus cats.' },
  { id: 'bff', icon: '💖', name: 'Best Friend', desc: 'Max out a friendship.' },
  { id: 'social', icon: '🦋', name: 'Social Star', desc: 'Reach friendship 50 with 8 different students.' },
  { id: 'rich', icon: '💰', name: 'Pocket Money', desc: 'Hold 400 coins at once.' },
  { id: 'lvl5', icon: '🎖️', name: 'Rising Student', desc: 'Reach level 5.' },
  { id: 'lvl10', icon: '🏅', name: 'Campus Legend', desc: 'Reach level 10.' },
  { id: 'boss', icon: '🗡️', name: 'Exam Slayer', desc: 'Defeat a finals boss.' },
  { id: 'rhythmS', icon: '🎵', name: 'Perfect Pitch', desc: 'Earn an S rank at Music Club.' },
  { id: 'dodge', icon: '🏀', name: 'Untouchable', desc: 'Finish Dodgeball Drill without losing a life.' },
  { id: 'chessAce', icon: '♟️', name: 'Checkmate!', desc: 'Solve every puzzle in a Chess Club session.' },
  { id: 'danceS', icon: '💃', name: 'Show Stopper', desc: 'Earn an S rank at Dance Club.' },
  { id: 'debateS', icon: '🎤', name: 'Silver Tongue', desc: 'Earn an S rank at Debate Club.' },
  { id: 'caught', icon: '🚨', name: 'Busted', desc: 'Get caught cheating or skipping class.' },
  { id: 'rebel', icon: '😎', name: 'Rebel Genius', desc: 'Cheat successfully and still ace the test.' },
  { id: 'rank1', icon: '🥇', name: 'Top of the Class', desc: 'Reach rank 1 on a semester transcript.' },
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
  { id: 'wallet', periods: [2, 4], weight: 2 },
  { id: 'note', periods: [0, 1, 2, 3, 4], weight: 3 },
  { id: 'guest', periods: [1, 3], weight: 2, noTestDay: true, noFinal: true },
  { id: 'fire', periods: [0, 1, 3], weight: 1, noTestDay: true, noFinal: true },
  { id: 'blackout', periods: [1, 3], weight: 1, noTestDay: true, noFinal: true },
  { id: 'special', periods: [2], weight: 2 },
  { id: 'fair', periods: [4], weight: 2 },
];

/* ---------------- clubs ---------------- */
export interface Club {
  name: string;
  icon: string;
  /** Name of the practice activity. */
  game: string;
  /** What the club does, shown by the registrar. */
  blurb: string;
  /** One line for the registration cards. */
  short: string;
  /** The room inside the Club House. */
  room: string;
  /** Main and secondary stat trained by the club. */
  stat: StatId;
  stat2: StatId;
  color: string;
}
/** Students must join one or two of these each semester, never more. */
export const CLUB_MAX = 2;
export const CLUBS: Record<ClubId, Club> = {
  chess: {
    name: 'Chess Club',
    icon: '♟️',
    game: 'Chess Puzzles',
    blurb: 'Solve tactics puzzles on real boards: mates, forks and winning captures.',
    short: 'Solve tactics puzzles',
    room: 'Chess Room',
    stat: 'int',
    stat2: 'foc',
    color: '#5b6577',
  },
  music: {
    name: 'Music Club',
    icon: '🎵',
    game: 'Rhythm Rehearsal',
    blurb: 'Rehearse on stage with a full band: hit the falling notes in time.',
    short: 'Hit the falling notes in time',
    room: 'Music Room',
    stat: 'cre',
    stat2: 'foc',
    color: '#9b59d6',
  },
  dance: {
    name: 'Dance Club',
    icon: '💃',
    game: 'Dance Battle',
    blurb: 'Follow the choreography in the mirrored studio: arrows on the beat.',
    short: 'Follow the arrows on the beat',
    room: 'Dance Studio',
    stat: 'sta',
    stat2: 'cha',
    color: '#ff5fa2',
  },
  debate: {
    name: 'Debate Club',
    icon: '🎤',
    game: 'Debate Round',
    blurb: 'Spot the logical flaw in your opponent’s argument before the judges decide.',
    short: 'Spot the flaw in an argument',
    room: 'Debate Hall',
    stat: 'cha',
    stat2: 'int',
    color: '#3d7be0',
  },
  sports: {
    name: 'Sports Club',
    icon: '🏀',
    game: 'Dodgeball Drill',
    blurb: 'Train on the indoor court: dodge, grab stars and keep your lives.',
    short: 'Dodge balls and grab stars',
    room: 'Sports Hall',
    stat: 'sta',
    stat2: 'foc',
    color: '#ff7a59',
  },
};

/** Which club each of the sixteen students belongs to (they are found in its room after class). */
export const NPC_CLUB: Record<NpcId, ClubId> = {
  rin: 'chess',
  iris: 'chess',
  theo: 'chess',
  zoe: 'music',
  lina: 'music',
  sam: 'music',
  diego: 'dance',
  tessa: 'dance',
  maya: 'dance',
  ava: 'debate',
  marcus: 'debate',
  jack: 'debate',
  kai: 'sports',
  felix: 'sports',
  yuki: 'sports',
  nora: 'sports',
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

export const PROFESSOR_COMMENTS: Record<LetterGrade, [string, string]> = {
  S: ['A pleasure to teach. Truly.', 'Outstanding work this term!'],
  A: ['Strong work. Keep that momentum!', 'Very impressive effort this term.'],
  B: ['Solid progress. Room to shine!', 'Good effort. A bit more focus and you’ll fly.'],
  C: ['Decent term. Study habits could improve.', 'There is potential here. Keep going.'],
  D: ['Needs more consistent study.', 'Let’s work together on the basics.'],
  F: ['Please see me. We can turn this around.', 'A tough term, but it is not over.'],
};

export const xpForLevel = (lvl: number): number => 70 + lvl * 45;

/* ---------------- seniors, peers and juniors ---------------- */
/** Generic chat lines used on top of each friend's own, depending on whether they are older, equal or younger. */
export const RELATION_TALK: Record<Relation, TalkLine[]> = {
  senior: [
    {
      line: 'Advice from someone who has been here longer: never pull an all-nighter before a midterm.',
      a: 'Noted. Thanks for the tip.',
      ra: 'Good. Sleep is a study technique.',
      b: 'Too late, I already bought coffee.',
      rb: 'Ha! Then buy a second one for me.',
    },
    {
      line: 'Senior secret number one: go to office hours. Professors love it when you show up.',
      a: 'I will go this week.',
      ra: 'Do it. Free knowledge, sometimes free cookies.',
      b: 'What if I just email?',
      rb: 'Emails get lost. People get remembered.',
    },
    {
      line: 'When I was your year I thought the library was haunted. It is only very quiet.',
      a: 'Is it actually haunted?',
      ra: 'Only by overdue books.',
      b: 'I think it is haunted too.',
      rb: 'See? You are going to fit right in.',
    },
  ],
  peer: [
    {
      line: 'Which course is crushing you the hardest this semester?',
      a: 'Honestly, all of them.',
      ra: 'Solidarity. Let’s suffer together.',
      b: 'I thrive on pressure. And snacks.',
      rb: 'Admirable. Share the snacks.',
    },
    {
      line: 'Want to start a study group? Misery loves company.',
      a: 'Count me in.',
      ra: 'Great. Bring flashcards and chaos.',
      b: 'Only if there’s pizza.',
      rb: 'Pizza is the foundation of all learning.',
    },
    {
      line: 'Did you see the syllabus for next week? I am pretending I did not.',
      a: 'Let’s read it together.',
      ra: 'Okay, but you hold my hand.',
      b: 'Ignorance is bliss.',
      rb: 'Until Monday. Then it is panic.',
    },
  ],
  junior: [
    {
      line: 'Excuse me, you are ahead of me, right? Any advice for surviving finals?',
      a: 'Start early and sleep more.',
      ra: 'Writing that down! Early. Sleep. Got it.',
      b: 'Just pray. And caffeinate.',
      rb: 'That is honestly my current plan.',
    },
    {
      line: 'People say you are really good at this. Can I ask how you study?',
      a: 'Short sessions, lots of practice.',
      ra: 'Practice. Okay. I can do practice.',
      b: 'Mostly stubbornness.',
      rb: 'Stubbornness I can do!',
    },
    {
      line: 'Everyone in my dorm says you are super chill. Is that the secret?',
      a: 'Chill and organised.',
      ra: 'Organised... I own a planner. I never open it.',
      b: 'No, I am secretly panicking.',
      rb: 'Wow. That is actually comforting.',
    },
  ],
};
