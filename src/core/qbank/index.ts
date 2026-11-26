// Every course's hand-written question bank, keyed by bank name, kept in one file per department.
import { CHEM_BANK } from './chem';
import { CSE_BANK } from './cse';
import { EEE_BANK } from './eee';
import { HUM_BANK } from './hum';
import { MATH_BANK } from './math';
import { PHY_BANK } from './phy';
import type { CourseBank } from './rows';

export type { CourseBank, QRow } from './rows';

export const COURSE_BANKS: CourseBank = {
  ...CSE_BANK,
  ...EEE_BANK,
  ...MATH_BANK,
  ...PHY_BANK,
  ...CHEM_BANK,
  ...HUM_BANK,
};
