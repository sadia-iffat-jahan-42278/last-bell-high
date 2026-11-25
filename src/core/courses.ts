// The university curriculum: 8 semesters, 8-10 courses each, plus the deterministic weekly timetable.
// Pure data and maths, so it is unit-tested in plain Node.
import { DEPT_IDS, type ClassBuilding, type CourseId, type RoomKind, type SubjectId } from './types';
import { mulberry32 } from './util';

export interface Course {
  id: CourseId;
  /** Catalogue code such as `MATH 101`. */
  code: string;
  name: string;
  area: SubjectId;
  /** Question difficulty 1..4. */
  tier: number;
  /** 0-based semester the course belongs to. */
  sem: number;
  /** Academic year 1..4. */
  year: number;
  kind: RoomKind;
  building: ClassBuilding;
  /** Floor of its department building, 1..5 (first-year courses sit low, final-year courses high). */
  floor: number;
  /** Which of the floor's six classrooms (0..5). */
  slot: number;
  /** Room label, e.g. `MTH-203`. */
  room: string;
  prof: string;
}

/** Floors in every department building, and classrooms on each floor. */
export const FLOORS = 5;
export const SLOTS_PER_FLOOR = 6;

/** The five department buildings. Each subject area belongs to exactly one of them. */
export const DEPARTMENTS: Record<
  ClassBuilding,
  { hall: string; school: string; code: string; icon: string; color: number }
> = {
  main: { hall: 'Hale Hall', school: 'Humanities', code: 'HUM', icon: '🏛️', color: 0xc23b3b },
  math: { hall: 'Newton Hall', school: 'Mathematics', code: 'MTH', icon: '📐', color: 0x3d7be0 },
  cs: { hall: 'Lovelace Hall', school: 'Computer Science', code: 'CSC', icon: '💻', color: 0x1aa6a6 },
  lab: { hall: 'Curie Hall', school: 'Sciences', code: 'SCI', icon: '🧪', color: 0x35a85a },
  econ: { hall: 'Smith Hall', school: 'Economics', code: 'ECO', icon: '📈', color: 0xe0a02a },
};
export const AREA_DEPT: Record<SubjectId, ClassBuilding> = {
  math: 'math',
  cs: 'cs',
  science: 'lab',
  econ: 'econ',
  english: 'main',
  history: 'main',
};
export const BUILDING_LABEL: Record<ClassBuilding, string> = Object.fromEntries(
  DEPT_IDS.map((d) => [d, DEPARTMENTS[d].hall]),
) as Record<ClassBuilding, string>;

export const ROOM_KIND_NAME: Record<RoomKind, string> = {
  lecture: 'Lecture Hall',
  seminar: 'Seminar Room',
  lab: 'Laboratory',
  computer: 'Computer Lab',
};

/** Professors per subject area, cycled through as courses are generated. */
const PROFS: Record<SubjectId, string[]> = {
  math: ['Prof. Okafor', 'Prof. Lindqvist', 'Prof. Banerjee', 'Prof. Castellanos'],
  science: ['Prof. Nakamura', 'Prof. Delacroix', 'Prof. Adeyemi', 'Prof. Whitfield', 'Prof. Sorensen'],
  english: ['Prof. Hartwell', 'Prof. Moreau', 'Prof. Abernathy'],
  history: ['Prof. Karlsson', 'Prof. Villanueva', 'Prof. Oyelaran', 'Prof. Brandt'],
  cs: ['Prof. Turing-Reyes', 'Prof. Zhao', 'Prof. Lovelace-Kim', 'Prof. Petrov'],
  econ: ['Prof. Marchetti', 'Prof. Osei', 'Prof. Fairbanks'],
};

type Row = [name: string, area: SubjectId, tier: number, kind: RoomKind];

/** One array per semester: the player takes every course listed. */
const CATALOG: Row[][] = [
  // ---- Year 1, Fall ----
  [
    ['Calculus I', 'math', 2, 'lecture'],
    ['Intro to Programming', 'cs', 1, 'computer'],
    ['General Chemistry', 'science', 1, 'lab'],
    ['Academic Writing', 'english', 1, 'seminar'],
    ['World History I', 'history', 1, 'lecture'],
    ['Principles of Economics', 'econ', 1, 'lecture'],
    ['Physics I', 'science', 2, 'lab'],
    ['Statistics I', 'math', 2, 'lecture'],
  ],
  // ---- Year 1, Spring ----
  [
    ['Calculus II', 'math', 3, 'lecture'],
    ['Data Structures', 'cs', 2, 'computer'],
    ['General Biology', 'science', 2, 'lab'],
    ['Composition & Rhetoric', 'english', 2, 'seminar'],
    ['World History II', 'history', 2, 'lecture'],
    ['Microeconomics', 'econ', 2, 'lecture'],
    ['Physics II', 'science', 3, 'lab'],
    ['Linear Algebra', 'math', 3, 'lecture'],
    ['Public Speaking', 'english', 1, 'seminar'],
  ],
  // ---- Year 2, Fall ----
  [
    ['Discrete Mathematics', 'math', 3, 'lecture'],
    ['Computer Systems', 'cs', 3, 'computer'],
    ['Organic Chemistry I', 'science', 3, 'lab'],
    ['British Literature', 'english', 2, 'seminar'],
    ['Modern European History', 'history', 3, 'lecture'],
    ['Macroeconomics', 'econ', 2, 'lecture'],
    ['Probability Theory', 'math', 3, 'lecture'],
    ['Intro to Psychology', 'science', 1, 'lecture'],
    ['Ethics & Philosophy', 'history', 2, 'seminar'],
    ['Financial Accounting', 'econ', 2, 'lecture'],
  ],
  // ---- Year 2, Spring ----
  [
    ['Algorithms', 'cs', 3, 'computer'],
    ['Databases', 'cs', 3, 'computer'],
    ['Organic Chemistry II', 'science', 3, 'lab'],
    ['American Literature', 'english', 3, 'seminar'],
    ['Political Science', 'history', 3, 'lecture'],
    ['Managerial Accounting', 'econ', 3, 'lecture'],
    ['Differential Equations', 'math', 4, 'lecture'],
    ['Cell Biology', 'science', 3, 'lab'],
    ['Statistics II', 'math', 3, 'lecture'],
  ],
  // ---- Year 3, Fall ----
  [
    ['Operating Systems', 'cs', 4, 'computer'],
    ['Machine Learning I', 'cs', 4, 'computer'],
    ['Numerical Methods', 'math', 4, 'lecture'],
    ['Biochemistry', 'science', 4, 'lab'],
    ['Creative Writing', 'english', 3, 'seminar'],
    ['History of Science', 'history', 3, 'seminar'],
    ['Econometrics', 'econ', 4, 'lecture'],
    ['Corporate Finance', 'econ', 3, 'lecture'],
    ['Social Psychology', 'science', 3, 'lecture'],
    ['Real Analysis', 'math', 4, 'lecture'],
  ],
  // ---- Year 3, Spring ----
  [
    ['Software Engineering', 'cs', 4, 'computer'],
    ['Computer Networks', 'cs', 3, 'computer'],
    ['Game Theory', 'econ', 4, 'lecture'],
    ['Quantum Physics', 'science', 4, 'lab'],
    ['Modern Poetry', 'english', 3, 'seminar'],
    ['Asian History', 'history', 3, 'lecture'],
    ['Number Theory', 'math', 4, 'lecture'],
    ['Research Methods', 'science', 3, 'lab'],
    ['International Trade', 'econ', 3, 'lecture'],
  ],
  // ---- Year 4, Fall ----
  [
    ['Distributed Systems', 'cs', 4, 'computer'],
    ['AI Capstone I', 'cs', 4, 'computer'],
    ['Thesis Seminar I', 'english', 4, 'seminar'],
    ['Global History', 'history', 4, 'lecture'],
    ['Advanced Macroeconomics', 'econ', 4, 'lecture'],
    ['Astrophysics', 'science', 4, 'lab'],
    ['Topology', 'math', 4, 'lecture'],
    ['Ethics in Technology', 'history', 3, 'seminar'],
  ],
  // ---- Year 4, Spring ----
  [
    ['Capstone Project', 'cs', 4, 'computer'],
    ['Thesis Seminar II', 'english', 4, 'seminar'],
    ['Entrepreneurship', 'econ', 3, 'lecture'],
    ['Philosophy of Mind', 'history', 4, 'seminar'],
    ['Cryptography', 'math', 4, 'lecture'],
    ['Environmental Science', 'science', 3, 'lab'],
    ['Technical Communication', 'english', 3, 'seminar'],
    ['Art & Society', 'history', 3, 'lecture'],
  ],
];

const CODE: Record<SubjectId, string> = {
  math: 'MATH',
  science: 'SCI',
  english: 'ENG',
  history: 'HIST',
  cs: 'CS',
  econ: 'ECON',
};

export const COURSES: Record<CourseId, Course> = {};
/** Course ids per semester, in catalogue order. */
export const CURRICULUM: CourseId[][] = [];

(() => {
  const profIdx: Partial<Record<SubjectId, number>> = {};
  CATALOG.forEach((rows, sem) => {
    const ids: CourseId[] = [];
    rows.forEach(([name, area, tier, kind], i) => {
      const id = `${CODE[area].toLowerCase()}${sem + 1}_${i + 1}`;
      const k = (profIdx[area] = (profIdx[area] ?? -1) + 1);
      const profs = PROFS[area];
      COURSES[id] = {
        id,
        code: `${CODE[area]} ${(Math.floor(sem / 2) + 1) * 100 + (sem % 2) * 10 + i + 1}`,
        name,
        area,
        tier,
        sem,
        year: Math.floor(sem / 2) + 1,
        kind,
        building: AREA_DEPT[area],
        floor: 1,
        slot: 0,
        room: '',
        prof: profs[k % profs.length],
      };
      ids.push(id);
    });
    CURRICULUM.push(ids);
  });
})();

// Rooms: each department building lists its courses in catalogue order (first year first) and hands out classrooms
// floor by floor, so first-year courses sit on the low floors and final-year courses on the top ones.
// Slot 5 of the ground floor in Hale Hall is kept for the Grand Exam Hall.
(() => {
  for (const dept of DEPT_IDS) {
    const list = Object.values(COURSES).filter((c) => c.building === dept);
    const perFloor = Math.min(SLOTS_PER_FLOOR - 1, Math.ceil(list.length / FLOORS));
    list.forEach((c, i) => {
      c.floor = 1 + Math.floor(i / perFloor);
      c.slot = i % perFloor;
      c.room = `${DEPARTMENTS[dept].code}-${c.floor}${String(c.slot + 1).padStart(2, '0')}`;
    });
  }
})();

export const TOTAL_COURSES = Object.keys(COURSES).length;

/** The course taught in a department building's classroom, if any. */
export function courseInRoom(building: ClassBuilding, floor: number, slot: number): Course | null {
  return (
    Object.values(COURSES).find((c) => c.building === building && c.floor === floor && c.slot === slot) ??
    null
  );
}

/** The grand hall used for midterm-style exams and finals. */
export const EXAM_HALL = {
  name: 'Grand Exam Hall',
  room: 'HUM-GH',
  floor: 1,
  slot: SLOTS_PER_FLOOR - 1,
  kind: 'lecture' as RoomKind,
  building: 'main' as ClassBuilding,
};

/* ---------------------------- timetable ---------------------------- */
/** Periods that hold a lecture; the rest of the day is lunch, after-class time and evening. */
export const LECTURE_PERIODS = [0, 1, 3] as const;
/** Days 0..LECTURE_DAYS-1 have lectures; the last day of a semester is finals. */
export const LECTURE_DAYS = 7;
export const MIDTERM_DAY = 2;
export const MIDTERM_PERIOD = 1;

export type TimetableEntry = CourseId | 'TEST' | 'FINAL' | null;

const cache = new Map<number, TimetableEntry[][]>();

/** The course examined in the midterm of semester `sem`. */
export function midtermCourse(sem: number): CourseId {
  const ids = CURRICULUM[Math.max(0, Math.min(CURRICULUM.length - 1, sem))];
  return ids[(sem * 3) % ids.length];
}

/**
 * Lecture timetable for a whole semester: `[day][period]`. Every course meets at least twice, never twice in
 * one day. Periods without a lecture hold `null`. The final day is two FINAL slots.
 */
export function semesterTimetable(sem: number): TimetableEntry[][] {
  const hit = cache.get(sem);
  if (hit) return hit;
  const ids = CURRICULUM[sem];
  const slots: [number, number][] = [];
  for (let d = 0; d < LECTURE_DAYS; d++)
    for (const p of LECTURE_PERIODS) if (!(d === MIDTERM_DAY && p === MIDTERM_PERIOD)) slots.push([d, p]);
  let table: TimetableEntry[][] | null = null;
  for (let attempt = 0; attempt < 400 && !table; attempt++) {
    const rng = mulberry32(sem * 7919 + attempt * 104729 + 17);
    const pool: CourseId[] = [...ids, ...ids];
    for (let i = 0; pool.length < slots.length; i++) pool.push(ids[Math.floor(rng() * ids.length)]);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const t: TimetableEntry[][] = Array.from({ length: LECTURE_DAYS + 1 }, () => [null, null, null, null]);
    let ok = true;
    slots.forEach(([d, p], i) => {
      if (!ok) return;
      const today = t[d].filter((x) => x);
      let k = i;
      while (k < pool.length && today.includes(pool[k])) k++;
      if (k >= pool.length) {
        ok = false;
        return;
      }
      [pool[i], pool[k]] = [pool[k], pool[i]];
      t[d][p] = pool[i];
    });
    if (ok) table = t;
  }
  if (!table) throw new Error(`Could not build a timetable for semester ${sem}`);
  table[MIDTERM_DAY][MIDTERM_PERIOD] = 'TEST';
  table[LECTURE_DAYS][0] = 'FINAL';
  table[LECTURE_DAYS][1] = 'FINAL';
  cache.set(sem, table);
  return table;
}

/** Subject areas the finals boss quizzes you on: the semester's distinct areas, at most four. */
export function finalPhases(sem: number): SubjectId[] {
  const out: SubjectId[] = [];
  for (const id of CURRICULUM[sem]) if (!out.includes(COURSES[id].area)) out.push(COURSES[id].area);
  return out.slice(0, 4);
}
