# Last Bell University

A 3D university-life game that runs in the browser: **4 years, 8 semesters, 71 courses** with 8–10 courses each
semester, lectures held in **real walk-in classrooms**, midterms, clubs, **16 students from every year** and a finals boss
fight at the end of each semester. Built with **Vite + TypeScript + Three.js**, deployed as a static site.

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
- **Courses:** every semester has its own 8–10 courses (`src/core/courses.ts`), each with a professor, a room and a
  question difficulty. A deterministic timetable meets every course at least twice, never twice on the same day.
- **Classrooms:** lectures are held in walk-in rooms (lecture hall, seminar room, lab, computer lab). Walk to
  Hale Hall or the Science Labs, press **E** at the door, find the glowing seat and press **E** to sit down and start the
  lesson. Talk to the professor first for a study tip.
- **Department buildings:** classrooms are split into five department buildings, each five storeys tall with a
  lobby, a corridor on every floor and a real staircase you walk up and down: Hale Hall (Humanities, plus the Grand
  Exam Hall), Newton Hall (Mathematics), Lovelace Hall (Computer Science), Curie Hall (Sciences) and Smith Hall
  (Economics). Every course has its own numbered room (for example `MTH-401`); first-year courses sit on the low
  floors and final-year courses on the top ones, and each department's classrooms have their own colours.
- **The Club House:** all five clubs (chess, music, dance, debate and sports) live in one building, each in its own
  themed room reached from a lobby: a giant floor chessboard, a stage with a drum kit and grand piano, a mirrored
  dance studio, a debate hall with podiums and a judges' table, and an indoor basketball court. Joining is mandatory:
  at the start of every semester you register for **one or two clubs** (never more) and must attend, or you get a
  warning on your semester report.
- **Questions that fit the course:** every course has its own question bank (71 of them) plus number generators, so
  Calculus asks calculus, Cryptography asks ciphers and keys. Difficulty rises through the semester and across the
  degree, and a question is not asked again until the course's whole pool has been used.
- **Friends from every year:** 16 students, four per academic year (freshman to senior). Whether someone is above you,
  in your year or below you changes as you progress, so upperclassmen give study tips and younger students look up to you.
  Each friend has three story scenes and perks.
- **Grades:** each course is 30% lectures, 30% midterm (one course per semester) and 40% finals, ranked against a cohort of 24
  simulated classmates. A semester report card, GPA and eight-semester transcript lead to one of several graduation endings.

## Layout

| Path                                          | What lives there                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/`                                   | Pure rules and content, no DOM / WebGL: `types.ts` (the whole save shape), `courses.ts` (catalogue + timetable), `state.ts` (calendar, perks, grades, rank, quests, friend bonuses, saves), `data.ts` + `bank.ts` + `npcs.ts` + `npcsMore.ts` (content tables), `questions.ts` (course question selection: relevance, rising difficulty, no repeats), `qbank/` (hand-written questions for all 71 courses), `qgen.ts` (number-based question generators)                   |
| `src/world/`                                  | Pure campus data: `layout.ts` (buildings, zones, spawn points, friend hangouts), `lighting.ts` (time-of-day / weather), `collision.ts`                                                                                                                                                                                                                                                                                                                                     |
| `src/render/`                                 | Three.js: `view.ts` (renderer, sky, fog, sun + shadows), `campus.ts` (merged static geometry + animated props), `rooms.ts` (classroom interiors), `clubhouse.ts` (Club House lobby + the five themed club rooms), `departments.ts` (corridor floors and staircases of the five department buildings), `canteen.ts` (walk-in canteen: counter, tables, vending machines, store), `batch.ts` (geometry merging), `characters.ts` (incl. seated pose, professors), `parts.ts` |
| `src/ui/`                                     | DOM overlays: `ui.ts` (promise-based dialogs, menus, results), `hud.ts`, `screens.ts` (title, settings, creator)                                                                                                                                                                                                                                                                                                                                                           |
| `src/minigames/`                              | `quiz.ts` (lectures, midterms, finals boss) and the five club games: `chess.ts` (verified puzzles), `rhythm.ts` (music), `dance.ts`, `debate.ts` (name the fallacy), `dodge.ts` (sports)                                                                                                                                                                                                                                                                                   |
| `src/game.ts`                                 | The controller: day / period flow, classrooms, every activity, rewards, events, reports, endings                                                                                                                                                                                                                                                                                                                                                                           |
| `src/scene.ts`, `src/input.ts`, `src/main.ts` | Live 3D scene (campus and classroom modes), input handling, boot and title flow                                                                                                                                                                                                                                                                                                                                                                                            |
| `tests/`                                      | Vitest suites for the rules layer, curriculum, friends, the world geometry and the classroom interiors                                                                                                                                                                                                                                                                                                                                                                     |

Everything under `src/core/` and `src/world/` is independent of the browser, so it is covered by tests that run in
plain Node. Saves are stored in `localStorage` under `lastbell.save.v2` (old high-school `v1` saves cannot be converted);
the cross-run meta file (settings, New Game+, unlocked cosmetics) keeps its old key and is validated / back-filled on load.
