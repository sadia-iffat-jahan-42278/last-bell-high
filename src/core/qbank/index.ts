// Every course's hand-written question bank, keyed by catalogue name.
import { YEAR1 } from './year1';
import { YEAR2 } from './year2';
import { YEAR3 } from './year3';
import { YEAR4 } from './year4';
import type { CourseBank } from './rows';

export type { CourseBank, QRow } from './rows';

export const COURSE_BANKS: CourseBank = { ...YEAR1, ...YEAR2, ...YEAR3, ...YEAR4 };
