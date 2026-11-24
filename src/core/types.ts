// Shared domain types. The whole save file shape lives in `GameState`.

export type SubjectId = 'math' | 'science' | 'english' | 'history';
export type NpcId = 'maya' | 'kai' | 'zoe' | 'rin';
export type ClubId = 'sports' | 'music' | 'science';
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
  | 'eureka'
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
  | 'eureka'
  | 'caught'
  | 'rebel'
  | 'rank1'
  | 'streak3';
export type EventId = 'popquiz' | 'wallet' | 'note' | 'guest' | 'fire' | 'blackout' | 'special' | 'fair';

export type Weather = 'sunny' | 'cloudy' | 'rain';
export type RecordKind = 'class' | 'test' | 'final';
export type PeriodKind = 'class' | 'test' | 'final' | 'lunch' | 'after' | 'showcase' | 'free' | 'evening';
export type LetterGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
export type Accessory = 'none' | 'glasses' | 'cap' | 'headphones' | 'beanie' | 'bow' | 'crown';
export type HairStyle = 'short' | 'long' | 'pony' | 'spiky' | 'bun' | 'bob';
/** Building / zone ids the player can interact with. */
export type ZoneId = 'main' | 'library' | 'canteen' | 'lab' | 'music' | 'gym' | 'roof' | 'gate' | 'notice';

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
  subject: SubjectId;
}

export type BoolFlag =
  'rinWager' | 'rinFriend' | 'rinNemesis' | 'rebel' | 'rank1' | 'rhythmS' | 'dodgeFlawless' | 'lab7';
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

export type ScoreList = Partial<Record<SubjectId, number[]>>;
export interface TermRecord {
  class: ScoreList;
  test: ScoreList;
  final: ScoreList;
}

export interface FriendState {
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
  v: 1;
  name: string;
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
  showcase: { term: number; club: ClubId; place: LetterGrade }[];
  friends: Record<NpcId, FriendState>;
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
  role: string;
  emoji: string;
  color: string;
  bio: string;
  perks: { need: number; text: string }[];
  talk: TalkLine[];
  beats: Beat[];
}
export interface BankItem {
  t: 1 | 2 | 3 | 4;
  q: string;
  a: string;
  w: string[];
}
