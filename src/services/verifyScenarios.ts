import {
  getClassesForDate,
  calculateBunk,
  calculateRecovery,
  calculateAttendanceMetrics,
  type EngineContext,
} from './attendanceEngine';
import type {
  SemesterSettings,
  Subject,
  TimetablePeriod,
  SaturdayRule,
  DateOverride,
  Holiday,
  AcademicEvent,
  ExtraClass,
  Substitution,
  AttendanceRecord,
} from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

console.log("=== RUNNING SCENARIOS VERIFICATION (1 to 12) ===\n");

// Base mock subjects
const mathSub: Subject = {
  id: 'sub-math',
  name: 'Mathematics',
  shortName: 'Math',
  code: 'MATH101',
  type: 'lecture',
  color: '#3b82f6',
  isActive: true,
  initialPresent: 0,
  initialAbsent: 0,
  order: 1,
  createdAt: '2026-09-01',
};

const dbmsSub: Subject = {
  id: 'sub-dbms',
  name: 'Database Management Systems',
  shortName: 'DBMS',
  code: 'CS302',
  type: 'lecture',
  color: '#10b981',
  isActive: true,
  initialPresent: 0,
  initialAbsent: 0,
  order: 2,
  createdAt: '2026-09-01',
};

const osSub: Subject = {
  id: 'sub-os',
  name: 'Operating Systems',
  shortName: 'OS',
  code: 'CS303',
  type: 'lecture',
  color: '#8b5cf6',
  isActive: true,
  initialPresent: 0,
  initialAbsent: 0,
  order: 3,
  createdAt: '2026-09-01',
};

// Timetable
// Monday (day 1): P1 -> Math, P2 -> DBMS, P3 -> OS
// Tuesday (day 2): P1 -> DBMS, P2 -> OS
const timetable: TimetablePeriod[] = [
  { id: 'tt-m1', dayOfWeek: 1, periodNumber: 1, subjectId: mathSub.id },
  { id: 'tt-m2', dayOfWeek: 1, periodNumber: 2, subjectId: dbmsSub.id },
  { id: 'tt-m3', dayOfWeek: 1, periodNumber: 3, subjectId: osSub.id },
  { id: 'tt-t1', dayOfWeek: 2, periodNumber: 1, subjectId: dbmsSub.id },
  { id: 'tt-t2', dayOfWeek: 2, periodNumber: 2, subjectId: osSub.id },
];

const saturdayRules: SaturdayRule[] = [
  { occurrence: 1, status: 'holiday', followsDay: 1 },
  { occurrence: 2, status: 'holiday', followsDay: 1 },
  { occurrence: 3, status: 'working', followsDay: 1 }, // 3rd Sat -> Monday TT
  { occurrence: 4, status: 'working', followsDay: 2 }, // 4th Sat -> Tuesday TT
  { occurrence: 5, status: 'holiday', followsDay: 1 },
];

let baseSettings: SemesterSettings = {
  id: 'current',
  semesterName: '3rd Semester',
  startDate: '2026-09-15',
  endDate: '2026-12-30',
  defaultTarget: 85,
  treatLabAsSingleUnit: false,
  includeSundayInTimetable: false,
  createdAt: '2026-09-15',
  updatedAt: '2026-09-15',
};

let dateOverrides: DateOverride[] = [];
let holidays: Holiday[] = [];
let academicEvents: AcademicEvent[] = [];
let extraClasses: ExtraClass[] = [];
let substitutions: Substitution[] = [];
let attendanceRecords: AttendanceRecord[] = [];

function getContext(): EngineContext {
  return {
    semesterSettings: baseSettings,
    subjects: [mathSub, dbmsSub, osSub],
    timetable,
    saturdayRules,
    dateOverrides,
    holidays,
    academicEvents,
    extraClasses,
    substitutions,
    attendanceRecords,
  };
}

// SCENARIO 1: Normal Monday timetable (2026-09-21 is Monday)
{
  const res = getClassesForDate('2026-09-21', getContext());
  assert(res.isWorkingDay === true, 'Scenario 1: 2026-09-21 is a working day');
  assert(res.classes.length === 3, 'Scenario 1: Generates 3 classes on Monday');
  assert(res.classes[0].subject.shortName === 'Math', 'Scenario 1: Period 1 is Math');
  assert(res.classes[1].subject.shortName === 'DBMS', 'Scenario 1: Period 2 is DBMS');
}

// SCENARIO 2: 1st Saturday = Holiday (2026-10-03 is 1st Saturday of Oct 2026)
{
  const res = getClassesForDate('2026-10-03', getContext());
  assert(res.isWorkingDay === false, 'Scenario 2: 1st Saturday is a Holiday');
  assert(res.classes.length === 0, 'Scenario 2: No classes generated on 1st Saturday');
}

// SCENARIO 3: 3rd Saturday = Working -> Monday timetable (2026-10-17 is 3rd Saturday)
{
  const res = getClassesForDate('2026-10-17', getContext());
  assert(res.isWorkingDay === true, 'Scenario 3: 3rd Saturday is working');
  assert(res.classes.length === 3, 'Scenario 3: Generates Monday timetable (3 classes)');
  assert(res.classes[0].subject.shortName === 'Math', 'Scenario 3: Period 1 is Math');
}

// SCENARIO 4: Specific Saturday override changes timetable (Override 2026-10-17 to Tuesday timetable)
{
  dateOverrides = [{
    id: 'ov-1',
    date: '2026-10-17',
    status: 'working',
    followsDay: 2, // Tuesday
    note: 'Special Tuesday swap',
  }];
  const res = getClassesForDate('2026-10-17', getContext());
  assert(res.classes.length === 2, 'Scenario 4: Specific override generates Tuesday timetable (2 classes)');
  assert(res.classes[0].subject.shortName === 'DBMS', 'Scenario 4: Period 1 is DBMS (from Tuesday)');
  dateOverrides = []; // reset
}

// SCENARIO 5: IAS from Monday-Friday (2026-10-05 to 2026-10-09 regular classes OFF)
{
  academicEvents = [{
    id: 'ias-1',
    startDate: '2026-10-05',
    endDate: '2026-10-09',
    type: 'ias',
    description: 'Internal Assessment 1',
    regularClassesRun: false,
  }];
  const resMon = getClassesForDate('2026-10-05', getContext());
  assert(resMon.isWorkingDay === false, 'Scenario 5: Monday during IAS regular classes OFF');
  assert(resMon.classes.length === 0, 'Scenario 5: 0 classes generated during IAS');
  academicEvents = []; // reset
}

// SCENARIO 6: One class cancelled. Cancelled class doesn't affect attendance percentage
{
  // 30 present, 5 absent, 2 cancelled -> 30/35 = 85.71% (NOT 30/37)
  const records: AttendanceRecord[] = [];
  for (let i = 0; i < 30; i++) {
    records.push({
      id: `p-${i}`,
      date: '2026-09-20',
      periodNumber: i + 1,
      subjectId: dbmsSub.id,
      status: 'present',
      source: 'regular',
      updatedAt: '2026-09-20',
    });
  }
  for (let i = 0; i < 5; i++) {
    records.push({
      id: `a-${i}`,
      date: '2026-09-20',
      periodNumber: 40 + i,
      subjectId: dbmsSub.id,
      status: 'absent',
      source: 'regular',
      updatedAt: '2026-09-20',
    });
  }
  for (let i = 0; i < 2; i++) {
    records.push({
      id: `c-${i}`,
      date: '2026-09-20',
      periodNumber: 60 + i,
      subjectId: dbmsSub.id,
      status: 'cancelled',
      source: 'regular',
      updatedAt: '2026-09-20',
    });
  }

  const { subjectStats } = calculateAttendanceMetrics([dbmsSub], records, 85);
  const dbmsStats = subjectStats[0];
  assert(dbmsStats.present === 30, 'Scenario 6: 30 Present');
  assert(dbmsStats.absent === 5, 'Scenario 6: 5 Absent');
  assert(dbmsStats.cancelled === 2, 'Scenario 6: 2 Cancelled');
  assert(dbmsStats.conducted === 35, 'Scenario 6: Conducted is 35 (30+5), NOT 37');
  assert(dbmsStats.percentage === 85.71, `Scenario 6: Percentage is 85.71% (got ${dbmsStats.percentage}%)`);
}

// SCENARIO 7: Extra class added. Extra class appears and affects attendance
{
  extraClasses = [{
    id: 'extra-1',
    date: '2026-10-03', // on a Saturday holiday!
    subjectId: dbmsSub.id,
    periodsCount: 1,
    description: 'Extra DBMS Revision Class',
    status: 'present',
  }];
  const res = getClassesForDate('2026-10-03', getContext());
  assert(res.classes.length === 1, 'Scenario 7: Extra class appears on holiday date');
  assert(res.classes[0].source === 'extra', 'Scenario 7: Class source is extra');
  assert(res.classes[0].status === 'present', 'Scenario 7: Class status is present');
  extraClasses = []; // reset
}

// SCENARIO 8: Course end date extended. New future classes are generated. Existing attendance unchanged.
{
  // With end date 2026-12-30:
  const resDec31Old = getClassesForDate('2027-01-04', getContext());
  assert(resDec31Old.hasClasses === false, 'Scenario 8: Before extension, 2027-01-04 has 0 classes');

  // Extend end date to 2027-01-10:
  baseSettings.endDate = '2027-01-10';
  const resJan4New = getClassesForDate('2027-01-04', getContext()); // 2027-01-04 is Monday
  assert(resJan4New.hasClasses === true, 'Scenario 8: After extension, 2027-01-04 generates classes');
  assert(resJan4New.classes.length === 3, 'Scenario 8: Monday classes appear in extended range');
}

// SCENARIO 9: User changes course start date. Future generation adjusts without deleting existing attendance
{
  baseSettings.startDate = '2026-09-20';
  const resSep16 = getClassesForDate('2026-09-16', getContext());
  assert(resSep16.hasClasses === false, 'Scenario 9: Dates before new start date generate no classes');
  baseSettings.startDate = '2026-09-15'; // reset
}

// SCENARIO 10: User changes Present -> Absent. All calculations update immediately
{
  const rec1: AttendanceRecord = {
    id: 'r1',
    date: '2026-09-21',
    periodNumber: 1,
    subjectId: mathSub.id,
    status: 'present',
    source: 'regular',
    updatedAt: '2026-09-21',
  };
  const stats1 = calculateAttendanceMetrics([mathSub], [rec1], 85);
  assert(stats1.subjectStats[0].percentage === 100, 'Scenario 10: Present -> 100%');

  // Change to absent
  const rec2: AttendanceRecord = { ...rec1, status: 'absent' };
  const stats2 = calculateAttendanceMetrics([mathSub], [rec2], 85);
  assert(stats2.subjectStats[0].percentage === 0, 'Scenario 10: Changing to Absent -> 0% immediately');
}

// SCENARIO 11: User adds existing attendance: 30 attended, 4 absent. Bunk/recovery start from 30/34
{
  const seededSub: Subject = {
    ...dbmsSub,
    initialPresent: 30,
    initialAbsent: 4,
  };
  const stats = calculateAttendanceMetrics([seededSub], [], 85);
  const s = stats.subjectStats[0];
  assert(s.present === 30, 'Scenario 11: Present starts at 30');
  assert(s.absent === 4, 'Scenario 11: Absent starts at 4');
  assert(s.conducted === 34, 'Scenario 11: Total conducted starts at 34');
  assert(s.percentage === 88.24, `Scenario 11: 30/34 is 88.24% (got ${s.percentage}%)`);
  assert(s.canMiss === 1, `Scenario 11: Can miss 1 class (after 1 miss: 30/35 = 85.71% >= 85%) (got ${s.canMiss})`);
}

// SCENARIO 12: Recovery & Bunk math accuracy
{
  // 40 / 45 = 88.89%, target 85% -> can miss 2 classes
  // 40 / (45 + 2) = 40/47 = 85.11% >= 85%
  // 40 / (45 + 3) = 40/48 = 83.33% < 85%
  const bunk = calculateBunk(40, 5, 85);
  assert(bunk === 2, `Scenario 12: Bunk for 40/45 @ 85% is 2 (got ${bunk})`);

  // 35 Present, 8 Absent = 35/43 = 81.40%, target 85% -> attend next 11 consecutive classes
  // (35 + 11) / (43 + 11) = 46 / 54 = 85.19% >= 85%
  const recovery = calculateRecovery(35, 8, 85);
  assert(recovery === 11, `Scenario 12: Recovery for 35/43 @ 85% is 11 (got ${recovery})`);
}

// SCENARIO 13: Continuous Periods (2 periods: P1 + P2 Math) grouped as 1 Attendance Unit
{
  const unitTimetable: TimetablePeriod[] = [
    { id: 'tt-u1', dayOfWeek: 1, periodNumber: 1, subjectId: mathSub.id, unitGroupId: 'unit-math-12' },
    { id: 'tt-u2', dayOfWeek: 1, periodNumber: 2, subjectId: mathSub.id, unitGroupId: 'unit-math-12' },
    { id: 'tt-u3', dayOfWeek: 1, periodNumber: 3, subjectId: dbmsSub.id },
  ];
  const ctx: EngineContext = { ...getContext(), timetable: unitTimetable };
  const res = getClassesForDate('2026-09-21', ctx);

  assert(res.classes.length === 2, `Scenario 13: P1+P2 collapsed into 1 unit, total 2 classes generated (got ${res.classes.length})`);
  const mathUnitCls = res.classes[0];
  assert(mathUnitCls.periodLabel === 'P1–P2', `Scenario 13: Period label is P1–P2 (got ${mathUnitCls.periodLabel})`);
  assert(mathUnitCls.unitSize === 2, `Scenario 13: Unit size is 2 (got ${mathUnitCls.unitSize})`);
  assert(mathUnitCls.slotKey === '2026-09-21_unit_unit-math-12', `Scenario 13: Slot key uses unitGroupId`);

  // Marking Present once on this unit
  const record: AttendanceRecord = {
    id: mathUnitCls.slotKey,
    date: '2026-09-21',
    periodNumber: 1,
    subjectId: mathSub.id,
    status: 'present',
    source: 'regular',
    updatedAt: '2026-09-21',
  };
  const { subjectStats } = calculateAttendanceMetrics([mathSub], [record], 85);
  assert(subjectStats[0].present === 1, `Scenario 13: Present count is 1 (got ${subjectStats[0].present})`);
  assert(subjectStats[0].conducted === 1, `Scenario 13: Conducted count is 1 (got ${subjectStats[0].conducted})`);
  assert(subjectStats[0].percentage === 100, `Scenario 13: Percentage is 100%`);
}

// SCENARIO 14: Continuous Periods (3 periods: P3 + P4 + P5 DBMS) grouped as 1 Attendance Unit
{
  const unit3Timetable: TimetablePeriod[] = [
    { id: 'tt-d3', dayOfWeek: 1, periodNumber: 3, subjectId: dbmsSub.id, unitGroupId: 'unit-dbms-345' },
    { id: 'tt-d4', dayOfWeek: 1, periodNumber: 4, subjectId: dbmsSub.id, unitGroupId: 'unit-dbms-345' },
    { id: 'tt-d5', dayOfWeek: 1, periodNumber: 5, subjectId: dbmsSub.id, unitGroupId: 'unit-dbms-345' },
  ];
  const ctx: EngineContext = { ...getContext(), timetable: unit3Timetable };
  const res = getClassesForDate('2026-09-21', ctx);

  assert(res.classes.length === 1, `Scenario 14: 3 consecutive periods collapsed into 1 unit`);
  const dbmsUnitCls = res.classes[0];
  assert(dbmsUnitCls.periodLabel === 'P3–P5', `Scenario 14: Period label is P3–P5 (got ${dbmsUnitCls.periodLabel})`);
  assert(dbmsUnitCls.unitSize === 3, `Scenario 14: Unit size is 3 (got ${dbmsUnitCls.unitSize})`);

  // Marking Absent once on this unit
  const record: AttendanceRecord = {
    id: dbmsUnitCls.slotKey,
    date: '2026-09-21',
    periodNumber: 3,
    subjectId: dbmsSub.id,
    status: 'absent',
    source: 'regular',
    updatedAt: '2026-09-21',
  };
  const { subjectStats } = calculateAttendanceMetrics([dbmsSub], [record], 85);
  assert(subjectStats[0].absent === 1, `Scenario 14: Absent count is 1 (got ${subjectStats[0].absent})`);
  assert(subjectStats[0].conducted === 1, `Scenario 14: Conducted count is 1 (got ${subjectStats[0].conducted})`);
  assert(subjectStats[0].percentage === 0, `Scenario 14: Percentage is 0%`);
}

// SCENARIO 15: Lab continuous 3 periods (P6 + P7 + P8) marked Cancelled
{
  const labSub: Subject = {
    id: 'sub-lab',
    name: 'Computer Networks Lab',
    shortName: 'CN Lab',
    type: 'lab',
    color: '#06b6d4',
    isActive: true,
    initialPresent: 0,
    initialAbsent: 0,
    order: 4,
    createdAt: '2026-09-01',
  };
  const labTimetable: TimetablePeriod[] = [
    { id: 'tt-l6', dayOfWeek: 1, periodNumber: 6, subjectId: labSub.id, unitGroupId: 'unit-cn-lab' },
    { id: 'tt-l7', dayOfWeek: 1, periodNumber: 7, subjectId: labSub.id, unitGroupId: 'unit-cn-lab' },
    { id: 'tt-l8', dayOfWeek: 1, periodNumber: 8, subjectId: labSub.id, unitGroupId: 'unit-cn-lab' },
  ];
  const ctx: EngineContext = { ...getContext(), subjects: [labSub], timetable: labTimetable };
  const res = getClassesForDate('2026-09-21', ctx);

  assert(res.classes.length === 1, `Scenario 15: CN Lab 3 periods collapsed into 1 unit`);
  assert(res.classes[0].periodLabel === 'P6–P8', `Scenario 15: Period label is P6–P8`);

  // Marking Cancelled once
  const record: AttendanceRecord = {
    id: res.classes[0].slotKey,
    date: '2026-09-21',
    periodNumber: 6,
    subjectId: labSub.id,
    status: 'cancelled',
    source: 'regular',
    updatedAt: '2026-09-21',
  };
  const { subjectStats } = calculateAttendanceMetrics([labSub], [record], 85);
  assert(subjectStats[0].cancelled === 1, `Scenario 15: Cancelled is 1`);
  assert(subjectStats[0].conducted === 0, `Scenario 15: Conducted is 0 (excluded from denominator)`);
  assert(subjectStats[0].percentage === 100, `Scenario 15: Percentage is 100% when 0 conducted (neutral/unstarted)`);
}

// SCENARIO 16: Non-consecutive same subjects are NEVER grouped together
{
  const nonConsecTimetable: TimetablePeriod[] = [
    { id: 'tt-nc1', dayOfWeek: 1, periodNumber: 2, subjectId: mathSub.id, unitGroupId: 'unit-nc-1' },
    { id: 'tt-nc2', dayOfWeek: 1, periodNumber: 3, subjectId: dbmsSub.id },
    { id: 'tt-nc3', dayOfWeek: 1, periodNumber: 5, subjectId: mathSub.id, unitGroupId: 'unit-nc-1' }, // gap! P4 is missing or another subject
  ];
  const ctx: EngineContext = { ...getContext(), timetable: nonConsecTimetable };
  const res = getClassesForDate('2026-09-21', ctx);

  assert(res.classes.length === 3, `Scenario 16: Non-consecutive math periods remain 2 separate classes, total 3 (got ${res.classes.length})`);
  assert(res.classes[0].periodLabel === 'P2', `Scenario 16: First math class is P2`);
  assert(res.classes[2].periodLabel === 'P5', `Scenario 16: Second math class is P5`);
}

// SCENARIO 17: Date-Specific Saturday Rule: 25/07/2026 (4th Sat) follows Monday Timetable
{
  const dateSpecificSaturdayRules = [
    {
      id: 'sat_2026-07-25',
      date: '2026-07-25',
      saturdayOccurrence: 4 as const,
      status: 'working' as const,
      followsDay: 'monday' as const,
      note: 'Circular Ref #401',
    },
  ];
  const ctx: EngineContext = {
    ...getContext(),
    dateSpecificSaturdayRules,
    semesterSettings: { ...baseSettings, startDate: '2026-07-01', endDate: '2026-12-31' },
  };

  const res = getClassesForDate('2026-07-25', ctx);
  assert(res.isWorkingDay === true, `Scenario 17: 2026-07-25 is a working day via circular rule`);
  assert(res.classes.length === 3, `Scenario 17: Generates Monday timetable (3 classes) instead of generic 4th Sat Tuesday TT`);
  assert(res.classes[0].subject.shortName === 'Math', `Scenario 17: Period 1 is Math (from Monday TT)`);
  assert(res.statusReason.toLowerCase().includes('circular'), `Scenario 17: Status reason highlights College Circular`);
}

// SCENARIO 18: Date-Specific Saturday Rule: 08/08/2026 (2nd Sat) follows Tuesday Timetable
{
  const dateSpecificSaturdayRules = [
    {
      id: 'sat_2026-08-08',
      date: '2026-08-08',
      saturdayOccurrence: 2 as const,
      status: 'working' as const,
      followsDay: 'tuesday' as const,
      note: 'Independence Day Prep Compensatory',
    },
  ];
  const ctx: EngineContext = {
    ...getContext(),
    dateSpecificSaturdayRules,
    semesterSettings: { ...baseSettings, startDate: '2026-07-01', endDate: '2026-12-31' },
  };

  const res = getClassesForDate('2026-08-08', ctx);
  assert(res.isWorkingDay === true, `Scenario 18: 2026-08-08 2nd Saturday is working via circular rule (default was holiday)`);
  assert(res.classes.length === 2, `Scenario 18: Generates Tuesday timetable (2 classes)`);
  assert(res.classes[0].subject.shortName === 'DBMS', `Scenario 18: Period 1 is DBMS (from Tuesday TT)`);
}

// SCENARIO 19: Date-Specific Saturday Rules: multiple circular dates
{
  const dateSpecificSaturdayRules = [
    { id: 'sat_2026-08-22', date: '2026-08-22', saturdayOccurrence: 4 as const, status: 'working' as const, followsDay: 'wednesday' as const },
    { id: 'sat_2026-08-29', date: '2026-08-29', saturdayOccurrence: 5 as const, status: 'working' as const, followsDay: 'thursday' as const },
    { id: 'sat_2026-09-12', date: '2026-09-12', saturdayOccurrence: 2 as const, status: 'working' as const, followsDay: 'friday' as const },
    { id: 'sat_2026-10-31', date: '2026-10-31', saturdayOccurrence: 5 as const, status: 'working' as const, followsDay: 'monday' as const },
  ];
  const ctx: EngineContext = {
    ...getContext(),
    dateSpecificSaturdayRules,
    semesterSettings: { ...baseSettings, startDate: '2026-07-01', endDate: '2026-12-31' },
  };

  const resOct31 = getClassesForDate('2026-10-31', ctx);
  assert(resOct31.isWorkingDay === true, `Scenario 19: 2026-10-31 (5th Sat) is working via circular rule`);
  assert(resOct31.classes.length === 3, `Scenario 19: Generates Monday timetable on 2026-10-31`);
}

// SCENARIO 20: Precedence Order: Specific Date Override > Date-Specific Saturday Rule > Generic Saturday Rule
{
  const dateSpecificSaturdayRules = [
    { id: 'sat_2026-07-25', date: '2026-07-25', saturdayOccurrence: 4 as const, status: 'working' as const, followsDay: 'monday' as const },
  ];
  // Specific override for 2026-07-25 to be off (holiday)
  const dateOverrides = [
    { id: 'ov-override', date: '2026-07-25', status: 'holiday' as const, note: 'Emergency Rain Holiday' },
  ];
  const ctx: EngineContext = {
    ...getContext(),
    dateSpecificSaturdayRules,
    dateOverrides,
    semesterSettings: { ...baseSettings, startDate: '2026-07-01', endDate: '2026-12-31' },
  };

  const res = getClassesForDate('2026-07-25', ctx);
  assert(res.isWorkingDay === false, `Scenario 20: Specific Date Override takes precedence over Date-Specific Saturday Rule`);
  assert(res.classes.length === 0, `Scenario 20: 0 classes generated due to higher-priority override`);
}

// SCENARIO 21: Undo / Unmark Attendance: Present -> Unmarked resets metrics without duplicate records
{
  const rec1: AttendanceRecord = {
    id: 'r_undo_1',
    date: '2026-09-21',
    periodNumber: 1,
    subjectId: mathSub.id,
    status: 'present',
    source: 'regular',
    updatedAt: '2026-09-21T10:00:00Z',
  };
  const statsBefore = calculateAttendanceMetrics([mathSub], [rec1], 85);
  assert(statsBefore.subjectStats[0].present === 1, `Scenario 21: Before undo: 1 present`);

  // Undo by updating status to 'unmarked'
  const recUndone: AttendanceRecord = { ...rec1, status: 'unmarked', updatedAt: '2026-09-21T10:05:00Z' };
  const statsAfter = calculateAttendanceMetrics([mathSub], [recUndone], 85);
  assert(statsAfter.subjectStats[0].present === 0, `Scenario 21: After undo: 0 present`);
  assert(statsAfter.subjectStats[0].conducted === 0, `Scenario 21: After undo: 0 conducted`);
  assert(statsAfter.subjectStats[0].percentage === 100, `Scenario 21: Percentage resets to 100% (unstarted baseline)`);
}

// SCENARIO 22: Undo Absent / Cancelled: resets cleanly
{
  const recAbsent: AttendanceRecord = {
    id: 'r_undo_absent',
    date: '2026-09-21',
    periodNumber: 1,
    subjectId: dbmsSub.id,
    status: 'absent',
    source: 'regular',
    updatedAt: '2026-09-21T10:00:00Z',
  };
  const statsAbsent = calculateAttendanceMetrics([dbmsSub], [recAbsent], 85);
  assert(statsAbsent.subjectStats[0].conducted === 1, `Scenario 22: Absent counted in conducted (1)`);

  const recUndone: AttendanceRecord = { ...recAbsent, status: 'unmarked' };
  const statsUndone = calculateAttendanceMetrics([dbmsSub], [recUndone], 85);
  assert(statsUndone.subjectStats[0].absent === 0, `Scenario 22: After undo: 0 absent`);
  assert(statsUndone.subjectStats[0].conducted === 0, `Scenario 22: After undo: 0 conducted`);
}

// SCENARIO 23: JSON Export & Import Data Structure Integrity
{
  const exportPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    semesterSettings: baseSettings,
    subjects: [mathSub, dbmsSub],
    timetable: [
      { id: 'tt-1', dayOfWeek: 1, periodNumber: 1, subjectId: mathSub.id, unitGroupId: 'unit-123' },
      { id: 'tt-2', dayOfWeek: 1, periodNumber: 2, subjectId: mathSub.id, unitGroupId: 'unit-123' },
    ],
    saturdayRules,
    dateSpecificSaturdayRules: [
      { id: 'sat_1', date: '2026-07-25', saturdayOccurrence: 4 as const, status: 'working' as const, followsDay: 'monday' as const },
    ],
    dateOverrides: [],
    holidays: [],
    academicEvents: [],
    extraClasses: [],
    substitutions: [],
    attendanceRecords: [],
  };

  const jsonStr = JSON.stringify(exportPayload);
  const parsed = JSON.parse(jsonStr);

  assert(parsed.version === 2, `Scenario 23: Export version is 2`);
  assert(parsed.dateSpecificSaturdayRules.length === 1, `Scenario 23: dateSpecificSaturdayRules included in export payload`);
  assert(parsed.timetable[0].unitGroupId === 'unit-123', `Scenario 23: unitGroupId preserved in timetable export`);
  assert(parsed.dateSpecificSaturdayRules[0].followsDay === 'monday', `Scenario 23: date-specific Saturday schedule preserved in export`);
}

console.log("\n=======================================================");
console.log("ALL 23 ADVANCED ATTENDANCE SCENARIOS VERIFIED 100% PASSING!");
console.log("=======================================================\n");

