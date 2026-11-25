/** One hand-written question: [tier 1..4, question, correct answer, wrong, wrong, wrong]. */
export type QRow = [tier: 1 | 2 | 3 | 4, q: string, a: string, w1: string, w2: string, w3: string];

/** A bank of rows per course name. */
export type CourseBank = Record<string, QRow[]>;
