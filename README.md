# Engineers of the Elite

A 3D engineering-university game that runs in the browser: pick one of **five departments** and take its own
**8-semester curriculum** (8 courses a semester, 138 courses in all), attend lectures in **real walk-in classrooms**, join
clubs, get to know **16 students from every year** and win a finals boss fight at the end of each semester. Built with
**Vite + TypeScript + Three.js**, deployed as a static site.

```bash
npm install
npm run dev        # dev server with hot reload (add ?debug to the URL to expose window.__game)
npm test           # unit tests (Vitest)
npm run typecheck  # strict TypeScript
npm run build      # typecheck + production build into dist/
npm run format     # Prettier
```

Deploy: import the repo in Vercel (the `vercel.json` already sets the Vite framework, build command and
security headers) or run `vercel` from this folder.

## How the game works

- **Calendar:** 64 days. Each semester is 8 days (Mon–Fri, Mon–Tue, then Finals day) with a midterm on day 3 and a
  club showcase on day 5. Each day has 6 periods: three lectures, lunch, after class and evening.
- **Departments:** CSE, EEE, Mathematics, Physics, Chemistry and Humanities. You choose CSE, EEE, Mathematics,
  Physics or Chemistry when you create your student. Humanities teaches courses to everyone but has no students of
  its own.
- **Courses:** each department's students follow their own plan (`src/core/courses.ts`) of eight courses a semester,
  mixing their own department's courses with ones taught by others. A deterministic timetable meets every course at
  least twice, never twice on the same day.
- **Classrooms:** lectures are held in walk-in rooms (lecture hall, seminar room, lab, computer lab) in the teaching
  department's hall. Walk there, press **E** at the door, find the glowing seat and press **E** to sit down and start
  the lesson. Talk to the professor first for a study tip. Classmates in the room come from the departments that take
  that course.
- **A fixed cast of 87:** 16 friends, 40 classmates (eight per major), 23 professors and 8 staff. Students and
  professors each belong to a department. Nobody else exists: every seated student,
  diner and passer-by is one of them, with the same face each time, and you can talk to any of them.
- **A campus that moves:** people stroll about instead of standing on fixed marks. How many you find, and where, is
  random: the campus, corridors and canteen are crowded at lunch, quieter during lectures and nearly empty in the
  evening. Professors pace at the front, kitchen staff work along the counter, dancers and athletes move around their
  club rooms, and latecomers take their chairs when the lecture starts. Walk up to someone and they stop to talk.
- **A relationship with everyone:** it runs from -100 (nemesis) to +100 (devoted) in eleven levels, one every 20 points. Everyone has a personality (a type,
  traits, and tones they like or dislike), shown in their profile from the first meeting. How you answer in
  conversation, your lecture results, cheating and skipping class all move the relationship.
- **Your student:** pick a gender and a department in the creator; the default name follows the gender.
- **Six department halls:** each five storeys tall with a lobby, a corridor on every floor and a real staircase you
  walk up and down: CSE Hall, EEE Hall, Math Hall, Physics Hall, Chemistry Hall and Humanities Hall (which also holds
  the Grand Exam Hall). Rooms are numbered (for example `CSE-301`), first-year rooms sit low and final-year rooms at
  the top, and a room can host different courses in different semesters.
- **The Club House:** all five clubs (chess, music, dance, debate and sports) live in one building, each in its own
  themed room reached from a lobby: a giant floor chessboard, a stage with a drum kit and grand piano, a mirrored
  dance studio, a debate hall with podiums and a judges' table, and an indoor basketball court. Joining is mandatory:
  at the start of every semester you register for **one or two clubs** (never more) and must attend, or you get a
  warning on your semester report.
- **Questions that fit the course:** every course has a question bank plus number generators, so Circuit Analysis asks
  circuits and Cryptography asks ciphers (the departmental thesis courses share a research-writing bank). Difficulty
  rises through the semester and across the degree, and a question is not asked again until the course's whole pool
  has been used.
- **Friends from every year:** 16 students, four per academic year (freshman to senior). Whether someone is above you,
  in your year or below you changes as you progress, so upperclassmen give study tips and younger students look up to you.
  Each friend has three story scenes and perks.
- **Grades:** each course is 30% lectures, 30% midterm (one course per semester) and 40% finals, ranked against a cohort of 40
  simulated classmates. A semester report card, GPA and eight-semester transcript lead to one of several graduation endings.

## Layout

| Path                                          | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/core/`                                   | Pure rules and content, no DOM / WebGL: `types.ts` (the whole save shape), `courses.ts` (catalogue + timetable), `state.ts` (calendar, perks, grades, rank, quests, friend bonuses, saves), `data.ts` + `npcs.ts` + `npcsMore.ts` (content tables), `people.ts` (the cast, personalities and the two scores), `questions.ts` (course question selection: relevance, rising difficulty, no repeats), `qbank/` (hand-written questions, one file per department), `qgen.ts` (number-based question generators) |
| `src/world/`                                  | Pure campus data: `layout.ts` (buildings, zones, gathering places), `wander.ts` (head counts, random spots and walking), `lighting.ts` (time-of-day / weather), `collision.ts`                                                                                                                                                                                                                                                                                                                               |
| `src/render/`                                 | Three.js: `view.ts` (renderer, sky, fog, sun + shadows), `campus.ts` (merged static geometry + animated props), `rooms.ts` (classroom interiors), `clubhouse.ts` (Club House lobby + the five themed club rooms), `departments.ts` (corridor floors and staircases of the six department halls), `canteen.ts` (walk-in canteen: counter, tables, vending machines, store), `batch.ts` (geometry merging), `characters.ts` (incl. seated pose, professors), `parts.ts`                                        |
| `src/ui/`                                     | DOM overlays: `ui.ts` (promise-based dialogs, menus, results), `hud.ts`, `screens.ts` (title, settings, creator)                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/minigames/`                              | `quiz.ts` (lectures, midterms, finals boss) and the five club games: `chess.ts` (verified puzzles), `rhythm.ts` (music), `dance.ts`, `debate.ts` (name the fallacy), `dodge.ts` (sports)                                                                                                                                                                                                                                                                                                                     |
| `src/game.ts`                                 | The controller: day / period flow, classrooms, every activity, rewards, events, reports, endings                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/scene.ts`, `src/input.ts`, `src/main.ts` | Live 3D scene (campus and classroom modes), input handling, boot and title flow                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `tests/`                                      | Vitest suites for the rules layer, curriculum, friends, the world geometry and the classroom interiors                                                                                                                                                                                                                                                                                                                                                                                                       |

Everything under `src/core/` and `src/world/` is independent of the browser, so it is covered by tests that run in
plain Node. Saves are stored in `localStorage` under `lastbell.save.v3` (earlier saves followed a different set of courses
and cannot be converted); the cross-run meta file (settings, New Game+, unlocked cosmetics) keeps its old key and is validated / back-filled on load.
