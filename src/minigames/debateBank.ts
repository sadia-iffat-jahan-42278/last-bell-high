import { hashStr } from '../core/util';

// Debate Club content: the logical fallacies and the flawed arguments the opponent throws at you.

export type FallacyId =
  | 'adhom'
  | 'straw'
  | 'band'
  | 'slope'
  | 'emotion'
  | 'dilemma'
  | 'hasty'
  | 'post'
  | 'auth'
  | 'red'
  | 'circ'
  | 'equiv'
  | 'ignor'
  | 'tuq'
  | 'trad'
  | 'cherry'
  | 'burden'
  | 'scot'
  | 'genetic'
  | 'comp';

export const FALLACIES: Record<FallacyId, { name: string; explain: string }> = {
  adhom: { name: 'Ad hominem', explain: 'It attacks the person instead of answering the argument.' },
  straw: { name: 'Straw man', explain: 'It twists your claim into something easier to knock down.' },
  band: { name: 'Bandwagon', explain: '“Everybody does it” is not evidence that it is right.' },
  slope: {
    name: 'Slippery slope',
    explain: 'It claims one small step must lead to disaster, without proof.',
  },
  emotion: { name: 'Appeal to emotion', explain: 'It uses feelings in place of reasons.' },
  dilemma: { name: 'False dilemma', explain: 'It offers only two options when there are more.' },
  hasty: { name: 'Hasty generalisation', explain: 'It draws a big conclusion from too few examples.' },
  post: { name: 'False cause (post hoc)', explain: 'B came after A, but that does not mean A caused B.' },
  auth: { name: 'Appeal to authority', explain: 'It leans on a famous name instead of evidence.' },
  red: { name: 'Red herring', explain: 'It changes the subject to distract from the question.' },
  circ: { name: 'Circular reasoning', explain: 'The conclusion is used as its own proof.' },
  equiv: { name: 'Equivocation', explain: 'One word is used with two different meanings.' },
  ignor: { name: 'Appeal to ignorance', explain: '“Nobody has disproved it” does not make it true.' },
  tuq: { name: 'Tu quoque (“you too”)', explain: '“You do it as well” does not answer the argument.' },
  trad: { name: 'Appeal to tradition', explain: '“We have always done it” is not a reason.' },
  cherry: { name: 'Cherry-picking', explain: 'It shows only the evidence that suits one side.' },
  burden: {
    name: 'Shifting the burden of proof',
    explain: 'It demands you disprove a claim it never supported.',
  },
  scot: { name: 'No true Scotsman', explain: 'It redefines the group to dodge a counter-example.' },
  genetic: {
    name: 'Genetic fallacy',
    explain: 'It judges an idea by where it came from, not by its merits.',
  },
  comp: {
    name: 'Fallacy of composition',
    explain: 'What is true of the parts is wrongly assumed true of the whole.',
  },
};

export interface DebateArg {
  /** 1 = obvious, 4 = subtle. */
  tier: 1 | 2 | 3 | 4;
  motion: string;
  /** What the opponent says. */
  line: string;
  flaw: FallacyId;
}

export const ARGUMENTS: DebateArg[] = [
  // ---- tier 1: loud and obvious ----
  {
    tier: 1,
    motion: 'Cars should be banned from city centres',
    line: 'Why listen to her? She does not even own a car, so she has no idea what she is talking about.',
    flaw: 'adhom',
  },
  {
    tier: 1,
    motion: 'Uniforms should be compulsory',
    line: 'My opponent wants uniforms? He dyes his hair green, so his opinion on dress codes is worthless.',
    flaw: 'adhom',
  },
  {
    tier: 1,
    motion: 'The library should close earlier on Fridays',
    line: 'My opponent wants earlier closing. So she wants the library shut all week and every student locked out!',
    flaw: 'straw',
  },
  {
    tier: 1,
    motion: 'Schools should start later in the morning',
    line: 'He says teenagers need more sleep, so apparently he wants us to skip school entirely.',
    flaw: 'straw',
  },
  {
    tier: 1,
    motion: 'Social media use should be limited for teenagers',
    line: 'Millions of people scroll all day long, so it must be perfectly healthy for teenagers.',
    flaw: 'band',
  },
  {
    tier: 1,
    motion: 'Everyone should learn to code',
    line: 'Everybody is signing up for the coding class, so it is clearly the right choice for you too.',
    flaw: 'band',
  },
  {
    tier: 1,
    motion: 'Phones should be banned in lectures',
    line: 'If we ban phones in lectures, next it will be laptops, then pens, and soon we will all be taught by shouting.',
    flaw: 'slope',
  },
  {
    tier: 1,
    motion: 'Zoos should be closed',
    line: 'Think of the sad little faces of the children who will never see an elephant! You cannot possibly agree with this.',
    flaw: 'emotion',
  },
  {
    tier: 1,
    motion: 'Junk food should be taxed',
    line: 'A single chocolate bar tax and soon the government will tell us what to eat, wear and think.',
    flaw: 'slope',
  },
  {
    tier: 1,
    motion: 'Exams should be replaced by projects',
    line: 'You cannot trust her view on exams. She failed her driving test twice.',
    flaw: 'adhom',
  },
  // ---- tier 2 ----
  {
    tier: 2,
    motion: 'The university should stop using plastic cups',
    line: 'Either we keep every plastic cup, or we ban drinks on campus. There is no other choice.',
    flaw: 'dilemma',
  },
  {
    tier: 2,
    motion: 'Public transport should be free',
    line: 'My cousin took the bus twice and both times it was late. Public transport is obviously useless.',
    flaw: 'hasty',
  },
  {
    tier: 2,
    motion: 'Homework should be abolished',
    line: 'Since homework was introduced, children have become more stressed, so homework causes stress.',
    flaw: 'post',
  },
  {
    tier: 2,
    motion: 'Energy drinks should be sold on campus',
    line: 'A famous footballer says energy drinks are fine, so there is nothing more to discuss.',
    flaw: 'auth',
  },
  {
    tier: 2,
    motion: 'The campus should have a bigger sports budget',
    line: 'Sports funding? What about the leaking roof of the library? Let us talk about that instead.',
    flaw: 'red',
  },
  {
    tier: 2,
    motion: 'Students should be allowed to retake exams',
    line: 'You either believe in strict standards or you believe in chaos. Pick one.',
    flaw: 'dilemma',
  },
  {
    tier: 2,
    motion: 'Online lectures are as good as live ones',
    line: 'I watched one dull online lecture and fell asleep. All online teaching is a waste of time.',
    flaw: 'hasty',
  },
  {
    tier: 2,
    motion: 'The cafeteria should serve more vegetarian meals',
    line: 'We got a new menu last week and then the café got busier, so the new menu is what attracts the crowds.',
    flaw: 'post',
  },
  {
    tier: 2,
    motion: 'Calculators should be allowed in maths exams',
    line: 'A professor of theatre told me calculators ruin young minds, and she should know.',
    flaw: 'auth',
  },
  {
    tier: 2,
    motion: 'Dorm curfews should be scrapped',
    line: 'Curfews? The real scandal is the price of the vending machine snacks. Nobody is talking about that!',
    flaw: 'red',
  },
  // ---- tier 3 ----
  {
    tier: 3,
    motion: 'The student council should be elected',
    line: 'The council makes the best decisions because the council members are the wisest people we have.',
    flaw: 'circ',
  },
  {
    tier: 3,
    motion: 'Banks should be free of fees',
    line: 'A bank is a river of money, and rivers should be free to flow, so banks should not charge anyone.',
    flaw: 'equiv',
  },
  {
    tier: 3,
    motion: 'Ghosts do not exist',
    line: 'Nobody has ever proved that ghosts are not real, so they must be.',
    flaw: 'ignor',
  },
  {
    tier: 3,
    motion: 'Teachers should not give grades',
    line: 'You say grades are unfair, but you got a top grade yourself, so you cannot complain.',
    flaw: 'tuq',
  },
  {
    tier: 3,
    motion: 'The old dress code should be updated',
    line: 'We have worn this uniform for a hundred years. That alone proves it is the right one.',
    flaw: 'trad',
  },
  {
    tier: 3,
    motion: 'The new gym is a good use of money',
    line: 'Look at the three weeks where gym sign-ups rose. I will not mention the ten months when they fell.',
    flaw: 'cherry',
  },
  {
    tier: 3,
    motion: 'Rules protect freedom',
    line: 'The rule is right because the rulebook says it is right, and the rulebook is right because it contains the rule.',
    flaw: 'circ',
  },
  {
    tier: 3,
    motion: 'Light bulbs should be recycled',
    line: 'Light is what we see by, and the law is a light that guides us. So we should switch off the law to save energy.',
    flaw: 'equiv',
  },
  {
    tier: 3,
    motion: 'Aliens have visited Earth',
    line: 'You cannot show that aliens have never visited, so I think we have to accept that they have.',
    flaw: 'ignor',
  },
  {
    tier: 3,
    motion: 'Exams should be open book',
    line: 'You tell me to study hard, yet I saw you copy a friend’s notes last term. Why should I listen?',
    flaw: 'tuq',
  },
  // ---- tier 4: subtle ----
  {
    tier: 4,
    motion: 'Ghost kitchens should be regulated',
    line: 'You say these kitchens are unsafe, but you have no proof that they are safe, so my claim stands.',
    flaw: 'burden',
  },
  {
    tier: 4,
    motion: 'Fans should be allowed in the stadium',
    line: 'No true supporter would ever boo their own team. So the ones who did were not real supporters.',
    flaw: 'scot',
  },
  {
    tier: 4,
    motion: 'The new curriculum should be adopted',
    line: 'That curriculum was designed by a company that also sells cereal, so we can ignore everything in it.',
    flaw: 'genetic',
  },
  {
    tier: 4,
    motion: 'The team should keep its star players',
    line: 'Every player on this team is excellent, so the team must be excellent as a whole, whatever the coach does.',
    flaw: 'comp',
  },
  {
    tier: 4,
    motion: 'Energy should come from wind farms',
    line: 'Prove to me that wind farms are not harmful. Until you do, my objection is correct.',
    flaw: 'burden',
  },
  {
    tier: 4,
    motion: 'The club should accept new members',
    line: 'No real chess player blunders a queen. If this person did, they are not a real chess player.',
    flaw: 'scot',
  },
  {
    tier: 4,
    motion: 'Public parks should be expanded',
    line: 'The idea of parks came from a Victorian factory owner. That is why we should not trust it today.',
    flaw: 'genetic',
  },
  {
    tier: 4,
    motion: 'The city should invest in its trains',
    line: 'Each train carriage is lightweight, so the whole train must be lightweight too. Moving it costs nothing.',
    flaw: 'comp',
  },
  {
    tier: 4,
    motion: 'Study groups improve grades',
    line: 'Last year, grades rose after we painted the library blue, and the paint is the only thing that changed.',
    flaw: 'post',
  },
  {
    tier: 4,
    motion: 'Debate should be taught in school',
    line: 'Of the twelve studies on the subject, I will tell you about the two that agree with me.',
    flaw: 'cherry',
  },
];

/** Choose arguments of the wanted difficulties, avoiding ones used recently. */
export function chooseArguments(
  plan: readonly number[],
  rng: () => number,
  history: number[],
  pool: readonly DebateArg[] = ARGUMENTS,
): DebateArg[] {
  const chosen: DebateArg[] = [];
  const recent = new Set(history);
  for (const tier of plan) {
    const order = [tier, tier - 1, tier + 1, tier - 2, tier + 2].filter((t) => t >= 1 && t <= 4);
    let pick: DebateArg | undefined;
    for (const pass of [0, 1]) {
      for (const t of order) {
        const c = pool.filter(
          (a) => a.tier === t && !chosen.includes(a) && (pass === 1 || !recent.has(hashStr(a.line))),
        );
        if (c.length) {
          pick = c[Math.floor(rng() * c.length)];
          break;
        }
      }
      if (pick) break;
    }
    if (pick) chosen.push(pick);
  }
  return chosen;
}
