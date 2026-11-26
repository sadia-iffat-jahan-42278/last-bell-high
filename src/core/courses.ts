// The university: six departments, five majors with their own 8-semester curricula, classrooms and the
// deterministic weekly timetable. Pure data and maths, so it is unit-tested in plain Node.
import {
  DEPT_IDS,
  MAJOR_IDS,
  type ClassBuilding,
  type CourseId,
  type DeptId,
  type MajorId,
  type RoomKind,
} from './types';
import { mulberry32 } from './util';

export interface Course {
  id: CourseId;
  /** Catalogue code such as `CSE 101`. */
  code: string;
  name: string;
  /** The department that teaches it: its classroom is in that department's hall. */
  area: DeptId;
  /** Question difficulty 1..4. */
  tier: number;
  /** 0-based semester the course is taken in. */
  sem: number;
  /** Academic year 1..4. */
  year: number;
  kind: RoomKind;
  building: ClassBuilding;
  /** Floor of its department hall, 1..5 (first-year courses sit low, final-year courses high). */
  floor: number;
  /** Which of the floor's six classrooms (0..5). */
  slot: number;
  /** Room label, e.g. `CSE-203`. Courses of different semesters can share a room. */
  room: string;
  prof: string;
  /** Which majors take this course. */
  majors: MajorId[];
  /** Name of its question bank (usually the course name; thesis courses share one). */
  bank: string;
}

/** Floors in every department building, and classrooms on each floor. */
export const FLOORS = 5;
export const SLOTS_PER_FLOOR = 6;

/** The six departments and their halls. Every course is taught in its own department's hall. */
export const DEPARTMENTS: Record<
  DeptId,
  { hall: string; school: string; short: string; code: string; icon: string; color: number }
> = {
  cse: {
    hall: 'CSE Hall',
    school: 'Computer Science & Engineering',
    short: 'CSE',
    code: 'CSE',
    icon: '💻',
    color: 0x1aa6a6,
  },
  eee: {
    hall: 'EEE Hall',
    school: 'Electrical & Electronic Engineering',
    short: 'EEE',
    code: 'EEE',
    icon: '⚡',
    color: 0xe0a02a,
  },
  math: {
    hall: 'Math Hall',
    school: 'Mathematics',
    short: 'Mathematics',
    code: 'MATH',
    icon: '📐',
    color: 0x3d7be0,
  },
  phy: {
    hall: 'Physics Hall',
    school: 'Physics',
    short: 'Physics',
    code: 'PHY',
    icon: '🔭',
    color: 0x7a4fb5,
  },
  chem: {
    hall: 'Chemistry Hall',
    school: 'Chemistry',
    short: 'Chemistry',
    code: 'CHEM',
    icon: '🧪',
    color: 0x35a85a,
  },
  hum: {
    hall: 'Humanities Hall',
    school: 'Humanities',
    short: 'Humanities',
    code: 'HUM',
    icon: '🏛️',
    color: 0xc23b3b,
  },
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

/** The professors of each department, cycled through as its courses are listed. */
export const FACULTY: Record<DeptId, string[]> = {
  cse: ['Prof. Turing-Reyes', 'Prof. Zhao', 'Prof. Lovelace-Kim', 'Prof. Petrov'],
  eee: ['Prof. Marchetti', 'Prof. Osei', 'Prof. Fairbanks', 'Prof. Brandt'],
  math: ['Prof. Okafor', 'Prof. Lindqvist', 'Prof. Banerjee', 'Prof. Castellanos'],
  phy: ['Prof. Nakamura', 'Prof. Delacroix', 'Prof. Whitfield'],
  chem: ['Prof. Adeyemi', 'Prof. Sorensen', 'Prof. Villanueva'],
  hum: ['Prof. Hartwell', 'Prof. Moreau', 'Prof. Abernathy', 'Prof. Karlsson', 'Prof. Oyelaran'],
};

/** The label on a classroom door, e.g. `CSE-203`. */
export function roomCode(building: ClassBuilding, floor: number, slot: number): string {
  return `${DEPARTMENTS[building].code}-${floor}${String(slot + 1).padStart(2, '0')}`;
}

/** [name, semester 1..8, difficulty 1..4, room kind, question bank if it differs from the name] */
type Row = [name: string, sem: number, tier: number, kind: RoomKind, bank?: string];

const L: RoomKind = 'lecture';
const S: RoomKind = 'seminar';
const B: RoomKind = 'lab';
const C: RoomKind = 'computer';

const CATALOG: Record<DeptId, Row[]> = {
  cse: [
    ['Intro to Programming', 1, 1, C],
    ['Computing Fundamentals', 1, 1, C],
    ['Data Structures', 2, 2, C],
    ['Digital Logic Design', 2, 2, B],
    ['Algorithms', 3, 3, C],
    ['Object-Oriented Programming', 3, 2, C],
    ['Computer Architecture', 3, 3, L],
    ['Databases', 4, 3, C],
    ['Operating Systems', 4, 3, C],
    ['Theory of Computation', 4, 3, L],
    ['Web Engineering', 4, 2, C],
    ['Software Engineering', 5, 3, C],
    ['Computer Networks', 5, 3, C],
    ['Compiler Design', 5, 4, C],
    ['Artificial Intelligence', 5, 3, C],
    ['Computer Graphics', 5, 3, C],
    ['Machine Learning', 6, 4, C],
    ['Distributed Systems', 6, 4, C],
    ['Computer Security', 6, 3, C],
    ['Human-Computer Interaction', 6, 3, S],
    ['CSE Thesis I', 7, 4, S, 'Thesis I'],
    ['Cloud Computing', 7, 3, C],
    ['Data Mining', 7, 4, C],
    ['Natural Language Processing', 7, 4, C],
    ['CSE Thesis II', 8, 4, S, 'Thesis II'],
    ['Computer Vision', 8, 4, C],
    ['Parallel Computing', 8, 4, C],
    ['Software Testing', 8, 3, C],
  ],
  eee: [
    ['Circuit Analysis I', 1, 1, B],
    ['Engineering Drawing', 1, 1, S],
    ['Circuit Analysis II', 2, 2, B],
    ['Electronic Devices', 2, 2, B],
    ['Signals & Systems', 3, 3, L],
    ['Analog Electronics', 3, 3, B],
    ['Electrical Machines I', 4, 3, B],
    ['Microprocessors', 4, 3, C],
    ['Electrical Machines II', 5, 3, B],
    ['Control Systems', 5, 3, L],
    ['Communication Theory', 5, 3, L],
    ['Digital Signal Processing', 5, 4, C],
    ['Power Systems', 6, 3, L],
    ['Power Electronics', 6, 4, B],
    ['Digital Communication', 6, 4, L],
    ['VLSI Design', 6, 4, C],
    ['EEE Thesis I', 7, 4, S, 'Thesis I'],
    ['Microwave Engineering', 7, 4, L],
    ['Renewable Energy', 7, 3, L],
    ['Embedded Systems', 7, 3, B],
    ['EEE Thesis II', 8, 4, S, 'Thesis II'],
    ['Wireless Communication', 8, 4, L],
    ['Power System Protection', 8, 4, L],
    ['Robotics', 8, 4, B],
  ],
  math: [
    ['Calculus I', 1, 2, L],
    ['Analytic Geometry', 1, 1, L],
    ['Mathematical Logic', 1, 1, L],
    ['Calculus II', 2, 3, L],
    ['Linear Algebra', 2, 3, L],
    ['Discrete Mathematics', 2, 2, L],
    ['Differential Equations', 3, 3, L],
    ['Statistics I', 3, 2, L],
    ['Multivariable Calculus', 3, 3, L],
    ['Numerical Methods', 4, 3, C],
    ['Real Analysis', 4, 4, L],
    ['Abstract Algebra', 4, 4, L],
    ['Complex Analysis', 5, 4, L],
    ['Partial Differential Equations', 5, 4, L],
    ['Number Theory', 5, 3, L],
    ['Statistics II', 5, 3, L],
    ['Topology', 6, 4, L],
    ['Mathematical Modelling', 6, 3, S],
    ['Operations Research', 6, 3, L],
    ['Cryptography', 6, 4, L],
    ['Mathematics Thesis I', 7, 4, S, 'Thesis I'],
    ['Functional Analysis', 7, 4, L],
    ['Differential Geometry', 7, 4, L],
    ['Graph Theory', 7, 3, L],
    ['Mathematics Thesis II', 8, 4, S, 'Thesis II'],
    ['Stochastic Processes', 8, 4, L],
    ['Measure Theory', 8, 4, L],
    ['Optimisation', 8, 4, C],
  ],
  phy: [
    ['Physics I', 1, 2, B],
    ['Mechanics', 1, 2, L],
    ['Physics II', 2, 3, B],
    ['Waves & Oscillations', 2, 2, L],
    ['Optics', 3, 3, B],
    ['Thermodynamics', 3, 3, L],
    ['Electromagnetism', 4, 3, L],
    ['Modern Physics', 4, 3, L],
    ['Quantum Mechanics', 5, 4, L],
    ['Statistical Mechanics', 5, 4, L],
    ['Solid State Physics', 6, 4, L],
    ['Nuclear Physics', 6, 4, L],
    ['Computational Physics', 6, 3, C],
    ['Physics Thesis I', 7, 4, S, 'Thesis I'],
    ['Astrophysics', 7, 4, B],
    ['Photonics', 7, 4, B],
    ['Plasma Physics', 7, 4, L],
    ['Physics Thesis II', 8, 4, S, 'Thesis II'],
    ['Relativity', 8, 4, L],
    ['Materials Physics', 8, 4, B],
  ],
  chem: [
    ['General Chemistry', 1, 1, B],
    ['Inorganic Chemistry I', 1, 1, B],
    ['General Biology', 1, 1, B],
    ['Organic Chemistry I', 2, 2, B],
    ['Analytical Chemistry', 2, 2, B],
    ['Physical Chemistry I', 3, 3, B],
    ['Inorganic Chemistry II', 3, 3, B],
    ['Organic Chemistry II', 4, 3, B],
    ['Physical Chemistry II', 4, 3, B],
    ['Cell Biology', 4, 3, B],
    ['Biochemistry', 5, 4, B],
    ['Instrumental Analysis', 5, 3, B],
    ['Quantum Chemistry', 5, 4, L],
    ['Polymer Chemistry', 6, 3, B],
    ['Industrial Chemistry', 6, 3, L],
    ['Electrochemistry', 6, 4, B],
    ['Environmental Science', 6, 3, L],
    ['Chemistry Thesis I', 7, 4, S, 'Thesis I'],
    ['Spectroscopy', 7, 4, B],
    ['Nanochemistry', 7, 4, B],
    ['Chemistry Thesis II', 8, 4, S, 'Thesis II'],
    ['Medicinal Chemistry', 8, 4, B],
    ['Green Chemistry', 8, 3, L],
  ],
  hum: [
    ['Academic Writing', 1, 1, S],
    ['History of Science', 1, 1, S],
    ['Technical Communication', 2, 2, S],
    ['Public Speaking', 2, 1, S],
    ['Principles of Economics', 3, 1, L],
    ['Intro to Psychology', 3, 1, L],
    ['Financial Accounting', 4, 2, L],
    ['Engineering Ethics', 4, 3, S],
    ['Engineering Management', 5, 3, L],
    ['Sociology', 5, 3, S],
    ['Entrepreneurship', 6, 3, L],
    ['Law for Engineers', 7, 3, L],
    ['Research Methods', 7, 3, S],
    ['Professional Practice', 8, 3, S],
    ['Organisational Behaviour', 8, 4, S],
  ],
};

/** What each major takes, semester by semester (eight courses each). */
const PLANS: Record<MajorId, string[][]> = {
  cse: [
    [
      'Intro to Programming',
      'Computing Fundamentals',
      'Calculus I',
      'Physics I',
      'General Chemistry',
      'Circuit Analysis I',
      'Academic Writing',
      'History of Science',
    ],
    [
      'Data Structures',
      'Digital Logic Design',
      'Discrete Mathematics',
      'Calculus II',
      'Linear Algebra',
      'Physics II',
      'Electronic Devices',
      'Technical Communication',
    ],
    [
      'Algorithms',
      'Object-Oriented Programming',
      'Computer Architecture',
      'Differential Equations',
      'Statistics I',
      'Signals & Systems',
      'Principles of Economics',
      'Intro to Psychology',
    ],
    [
      'Databases',
      'Operating Systems',
      'Theory of Computation',
      'Web Engineering',
      'Microprocessors',
      'Numerical Methods',
      'Financial Accounting',
      'Engineering Ethics',
    ],
    [
      'Software Engineering',
      'Computer Networks',
      'Compiler Design',
      'Artificial Intelligence',
      'Computer Graphics',
      'Digital Signal Processing',
      'Complex Analysis',
      'Engineering Management',
    ],
    [
      'Machine Learning',
      'Distributed Systems',
      'Computer Security',
      'Human-Computer Interaction',
      'Cryptography',
      'Operations Research',
      'VLSI Design',
      'Entrepreneurship',
    ],
    [
      'CSE Thesis I',
      'Cloud Computing',
      'Data Mining',
      'Natural Language Processing',
      'Embedded Systems',
      'Graph Theory',
      'Law for Engineers',
      'Research Methods',
    ],
    [
      'CSE Thesis II',
      'Computer Vision',
      'Parallel Computing',
      'Software Testing',
      'Robotics',
      'Optimisation',
      'Professional Practice',
      'Organisational Behaviour',
    ],
  ],
  eee: [
    [
      'Circuit Analysis I',
      'Engineering Drawing',
      'Intro to Programming',
      'Calculus I',
      'Analytic Geometry',
      'Physics I',
      'General Chemistry',
      'Academic Writing',
    ],
    [
      'Circuit Analysis II',
      'Electronic Devices',
      'Data Structures',
      'Calculus II',
      'Linear Algebra',
      'Physics II',
      'Technical Communication',
      'Public Speaking',
    ],
    [
      'Signals & Systems',
      'Analog Electronics',
      'Object-Oriented Programming',
      'Differential Equations',
      'Multivariable Calculus',
      'Statistics I',
      'Thermodynamics',
      'Principles of Economics',
    ],
    [
      'Electrical Machines I',
      'Microprocessors',
      'Electromagnetism',
      'Modern Physics',
      'Numerical Methods',
      'Databases',
      'Financial Accounting',
      'Engineering Ethics',
    ],
    [
      'Electrical Machines II',
      'Control Systems',
      'Communication Theory',
      'Digital Signal Processing',
      'Complex Analysis',
      'Partial Differential Equations',
      'Computer Networks',
      'Engineering Management',
    ],
    [
      'Power Systems',
      'Power Electronics',
      'Digital Communication',
      'VLSI Design',
      'Machine Learning',
      'Solid State Physics',
      'Environmental Science',
      'Entrepreneurship',
    ],
    [
      'EEE Thesis I',
      'Microwave Engineering',
      'Renewable Energy',
      'Embedded Systems',
      'Photonics',
      'Cloud Computing',
      'Law for Engineers',
      'Research Methods',
    ],
    [
      'EEE Thesis II',
      'Wireless Communication',
      'Power System Protection',
      'Robotics',
      'Computer Vision',
      'Materials Physics',
      'Professional Practice',
      'Organisational Behaviour',
    ],
  ],
  math: [
    [
      'Calculus I',
      'Analytic Geometry',
      'Mathematical Logic',
      'Intro to Programming',
      'Physics I',
      'General Chemistry',
      'Academic Writing',
      'History of Science',
    ],
    [
      'Calculus II',
      'Linear Algebra',
      'Discrete Mathematics',
      'Data Structures',
      'Physics II',
      'Waves & Oscillations',
      'Technical Communication',
      'Public Speaking',
    ],
    [
      'Differential Equations',
      'Statistics I',
      'Multivariable Calculus',
      'Algorithms',
      'Object-Oriented Programming',
      'Optics',
      'Principles of Economics',
      'Intro to Psychology',
    ],
    [
      'Real Analysis',
      'Abstract Algebra',
      'Numerical Methods',
      'Databases',
      'Theory of Computation',
      'Modern Physics',
      'Financial Accounting',
      'Engineering Ethics',
    ],
    [
      'Complex Analysis',
      'Partial Differential Equations',
      'Number Theory',
      'Statistics II',
      'Artificial Intelligence',
      'Quantum Mechanics',
      'Engineering Management',
      'Sociology',
    ],
    [
      'Topology',
      'Mathematical Modelling',
      'Operations Research',
      'Cryptography',
      'Machine Learning',
      'Computational Physics',
      'Environmental Science',
      'Entrepreneurship',
    ],
    [
      'Mathematics Thesis I',
      'Functional Analysis',
      'Differential Geometry',
      'Graph Theory',
      'Data Mining',
      'Astrophysics',
      'Law for Engineers',
      'Research Methods',
    ],
    [
      'Mathematics Thesis II',
      'Stochastic Processes',
      'Measure Theory',
      'Optimisation',
      'Parallel Computing',
      'Relativity',
      'Professional Practice',
      'Organisational Behaviour',
    ],
  ],
  phy: [
    [
      'Physics I',
      'Mechanics',
      'Calculus I',
      'Analytic Geometry',
      'Intro to Programming',
      'General Chemistry',
      'Circuit Analysis I',
      'Academic Writing',
    ],
    [
      'Physics II',
      'Waves & Oscillations',
      'Calculus II',
      'Linear Algebra',
      'Discrete Mathematics',
      'Electronic Devices',
      'Analytical Chemistry',
      'Technical Communication',
    ],
    [
      'Optics',
      'Thermodynamics',
      'Differential Equations',
      'Multivariable Calculus',
      'Statistics I',
      'Analog Electronics',
      'Physical Chemistry I',
      'Principles of Economics',
    ],
    [
      'Electromagnetism',
      'Modern Physics',
      'Numerical Methods',
      'Real Analysis',
      'Microprocessors',
      'Physical Chemistry II',
      'Engineering Ethics',
      'Financial Accounting',
    ],
    [
      'Quantum Mechanics',
      'Statistical Mechanics',
      'Complex Analysis',
      'Partial Differential Equations',
      'Statistics II',
      'Instrumental Analysis',
      'Quantum Chemistry',
      'Engineering Management',
    ],
    [
      'Solid State Physics',
      'Nuclear Physics',
      'Computational Physics',
      'Mathematical Modelling',
      'Topology',
      'Electrochemistry',
      'Environmental Science',
      'Entrepreneurship',
    ],
    [
      'Physics Thesis I',
      'Astrophysics',
      'Photonics',
      'Plasma Physics',
      'Differential Geometry',
      'Renewable Energy',
      'Law for Engineers',
      'Research Methods',
    ],
    [
      'Physics Thesis II',
      'Relativity',
      'Materials Physics',
      'Stochastic Processes',
      'Robotics',
      'Green Chemistry',
      'Professional Practice',
      'Organisational Behaviour',
    ],
  ],
  chem: [
    [
      'General Chemistry',
      'Inorganic Chemistry I',
      'General Biology',
      'Calculus I',
      'Physics I',
      'Computing Fundamentals',
      'Academic Writing',
      'History of Science',
    ],
    [
      'Organic Chemistry I',
      'Analytical Chemistry',
      'Calculus II',
      'Linear Algebra',
      'Physics II',
      'Waves & Oscillations',
      'Technical Communication',
      'Public Speaking',
    ],
    [
      'Physical Chemistry I',
      'Inorganic Chemistry II',
      'Thermodynamics',
      'Differential Equations',
      'Statistics I',
      'Object-Oriented Programming',
      'Principles of Economics',
      'Intro to Psychology',
    ],
    [
      'Organic Chemistry II',
      'Physical Chemistry II',
      'Cell Biology',
      'Numerical Methods',
      'Modern Physics',
      'Databases',
      'Engineering Ethics',
      'Financial Accounting',
    ],
    [
      'Biochemistry',
      'Instrumental Analysis',
      'Quantum Chemistry',
      'Quantum Mechanics',
      'Statistics II',
      'Statistical Mechanics',
      'Engineering Management',
      'Sociology',
    ],
    [
      'Polymer Chemistry',
      'Industrial Chemistry',
      'Electrochemistry',
      'Environmental Science',
      'Nuclear Physics',
      'Solid State Physics',
      'Mathematical Modelling',
      'Entrepreneurship',
    ],
    [
      'Chemistry Thesis I',
      'Spectroscopy',
      'Nanochemistry',
      'Photonics',
      'Renewable Energy',
      'Data Mining',
      'Law for Engineers',
      'Research Methods',
    ],
    [
      'Chemistry Thesis II',
      'Medicinal Chemistry',
      'Green Chemistry',
      'Materials Physics',
      'Stochastic Processes',
      'Optimisation',
      'Professional Practice',
      'Organisational Behaviour',
    ],
  ],
};

export const COURSES: Record<CourseId, Course> = {};
/** Course ids per major and semester, in plan order. */
export const CURRICULUM = {} as Record<MajorId, CourseId[][]>;

/** First floor used by each semester's courses. */
const SEM_FLOOR = [1, 1, 2, 2, 3, 4, 4, 5];
/** Classrooms handed out per floor; the sixth is a staff room (and the exam hall in Humanities Hall). */
const ROOMS_PER_FLOOR = SLOTS_PER_FLOOR - 1;

(() => {
  const byName = new Map<string, CourseId>();
  for (const dept of DEPT_IDS) {
    const used: number[] = Array(8).fill(0);
    CATALOG[dept].forEach(([name, semester, tier, kind, bank], i) => {
      const sem = semester - 1;
      const year = Math.floor(sem / 2) + 1;
      const k = used[sem]++;
      // Rooms are unique within a semester; different semesters reuse them, since nobody takes both at once.
      const floor = ((SEM_FLOOR[sem] - 1 + Math.floor(k / ROOMS_PER_FLOOR)) % FLOORS) + 1;
      const slot = k % ROOMS_PER_FLOOR;
      const D = DEPARTMENTS[dept];
      const id = `${dept}${semester}_${k + 1}`;
      COURSES[id] = {
        id,
        code: `${D.code} ${year}${sem % 2}${k + 1}`,
        name,
        area: dept,
        tier,
        sem,
        year,
        kind,
        building: dept,
        floor,
        slot,
        room: roomCode(dept, floor, slot),
        prof: FACULTY[dept][i % FACULTY[dept].length],
        majors: [],
        bank: bank ?? name,
      };
      byName.set(name, id);
    });
  }
  for (const major of MAJOR_IDS) {
    CURRICULUM[major] = PLANS[major].map((names, sem) =>
      names.map((name) => {
        const id = byName.get(name);
        if (!id || COURSES[id].sem !== sem)
          throw new Error(`${major} semester ${sem + 1}: "${name}" is not offered then`);
        COURSES[id].majors.push(major);
        return id;
      }),
    );
  }
})();

export const TOTAL_COURSES = Object.keys(COURSES).length;

/**
 * The course held in a classroom during semester `sem`. The player's own course wins; otherwise it is the one
 * another department's students are taking there.
 */
export function courseInRoom(
  building: ClassBuilding,
  floor: number,
  slot: number,
  major: MajorId,
  sem: number,
): Course | null {
  const here = Object.values(COURSES).filter(
    (c) => c.building === building && c.floor === floor && c.slot === slot && c.sem === sem,
  );
  return here.find((c) => c.majors.includes(major)) ?? here[0] ?? null;
}

/** The grand hall used for midterm-style exams and finals. */
export const EXAM_HALL = {
  name: 'Grand Exam Hall',
  room: 'HUM-GH',
  floor: 1,
  slot: SLOTS_PER_FLOOR - 1,
  kind: 'lecture' as RoomKind,
  building: 'hum' as ClassBuilding,
};

/* ---------------------------- timetable ---------------------------- */
/** Periods that hold a lecture; the rest of the day is lunch, after-class time and evening. */
export const LECTURE_PERIODS = [0, 1, 3] as const;
/** Days 0..LECTURE_DAYS-1 have lectures; the last day of a semester is finals. */
export const LECTURE_DAYS = 7;
export const MIDTERM_DAY = 2;
export const MIDTERM_PERIOD = 1;

export type TimetableEntry = CourseId | 'TEST' | 'FINAL' | null;

const cache = new Map<string, TimetableEntry[][]>();

const clampSem = (major: MajorId, sem: number): number =>
  Math.max(0, Math.min(CURRICULUM[major].length - 1, sem));

/** The course examined in a major's midterm of semester `sem`. */
export function midtermCourse(major: MajorId, sem: number): CourseId {
  const ids = CURRICULUM[major][clampSem(major, sem)];
  return ids[(sem * 3) % ids.length];
}

/**
 * Lecture timetable of a major for a whole semester: `[day][period]`. Every course meets at least twice, never
 * twice in one day. Periods without a lecture hold `null`. The final day is two FINAL slots.
 */
export function semesterTimetable(major: MajorId, sem: number): TimetableEntry[][] {
  const key = `${major}:${sem}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const ids = CURRICULUM[major][sem];
  const slots: [number, number][] = [];
  for (let d = 0; d < LECTURE_DAYS; d++)
    for (const p of LECTURE_PERIODS) if (!(d === MIDTERM_DAY && p === MIDTERM_PERIOD)) slots.push([d, p]);
  const seed = sem * 7919 + MAJOR_IDS.indexOf(major) * 15485863;
  let table: TimetableEntry[][] | null = null;
  for (let attempt = 0; attempt < 400 && !table; attempt++) {
    const rng = mulberry32(seed + attempt * 104729 + 17);
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
  if (!table) throw new Error(`Could not build a timetable for ${key}`);
  table[MIDTERM_DAY][MIDTERM_PERIOD] = 'TEST';
  table[LECTURE_DAYS][0] = 'FINAL';
  table[LECTURE_DAYS][1] = 'FINAL';
  cache.set(key, table);
  return table;
}

/** Departments the finals boss quizzes a major on: the semester's distinct departments, at most four. */
export function finalPhases(major: MajorId, sem: number): DeptId[] {
  const out: DeptId[] = [];
  for (const id of CURRICULUM[major][sem]) if (!out.includes(COURSES[id].area)) out.push(COURSES[id].area);
  return out.slice(0, 4);
}
