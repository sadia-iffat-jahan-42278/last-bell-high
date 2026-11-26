// The complete, fixed cast of Engineers of the Elite: every person you can meet, each with a personality.
// Nobody else exists: seated classmates, diners, passers-by and staff are all drawn from this list.
import { DEPARTMENTS, FACULTY } from './courses';
import { NPCS } from './npcs';
import { DEPT_IDS, MAJOR_IDS, NPC_IDS, type DeptId, type MajorId, type NpcId, type PersonId } from './types';
import { shuffle, type Rng } from './util';

/** The way you answer someone. Each personality likes some tones and dislikes others. */
export type Tone = 'kind' | 'humour' | 'honest' | 'curious' | 'bold';
export const TONES: Tone[] = ['kind', 'humour', 'honest', 'curious', 'bold'];
export const TONE_NAME: Record<Tone, string> = {
  kind: 'warmth and support',
  humour: 'jokes',
  honest: 'straight talk',
  curious: 'thoughtful questions',
  bold: 'friendly challenges',
};

export type PersonRole = 'friend' | 'student' | 'professor' | 'staff';

export interface Personality {
  /** A short name for the personality, e.g. "The Perfectionist". */
  type: string;
  traits: string[];
  about: string;
  likes: Tone[];
  dislikes: Tone[];
}

export interface Person {
  id: PersonId;
  name: string;
  role: PersonRole;
  /** What they do, always visible. */
  title: string;
  /** The department they study or teach in; staff belong to none. */
  dept?: DeptId;
  emoji: string;
  /** Their own way of starting a conversation. */
  opener: string;
  personality: Personality;
}

type Row = [
  name: string,
  title: string,
  emoji: string,
  type: string,
  traits: string,
  about: string,
  likes: string,
  dislikes: string,
  opener: string,
];

const person = (id: PersonId, role: PersonRole, r: Row): Person => ({
  id,
  role,
  name: r[0],
  title: r[1],
  emoji: r[2],
  opener: r[8],
  personality: {
    type: r[3],
    traits: r[4].split(', '),
    about: r[5],
    likes: r[6].split(' ') as Tone[],
    dislikes: r[7].split(' ') as Tone[],
  },
});

/* ------------------------------------------------------------------------------------------ */
/* The sixteen friends: their names, roles and looks live in `npcs.ts`; personalities here.   */
/* ------------------------------------------------------------------------------------------ */
type FriendRow = [
  type: string,
  traits: string,
  about: string,
  likes: string,
  dislikes: string,
  opener: string,
];
const FRIENDS: Record<NpcId, FriendRow> = {
  maya: [
    'The Quiet Anchor',
    'patient, observant, caring',
    'Listens more than she talks and remembers every detail. Teasing shuts her down; sincerity opens her up.',
    'kind curious',
    'bold',
    'You look like you have had a long day. Want to talk about it?',
  ],
  kai: [
    'The Competitor',
    'energetic, loyal, blunt',
    'Treats everything as a friendly match and respects anyone who answers back.',
    'bold humour',
    'curious',
    'Quick question: if we raced to the gym right now, who wins?',
  ],
  zoe: [
    'The Dreamer',
    'creative, sensitive, intense',
    'Feels everything at full volume. Wants to be asked what her music means, not told what to fix.',
    'curious kind',
    'honest',
    'I have had one melody stuck in my head all morning. Is that normal?',
  ],
  rin: [
    'The Rival',
    'sharp, proud, precise',
    'Has no patience for flattery and secretly enjoys being challenged.',
    'bold honest',
    'kind',
    'I checked the rankings. Did you?',
  ],
  theo: [
    'The Night Coder',
    'dry, curious, easygoing',
    'Answers questions with better questions and laughs at bad puns.',
    'humour curious',
    'bold',
    'My code works and I do not know why. Is that a problem?',
  ],
  lina: [
    'The Storyteller',
    'nosy, lively, honest',
    'Collects everyone’s stories and loves being asked about her own.',
    'curious honest',
    'bold',
    'I am writing a piece on campus life. What is the strangest thing you have seen?',
  ],
  sam: [
    'The Warm Host',
    'cheerful, generous, practical',
    'Runs on good moods. Kindness and a joke go a long way; sharp words do not.',
    'kind humour',
    'honest bold',
    'You look like someone who needs a coffee. Am I right?',
  ],
  diego: [
    'The Hustler',
    'charming, ambitious, playful',
    'Loves a bit of banter and a dare, and gets bored by heart-to-hearts.',
    'humour bold',
    'kind',
    'I have a business idea and it only sounds a little illegal.',
  ],
  iris: [
    'The Analyst',
    'logical, reserved, fair',
    'Wants evidence and clear answers. Jokes tend to miss.',
    'honest curious',
    'humour',
    'I marked forty lab reports today. Please tell me something coherent.',
  ],
  yuki: [
    'The Tinkerer',
    'shy, inventive, focused',
    'Opens up when someone shows real interest in the build; loud challenges make them retreat.',
    'curious kind',
    'bold',
    'Do you want to see what the robot arm learned today?',
  ],
  marcus: [
    'The Diplomat',
    'composed, principled, ambitious',
    'Values considered answers and genuine support. Dislikes being treated as a joke.',
    'honest kind',
    'humour',
    'The council wants opinions. What would you change on campus?',
  ],
  ava: [
    'The Advocate',
    'fierce, quick, candid',
    'Argues for sport and respects people who argue back.',
    'bold honest',
    'kind',
    'Defend this: pineapple belongs on pizza. Go.',
  ],
  felix: [
    'The Organiser',
    'hyper, optimistic, inventive',
    'Runs on enthusiasm. Matching his energy wins him over; cold facts deflate him.',
    'humour curious',
    'honest',
    'Hackathon in three weeks. Please say you are excited.',
  ],
  nora: [
    'The Mentor',
    'wise, direct, nurturing',
    'Likes students who ask good questions and speak plainly.',
    'curious honest',
    'humour',
    'How are you really coping with your courses?',
  ],
  jack: [
    'The Founder',
    'confident, restless, witty',
    'Enjoys people who push back with a grin; sympathy makes him uncomfortable.',
    'bold humour',
    'kind',
    'Pitch me something. You have ten seconds.',
  ],
  tessa: [
    'The Guardian',
    'gentle, responsible, perceptive',
    'Looks after everyone and appreciates kindness in return. Dislikes bravado.',
    'kind honest',
    'bold',
    'Are you sleeping enough? I am asking officially.',
  ],
};

/* ------------------------------------------------------------------------------------------ */
/* Forty classmates, eight from each major: the same people who appear on the grade rankings. */
/* ------------------------------------------------------------------------------------------ */
const STUDENT_ROWS: Row[] = [
  [
    'Aiko',
    'cse',
    '🎨',
    'The Perfectionist',
    'meticulous, quiet, kind',
    'Redraws things until they are exactly right and takes praise seriously.',
    'kind curious',
    'humour',
    'Does this layout look straight to you?',
  ],
  [
    'Ben',
    'cse',
    '📈',
    'The Joker',
    'loud, friendly, careless',
    'Would rather laugh than revise.',
    'humour bold',
    'honest',
    'I studied for four whole minutes. Proud of me?',
  ],
  [
    'Chloe',
    'chem',
    '🌱',
    'The Helper',
    'warm, organised, anxious',
    'Shares her notes with everyone and worries about all of them.',
    'kind honest',
    'bold',
    'Do you need the notes from yesterday?',
  ],
  [
    'Dev',
    'cse',
    '💻',
    'The Debugger',
    'logical, dry, patient',
    'Likes questions that have answers.',
    'curious honest',
    'bold',
    'Name a bug that is not secretly a feature.',
  ],
  [
    'Elena',
    'phy',
    '📜',
    'The Skeptic',
    'sharp, well read, guarded',
    'Checks every claim and trusts people who do the same.',
    'honest curious',
    'humour',
    'Source for that, please.',
  ],
  [
    'Farid',
    'phy',
    '🔭',
    'The Wonderer',
    'dreamy, gentle, curious',
    'Can talk about the night sky until sunrise.',
    'curious kind',
    'bold',
    'Have you ever wondered why the sky is dark at night?',
  ],
  [
    'Grace',
    'math',
    '⚖️',
    'The Achiever',
    'driven, competitive, fair',
    'Keeps score and enjoys a worthy opponent.',
    'bold honest',
    'humour',
    'What did you get on the last quiz?',
  ],
  [
    'Hana',
    'phy',
    '📖',
    'The Romantic',
    'poetic, shy, loyal',
    'Reads on every bench and likes gentle company.',
    'kind curious',
    'bold honest',
    'What was the last book that stayed with you?',
  ],
  [
    'Ivan',
    'math',
    '➗',
    'The Loner',
    'blunt, brilliant, private',
    'Prefers facts to small talk.',
    'honest',
    'kind humour',
    'You are standing in my light.',
  ],
  [
    'Jade',
    'eee',
    '🏃',
    'The Spark',
    'bubbly, fearless, restless',
    'Says yes to every challenge.',
    'bold humour',
    'honest',
    'Race you to the fountain?',
  ],
  [
    'Karim',
    'chem',
    '🩺',
    'The Caretaker',
    'calm, attentive, tired',
    'Notices when people are struggling.',
    'kind honest',
    'humour',
    'Have you eaten today?',
  ],
  [
    'Lena',
    'eee',
    '🎻',
    'The Idealist',
    'passionate, earnest, stubborn',
    'Believes everything should mean something.',
    'curious kind',
    'humour',
    'Why do you think people sing?',
  ],
  [
    'Milo',
    'phy',
    '🖌️',
    'The Free Spirit',
    'whimsical, relaxed, odd',
    'Takes nothing too seriously, least of all timetables.',
    'humour curious',
    'honest',
    'I painted the library cat. The cat disagrees.',
  ],
  [
    'Nadia',
    'eee',
    '💼',
    'The Planner',
    'efficient, polite, firm',
    'Has a colour-coded week and likes people who get to the point.',
    'honest bold',
    'humour',
    'I have seven minutes. What is up?',
  ],
  [
    'Omar',
    'eee',
    '🔧',
    'The Fixer',
    'practical, cheerful, steady',
    'Repairs things nobody asked him to repair.',
    'humour honest',
    'curious',
    'Is your chair wobbly? I have a screwdriver.',
  ],
  [
    'Priya',
    'chem',
    '🧪',
    'The Enthusiast',
    'eager, talkative, bright',
    'Delighted by every experiment and every question about it.',
    'curious humour',
    'bold',
    'Guess what turned bright green today!',
  ],
  [
    'Quinn',
    'math',
    '🤔',
    'The Questioner',
    'thoughtful, contrary, soft-spoken',
    'Answers with another question.',
    'curious bold',
    'kind',
    'But how do you know you are here for a degree?',
  ],
  [
    'Ravi',
    'math',
    '📊',
    'The Realist',
    'measured, honest, wry',
    'Deals in probabilities and plain words.',
    'honest curious',
    'bold',
    'There is a 70% chance that lecture runs over.',
  ],
  [
    'Sofia',
    'cse',
    '📸',
    'The Socialite',
    'chatty, stylish, generous',
    'Knows everyone and loves a compliment.',
    'kind humour',
    'honest',
    'Hold still, the light is perfect.',
  ],
  [
    'Tariq',
    'cse',
    '🗳️',
    'The Debater',
    'argumentative, quick, principled',
    'Happiest mid-disagreement.',
    'bold honest',
    'kind',
    'Pick a side. I will take the other.',
  ],
  [
    'Uma',
    'chem',
    '🧠',
    'The Empath',
    'intuitive, calm, private',
    'Reads moods before words.',
    'kind curious',
    'bold',
    'You seem a bit tense. Shall we sit?',
  ],
  [
    'Victor',
    'eee',
    '💰',
    'The Showman',
    'proud, flashy, competitive',
    'Wants to be impressed, or to impress you.',
    'bold humour',
    'honest',
    'Have I told you about my portfolio?',
  ],
  [
    'Wen',
    'phy',
    '🌙',
    'The Observer',
    'quiet, precise, funny',
    'Says little, and it is usually good.',
    'curious humour',
    'bold',
    'I was awake until three. Jupiter was worth it.',
  ],
  [
    'Zara',
    'math',
    '🏅',
    'The Prodigy',
    'brilliant, restless, direct',
    'Top of the cohort and bored by flattery.',
    'honest bold',
    'kind',
    'Which question did you find hard? Be honest.',
  ],
  [
    'Arif',
    'cse',
    '🕹️',
    'The Night Owl',
    'quiet, focused, sarcastic',
    'Codes after midnight and likes people who skip the small talk.',
    'honest humour',
    'kind',
    'It compiled at 4 a.m. Do not ask how.',
  ],
  [
    'Bella',
    'cse',
    '🎀',
    'The Organiser',
    'cheerful, precise, kind',
    'Runs every group chat and remembers who needs help.',
    'kind honest',
    'bold',
    'I made a revision schedule. For both of us.',
  ],
  [
    'Chen',
    'cse',
    '🧠',
    'The Strategist',
    'calm, competitive, clever',
    'Thinks three moves ahead and respects a good challenge.',
    'bold curious',
    'kind',
    'I bet you cannot solve this in one pass.',
  ],
  [
    'Dina',
    'eee',
    '💡',
    'The Tinkerer',
    'inventive, messy, upbeat',
    'Builds first and reads the manual later, if ever.',
    'humour curious',
    'honest',
    'Smell that? Nothing to worry about. Probably.',
  ],
  [
    'Eshan',
    'eee',
    '🔌',
    'The Careful One',
    'cautious, thorough, loyal',
    'Checks every connection twice and appreciates patience.',
    'kind honest',
    'bold',
    'Did you switch off the supply first?',
  ],
  [
    'Freya',
    'eee',
    '🛰️',
    'The Dreamer',
    'ambitious, curious, warm',
    'Wants to build satellites and loves a good what-if.',
    'curious kind',
    'humour',
    'If you could send one thing into orbit, what would it be?',
  ],
  [
    'Gita',
    'math',
    '🔢',
    'The Patient One',
    'gentle, steady, wise',
    'Explains the same idea five ways without sighing.',
    'kind curious',
    'bold',
    'Shall we go through it once more?',
  ],
  [
    'Hugo',
    'math',
    '🎲',
    'The Gambler',
    'playful, daring, quick',
    'Turns every question into a wager.',
    'bold humour',
    'honest',
    'Two coffees says I finish the sheet first.',
  ],
  [
    'Ines',
    'math',
    '📏',
    'The Purist',
    'exact, serious, frank',
    'Wants a proof, not a feeling.',
    'honest curious',
    'humour',
    'You said it is obvious. Show me.',
  ],
  [
    'Jonas',
    'phy',
    '🧲',
    'The Explainer',
    'talkative, kind, eager',
    'Cannot hear a question without drawing a diagram.',
    'curious kind',
    'bold',
    'Do you know why the sky is blue? Sit down.',
  ],
  [
    'Kira',
    'phy',
    '☄️',
    'The Daredevil',
    'bold, bright, impatient',
    'Likes experiments that go bang and people who keep up.',
    'bold humour',
    'kind',
    'The safety goggles are the boring part. Wear them anyway.',
  ],
  [
    'Liam',
    'phy',
    '📡',
    'The Doubter',
    'skeptical, honest, dry',
    'Trusts error bars more than enthusiasm.',
    'honest curious',
    'humour',
    'What is the uncertainty on that claim?',
  ],
  [
    'Mira',
    'chem',
    '🌸',
    'The Peacemaker',
    'soft-spoken, fair, caring',
    'Smooths over lab arguments before they start.',
    'kind curious',
    'bold',
    'You two looked tense. Everything all right?',
  ],
  [
    'Noor',
    'chem',
    '⚗️',
    'The Fireball',
    'passionate, outspoken, brave',
    'Says exactly what she thinks and expects the same.',
    'bold honest',
    'humour',
    'Do you agree with the new lab rules? I do not.',
  ],
  [
    'Oscar',
    'chem',
    '🧫',
    'The Comedian',
    'funny, relaxed, observant',
    'Defuses exam panic with terrible puns.',
    'humour kind',
    'honest',
    'I would tell a chemistry joke, but I might get no reaction.',
  ],
  [
    'Pia',
    'chem',
    '📓',
    'The Scholar',
    'studious, curious, modest',
    'Reads one chapter ahead and enjoys a thoughtful question.',
    'curious honest',
    'humour',
    'What did you make of the last practical?',
  ],
];

/* ------------------------------------------------------------------------------------------ */
/* Every professor who teaches a course. Their department comes from `FACULTY`.               */
/* ------------------------------------------------------------------------------------------ */
const PROFESSOR_ROWS: Row[] = [
  [
    'Prof. Okafor',
    '',
    '➗',
    'The Encourager',
    'generous, rigorous, upbeat',
    'Believes anyone can learn mathematics if they keep asking.',
    'curious kind',
    'bold',
    'Good, a student with a face full of questions.',
  ],
  [
    'Prof. Lindqvist',
    '',
    '📐',
    'The Minimalist',
    'terse, exact, fair',
    'Prefers one correct sentence to ten hopeful ones.',
    'honest',
    'humour kind',
    'Ask. Briefly.',
  ],
  [
    'Prof. Banerjee',
    '',
    '🧮',
    'The Puzzle Lover',
    'playful, clever, patient',
    'Turns every office hour into a riddle.',
    'humour curious',
    'honest',
    'I have a puzzle for you, if you dare.',
  ],
  [
    'Prof. Castellanos',
    '',
    '∑',
    'The Taskmaster',
    'demanding, proud, just',
    'Respects students who stand their ground.',
    'bold honest',
    'humour',
    'Convince me you did the reading.',
  ],
  [
    'Prof. Nakamura',
    '',
    '🔬',
    'The Experimenter',
    'curious, methodical, kind',
    'Loves a good hypothesis.',
    'curious honest',
    'bold',
    'What did you observe today?',
  ],
  [
    'Prof. Delacroix',
    '',
    '⚗️',
    'The Dramatist',
    'theatrical, witty, passionate',
    'Lectures as if it were opening night.',
    'humour bold',
    'honest',
    'Did you see that spark? Magnificent!',
  ],
  [
    'Prof. Adeyemi',
    '',
    '🧬',
    'The Nurturer',
    'warm, thorough, protective',
    'Checks on students as carefully as on cultures.',
    'kind curious',
    'bold',
    'How are you finding the workload?',
  ],
  [
    'Prof. Whitfield',
    '',
    '🔭',
    'The Absent-Minded',
    'brilliant, vague, gentle',
    'Forgets names, never forgets an interesting question.',
    'curious humour',
    'bold',
    'Ah, you. Yes. Were we talking about comets?',
  ],
  [
    'Prof. Sorensen',
    '',
    '🌡️',
    'The Sceptic',
    'dry, strict, honest',
    'Has seen every excuse and accepts none.',
    'honest',
    'humour kind',
    'Is this about an extension?',
  ],
  [
    'Prof. Hartwell',
    '',
    '📚',
    'The Classicist',
    'formal, eloquent, kindly',
    'Appreciates courtesy and careful thought.',
    'kind curious',
    'humour bold',
    'Do come in. What are you reading?',
  ],
  [
    'Prof. Moreau',
    '',
    '✒️',
    'The Provocateur',
    'sharp, ironic, lively',
    'Wants students to disagree, well.',
    'bold humour',
    'kind',
    'Tell me why my favourite novel is bad.',
  ],
  [
    'Prof. Abernathy',
    '',
    '🖋️',
    'The Confidant',
    'soft-spoken, perceptive, candid',
    'Treats drafts and people gently but truthfully.',
    'honest kind',
    'bold',
    'How is the writing going, truly?',
  ],
  [
    'Prof. Karlsson',
    '',
    '🗿',
    'The Storyteller',
    'rambling, vivid, jovial',
    'Never tells a short anecdote.',
    'curious humour',
    'honest',
    'Did I ever tell you about the siege? Sit down.',
  ],
  [
    'Prof. Villanueva',
    '',
    '🏺',
    'The Activist',
    'passionate, principled, direct',
    'Cares what chemistry does to the world.',
    'honest bold',
    'humour',
    'Would you pour that down the sink? Think first.',
  ],
  [
    'Prof. Oyelaran',
    '',
    '📜',
    'The Sage',
    'calm, wise, patient',
    'Rewards people who listen and ask.',
    'curious kind',
    'bold',
    'Take your time. What puzzles you?',
  ],
  [
    'Prof. Brandt',
    '',
    '🧾',
    'The Stickler',
    'exacting, punctual, wry',
    'Labels everything, including the labels.',
    'honest curious',
    'humour',
    'You have a datasheet for that, I trust.',
  ],
  [
    'Prof. Turing-Reyes',
    '',
    '🖥️',
    'The Visionary',
    'imaginative, intense, open',
    'Always three technologies ahead.',
    'curious bold',
    'kind',
    'What would you build if nothing stopped you?',
  ],
  [
    'Prof. Zhao',
    '',
    '⌨️',
    'The Engineer',
    'practical, brisk, fair',
    'Likes working code and plain answers.',
    'honest',
    'kind humour',
    'Does it compile?',
  ],
  [
    'Prof. Lovelace-Kim',
    '',
    '🧩',
    'The Coach',
    'encouraging, energetic, funny',
    'Cheers every small win.',
    'humour kind',
    'bold',
    'Show me what you got working!',
  ],
  [
    'Prof. Petrov',
    '',
    '🔐',
    'The Cryptic',
    'secretive, dry, clever',
    'Enjoys a challenge and distrusts compliments.',
    'bold curious',
    'kind',
    'You first. What do you think I want to hear?',
  ],
  [
    'Prof. Marchetti',
    '',
    '💶',
    'The Charmer',
    'sociable, witty, shrewd',
    'Explains circuits over espresso.',
    'humour bold',
    'honest',
    'There is no free energy, but there is coffee.',
  ],
  [
    'Prof. Osei',
    '',
    '📉',
    'The Pragmatist',
    'grounded, generous, frank',
    'Asks what a design is good for in real life.',
    'honest kind',
    'bold',
    'What problem are you actually trying to solve?',
  ],
  [
    'Prof. Fairbanks',
    '',
    '🏦',
    'The Old Guard',
    'traditional, stern, loyal',
    'Warms slowly to those who show respect and effort.',
    'kind honest',
    'humour bold',
    'In my day we read the whole chapter.',
  ],
];

/* ------------------------------------------------------------------------------------------ */
/* Staff.                                                                                     */
/* ------------------------------------------------------------------------------------------ */
const STAFF_ROWS: [string, Row][] = [
  [
    'x_dean',
    [
      'Dean Hale',
      'Dean of Students',
      '🎩',
      'The Statesman',
      'formal, fair, far-sighted',
      'Wants honesty and ambition from every student.',
      'honest bold',
      'humour',
      'And how is my university treating you?',
    ],
  ],
  [
    'x_security',
    [
      'Campus Security',
      'Security officer',
      '👮',
      'The Watchman',
      'strict, tired, decent',
      'Has heard every excuse. Straightforward people get along fine.',
      'honest kind',
      'bold humour',
      'Everything all right here?',
    ],
  ],
  [
    'x_clerk',
    [
      'Registrar Clerk',
      'Registrar’s office',
      '🧑‍💼',
      'The Archivist',
      'tidy, shy, helpful',
      'Brightens at a polite word.',
      'kind curious',
      'bold',
      'Do you have your student number?',
    ],
  ],
  [
    'x_manager',
    [
      'Café Manager',
      'Runs the canteen',
      '👩‍🍳',
      'The Matriarch',
      'hearty, bossy, generous',
      'Feeds people first and asks questions later.',
      'kind humour',
      'bold',
      'You are too thin. What did you have for breakfast?',
    ],
  ],
  [
    'x_chef',
    [
      'Chef Marco',
      'Head chef',
      '👨‍🍳',
      'The Artist',
      'fiery, proud, funny',
      'Take the food seriously and him less so.',
      'curious humour',
      'honest',
      'Taste with your eyes first. What do you see?',
    ],
  ],
  [
    'x_cook',
    [
      'Cook Bruno',
      'Kitchen cook',
      '🍳',
      'The Grump',
      'gruff, hard-working, soft-hearted',
      'Respects people who say what they mean.',
      'honest bold',
      'curious',
      'What? The soup is not ready.',
    ],
  ],
  [
    'x_coordinator',
    [
      'Club Coordinator',
      'Runs the Club House',
      '📋',
      'The Cheerleader',
      'upbeat, organised, tireless',
      'Loves enthusiasm and showing up.',
      'kind bold',
      'honest',
      'Have you been to your club this week?',
    ],
  ],
  [
    'x_captain',
    [
      'Club Captain',
      'Student club captain',
      '📣',
      'The Hype Leader',
      'loud, loyal, competitive',
      'Runs on noise and expects the same energy back.',
      'bold humour',
      'honest',
      'Louder! Which club is the best?',
    ],
  ],
];

const slug = (name: string): string =>
  name
    .toLowerCase()
    .replace(/^prof\. /, '')
    .replace(/[^a-z]+/g, '');

export const FRIEND_PEOPLE: Person[] = NPC_IDS.map((id) => {
  const f = FRIENDS[id];
  const N = NPCS[id];
  const title = `${N.role} · ${DEPARTMENTS[N.major].short} student`;
  const p = person(id, 'friend', [N.name, title, N.emoji, f[0], f[1], f[2], f[3], f[4], f[5]]);
  return { ...p, dept: N.major };
});
export const STUDENTS: Person[] = STUDENT_ROWS.map((r) => {
  const dept = r[1] as MajorId;
  const p = person(`s_${slug(r[0])}`, 'student', r);
  return { ...p, dept, title: `${DEPARTMENTS[dept].short} student` };
});
export const PROFESSORS: Person[] = PROFESSOR_ROWS.map((r) => {
  const dept = DEPT_IDS.find((d) => FACULTY[d].includes(r[0]));
  if (!dept) throw new Error(`${r[0]} belongs to no department`);
  const p = person(`p_${slug(r[0])}`, 'professor', r);
  return { ...p, dept, title: `${DEPARTMENTS[dept].short} professor` };
});
export const STAFF: Person[] = STAFF_ROWS.map(([id, r]) => person(id, 'staff', r));

/** Everybody, by id. A friend's person id is their `NpcId`. */
export const PEOPLE: Record<PersonId, Person> = Object.fromEntries(
  [...FRIEND_PEOPLE, ...STUDENTS, ...PROFESSORS, ...STAFF].map((p) => [p.id, p]),
);
export const PERSON_IDS: PersonId[] = Object.keys(PEOPLE);
export const professorId = (name: string): PersonId | null =>
  PROFESSORS.find((p) => p.name === name)?.id ?? null;

/** The majors a classmate can belong to, for filtering. */
export const studentsOf = (major: MajorId): Person[] => STUDENTS.filter((s) => s.dept === major);

/**
 * `count` different classmates in a random order (at most all of them). With `majors`, only students of those
 * departments: the people who really take that class.
 */
export function pickStudents(rng: Rng, count: number, majors: readonly MajorId[] = MAJOR_IDS): PersonId[] {
  return shuffle(
    STUDENTS.filter((p) => majors.includes(p.dept as MajorId)).map((p) => p.id),
    rng,
  ).slice(0, count);
}

/* ------------------------------------------------------------------------------------------ */
/* The two scores. Interaction only ever grows; Relationship swings between -100 and +100.    */
/* ------------------------------------------------------------------------------------------ */
/** Interaction points needed before you can see someone's personality. */
export const PERSONALITY_AT = 30;
export const INTERACTION_LEVELS: { min: number; name: string }[] = [
  { min: 0, name: 'Stranger' },
  { min: 10, name: 'Acquaintance' },
  { min: PERSONALITY_AT, name: 'Familiar' },
  { min: 80, name: 'Well known' },
  { min: 150, name: 'Old friend of the family' },
];
export const interactionLevel = (points: number): { level: number; name: string } => {
  let level = 0;
  for (let i = 0; i < INTERACTION_LEVELS.length; i++) if (points >= INTERACTION_LEVELS[i].min) level = i;
  return { level, name: INTERACTION_LEVELS[level].name };
};

export const relationshipLabel = (rel: number): { name: string; icon: string } =>
  rel <= -50
    ? { name: 'Hostile', icon: '💢' }
    : rel <= -15
      ? { name: 'Cold', icon: '🥶' }
      : rel < 15
        ? { name: 'Neutral', icon: '😐' }
        : rel < 40
          ? { name: 'Friendly', icon: '🙂' }
          : rel < 75
            ? { name: 'Close', icon: '😊' }
            : { name: 'Devoted', icon: '💖' };

/* ------------------------------------------------------------------------------------------ */
/* Conversations: pick a reply; how it lands depends on who you are talking to.               */
/* ------------------------------------------------------------------------------------------ */
export type ReplyTone = Tone | 'dismissive';
export type Mood = 'liked' | 'fine' | 'disliked' | 'rude';

export const REPLIES: Record<ReplyTone, string[]> = {
  kind: [
    'That sounds like a lot. How are you holding up?',
    'You are doing better than you think.',
    'I am glad you said that. Can I help?',
  ],
  humour: [
    'Sounds like a job for snacks and bad jokes.',
    'If it gets worse, we blame the printer.',
    'I would help, but I am busy being hilarious.',
  ],
  honest: [
    'Honestly? I think you are overthinking it.',
    'Straight answer: start with the hard part.',
    'I will be blunt, I see it differently.',
  ],
  curious: [
    'Interesting. What made you think of that?',
    'Tell me more. How did it start?',
    'What would you do differently next time?',
  ],
  bold: ['Bet you I could do it faster.', 'Challenge accepted. Loser buys coffee.', 'Prove it.'],
  dismissive: ['Sorry, I am really not interested.', 'Not my problem.', 'Can we skip this?'],
};
export const REACTIONS: Record<Mood, string[]> = {
  liked: [
    'That is exactly what I needed to hear.',
    'I like talking with you.',
    'You get it. Not many people do.',
  ],
  fine: ['Hm. Fair enough.', 'Right. Well, good to chat.', 'Sure, I can see that.'],
  disliked: [
    'That is not really what I meant.',
    'I would rather you had not said it like that.',
    'Okay… noted.',
  ],
  rude: ['Wow. Fine.', 'Then I will not keep you.', 'That was uncalled for.'],
};
export const RELATION_CHANGE: Record<Mood, number> = { liked: 8, fine: 2, disliked: -7, rude: -10 };

/** Four replies to choose from: three different tones and one brush-off, in random order. */
export function replyOptions(rng: Rng): { tone: ReplyTone; text: string }[] {
  const tones: ReplyTone[] = [...shuffle([...TONES], rng).slice(0, 3), 'dismissive'];
  return shuffle(tones, rng).map((tone) => ({
    tone,
    text: REPLIES[tone][Math.floor(rng() * REPLIES[tone].length)],
  }));
}

/** How a reply of this tone lands with this person. */
export function moodFor(p: Person, tone: ReplyTone): Mood {
  if (tone === 'dismissive') return 'rude';
  if (p.personality.likes.includes(tone)) return 'liked';
  if (p.personality.dislikes.includes(tone)) return 'disliked';
  return 'fine';
}
