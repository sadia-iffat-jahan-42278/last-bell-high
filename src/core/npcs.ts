import type { Npc, NpcId } from './types';

/** Friends: dialogue, story beats and the perks they unlock. */
export const NPCS: Record<NpcId, Npc> = {
  maya: {
    name: 'Maya',
    role: 'Study Buddy',
    emoji: '📚',
    color: '#b28cff',
    bio: 'Class 2-B. Color-codes everything. Quietly brilliant, loudly nervous.',
    perks: [
      { need: 2, text: 'Study Buddy: the first question of every quiz is auto-hinted.' },
      { need: 3, text: 'Study Group: +15% XP from library & late-night study.' },
    ],
    talk: [
      {
        line: 'Oh! Hi. I was just color-coding my flashcards. Is that weird?',
        a: 'Not weird. It’s impressive.',
        ra: 'Really? Thanks! Color-coding is half the battle.',
        b: 'Only if you don’t color-code me.',
        rb: 'Ha! You’re yellow. Yellow is the funny color.',
      },
      {
        line: 'Do you ever feel like the more you study, the less you know?',
        a: 'Every single day.',
        ra: 'Same! At least we’re confused together.',
        b: 'I just assume I’m a genius with amnesia.',
        rb: 'That… might be my new coping strategy.',
      },
      {
        line: 'The library’s quiet zone is the best place in school. Don’t tell anyone.',
        a: 'Your secret’s safe.',
        ra: 'I knew I could trust you.',
        b: 'Too late, I made a poster.',
        rb: 'A poster?! Is it at least laminated?',
      },
      {
        line: 'Tests make my hands shake. Then I remember I’ve studied. Mostly.',
        a: 'You always do great.',
        ra: 'You think so? Okay. Deep breaths.',
        b: 'Just bring a spare brain.',
        rb: 'Do they sell those at the canteen?',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'The Study Guide',
        scene: [['Maya', 'Hey, um… I made a study guide. For everyone. Mostly for you. Do you want it?']],
        prompt: 'Maya holds out a neatly stapled guide.',
        options: [
          {
            label: 'Yes, thank you!',
            result: ['Maya beams. “Page 3 has the tricky formulas. I drew little dinosaurs next to them.”'],
            fx: { items: { notes: 2 }, rel: 5 },
          },
          {
            label: 'Teach me how you make one.',
            result: ['Maya lights up. “Step one: stop highlighting everything. Step two: dinosaurs.”'],
            fx: { stat: { int: 1 }, rel: 8 },
          },
        ],
      },
      {
        at: 40,
        title: 'Frozen',
        scene: [
          ['Maya', 'I froze during the practice test. All the answers just… vanished.'],
          ['Maya', 'What if it happens at finals?'],
        ],
        prompt: 'Maya stares at her shoes.',
        options: [
          {
            label: 'Breathe. I’ll quiz you.',
            result: ['She smiles shakily. “Okay. Quiz me. Please be gentle.”'],
            fx: { rel: 8, stat: { cha: 1 }, stress: -6 },
          },
          {
            label: 'Let’s turn it into a game.',
            result: ['“A game? Oh no, I’m competitive.” She’s already grinning.'],
            fx: { rel: 8, stat: { foc: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Study Group',
        scene: [
          ['Maya', 'You know what’s funny? I used to hate group study.'],
          ['Maya', 'Now I run one. Because of you. Thank you.'],
        ],
        prompt: 'Maya looks genuinely proud.',
        options: [
          {
            label: 'You did that yourself.',
            result: ['“Maybe a little,” she says, glowing.'],
            fx: { xp: 90, rel: 5 },
          },
          {
            label: 'We make a great team.',
            result: ['“The best team,” she agrees, handing you a tiny dinosaur sticker.'],
            fx: { coins: 60, rel: 5 },
          },
        ],
      },
    ],
  },
  kai: {
    name: 'Kai',
    role: 'Sports Captain',
    emoji: '🏀',
    color: '#ff7a59',
    bio: 'Captain of everything with a ball. Believes snacks are a training method.',
    perks: [
      { need: 1, text: 'Warm-up buddy: +1 Stamina.' },
      { need: 2, text: 'Iron Habits: energy costs −15%.' },
      { need: 3, text: 'Team Spirit: +1 extra life in Dodgeball Drill.' },
    ],
    talk: [
      {
        line: 'Yo! Stretch with me. Your hamstrings look like they’ve never met the sun.',
        a: 'Okay, show me.',
        ra: 'That’s the spirit! Touch your toes. Or knees. Or just look at your toes.',
        b: 'My hamstrings have a strong legal team.',
        rb: 'Ha! Objection overruled. Down you go!',
      },
      {
        line: 'We need one more runner for the relay. Hint hint.',
        a: 'I’ll think about it.',
        ra: 'Think fast. Relay people always think fast.',
        b: 'I can run. Away. Quickly.',
        rb: 'That’s technically the entire sport.',
      },
      {
        line: 'Curry day is tomorrow. Best fuel ever.',
        a: 'Save me a seat.',
        ra: 'Front row, extra rice.',
        b: 'Curry day is my legacy.',
        rb: 'Legend. Statue in the courtyard soon.',
      },
      {
        line: 'Coach says hustle beats talent. I say hustle plus snacks.',
        a: 'Hustle plus snacks. Wise.',
        ra: 'Put it on a banner!',
        b: 'I’m more of a snacks-then-nap guy.',
        rb: 'Honestly? Respect.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Relay Practice',
        scene: [['Kai', 'We’re short a runner for relay practice. Come on, jog with us!']],
        prompt: 'Kai bounces on his toes.',
        options: [
          {
            label: 'Count me in!',
            result: ['You jog three laps. Kai high-fives you so hard it echoes.'],
            fx: { stat: { sta: 1 }, rel: 6, stress: -5 },
          },
          {
            label: 'I’ll cheer from the bench.',
            result: ['“Best cheerleader ever!” He tosses you a sports drink.'],
            fx: { stat: { cha: 1 }, rel: 4, items: { drink: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Big Match Nerves',
        scene: [['Kai', 'Big match this week. I get weirdly nervous… but I act like I don’t.']],
        prompt: 'For once, Kai isn’t bouncing.',
        options: [
          {
            label: 'You’ve got this, captain.',
            result: ['“Yeah. Yeah, I do.” He straightens up. “Thanks.”'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
          {
            label: 'Race you to the canteen!',
            result: ['He’s gone before you finish the sentence. You lose, but you’re laughing.'],
            fx: { rel: 8, stat: { sta: 1 }, stress: -10 },
          },
        ],
      },
      {
        at: 70,
        title: 'Honorary Captain',
        scene: [['Kai', 'Team voted. You’re honorary captain. No take-backs.']],
        prompt: 'Kai drapes a jacket over your shoulders.',
        options: [
          {
            label: 'I’m honored!',
            result: ['Kai grins. “Don’t be. Be hungry.”'],
            fx: { coins: 60, xp: 80, rel: 5 },
          },
          {
            label: 'I mostly want the jacket.',
            result: ['“Honest. I like it.” He tosses you drinks too.'],
            fx: { items: { drink: 2 }, rel: 5 },
          },
        ],
      },
    ],
  },
  zoe: {
    name: 'Zoe',
    role: 'Music Prodigy',
    emoji: '🎧',
    color: '#35d9a0',
    bio: 'Hears music in vending machines. Says “shh” a lot, lovingly.',
    perks: [
      { need: 2, text: 'Perfect Ear: rhythm timing windows 12% wider.' },
      { need: 3, text: 'Duet: rhythm scores ×1.15 and bonus club XP.' },
    ],
    talk: [
      {
        line: 'Shh. Do you hear that? The vending machine hums in B flat.',
        a: 'You’re right, it does!',
        ra: 'Finally, someone with ears.',
        b: 'I hear “out of order”.',
        rb: 'That’s the sad second movement.',
      },
      {
        line: 'I’m writing a song about homework. Working title: “Due Tomorrow”.',
        a: 'Sounds like a hit.',
        ra: 'The bridge is about procrastination. It’s very long.',
        b: 'It needs more cowbell.',
        rb: 'Always. Always more cowbell.',
      },
      {
        line: 'I need a backup singer for the showcase. Don’t panic. Panic later.',
        a: 'I’m in.',
        ra: 'Great. Rule one: no shower solos.',
        b: 'Can I be the triangle?',
        rb: 'The triangle is the unsung hero. Literally.',
      },
      {
        line: 'Rhythm isn’t just music. Even exams have a tempo.',
        a: 'Teach me the tempo.',
        ra: 'Slow, steady, confident. Presto at the end.',
        b: 'My tempo is “panic allegro”.',
        rb: 'A classic. Let’s get you to andante.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'A Little Melody',
        scene: [
          ['Zoe', 'I wrote a melody. Want to tap along? It’s only four notes. They’re very good notes.'],
        ],
        prompt: 'Zoe hums, eyes closed.',
        options: [
          {
            label: 'Of course!',
            result: ['You tap along. It’s four good notes. You can’t stop humming them.'],
            fx: { stat: { cre: 1 }, rel: 6 },
          },
          {
            label: 'I can’t keep rhythm.',
            result: ['“Perfect. Beginners have no bad habits.” She sounds delighted.'],
            fx: { stat: { cre: 1 }, rel: 4, stress: -5 },
          },
        ],
      },
      {
        at: 40,
        title: 'Stage Fright',
        scene: [['Zoe', 'The showcase scares me. Crowds never clap in rhythm.']],
        prompt: 'Zoe fiddles with her headphones.',
        options: [
          {
            label: 'I’ll clap on the beat.',
            result: ['“Promise?” “Promise.” She lets out a long breath.'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
          {
            label: 'Picture them as metronomes.',
            result: ['She laughs so hard she snorts. Then she looks lighter.'],
            fx: { rel: 8, stat: { cre: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'The Duet',
        scene: [
          ['Zoe', 'I wrote you a duet. Don’t make it weird.'],
          ['Zoe', 'Okay, make it a little weird.'],
        ],
        prompt: 'She hands you sheet music, hands slightly shaking.',
        options: [
          {
            label: 'Best gift ever.',
            result: ['“It’s only a gift if you play it properly,” she says, pink-cheeked.'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Only if I get a solo.',
            result: ['“Eight bars. Not nine.” Deal.'],
            fx: { coins: 70, stat: { cre: 1 }, rel: 5 },
          },
        ],
      },
    ],
  },
  rin: {
    name: 'Rin',
    role: 'Rival',
    emoji: '🏆',
    color: '#f0b429',
    bio: 'Top of the class. Studies until 2 a.m. Pretends not to care what you scored.',
    perks: [
      { need: 2, text: 'Rival Notes: +3s per question on tests.' },
      { need: 3, text: 'Final Edge: +1 heart in the finals boss fight.' },
    ],
    talk: [
      {
        line: 'Oh, you’re still here. Good. Competition keeps me sharp.',
        a: 'I’ll beat you someday.',
        ra: 'I hope so. Otherwise this is boring.',
        b: 'Sharp? You’re basically a pencil.',
        rb: '…Did you compare me to a pencil? Hm. Fair.',
      },
      {
        line: 'I studied until 2 a.m. Don’t look so impressed.',
        a: 'That’s dedication.',
        ra: 'It’s a bad habit. Don’t copy it.',
        b: 'That’s not studying, that’s hostage-taking.',
        rb: 'The hostage was my sleep schedule.',
      },
      {
        line: 'Rank is just a number. A very important number.',
        a: 'I’m catching up.',
        ra: 'Then run faster.',
        b: 'I can’t count that high.',
        rb: 'Your jokes are improving. Tragically.',
      },
      {
        line: 'Why do you always smile before a test?',
        a: 'Confidence.',
        ra: 'Interesting strategy. Is it working?',
        b: 'Nerves. Strategically hidden.',
        rb: 'That… actually works. Ugh.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'The Wager',
        scene: [
          ['Rin', 'You scored well. Well enough that I noticed. Congratulations. It won’t happen twice.'],
          [
            'Rin',
            'Let’s make it interesting. Beat my score on the next test and I’ll buy your lunch. Lose, and you buy mine.',
          ],
        ],
        prompt: 'Rin holds out a hand without looking at you.',
        options: [
          { label: 'Deal.', result: ['A handshake. Firm. Dangerous.'], fx: { rel: 6, flag: 'rinWager' } },
          {
            label: 'No thanks. I’d rather eat in peace.',
            result: ['“Hm. Smart. Or scared.” She almost smiles.'],
            fx: { rel: 3 },
          },
        ],
      },
      {
        at: 40,
        title: 'Second Place',
        scene: [['Rin', 'Truth is, I’m terrified of coming second. Everyone expects me to be perfect.']],
        prompt: 'Rin looks away, jaw tight.',
        options: [
          {
            label: 'Nobody’s perfect.',
            result: ['“Annoying. And true.” She exhales.'],
            fx: { rel: 8, stress: -8 },
          },
          {
            label: 'Perfect is boring.',
            result: ['“Is it?” She tilts her head. “…Maybe it is.”'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'A Rival Worth Having',
        scene: [['Rin', 'I used to think you were an obstacle. Now you’re a rival worth having.']],
        prompt: 'It might be the nicest thing Rin has ever said.',
        options: [
          {
            label: 'Friends?',
            result: ['“Rivals. Friendly ones. Don’t push it.” But she’s smiling.'],
            fx: { rel: 10, coins: 50, flag: 'rinFriend' },
          },
          {
            label: 'Let’s keep it a rivalry.',
            result: ['“Wouldn’t have it any other way.” Her eyes flash.'],
            fx: { rel: 5, xp: 100, flag: 'rinNemesis' },
          },
        ],
      },
    ],
  },
};
