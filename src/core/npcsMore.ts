import type { Npc, NpcId } from './types';

/** The other twelve students: three per academic year alongside Maya, Kai, Zoe and Rin. */
export const NPCS_MORE: Record<Exclude<NpcId, 'maya' | 'kai' | 'zoe' | 'rin'>, Npc> = {
  /* ------------------------------ Year 1 ------------------------------ */
  theo: {
    name: 'Theo',
    year: 1,
    major: 'Computer Science',
    role: 'Dorm Neighbour',
    emoji: '🎮',
    color: '#4aa8ff',
    bio: 'Your dorm neighbour. Debugs in his sleep. Believes every problem has a keyboard shortcut.',
    perks: [
      {
        need: 2,
        text: 'Game Sense: +1.5s on every quiz question.',
        bonus: { timePlus: 1.5 },
      },
      { need: 3, text: 'Co-op Night: −4 stress at the end of every day.', bonus: { stressRelief: 4 } },
    ],
    talk: [
      {
        line: 'My code compiled on the first try. I do not trust it.',
        a: 'Run the tests.',
        ra: 'Tests? In this economy?',
        b: 'Enjoy it while it lasts.',
        rb: 'Wise. Deeply, painfully wise.',
      },
      {
        line: 'Do you think energy drinks count as a food group?',
        a: 'Absolutely not.',
        ra: 'Fair. I will add toast.',
        b: 'Top of the pyramid.',
        rb: 'I knew you were a scholar.',
      },
      {
        line: 'I named my laptop Gerald. Gerald is tired.',
        a: 'Give Gerald a break.',
        ra: 'Gerald thanks you. Mostly with fan noise.',
        b: 'Gerald needs an update.',
        rb: 'Gerald has opinions about updates.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Dorm Debug',
        scene: [['Theo', 'My dorm wifi died and I have a lab due. Can you help me debug?']],
        prompt: 'Theo waves a router cable at you.',
        options: [
          {
            label: 'Reboot it.',
            result: ['Theo stares at the blinking lights. “You are a wizard.” It works.'],
            fx: { rel: 6, stat: { int: 1 } },
          },
          {
            label: 'Share my hotspot.',
            result: ['“You are a hero. I owe you a snack.”'],
            fx: { rel: 6, items: { snack: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Impostor Syndrome',
        scene: [['Theo', 'Everyone in programming already knows five languages. I know two. One is HTML.']],
        prompt: 'Theo hides behind his laptop screen.',
        options: [
          {
            label: 'HTML counts!',
            result: ['“It really does not.” He laughs anyway. “Thanks.”'],
            fx: { rel: 8, stress: -6 },
          },
          {
            label: 'Teach me your two.',
            result: ['You trade tips for an hour. Both of you learn something.'],
            fx: { rel: 8, stat: { foc: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Hackathon Weekend',
        scene: [
          [
            'Theo',
            'There is a 24-hour hackathon on Saturday. Team of two. I picked you before you could say no.',
          ],
        ],
        prompt: 'Theo holds out two energy bars.',
        options: [
          {
            label: 'Obviously yes.',
            result: ['You win “Best Bug”. Nobody is sure if it is a compliment.'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Only if I sleep.',
            result: ['“Deal. Sleep in shifts.” You win the snack prize.'],
            fx: { coins: 60, rel: 5, items: { drink: 1 } },
          },
        ],
      },
    ],
  },
  lina: {
    name: 'Lina',
    year: 1,
    major: 'Journalism & Art',
    role: 'Campus Reporter',
    emoji: '📰',
    color: '#ff6bd6',
    bio: 'Writes for the campus paper, sketches in the margins. Collects other people’s stories.',
    perks: [
      { need: 2, text: 'Press Pass: +5% XP from everything.', bonus: { xpPct: 0.05 } },
      { need: 3, text: 'Sketchbook Notes: +10% mastery gain.', bonus: { masteryPct: 0.1 } },
    ],
    talk: [
      {
        line: 'Can I interview you? Two questions. Maybe seven.',
        a: 'Ask away.',
        ra: 'First question: how do you feel about deadlines?',
        b: 'No comment.',
        rb: '“No comment” is a headline. I will take it.',
      },
      {
        line: 'I drew the whole lecture hall during Economics. The professor looks great.',
        a: 'Show me!',
        ra: 'He is a triangle with glasses.',
        b: 'Did you pay attention at all?',
        rb: 'The triangle was paying attention!',
      },
      {
        line: 'The best stories hide in the café queue. Never skip the queue.',
        a: 'I will keep my ears open.',
        ra: 'Excellent. Journalism is mostly eavesdropping.',
        b: 'I only listen for the menu.',
        rb: 'Also a story. “Man versus Menu”.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Front Page',
        scene: [['Lina', 'The paper needs a student profile. I nominated you. You are very… profile-able.']],
        prompt: 'Lina clicks her pen.',
        options: [
          {
            label: 'Do the interview.',
            result: ['An hour later you are a minor campus celebrity.'],
            fx: { rel: 6, stat: { cha: 1 } },
          },
          {
            label: 'Only if I pick the photo.',
            result: ['You pick a terrible photo on purpose. She prints it anyway.'],
            fx: { rel: 6, coins: 25 },
          },
        ],
      },
      {
        at: 40,
        title: 'Writer’s Block',
        scene: [['Lina', 'I have a column due tonight and a blank page. The page is winning.']],
        prompt: 'Lina stares at the blinking cursor.',
        options: [
          {
            label: 'Talk it out loud.',
            result: ['Halfway through your rambling she starts typing furiously.'],
            fx: { rel: 8, stat: { cre: 1 } },
          },
          {
            label: 'Take a walk first.',
            result: ['Fresh air. Three paragraphs appear.'],
            fx: { rel: 8, stress: -8 },
          },
        ],
      },
      {
        at: 70,
        title: 'The Exposé',
        scene: [['Lina', 'I wrote about the library’s secret quiet room. I mentioned you. Positively.']],
        prompt: 'She hands you a printed copy.',
        options: [
          {
            label: 'I’m blushing.',
            result: ['“Good. Blush for the readers.” The article goes viral on campus.'],
            fx: { xp: 90, rel: 5 },
          },
          {
            label: 'Where is my royalty?',
            result: ['She slides a coffee voucher across. “Payment in exposure and caffeine.”'],
            fx: { coins: 60, rel: 5 },
          },
        ],
      },
    ],
  },
  sam: {
    name: 'Sam',
    year: 1,
    major: 'Business',
    role: 'Café Barista',
    emoji: '☕',
    color: '#c8803a',
    bio: 'Works the café counter between lectures. Knows everyone’s order and half their secrets.',
    perks: [
      { need: 2, text: 'Staff Discount: shop prices −10%.', bonus: { shopPct: 0.1 } },
      { need: 3, text: 'Free Refills: +6 energy at the end of every day.', bonus: { restPlus: 6 } },
    ],
    talk: [
      {
        line: 'Large double-shot oat latte, extra foam? You look like a double-shot kind of person.',
        a: 'You know me too well.',
        ra: 'It is my superpower.',
        b: 'I am a tea person.',
        rb: 'Betrayal. Also, I respect it.',
      },
      {
        line: 'The secret to the café is: smile, then caffeinate.',
        a: 'Smile. Caffeinate. Got it.',
        ra: 'You could run this place.',
        b: 'And the muffins?',
        rb: 'Muffins are the real boss.',
      },
      {
        line: 'Someone ordered “a regular coffee” today. I asked which regular. They left.',
        a: 'Fair question.',
        ra: 'Thank you! Nobody gets me.',
        b: 'You scared them.',
        rb: 'Business is dangerous.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Staff Meal',
        scene: [['Sam', 'Closing-shift leftovers. Take a snack box, or help me stack chairs and take two?']],
        prompt: 'Sam holds up a tray.',
        options: [
          {
            label: 'Just the snack box.',
            result: ['“Easy.” Sam tosses you one.'],
            fx: { items: { snack: 1 }, rel: 5 },
          },
          {
            label: 'Help stack chairs.',
            result: ['Twenty chairs later you have two snacks and a friend.'],
            fx: { items: { snack: 2 }, rel: 6, stat: { sta: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Rush Hour',
        scene: [['Sam', 'Finals-week queue is a monster. Can you carry orders for ten minutes?']],
        prompt: 'Sam hands you an apron.',
        options: [
          {
            label: 'Apron on!',
            result: ['You deliver nineteen lattes without a single spill. Almost.'],
            fx: { rel: 8, coins: 30, stat: { cha: 1 } },
          },
          {
            label: 'I will lose the orders.',
            result: ['“Honest. Stay at the till then.” You count coins instead.'],
            fx: { rel: 8, coins: 20 },
          },
        ],
      },
      {
        at: 70,
        title: 'Employee of the Month',
        scene: [
          ['Sam', 'They made me employee of the month. I put you on the plaque as “unofficial assistant”.'],
        ],
        prompt: 'Sam beams behind the counter.',
        options: [
          { label: 'I accept.', result: ['“Welcome to management.”'], fx: { xp: 90, rel: 5 } },
          {
            label: 'I want a raise.',
            result: ['“Payable in muffins.” He slides over coins too.'],
            fx: { coins: 60, rel: 5 },
          },
        ],
      },
    ],
  },

  /* ------------------------------ Year 2 ------------------------------ */
  diego: {
    name: 'Diego',
    year: 2,
    major: 'Marketing',
    role: 'Campus Hustler',
    emoji: '🛹',
    color: '#e0762a',
    bio: 'Sells handmade sticker packs, tutoring slots and, once, a very convincing houseplant.',
    perks: [
      { need: 2, text: 'Side Hustle: +10% coins from everything.', bonus: { coinPct: 0.1 } },
      { need: 3, text: 'Bulk Deals: shop prices −10%.', bonus: { shopPct: 0.1 } },
    ],
    talk: [
      {
        line: 'Sticker pack, three coins. Or two for five, which is technically worse. Marketing!',
        a: 'Two for five.',
        ra: 'Excellent. You are my favourite customer.',
        b: 'That is not a deal.',
        rb: 'Not with that attitude it isn’t.',
      },
      {
        line: 'Rule one of business: be nice to sophomores. We remember everything.',
        a: 'Noted.',
        ra: 'Good. I also remember birthdays.',
        b: 'I forget everything.',
        rb: 'Then you are easy to impress.',
      },
      {
        line: 'I am thinking about selling lecture notes. Legally. Allegedly.',
        a: 'Professors might not love that.',
        ra: 'Which is why I call them “study companions”.',
        b: 'Sign me up.',
        rb: 'Friends get the student discount. It is free.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Starter Pack',
        scene: [['Diego', 'Sample pack for you. Honest review required. Five stars preferred.']],
        prompt: 'Diego presents a glittery envelope.',
        options: [
          {
            label: 'Five stars!',
            result: ['“I knew I liked you.” He adds a free study sheet.'],
            fx: { items: { notes: 1 }, rel: 6 },
          },
          {
            label: 'Honest review: three.',
            result: ['“Brutal. Fair.” He writes it on a sign.'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Profit Margin',
        scene: [['Diego', 'I made a profit this week! Eleven coins. I am basically a tycoon.']],
        prompt: 'Diego counts coins reverently.',
        options: [
          {
            label: 'Reinvest it.',
            result: ['He buys better stickers. Sales double.'],
            fx: { rel: 8, coins: 30 },
          },
          {
            label: 'Treat yourself.',
            result: ['He treats you both to curry.'],
            fx: { rel: 8, stress: -8 },
          },
        ],
      },
      {
        at: 70,
        title: 'Pitch Night',
        scene: [['Diego', 'Business class pitch night. I need a co-pitcher. Wear something confident.']],
        prompt: 'Diego adjusts a very bold tie.',
        options: [
          {
            label: 'Do the pitch.',
            result: ['You win third place. He calls it a “brand win”.'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Handle the slides.',
            result: ['The slides carry the pitch. He tips you generously.'],
            fx: { coins: 70, rel: 5 },
          },
        ],
      },
    ],
  },
  iris: {
    name: 'Iris',
    year: 2,
    major: 'Physics',
    role: 'Teaching Assistant',
    emoji: '🔭',
    color: '#7a4fb5',
    bio: 'Runs the Tuesday study session. Explains black holes using breakfast cereal.',
    perks: [
      { need: 2, text: 'Study Session: +10% hint chance on every question.', bonus: { hintPlus: 0.1 } },
      { need: 3, text: 'Extra Credit: +10% mastery gain.', bonus: { masteryPct: 0.1 } },
    ],
    talk: [
      {
        line: 'Imagine the universe is a bowl of cereal. Now imagine you are the last marshmallow.',
        a: 'This is going somewhere.',
        ra: 'Yes! Gravity. I think.',
        b: 'I am the last marshmallow.',
        rb: 'Spiritually, we all are.',
      },
      {
        line: 'Office hours are open. Nobody comes. I eat my sandwich in peace.',
        a: 'I will come.',
        ra: 'Bring questions. And napkins.',
        b: 'Peace sounds nice.',
        rb: 'Heartless. Respect.',
      },
      {
        line: 'The best way to learn a thing is to teach it. Also to forget it, then re-learn it.',
        a: 'Teach me then.',
        ra: 'Lesson one: do not panic.',
        b: 'I prefer the forgetting part.',
        rb: 'You are a natural.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Problem Set',
        scene: [['Iris', 'You look lost at problem four. Everyone is. It is a trick question.']],
        prompt: 'Iris slides a pencil across the table.',
        options: [
          {
            label: 'Show me the trick.',
            result: ['Three lines of reasoning and the answer pops out.'],
            fx: { rel: 6, stat: { int: 1 } },
          },
          {
            label: 'Let me try first.',
            result: ['She watches, nodding. You get it on the second try.'],
            fx: { rel: 6, stat: { foc: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'TA Burnout',
        scene: [['Iris', 'I have forty papers to grade and my red pen just died. Is this a sign?']],
        prompt: 'Iris stares at a very tall stack.',
        options: [
          {
            label: 'Make her tea.',
            result: ['“You are a good person.” She grades seven papers in an hour.'],
            fx: { rel: 8, stress: -6 },
          },
          {
            label: 'Sort the pile.',
            result: ['Sorting is half the battle. The pile looks smaller.'],
            fx: { rel: 8, stat: { foc: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Dean’s List Letter',
        scene: [
          [
            'Iris',
            'I wrote you a recommendation for the Dean’s list. Do not read it in public. You will cry.',
          ],
        ],
        prompt: 'She hands over a sealed envelope.',
        options: [
          { label: 'I will read it later.', result: ['“Wise. Bring tissues.”'], fx: { xp: 90, rel: 5 } },
          {
            label: 'Read it now!',
            result: ['You cry a little. She pretends not to notice.'],
            fx: { coins: 60, rel: 5 },
          },
        ],
      },
    ],
  },
  yuki: {
    name: 'Yuki',
    year: 2,
    major: 'Robotics',
    role: 'Lab Nerd',
    emoji: '🤖',
    color: '#2ec4b6',
    bio: 'Lives in the engineering lab. Her robot has a name, a personality and a minor attitude problem.',
    perks: [
      { need: 2, text: 'Lab Partner: +1s on every quiz question.', bonus: { timePlus: 1 } },
      { need: 3, text: 'Optimised Routine: +5% XP from everything.', bonus: { xpPct: 0.05 } },
    ],
    talk: [
      {
        line: 'Meet Bolt. He is a robot. He has opinions about my sleep schedule.',
        a: 'Hi Bolt.',
        ra: 'He says hello. He blinked. Probably.',
        b: 'Does Bolt do homework?',
        rb: 'Only the geometry. He hates essays.',
      },
      {
        line: 'I soldered my finger. Twice. Science!',
        a: 'Please be careful.',
        ra: 'I will. Probably. Maybe tomorrow.',
        b: 'That sounds painful.',
        rb: 'It builds character. And blisters.',
      },
      {
        line: 'A good robot is just a very patient child with sensors.',
        a: 'Lovely thought.',
        ra: 'I have wasted three weekends on this thought.',
        b: 'Mine would need snacks.',
        rb: 'Robots and snacks. Same engineering, different goals.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Loose Wires',
        scene: [['Yuki', 'Bolt will not turn left. Can you hold the flashlight while I look?']],
        prompt: 'Yuki disappears into a tangle of cables.',
        options: [
          {
            label: 'Hold the light.',
            result: ['You hold the light for an hour. Bolt turns left. Everyone cheers.'],
            fx: { rel: 6, stat: { foc: 1 } },
          },
          {
            label: 'Debug the code.',
            result: ['A missing semicolon. As always.'],
            fx: { rel: 6, stat: { int: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Contest Jitters',
        scene: [['Yuki', 'The regional robot contest is tomorrow. Bolt has never worked twice in a row.']],
        prompt: 'Yuki hugs a toolbox.',
        options: [
          {
            label: 'He will do great.',
            result: ['“Statistically unlikely, but thank you.” She smiles.'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
          {
            label: 'Run one last test.',
            result: ['Bolt passes. Barely. She cries happy tears into his casing.'],
            fx: { rel: 8, stress: -6 },
          },
        ],
      },
      {
        at: 70,
        title: 'Second Place Trophy',
        scene: [['Yuki', 'We got second! The winning robot was bigger. Bolt wants you to hold the trophy.']],
        prompt: 'Bolt beeps proudly.',
        options: [
          {
            label: 'I am honoured.',
            result: ['Bolt beeps. You are officially a team member.'],
            fx: { xp: 90, rel: 5 },
          },
          {
            label: 'Photos with Bolt!',
            result: ['Forty photos. Bolt photobombs half.'],
            fx: { coins: 60, rel: 5 },
          },
        ],
      },
    ],
  },

  /* ------------------------------ Year 3 ------------------------------ */
  marcus: {
    name: 'Marcus',
    year: 3,
    major: 'Political Science',
    role: 'Student Council President',
    emoji: '🎙️',
    color: '#c23b3b',
    bio: 'Smooth talker with a clipboard. Wants a better campus and an even better parking policy.',
    perks: [
      { need: 2, text: 'Council Funds: +10% coins from everything.', bonus: { coinPct: 0.1 } },
      { need: 3, text: 'Campaign Trail: +6% XP from everything.', bonus: { xpPct: 0.06 } },
    ],
    talk: [
      {
        line: 'Can I count on your vote? Longer library hours. Free coffee Fridays. Probably.',
        a: 'You have my vote.',
        ra: 'A true democrat. I will frame you.',
        b: 'Define “probably”.',
        rb: 'Politicians never define. That is the secret.',
      },
      {
        line: 'The student council has one rule: every meeting must have snacks.',
        a: 'Excellent rule.',
        ra: 'The constitution of snacks. I wrote it myself.',
        b: 'And the agenda?',
        rb: 'We get to that after the snacks.',
      },
      {
        line: 'I once debated a vending machine for twenty minutes. I lost.',
        a: 'Respect.',
        ra: 'We have not spoken since.',
        b: 'Did the machine have a policy?',
        rb: 'Only “exact change”.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Petition',
        scene: [['Marcus', 'I am collecting signatures for later library hours. Will you sign?']],
        prompt: 'Marcus offers a clipboard and a pen on a string.',
        options: [
          {
            label: 'Sign it.',
            result: ['Your signature goes first. Marcus beams: “Trendsetter!”'],
            fx: { rel: 6, stat: { cha: 1 } },
          },
          {
            label: 'Read the fine print first.',
            result: ['No fine print. He actually is that sincere.'],
            fx: { rel: 6, stat: { int: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Budget Meeting',
        scene: [['Marcus', 'We have 200 coins left and twelve clubs begging. How do I choose?']],
        prompt: 'Marcus rubs his temples.',
        options: [
          {
            label: 'Split it evenly.',
            result: ['Fair. Boring. Everyone is a little happy.'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
          {
            label: 'Fund the weirdest club.',
            result: ['The Competitive Napping club gets a trophy shelf.'],
            fx: { rel: 8, stat: { cre: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Passing the Gavel',
        scene: [['Marcus', 'Next year’s council needs a mentor. I recommended you. Politely. Loudly.']],
        prompt: 'Marcus holds out a tiny wooden gavel.',
        options: [
          {
            label: 'Accept the title.',
            result: ['“Honorary Vice President of Snacks.”'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Decline, but help.',
            result: ['He gives you a council stipend anyway.'],
            fx: { coins: 70, rel: 5 },
          },
        ],
      },
    ],
  },
  ava: {
    name: 'Ava',
    year: 3,
    major: 'Law & Debate',
    role: 'Debate Captain',
    emoji: '⚖️',
    color: '#e58ab5',
    bio: 'Would argue the sky is green if you let her. Always wins; always asks if you are okay afterwards.',
    perks: [
      { need: 2, text: 'Quick Rebuttals: +2s on every quiz question.', bonus: { timePlus: 2 } },
      { need: 3, text: 'Logical Edge: +8% hint chance.', bonus: { hintPlus: 0.08 } },
    ],
    talk: [
      {
        line: 'Debate topic today: pineapple on pizza. I am assigned “for”. I will not survive.',
        a: 'You have got this.',
        ra: 'I will bring a very persuasive pizza.',
        b: 'Pineapple is a crime.',
        rb: 'That is exactly what the other team said. Annoying.',
      },
      {
        line: 'Rule one of debate: never say “um”. Rule two: never say “um”. Rule three: um.',
        a: 'You just said it.',
        ra: 'Strategic. That was a test.',
        b: 'I will remember that.',
        rb: 'Great. You can join the team.',
      },
      {
        line: 'I won by saying “with respect”. It is a magic phrase. It means “you are wrong”.',
        a: 'Magic words.',
        ra: 'Use them wisely.',
        b: 'With respect, you are wrong.',
        rb: 'Ha! Okay, that one was good.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Practice Round',
        scene: [['Ava', 'I need a sparring partner. Argue with me about whether cereal is a soup.']],
        prompt: 'Ava cracks her knuckles.',
        options: [
          {
            label: 'Soup. Obviously.',
            result: ['You lose gloriously. She says you have great potential.'],
            fx: { rel: 6, stat: { cha: 1 } },
          },
          {
            label: 'Cereal is cereal.',
            result: ['She nods. “Circular, but I admire the commitment.”'],
            fx: { rel: 6, stat: { int: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Nerves of Steel',
        scene: [
          ['Ava', 'Nationals are next week. I look calm. I am a duck: calm on top, paddling like crazy.'],
        ],
        prompt: 'Ava smiles a little too hard.',
        options: [
          {
            label: 'Paddle with me.',
            result: ['You run mock rounds all night. She sleeps better after.'],
            fx: { rel: 8, stress: -6 },
          },
          {
            label: 'You are the best.',
            result: ['“Do not flatter me. Keep going.”'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Closing Statement',
        scene: [['Ava', 'I lost nationals by one point. My closing statement was your idea. Thank you.']],
        prompt: 'Ava is smiling anyway.',
        options: [
          { label: 'Next year you win.', result: ['“I will hold you to that.”'], fx: { xp: 90, rel: 5 } },
          {
            label: 'It was a great idea.',
            result: ['“It really was.” She grins.'],
            fx: { coins: 60, rel: 5 },
          },
        ],
      },
    ],
  },
  felix: {
    name: 'Felix',
    year: 3,
    major: 'Computer Engineering',
    role: 'Hackathon Organiser',
    emoji: '💡',
    color: '#35d9a0',
    bio: 'Runs three clubs, two hackathons and one very optimistic spreadsheet.',
    perks: [
      { need: 2, text: 'Productivity Hack: +12% mastery gain.', bonus: { masteryPct: 0.12 } },
      { need: 3, text: 'Power Naps: +5 energy at the end of every day.', bonus: { restPlus: 5 } },
    ],
    talk: [
      {
        line: 'I made a spreadsheet to organise my spreadsheets. It has tabs. The tabs have tabs.',
        a: 'Beautiful.',
        ra: 'Thank you. It is my masterpiece.',
        b: 'That is a cry for help.',
        rb: 'It is also a to-do list. Same thing.',
      },
      {
        line: 'My secret: learn it, teach it, forget it, learn it faster.',
        a: 'That is a real technique.',
        ra: 'It has a name. I forget what it is.',
        b: 'Sounds exhausting.',
        rb: 'It is! That is how you know it works.',
      },
      {
        line: 'Hackathons are just all-nighters with better branding.',
        a: 'And free pizza.',
        ra: 'The pizza is the main sponsor.',
        b: 'I need sleep first.',
        rb: 'Understandable. Rest. Then pizza.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Sign-Up Sheet',
        scene: [['Felix', 'Volunteers wanted for the hackathon. Free energy drinks and a t-shirt.']],
        prompt: 'Felix shakes a laminated sign-up sheet.',
        options: [
          {
            label: 'Volunteer.',
            result: ['You hand out drinks to sleepy programmers. One cries with gratitude.'],
            fx: { rel: 6, items: { drink: 1 } },
          },
          {
            label: 'Make the poster.',
            result: ['Your poster has a dragon on it. Sign-ups triple.'],
            fx: { rel: 6, stat: { cre: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Server Down',
        scene: [
          ['Felix', 'The event website crashed ten minutes before launch. I am fine. I am extremely fine.'],
        ],
        prompt: 'Felix is typing with six fingers.',
        options: [
          {
            label: 'Restart it.',
            result: ['It works. Nobody knows why. Felix hugs the keyboard.'],
            fx: { rel: 8, stat: { int: 1 } },
          },
          {
            label: 'Breathe with him.',
            result: ['In. Out. The site fixes itself while you meditate.'],
            fx: { rel: 8, stress: -8 },
          },
        ],
      },
      {
        at: 70,
        title: 'Demo Day',
        scene: [['Felix', 'Your idea won the audience award at demo day. I told them it was yours.']],
        prompt: 'Felix holds out a tiny glass trophy.',
        options: [
          {
            label: 'Take a bow.',
            result: ['The crowd claps. You pretend you planned it.'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Share the credit.',
            result: ['“Typical you.” He adds prize money.'],
            fx: { coins: 70, rel: 5 },
          },
        ],
      },
    ],
  },

  /* ------------------------------ Year 4 ------------------------------ */
  nora: {
    name: 'Nora',
    year: 4,
    major: 'Biology',
    role: 'Grad-School Mentor',
    emoji: '🎓',
    color: '#3d7be0',
    bio: 'Library regular and future researcher. Gives advice like she is handing out maps.',
    perks: [
      { need: 2, text: 'Mentor’s Map: +12% hint chance.', bonus: { hintPlus: 0.12 } },
      { need: 3, text: 'Research Habits: +15% mastery gain.', bonus: { masteryPct: 0.15 } },
    ],
    talk: [
      {
        line: 'I once read forty papers in a weekend. Do not do that. Read five and understand them.',
        a: 'Quality over quantity.',
        ra: 'Exactly. Mostly.',
        b: 'Forty papers? Respect.',
        rb: 'It was a mistake. I still have nightmares.',
      },
      {
        line: 'Grad school is mostly asking better questions.',
        a: 'How do I ask better ones?',
        ra: 'Start by asking “why” three times.',
        b: 'Why is that the answer?',
        rb: 'That is one. Two more.',
      },
      {
        line: 'The library at 2 a.m. has a special silence. I call it “the good silence”.',
        a: 'I want to hear it.',
        ra: 'Bring tea. And a sweater.',
        b: 'I prefer the café.',
        rb: 'Different silence. Equal wisdom.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Reading List',
        scene: [['Nora', 'I made you a reading list. Five items. No more. I counted twice.']],
        prompt: 'Nora hands you a neatly folded page.',
        options: [
          {
            label: 'Read it all.',
            result: ['By the end of the week you understand five things deeply.'],
            fx: { rel: 6, stat: { int: 1 } },
          },
          {
            label: 'Pick two to start.',
            result: ['“Smart. Slow is fast.” She looks pleased.'],
            fx: { rel: 6, stat: { foc: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Failed Experiment',
        scene: [['Nora', 'My experiment failed for the sixth time. I am calling it “data”.']],
        prompt: 'Nora stares at a fogged-up petri dish.',
        options: [
          {
            label: 'Failures teach.',
            result: ['“So do friends.” She laughs for the first time all week.'],
            fx: { rel: 8, stress: -6 },
          },
          {
            label: 'Try a new angle.',
            result: ['You sketch a new design on a napkin. She frames it.'],
            fx: { rel: 8, stat: { cre: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Acceptance Letter',
        scene: [['Nora', 'I got in. Grad school. I wanted you to be the first to know.']],
        prompt: 'Nora is holding a very official envelope.',
        options: [
          {
            label: 'Congratulations!',
            result: ['“Do not make me cry in the library.”'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Dinner is on me.',
            result: ['She insists on paying half. She also sends you a stipend note.'],
            fx: { coins: 70, rel: 5 },
          },
        ],
      },
    ],
  },
  jack: {
    name: 'Jack',
    year: 4,
    major: 'Entrepreneurship',
    role: 'Startup Founder',
    emoji: '🚀',
    color: '#ff7a59',
    bio: 'Dropped three business ideas and kept a fourth. Always “between funding rounds”.',
    perks: [
      { need: 2, text: 'Angel Investor: +15% coins from everything.', bonus: { coinPct: 0.15 } },
      { need: 3, text: 'Network Effect: shop prices −10%.', bonus: { shopPct: 0.1 } },
    ],
    talk: [
      {
        line: 'We are disrupting the sandwich industry. I cannot say how. It is a secret sandwich.',
        a: 'Intriguing.',
        ra: 'Right? I have not figured it out yet either.',
        b: 'Is it even a sandwich?',
        rb: 'Technically a wrap. Do not tell investors.',
      },
      {
        line: 'Fail fast, learn faster. Mostly fail, though.',
        a: 'Wise words.',
        ra: 'I have a mug that says it.',
        b: 'Failing sounds expensive.',
        rb: 'It is. That is why they call it “capital”.',
      },
      {
        line: 'My pitch deck has forty slides. Fourteen are about me.',
        a: 'That is a lot of you.',
        ra: 'Branding. It is called branding.',
        b: 'Delete thirty.',
        rb: 'Painful. Correct. Annoying.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Elevator Pitch',
        scene: [['Jack', 'Quick: pitch me your dream startup. Thirty seconds. Go.']],
        prompt: 'Jack taps a stopwatch.',
        options: [
          {
            label: 'A café for nappers.',
            result: ['“Brilliant. I will steal it.” He writes it down anyway.'],
            fx: { rel: 6, stat: { cre: 1 } },
          },
          {
            label: 'A study-buddy app.',
            result: ['“There are forty of those. Yours has a better name.”'],
            fx: { rel: 6, stat: { int: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Investor Meeting',
        scene: [['Jack', 'The investor meeting is in an hour. I have a stain on my shirt and no slides.']],
        prompt: 'Jack paces in a tiny circle.',
        options: [
          {
            label: 'Lend him your blazer.',
            result: ['It fits. Sort of. He looks like a very serious toddler.'],
            fx: { rel: 8, stat: { cha: 1 } },
          },
          {
            label: 'Practise the pitch together.',
            result: ['Three run-throughs. His voice stops shaking.'],
            fx: { rel: 8, stress: -6 },
          },
        ],
      },
      {
        at: 70,
        title: 'First Customer',
        scene: [['Jack', 'We sold a sandwich! One. To a stranger. I framed the receipt.']],
        prompt: 'Jack holds up a framed receipt like a championship belt.',
        options: [
          { label: 'Frame it big.', result: ['It hangs above his desk, glowing.'], fx: { xp: 90, rel: 5 } },
          {
            label: 'Ask for a share.',
            result: ['“Equity: one sandwich.” He adds real coins too.'],
            fx: { coins: 80, rel: 5 },
          },
        ],
      },
    ],
  },
  tessa: {
    name: 'Tessa',
    year: 4,
    major: 'Education',
    role: 'Resident Advisor',
    emoji: '🏠',
    color: '#f0b429',
    bio: 'Runs the dorm floor with warm bossiness. Hands out advice, sticky notes and emergency tea.',
    perks: [
      { need: 2, text: 'Dorm Wellness: −5 stress at the end of every day.', bonus: { stressRelief: 5 } },
      { need: 3, text: 'Warm Blanket: +8 energy at the end of every day.', bonus: { restPlus: 8 } },
    ],
    talk: [
      {
        line: 'Quiet hours start at ten. This is a gentle reminder. And a mild threat.',
        a: 'I will keep it down.',
        ra: 'You are officially my favourite resident.',
        b: 'Quiet hours are a state of mind.',
        rb: 'My favourite excuse. Still no.',
      },
      {
        line: 'I keep a drawer of emergency snacks for sad students. It is never empty.',
        a: 'That is wonderful.',
        ra: 'It is called “community”.',
        b: 'Can I be a sad student?',
        rb: 'You are sad enough. Here: chocolate.',
      },
      {
        line: 'Rule of thumb: if you have not slept, eaten or called home, start there.',
        a: 'Good checklist.',
        ra: 'I laminate it every year.',
        b: 'I will do one of three.',
        rb: 'Pick sleep. Please pick sleep.',
      },
    ],
    beats: [
      {
        at: 15,
        title: 'Floor Meeting',
        scene: [['Tessa', 'Floor meeting at nine. Snacks provided. Attendance is… strongly encouraged.']],
        prompt: 'Tessa waves a clipboard of sticky notes.',
        options: [
          {
            label: 'I will be there.',
            result: ['She hands you a snack box for being early.'],
            fx: { items: { snack: 1 }, rel: 6 },
          },
          {
            label: 'Help set up chairs.',
            result: ['Forty chairs later, you are the unofficial floor mascot.'],
            fx: { rel: 6, stat: { sta: 1 } },
          },
        ],
      },
      {
        at: 40,
        title: 'Homesick',
        scene: [['Tessa', 'Half my floor is homesick this week. Honestly? Me too, a little.']],
        prompt: 'Tessa folds a stack of blankets.',
        options: [
          {
            label: 'Make a care package.',
            result: ['Cookies, a card, a plushie. Half the floor writes thank-you notes.'],
            fx: { rel: 8, stress: -6 },
          },
          {
            label: 'Movie night!',
            result: ['Twenty students, one tiny projector, zero regrets.'],
            fx: { rel: 8, stat: { cre: 1 } },
          },
        ],
      },
      {
        at: 70,
        title: 'Floor Legacy',
        scene: [
          ['Tessa', 'When I leave, the floor needs someone who remembers everyone’s name. I nominated you.'],
        ],
        prompt: 'Tessa hands you a key on a lanyard.',
        options: [
          {
            label: 'I would be honoured.',
            result: ['“Say it with confidence.” You do.'],
            fx: { xp: 100, rel: 5 },
          },
          {
            label: 'Teach me the ropes.',
            result: ['Three hours later you know every secret of dorm life.'],
            fx: { coins: 70, rel: 5 },
          },
        ],
      },
    ],
  },
};
