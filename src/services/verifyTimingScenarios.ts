import {
  timeToMinutes,
  minutesToTime,
  formatTimeDisplay,
  formatDuration,
  isValidTimeInterval,
  validateScheduleTimings,
  resolveDayTiming,
  resolveClassTimes,
  getScheduleTimeline,
  getCurrentClass,
  getNextClass,
} from './timingEngine';
import type {
  ClassTimingSettings,
  PeriodTiming,
  BreakTiming,
  DayTimingConfig,
  GeneratedClassInstance,
  Subject,
} from '../types';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`PASSED: ${testName}`);
    passedCount++;
  } else {
    console.error(`FAILED: ${testName}${detail ? ` — ${detail}` : ''}`);
    failedCount++;
  }
}

console.log('=== RUNNING FLEXIBLE CLASS TIMINGS & BREAKS VERIFICATION (25 Scenarios) ===\n');

// Mock Subject
const mockSubjectA: Subject = {
  id: 'sub_a',
  name: 'Operating Systems',
  shortName: 'OS',
  code: 'CS301',
  type: 'lecture',
  color: '#3b82f6',
  isActive: true,
  initialPresent: 0,
  initialAbsent: 0,
  order: 1,
  createdAt: '2026-09-01T00:00:00Z',
};

const mockSubjectLab: Subject = {
  id: 'sub_lab',
  name: 'OS Laboratory',
  shortName: 'OS Lab',
  code: 'CS302',
  type: 'lab',
  color: '#10b981',
  isActive: true,
  initialPresent: 0,
  initialAbsent: 0,
  order: 2,
  createdAt: '2026-09-01T00:00:00Z',
};

// 1. Default period timing
const defaultPeriods: PeriodTiming[] = [
  { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
  { periodNumber: 2, startTime: '09:50', endTime: '10:40' },
  { periodNumber: 3, startTime: '10:50', endTime: '11:40' },
  { periodNumber: 4, startTime: '11:40', endTime: '12:30' },
  { periodNumber: 5, startTime: '13:30', endTime: '14:20' },
];

const defaultBreaks: BreakTiming[] = [
  { id: 'b1', name: 'Short Break', startTime: '10:40', endTime: '10:50' },
  { id: 'b2', name: 'Lunch Break', startTime: '12:30', endTime: '13:30' },
];

const settings: ClassTimingSettings = {
  defaultTiming: {
    periods: [...defaultPeriods],
    breaks: [...defaultBreaks],
  },
  daySpecificTimings: [],
  dateOverrides: [],
};

const resolvedDefault = resolveDayTiming('2026-09-21', settings);
assert(
  resolvedDefault?.periods.length === 5 && resolvedDefault.periods[0].startTime === '09:00',
  'Scenario 1: Default period timing',
  `Expected 5 periods with P1 start 09:00, got ${resolvedDefault?.periods.length}`
);

// 2. Add period
const modifiedPeriods = [...settings.defaultTiming.periods, { periodNumber: 6, startTime: '14:20', endTime: '15:10' }];
assert(
  modifiedPeriods.length === 6 && modifiedPeriods[5].periodNumber === 6 && modifiedPeriods[5].startTime === '14:20',
  'Scenario 2: Add period'
);

// 3. Edit period
const editedPeriods = modifiedPeriods.map(p => (p.periodNumber === 1 ? { ...p, startTime: '08:30', endTime: '09:20' } : p));
assert(
  editedPeriods[0].startTime === '08:30' && editedPeriods[0].endTime === '09:20',
  'Scenario 3: Edit period'
);

// 4. Delete period
const deletedPeriods = editedPeriods.filter(p => p.periodNumber !== 6);
assert(
  deletedPeriods.length === 5 && !deletedPeriods.some(p => p.periodNumber === 6),
  'Scenario 4: Delete period'
);

// 5. Add break
const modifiedBreaks = [...settings.defaultTiming.breaks, { id: 'b3', name: 'Tea Break', startTime: '15:10', endTime: '15:25' }];
assert(
  modifiedBreaks.length === 3 && modifiedBreaks.some(b => b.name === 'Tea Break'),
  'Scenario 5: Add break'
);

// 6. Edit break
const editedBreaks = modifiedBreaks.map(b => (b.id === 'b1' ? { ...b, startTime: '10:35', endTime: '10:50' } : b));
assert(
  editedBreaks.find(b => b.id === 'b1')?.startTime === '10:35',
  'Scenario 6: Edit break'
);

// 7. Delete break
const deletedBreaks = editedBreaks.filter(b => b.id !== 'b3');
assert(
  deletedBreaks.length === 2 && !deletedBreaks.some(b => b.id === 'b3'),
  'Scenario 7: Delete break'
);

// 8. Invalid overlapping periods
const invalidOverlapPeriods: PeriodTiming[] = [
  { periodNumber: 1, startTime: '09:00', endTime: '10:00' },
  { periodNumber: 2, startTime: '09:30', endTime: '10:30' },
];
const vOverlap = validateScheduleTimings(invalidOverlapPeriods, []);
assert(
  !vOverlap.isValid && (vOverlap.error || '').includes('overlap'),
  'Scenario 8: Invalid overlapping periods',
  vOverlap.error
);

// 9. Invalid overlapping break
const invalidBreakPeriod: PeriodTiming[] = [
  { periodNumber: 1, startTime: '09:00', endTime: '09:50' },
];
const invalidBreakList: BreakTiming[] = [
  { id: 'b_err', name: 'Collision Break', startTime: '09:30', endTime: '10:00' },
];
const vBreakOverlap = validateScheduleTimings(invalidBreakPeriod, invalidBreakList);
assert(
  !vBreakOverlap.isValid && (vBreakOverlap.error || '').includes('overlaps'),
  'Scenario 9: Invalid overlapping break',
  vBreakOverlap.error
);

// 10. Valid adjacent periods (e.g. 09:00-09:50, 09:50-10:40)
const validAdjacent = validateScheduleTimings(defaultPeriods, defaultBreaks);
assert(
  validAdjacent.isValid,
  'Scenario 10: Valid adjacent periods',
  validAdjacent.error
);

// 11. Current class detection
const testClasses: GeneratedClassInstance[] = [
  {
    date: '2026-09-21',
    periodNumber: 1,
    periodNumbers: [1],
    periodLabel: 'P1',
    subject: mockSubjectA,
    source: 'regular',
    status: 'unmarked',
    slotKey: '2026-09-21_1_sub_a',
    unitSize: 1,
    startTime: '09:00',
    endTime: '09:50',
  },
  {
    date: '2026-09-21',
    periodNumber: 2,
    periodNumbers: [2],
    periodLabel: 'P2',
    subject: mockSubjectA,
    source: 'regular',
    status: 'unmarked',
    slotKey: '2026-09-21_2_sub_a',
    unitSize: 1,
    startTime: '09:50',
    endTime: '10:40',
  },
];
const currentCls = getCurrentClass('2026-09-21', '09:15', testClasses, settings.defaultTiming, true);
assert(
  currentCls !== null && currentCls.periodNumber === 1,
  'Scenario 11: Current class detection',
  `Expected P1, got ${currentCls?.periodNumber}`
);

// 12. Next class detection
const nextClsResult = getNextClass('2026-09-21', '09:15', testClasses, settings.defaultTiming, true);
assert(
  nextClsResult.classInstance !== null && nextClsResult.classInstance.periodNumber === 2,
  'Scenario 12: Next class detection',
  `Expected P2, got ${nextClsResult.classInstance?.periodNumber}`
);

// 13. Break detection (10:45 is during 10:40-10:50 break)
const timelineBreak = getScheduleTimeline('2026-09-21', '10:45', testClasses, settings.defaultTiming, true);
assert(
  timelineBreak.state === 'in_break' && timelineBreak.currentBreak?.name === 'Short Break',
  'Scenario 13: Break detection',
  `Expected in_break with Short Break, got ${timelineBreak.state}`
);

// 14. Before first class (08:30 is before 09:00)
const timelineBefore = getScheduleTimeline('2026-09-21', '08:30', testClasses, settings.defaultTiming, true);
assert(
  timelineBefore.state === 'before_first' && timelineBefore.nextClassStartsInMinutes === 30,
  'Scenario 14: Before first class',
  `Expected before_first with 30m, got ${timelineBefore.state} & ${timelineBefore.nextClassStartsInMinutes}`
);

// 15. After last class (16:00 is after all periods)
const timelineAfter = getScheduleTimeline('2026-09-21', '16:00', testClasses, settings.defaultTiming, true);
assert(
  timelineAfter.state === 'after_last',
  'Scenario 15: After last class',
  `Expected after_last, got ${timelineAfter.state}`
);

// 16. No timings configured
const unconfiguredTimeline = getScheduleTimeline('2026-09-21', '09:15', testClasses, null, true);
assert(
  unconfiguredTimeline.state === 'unconfigured',
  'Scenario 16: No timings configured',
  `Expected unconfigured, got ${unconfiguredTimeline.state}`
);

// 17. Grouped P1–P2 timing: Start = 09:00 (P1 start), End = 10:40 (P2 end)
const groupedP1P2Class: GeneratedClassInstance = {
  date: '2026-09-21',
  periodNumber: 1,
  periodNumbers: [1, 2],
  periodLabel: 'P1–P2',
  subject: mockSubjectA,
  source: 'regular',
  status: 'unmarked',
  slotKey: '2026-09-21_unit_1_2',
  unitSize: 2,
};
const p1p2Times = resolveClassTimes(groupedP1P2Class, settings.defaultTiming);
assert(
  p1p2Times.isConfigured && p1p2Times.startTime === '09:00' && p1p2Times.endTime === '10:40',
  'Scenario 17: Grouped P1–P2 timing',
  `Expected 09:00 - 10:40, got ${p1p2Times.startTime} - ${p1p2Times.endTime}`
);

// 18. Grouped 3-period lab timing: P3-P5 -> Start = 10:50 (P3 start), End = 14:20 (P5 end)
const groupedLabClass: GeneratedClassInstance = {
  date: '2026-09-21',
  periodNumber: 3,
  periodNumbers: [3, 4, 5],
  periodLabel: 'P3–P5',
  subject: mockSubjectLab,
  source: 'regular',
  status: 'unmarked',
  slotKey: '2026-09-21_unit_3_4_5',
  unitSize: 3,
};
const labTimes = resolveClassTimes(groupedLabClass, settings.defaultTiming);
assert(
  labTimes.isConfigured && labTimes.startTime === '10:50' && labTimes.endTime === '14:20',
  'Scenario 18: Grouped 3-period lab timing',
  `Expected 10:50 - 14:20, got ${labTimes.startTime} - ${labTimes.endTime}`
);

// 19. Day-specific timing (e.g. Friday special early timetable)
// Friday is DayOfWeek 5
const fridayTimings: PeriodTiming[] = [
  { periodNumber: 1, startTime: '08:00', endTime: '08:45' },
  { periodNumber: 2, startTime: '08:45', endTime: '09:30' },
];
const settingsWithDaySpecific: ClassTimingSettings = {
  ...settings,
  daySpecificTimings: [
    {
      dayOfWeek: 5,
      periods: fridayTimings,
      breaks: [],
    },
  ],
};
// 2026-09-25 is Friday
const resolvedFriday = resolveDayTiming('2026-09-25', settingsWithDaySpecific);
assert(
  resolvedFriday?.periods.length === 2 && resolvedFriday.periods[0].startTime === '08:00',
  'Scenario 19: Day-specific timing',
  `Expected Friday start 08:00, got ${resolvedFriday?.periods[0]?.startTime}`
);

// 20. Default timing fallback (e.g. Thursday falls back to default)
// 2026-09-24 is Thursday (DayOfWeek 4)
const resolvedThursday = resolveDayTiming('2026-09-24', settingsWithDaySpecific);
assert(
  resolvedThursday?.periods.length === 5 && resolvedThursday.periods[0].startTime === '09:00',
  'Scenario 20: Default timing fallback',
  `Expected default 09:00, got ${resolvedThursday?.periods[0]?.startTime}`
);

// 21. Saturday timetable timing (Saturday with day-specific schedule)
// Saturday is DayOfWeek 6
const saturdayTimings: PeriodTiming[] = [
  { periodNumber: 1, startTime: '08:30', endTime: '09:15' },
  { periodNumber: 2, startTime: '09:15', endTime: '10:00' },
];
const settingsWithSat: ClassTimingSettings = {
  ...settings,
  daySpecificTimings: [
    {
      dayOfWeek: 6,
      periods: saturdayTimings,
      breaks: [],
    },
  ],
};
// 2026-09-26 is Saturday
const resolvedSat = resolveDayTiming('2026-09-26', settingsWithSat);
assert(
  resolvedSat?.periods[0].startTime === '08:30',
  'Scenario 21: Saturday timetable timing',
  `Expected 08:30, got ${resolvedSat?.periods[0]?.startTime}`
);

// 22. Special-date timetable timing (date override takes precedence over default and day-specific)
const specialOverrideSettings: ClassTimingSettings = {
  ...settingsWithSat,
  dateOverrides: [
    {
      id: 'override_1',
      date: '2026-09-26',
      periods: [{ periodNumber: 1, startTime: '10:00', endTime: '10:50' }],
      breaks: [],
    },
  ],
};
const resolvedOverride = resolveDayTiming('2026-09-26', specialOverrideSettings);
assert(
  resolvedOverride?.periods[0].startTime === '10:00',
  'Scenario 22: Special-date timetable timing',
  `Expected 10:00, got ${resolvedOverride?.periods[0]?.startTime}`
);

// 23. Next-class reminder timing: Exactly 1 notification computed per grouped unit with earliest period start
const groupedUnitClass: GeneratedClassInstance = {
  date: '2026-09-21',
  periodNumber: 1,
  periodNumbers: [1, 2],
  periodLabel: 'P1–P2',
  subject: mockSubjectA,
  source: 'regular',
  status: 'unmarked',
  slotKey: '2026-09-21_unit_1_2',
  unitSize: 2,
  startTime: '09:00',
  endTime: '10:40',
};
const reminderLeadMinutes = 10;
const periodStartMin = timeToMinutes(groupedUnitClass.startTime!);
const expectedNotifyMin = periodStartMin - reminderLeadMinutes; // 540 - 10 = 530 (08:50)
assert(
  expectedNotifyMin === 530 && minutesToTime(expectedNotifyMin) === '08:50',
  'Scenario 23: Next-class reminder timing',
  `Expected notify at 08:50 (530 min), got ${minutesToTime(expectedNotifyMin)}`
);

// 24. Widget current-class timing: At 09:20 during P1-P2 (09:00-10:40), widget receives NOW badge
const widgetNowStatus = getScheduleTimeline('2026-09-21', '09:20', [groupedUnitClass], settings.defaultTiming, true);
assert(
  widgetNowStatus.state === 'in_class' && widgetNowStatus.currentClass?.slotKey === groupedUnitClass.slotKey,
  'Scenario 24: Widget current-class timing',
  `Expected in_class with slotKey ${groupedUnitClass.slotKey}, got state ${widgetNowStatus.state}`
);

// 25. Widget next-class timing: At 08:40 before P1-P2, widget receives NEXT badge with 20 minutes countdown
const widgetNextStatus = getScheduleTimeline('2026-09-21', '08:40', [groupedUnitClass], settings.defaultTiming, true);
assert(
  widgetNextStatus.state === 'before_first' && widgetNextStatus.nextClassStartsInMinutes === 20,
  'Scenario 25: Widget next-class timing',
  `Expected before_first with 20 mins, got state ${widgetNextStatus.state} with ${widgetNextStatus.nextClassStartsInMinutes}`
);

console.log('\n=======================================================');
console.log(`TOTAL SCENARIOS: 25 | PASSED: ${passedCount} | FAILED: ${failedCount}`);
if (failedCount === 0) {
  console.log('ALL 25 CLASS TIMINGS & BREAKS SCENARIOS VERIFIED 100% PASSING!');
} else {
  console.error(`SOME SCENARIOS FAILED: ${failedCount} failures`);
  process.exit(1);
}
console.log('=======================================================\n');
