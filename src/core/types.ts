// Shared domain types. The whole save file shape lives in `GameState`.

/** Subject areas: they drive question banks and mastery. Courses belong to one area. */
export type SubjectId = 'math' | 'science' | 'english' | 'history' | 'cs' | 'econ';
/** Every friend on campus, four per academic year (Maya/Theo/Lina/Sam are freshmen ... Rin/Nora/Jack/Tessa seniors). */
export const NPC_IDS = [
  'maya',
  'kai',
  'zoe',
  'rin',
  'theo',
  'lina',
  'sam',
  'diego',
  'iris',
  'yuki',
  'marcus',
  'ava',
  'felix',
  'nora',
  'jack',
  'tessa',
] as const;
export type NpcId = (typeof NPC_IDS)[number];
/** A course is identified by a short string such as `calc1`. */
export type CourseId = string;
/** The kind of classroom a course meets in. */
export type RoomKind = 'lecture' | 'seminar' | 'lab' | 'computer';
/** The five department buildings that hold the classrooms: Hale (humanities), Newton (maths), Lovelace (computing), Curie (sciences) and Smith (economics). */
export const DEPT_IDS = ['main', 'math', 'cs', 'lab', 'econ'] as const;
export type ClassBuilding = (typeof DEPT_IDS)[number];
/** How a student stands relative to you: older (senior), same year (peer) or younger (junior). */
export type Relation = 'senior' | 'peer' | 'junior';
/** The five clubs, all housed in the Club House. */
export const CLUB_IDS = ['chess', 'music', 'dance', 'debate', 'sports'] as const;
export type ClubId = (typeof CLUB_IDS)[number];
export type StatId = 'int' | 'foc' | 'sta' | 'cha' | 'cre';
export type ItemId = 'drink' | 'snack' | 'notes' | 'tea' | 'pen' | 'skip' | 'cheat';
export type PerkId =
  | 'speed'
  | 'steady'
  | 'teacher'
  | 'night'
  | 'combo'
  | 'calm'
  | 'social'
  | 'coupon'
  | 'iron'
  | 'pitch'
  | 'spotlight'
  | 'hint'
  | 'lucky'
  | 'scholar';
export type QuestId =
  | 'classA'
  | 'classes'
  | 'star'
  | 'talk'
  | 'canteen'
  | 'study'
  | 'club'
  | 'streak5'
  | 'cat'
  | 'rooftop'
  | 'spend'
  | 'perfect';
export type AchievementId =
  | 'firstA'
  | 'combo10'
  | 'perfectTest'
  | 'allStars'
  | 'cats'
  | 'bff'
  | 'social'
  | 'rich'
  | 'lvl5'
  | 'lvl10'
  | 'boss'
  | 'rhythmS'
  | 'dodge'
  | 'chessAce'
  | 'danceS'
  | 'debateS'
  | 'caught'
  | 'rebel'
  | 'rank1'
  | 'streak3';
export type EventId = 'popquiz' | 'wallet' | 'note' | 'guest' | 'fire' | 'blackout' | 'special' | 'fair';

export type Weather = 'sunny' | 'cloudy' | 'rain';
export type RecordKind = 'class' | 'test' | 'final';
export type PeriodKind = 'class' | 'test' | 'final' | 'lunch' | 'after' | 'showcase' | 'free' | 'evening';
/** Friend perks that stack numerically (see `friendBonus`). */
export type BonusKey =
  'timePlus' | 'xpPct' | 'coinPct' | 'shopPct' | 'restPlus' | 'stressRelief' | 'masteryPct' | 'hintPlus';
export type LetterGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type Accessory = 'none' | 'glasses' | 'cap' | 'headphones' | 'beanie' | 'bow' | 'crown';
export type HairStyle = 'short' | 'long' | 'pony' | 'spiky' | 'bun' | 'bob';
/** Building / zone ids the player can interact with. */
export type ZoneId = ClassBuilding | 'library' | 'canteen' | 'club' | 'roof' | 'gate' | 'notice';

export interface Look {
  skin: number;
  hairStyle: HairStyle;
  hair: number;
  blazer: number;
  bag: number;
  acc: Accessory;
  pants?: number;
  tie?: number;
}

/** One multiple-choice question as shown to the player. `ans` indexes `opts`. */
export interface Question {
  q: string;
  opts: string[];
  ans: number;
  /** Subject area (colours and mastery). */
  subject: SubjectId;
  /** The course this question belongs to, when it was drawn from one. */
  course?: CourseId;
  /** Difficulty 1..4. */
  tier?: number;
}

export type BoolFlag =
  | 'rinWager'
  | 'rinFriend'
  | 'rinNemesis'
  | 'rebel'
  | 'rank1'
  | 'rhythmS'
  | 'dodgeFlawless'
  | 'chessAce'
  | 'danceS'
  | 'debateS';
export type Flags = Partial<Record<BoolFlag, boolean>> & { sleep?: 'early' | 'late' | 'game' };

export interface QuestProgress {
  id: QuestId;
  need: number;
  prog: number;
  done: boolean;
}

export interface Daily {
  xp: number;
  coins: number;
  stats: Partial<Record<StatId, number>>;
  grades: { kind: string; subj: SubjectId | undefined; letter: LetterGrade }[];
  rankFrom: number | null;
  notes: string[];
}

/** Scores (0..1) per course id. */
export type ScoreList = Partial<Record<CourseId, number[]>>;
export interface TermRecord {
  class: ScoreList;
  test: ScoreList;
  final: ScoreList;
}

export type Gender = 'female' | 'male' | 'nonbinary';
/** Anyone in the cast: a friend's `NpcId`, or `s_…` (student), `p_…` (professor), `x_…` (staff). */
export type PersonId = string;

/** The two scores you have with every person. */
export interface Bond {
  /** Interaction points: how much you have had to do with them. Only ever grows. */
  interaction: number;
  /** Relationship points, from -100 (hostile) to +100 (devoted). */
  rel: number;
  /** Day of your last conversation. */
  talked: number;
}

export interface FriendState {
  /** Interaction points (only ever grows). */
  interaction: number;
  /** Relationship points, from -100 to +100. */
  rel: number;
  story: number;
  talked: number;
  gift: number;
}

export interface ActiveEvent {
  id: EventId;
  period: number;
}

export interface Totals {
  correct: number;
  answered: number;
  maxCombo: number;
  perfects: number;
  classes: number;
  tests: number;
  aCount: number;
  perfectTests: number;
  bosses: number;
  daysPlayed: number;
}

export interface Unlocks {
  hair: number[];
  blazer: number[];
  bag: number[];
  acc: Accessory[];
}

export interface GameState {
  v: 2;
  name: string;
  gender: Gender;
  look: Look;
  day: number;
  period: number;
  coins: number;
  energy: number;
  stress: number;
  xp: number;
  level: number;
  perks: PerkId[];
  pendingPerks: number;
  stats: Record<StatId, number>;
  mastery: Record<SubjectId, number>;
  touched: Partial<Record<SubjectId, boolean>>;
  records: TermRecord[];
  clubs: Record<ClubId, { xp: number; best: number }>;
  /** Clubs joined in each semester (1 or 2, chosen at registration; joining is mandatory). */
  memberships: ClubId[][];
  /** Club sessions attended in each semester. */
  sessions: Partial<Record<ClubId, number>>[];
  /** Questions already asked, as hashes per course (or subject area), so quizzes do not repeat. */
  seenQ: Record<string, number[]>;
  showcase: { term: number; club: ClubId; place: LetterGrade }[];
  friends: Record<NpcId, FriendState>;
  /** Your two scores with everyone who is not one of the sixteen friends. */
  people: Record<PersonId, Bond>;
  items: Partial<Record<ItemId, number>>;
  stars: number[];
  cats: number[];
  catDay: Record<number, number>;
  unlocks: Unlocks;
  quests: QuestProgress[];
  questsDay: number;
  questStreak: number;
  flags: Flags;
  ach: Partial<Record<AchievementId, number>>;
  daily: Daily;
  weather: Weather;
  event: ActiveEvent | null;
  eventDone: boolean;
  cancelled: Record<number, boolean>;
  rep: number;
  cheated: number;
  caught: number;
  totals: Totals;
  termReports: { term: number; score: number; rank: number | null }[];
  rested: boolean;
  detention: boolean;
  canteenSpecial: boolean;
  clubBoost: boolean;
  revealedStar: number;
  /** Day on which the player last chatted with each professor (by course id). */
  profDay: Record<CourseId, number>;
  created: number;
}

/** Persistent data that survives across playthroughs. */
export interface Meta {
  settings: { music: number; sfx: number; quality: number };
  ngPlus: number;
  endings: string[];
  bestRank: number;
  unlockedAcc: Accessory[];
  seenHelp: boolean;
}

/* ---------- content table shapes ---------- */
export interface Fx {
  coins?: number;
  xp?: number;
  items?: Partial<Record<ItemId, number>>;
  stat?: Partial<Record<StatId, number>>;
  rel?: number;
  stress?: number;
  rep?: number;
  flag?: BoolFlag;
}
export interface BeatOption {
  label: string;
  result: string[];
  fx: Fx;
}
export interface Beat {
  at: number;
  title: string;
  scene: [string, string][];
  prompt: string;
  options: BeatOption[];
}
export interface TalkLine {
  line: string;
  a: string;
  ra: string;
  b: string;
  rb: string;
}
export interface Npc {
  name: string;
  /** Academic year 1 (freshman) .. 4 (senior). */
  year: 1 | 2 | 3 | 4;
  major: string;
  role: string;
  emoji: string;
  color: string;
  bio: string;
  /** `bonus` perks are applied by `friendBonus`; the older hand-coded perks have no bonus. */
  perks: { need: number; text: string; bonus?: Partial<Record<BonusKey, number>> }[];
  talk: TalkLine[];
  beats: Beat[];
}
export interface BankItem {
  t: 1 | 2 | 3 | 4;
  q: string;
  a: string;
  w: string[];
}
