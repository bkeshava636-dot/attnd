import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getStoredNotificationSettings,
  saveStoredNotificationSettings,
} from './notificationService';
import {
  type EngineContext,
  getClassesForDate,
  calculateAttendanceMetrics,
} from './attendanceEngine';
import type {
  Subject,
  TimetablePeriod,
  SemesterSettings,
  SaturdayRule,
  AttendanceRecord,
} from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`PASSED: ${message}`);
}

console.log('=== RUNNING WIDGET & NOTIFICATION SCENARIOS VERIFICATION ===\n');

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
global.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => { mockStorage[key] = val; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i: number) => Object.keys(mockStorage)[i] || null,
  length: 0,
};

// Scenario 1: Default notification settings & persistence
const initialSettings = getStoredNotificationSettings();
assert(initialSettings.dailyReminderEnabled === true, 'Scenario 1: Daily reminder enabled by default');
assert(initialSettings.dailyReminderTime === '20:30', 'Scenario 1: Default reminder time is 20:30');
assert(initialSettings.nextClassReminderEnabled === true, 'Scenario 1: Next class reminder enabled by default');
assert(initialSettings.nextClassLeadMinutes === 10, 'Scenario 1: Default lead time is 10 mins');

saveStoredNotificationSettings({
  ...initialSettings,
  dailyReminderTime: '21:00',
  nextClassLeadMinutes: 15,
});
const updatedSettings = getStoredNotificationSettings();
assert(updatedSettings.dailyReminderTime === '21:00', 'Scenario 1: Custom reminder time 21:00 persisted');
assert(updatedSettings.nextClassLeadMinutes === 15, 'Scenario 1: Custom lead time 15m persisted');

// Scenario 2: Grouped period unit generation for notification and widget
const mathSub: Subject = {
  id: 'sub-math',
  name: 'Mathematics III',
  shortName: 'Math',
  type: 'lecture',
  color: '#f59e0b',
  isActive: true,
  initialPresent: 10,
  initialAbsent: 2,
  order: 1,
  createdAt: '2026-09-01T00:00:00Z',
};

const labSub: Subject = {
  id: 'sub-lab',
  name: 'DSA Lab',
  shortName: 'DS Lab',
  type: 'lab',
  color: '#3b82f6',
  isActive: true,
  initialPresent: 5,
  initialAbsent: 0,
  order: 2,
  createdAt: '2026-09-01T00:00:00Z',
};

const settings: SemesterSettings = {
  id: 'sem-1',
  semesterName: '3rd Sem',
  startDate: '2026-09-01',
  endDate: '2026-12-30',
  defaultTarget: 85,
  treatLabAsSingleUnit: true,
  includeSundayInTimetable: false,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
};

// Monday: P1 Math, P2-P3 grouped Math (unitGroupId='unit_math_2p'), P4-P6 grouped Lab (3 periods, labGroupKey='lab_1')
const timetable: TimetablePeriod[] = [
  { id: 'tt-1', dayOfWeek: 1, periodNumber: 1, subjectId: 'sub-math', startTime: '09:00', endTime: '09:50' },
  { id: 'tt-2', dayOfWeek: 1, periodNumber: 2, subjectId: 'sub-math', startTime: '09:55', endTime: '10:45', unitGroupId: 'unit_math_2p' },
  { id: 'tt-3', dayOfWeek: 1, periodNumber: 3, subjectId: 'sub-math', startTime: '10:50', endTime: '11:40', unitGroupId: 'unit_math_2p' },
  { id: 'tt-4', dayOfWeek: 1, periodNumber: 4, subjectId: 'sub-lab', startTime: '11:45', endTime: '12:35', labGroupKey: 'lab_1' },
  { id: 'tt-5', dayOfWeek: 1, periodNumber: 5, subjectId: 'sub-lab', startTime: '13:30', endTime: '14:20', labGroupKey: 'lab_1' },
  { id: 'tt-6', dayOfWeek: 1, periodNumber: 6, subjectId: 'sub-lab', startTime: '14:25', endTime: '15:15', labGroupKey: 'lab_1' },
];

const context: EngineContext = {
  semesterSettings: settings,
  subjects: [mathSub, labSub],
  timetable,
  saturdayRules: [],
  dateOverrides: [],
  holidays: [],
  academicEvents: [],
  extraClasses: [],
  substitutions: [],
  attendanceRecords: [],
};

// Check Monday 2026-09-21
const summary = getClassesForDate('2026-09-21', context);
assert(summary.classes.length === 3, `Scenario 2: 6 periods collapsed into 3 attendance units (got ${summary.classes.length})`);
assert(summary.classes[0].periodLabel === 'P1', 'Scenario 2: First class is P1');
assert(summary.classes[1].periodLabel === 'P2–P3', `Scenario 2: Second unit is P2–P3 (got ${summary.classes[1].periodLabel})`);
assert(summary.classes[1].unitSize === 2, 'Scenario 2: Unit size for P2-P3 is 2');
assert(summary.classes[2].periodLabel === 'P4–P6', `Scenario 2: Third unit is P4–P6 (got ${summary.classes[2].periodLabel})`);
assert(summary.classes[2].unitSize === 3, 'Scenario 2: Unit size for P4-P6 is 3');

// Scenario 3: Holiday & Override skipping
const holidayContext: EngineContext = {
  ...context,
  holidays: [
    { id: 'h-1', startDate: '2026-09-21', endDate: '2026-09-21', description: 'Ganesh Chaturthi' },
  ],
};
const holSummary = getClassesForDate('2026-09-21', holidayContext);
assert(!holSummary.isWorkingDay, 'Scenario 3: Holiday makes day non-working');
assert(holSummary.classes.length === 0, 'Scenario 3: 0 classes generated on holiday, notifications skipped');

// Scenario 4: Widget Direct Actions and Mathematical Precision
// Baseline: Math 10 present, 2 absent = 12 conducted (83.33%)
// Lab: 5 present, 0 absent = 5 conducted (100%)
// Overall: 15 present, 2 absent = 17 conducted -> 15/17 = 88.24%
const baselineMetrics = calculateAttendanceMetrics(context.subjects, context.attendanceRecords, 85, true);
assert(baselineMetrics.overall.present === 15, 'Scenario 4: Baseline present is 15');
assert(baselineMetrics.overall.absent === 2, 'Scenario 4: Baseline absent is 2');
assert(baselineMetrics.overall.percentage === 88.24, `Scenario 4: Baseline percentage is 88.24% (got ${baselineMetrics.overall.percentage}%)`);

// User marks P2-P3 Present on Widget
const p2Record: AttendanceRecord = {
  id: '2026-09-21_unit_unit_math_2p',
  date: '2026-09-21',
  periodNumber: 2,
  subjectId: 'sub-math',
  status: 'present',
  source: 'regular',
  updatedAt: new Date().toISOString(),
};
const updatedRecords = [...context.attendanceRecords, p2Record];
const afterPresent = calculateAttendanceMetrics(context.subjects, updatedRecords, 85, true);
assert(afterPresent.overall.present === 16, 'Scenario 4: Overall present increased to 16');
assert(afterPresent.overall.conducted === 18, 'Scenario 4: Overall conducted increased to 18 (16+2)');
assert(afterPresent.overall.percentage === 88.89, `Scenario 4: 16/18 is 88.89% (got ${afterPresent.overall.percentage}%)`);

// User marks P4-P6 (3 periods lab unit) CANCELLED on Widget
const labCancelRecord: AttendanceRecord = {
  id: '2026-09-21_unit_lab_lab_1',
  date: '2026-09-21',
  periodNumber: 4,
  subjectId: 'sub-lab',
  status: 'cancelled',
  source: 'regular',
  updatedAt: new Date().toISOString(),
};
const afterCancel = calculateAttendanceMetrics(context.subjects, [...updatedRecords, labCancelRecord], 85, true);
assert(afterCancel.overall.cancelled === 1, 'Scenario 4: Overall cancelled count is 1');
assert(afterCancel.overall.conducted === 18, 'Scenario 4: Conducted remains 18 (cancelled excluded from denominator)');
assert(afterCancel.overall.percentage === 88.89, 'Scenario 4: Percentage remains 88.89% unchanged by cancel');

// User taps UNDO on P2-P3
const afterUndo = calculateAttendanceMetrics(context.subjects, [labCancelRecord], 85, true);
assert(afterUndo.overall.present === 15, 'Scenario 4: Present safely reverted to 15 after UNDO');
assert(afterUndo.overall.conducted === 17, 'Scenario 4: Conducted safely reverted to 17 after UNDO');
assert(afterUndo.overall.percentage === 88.24, 'Scenario 4: Percentage safely restored to 88.24%');

console.log('\n================================================================');
console.log('ALL WIDGET & NOTIFICATION SCENARIOS VERIFIED 100% PASSING!');
console.log('================================================================');
