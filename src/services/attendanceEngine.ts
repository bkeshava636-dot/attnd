import type {
  SemesterSettings,
  Subject,
  TimetablePeriod,
  SaturdayRule,
  DateSpecificSaturdayRule,
  DateOverride,
  Holiday,
  AcademicEvent,
  ExtraClass,
  Substitution,
  AttendanceRecord,
  GeneratedClassInstance,
  DayClassSummary,
  SubjectAttendanceStats,
  OverallAttendanceStats,
  DayOfWeek,
  SaturdayOccurrence,
  ClassTimingSettings,
} from '../types';
import { resolveDayTiming, resolveClassTimes } from './timingEngine';

// Format YYYY-MM-DD
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Parse YYYY-MM-DD into local Date object (at midnight)
export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// Human readable day names
export const DAY_NAMES: Record<number, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

// Calculate Saturday occurrence in the month (1st, 2nd, 3rd, 4th, or 5th)
export function getSaturdayOccurrence(date: Date): SaturdayOccurrence {
  const dayOfMonth = date.getDate();
  const occurrence = Math.ceil(dayOfMonth / 7);
  return Math.min(occurrence, 5) as SaturdayOccurrence;
}

// Check if a date string falls inside [startDate, endDate] inclusive
export function isDateInRange(targetDateStr: string, startDateStr: string, endDateStr: string): boolean {
  return targetDateStr >= startDateStr && targetDateStr <= endDateStr;
}

export interface EngineContext {
  semesterSettings: SemesterSettings;
  subjects: Subject[];
  timetable: TimetablePeriod[];
  saturdayRules: SaturdayRule[];
  dateSpecificSaturdayRules?: DateSpecificSaturdayRule[];
  dateOverrides: DateOverride[];
  holidays: Holiday[];
  academicEvents: AcademicEvent[];
  extraClasses: ExtraClass[];
  substitutions: Substitution[];
  attendanceRecords: AttendanceRecord[];
  classTimingSettings?: ClassTimingSettings;
}

/**
 * Deterministically generates the list of classes for a specific date
 * adhering strictly to priority:
 * 1. Semester Start / End bounds
 * 2. Specific Date Override
 * 3. Academic Event (regularClassesRun === false)
 * 4. Holiday
 * 5. Saturday Rule
 * 6. Normal Weekday Timetable
 */
export function getClassesForDate(dateStr: string, context: EngineContext): DayClassSummary {
  const date = parseDate(dateStr);
  const dayOfWeek = date.getDay() as DayOfWeek;
  const subjectMap = new Map<string, Subject>(context.subjects.map(s => [s.id, s]));

  // 1. Check Semester Bounds
  const { startDate, endDate } = context.semesterSettings;
  if (dateStr < startDate) {
    return {
      date: dateStr,
      isWorkingDay: false,
      statusReason: `Before semester start (${startDate})`,
      classes: [],
      allMarked: true,
      hasClasses: false,
    };
  }
  if (endDate && dateStr > endDate) {
    return {
      date: dateStr,
      isWorkingDay: false,
      statusReason: `After semester end (${endDate})`,
      classes: [],
      allMarked: true,
      hasClasses: false,
    };
  }

  // 2. Specific Date Override
  const override = context.dateOverrides.find(o => o.date === dateStr);
  let effectiveTimetableDay: DayOfWeek | null = null;
  let isWorking = true;
  let statusReason = '';

  if (override) {
    if (override.status === 'holiday') {
      isWorking = false;
      const noteStr = override.note ? ` (${override.note})` : '';
      statusReason = `Override: Holiday${noteStr}`;
    } else {
      isWorking = true;
      const follow = override.followsDay !== undefined && override.followsDay !== 'custom'
        ? (override.followsDay as DayOfWeek)
        : dayOfWeek;
      effectiveTimetableDay = follow;
      const noteStr = override.note ? ` (${override.note})` : '';
      statusReason = `Override: Follows ${DAY_NAMES[follow]} timetable${noteStr}`;
    }
  } else if (dayOfWeek === 6 && context.dateSpecificSaturdayRules?.some(r => r.date === dateStr)) {
    // 3. Date-Specific Working Saturday Mapping (College Circular Schedule)
    const dateSpecificSat = context.dateSpecificSaturdayRules.find(r => r.date === dateStr)!;
    const occurrence = getSaturdayOccurrence(date);
    if (dateSpecificSat.status === 'holiday') {
      isWorking = false;
      const noteStr = dateSpecificSat.note ? ` (${dateSpecificSat.note})` : '';
      statusReason = `${occurrence}${getOrdinalSuffix(occurrence)} Saturday (College Circular): Holiday${noteStr}`;
    } else {
      isWorking = true;
      const dayMap: Record<string, DayOfWeek> = {
        sunday: 0,
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
      };
      const followNum: DayOfWeek = typeof dateSpecificSat.followsDay === 'number'
        ? (dateSpecificSat.followsDay as DayOfWeek)
        : (dayMap[String(dateSpecificSat.followsDay).toLowerCase()] ?? 1);
      effectiveTimetableDay = followNum;
      const noteStr = dateSpecificSat.note ? ` (${dateSpecificSat.note})` : '';
      statusReason = `${occurrence}${getOrdinalSuffix(occurrence)} Saturday (College Circular): Working (${DAY_NAMES[followNum]} timetable)${noteStr}`;
    }
  } else {
    // 4. Academic Event
    const activeEvent = context.academicEvents.find(e =>
      isDateInRange(dateStr, e.startDate, e.endDate)
    );

    if (activeEvent && !activeEvent.regularClassesRun) {
      isWorking = false;
      const typeLabel = activeEvent.type.toUpperCase();
      statusReason = `${typeLabel}: ${activeEvent.description} (Regular classes OFF)`;
    } else {
      // 5. Holiday
      const activeHoliday = context.holidays.find(h =>
        isDateInRange(dateStr, h.startDate, h.endDate)
      );

      if (activeHoliday) {
        isWorking = false;
        statusReason = `Holiday: ${activeHoliday.description}`;
      } else if (dayOfWeek === 6) {
        // 6. Generic Saturday Rule (Fallback when no date-specific mapping exists)
        const occurrence = getSaturdayOccurrence(date);
        const satRule = context.saturdayRules.find(r => r.occurrence === occurrence);

        if (!satRule || satRule.status === 'holiday') {
          isWorking = false;
          statusReason = `${occurrence}${getOrdinalSuffix(occurrence)} Saturday: Holiday`;
        } else {
          isWorking = true;
          const follow = (satRule.followsDay !== undefined && satRule.followsDay !== 'custom')
            ? (satRule.followsDay as DayOfWeek)
            : 6;
          effectiveTimetableDay = follow;
          statusReason = follow === 6
            ? `${occurrence}${getOrdinalSuffix(occurrence)} Saturday: Working`
            : `${occurrence}${getOrdinalSuffix(occurrence)} Saturday: Working (${DAY_NAMES[follow]} timetable)`;
        }
      } else if (dayOfWeek === 0) {
        // Sunday
        if (context.semesterSettings.includeSundayInTimetable) {
          isWorking = true;
          effectiveTimetableDay = 0;
          statusReason = 'Sunday Timetable';
        } else {
          isWorking = false;
          statusReason = 'Sunday (Non-working)';
        }
      } else {
        // Normal Weekday
        isWorking = true;
        effectiveTimetableDay = dayOfWeek;
        statusReason = `${DAY_NAMES[dayOfWeek]} Timetable`;
      }
    }
  }

  // Generate class list as ATTENDANCE UNITS
  const classes: GeneratedClassInstance[] = [];

  // If working and has a timetable day
  if (isWorking && effectiveTimetableDay !== null) {
    const scheduledPeriods = context.timetable
      .filter(p => p.dayOfWeek === effectiveTimetableDay)
      .sort((a, b) => a.periodNumber - b.periodNumber);

    // Group contiguous periods into single attendance units
    let i = 0;
    while (i < scheduledPeriods.length) {
      const p = scheduledPeriods[i];
      let subject = subjectMap.get(p.subjectId);
      let originalSubject: Subject | undefined = undefined;
      let source: 'regular' | 'substitution' = 'regular';
      let note: string | undefined = undefined;

      const sub = context.substitutions.find(
        s => s.date === dateStr && s.periodNumber === p.periodNumber
      );
      if (sub) {
        const substituteSub = subjectMap.get(sub.substituteSubjectId);
        if (substituteSub) {
          originalSubject = subject;
          subject = substituteSub;
          source = 'substitution';
          note = sub.note;
        }
      }

      if (!subject) {
        i++;
        continue;
      }

      // Check if this period has a unit group configured
      const activeUnitGroupId = p.unitGroupId || (
        context.semesterSettings.treatLabAsSingleUnit && subject.type === 'lab' && p.labGroupKey
          ? `lab_${p.labGroupKey}`
          : undefined
      );

      const grouped: TimetablePeriod[] = [p];

      if (activeUnitGroupId) {
        // Scan contiguous periods matching the same unit group & same effective subject
        let j = i + 1;
        while (j < scheduledPeriods.length) {
          const nextP = scheduledPeriods[j];
          // Must be strictly consecutive period number
          if (nextP.periodNumber !== scheduledPeriods[j - 1].periodNumber + 1) {
            break;
          }
          const nextUnitGroupId = nextP.unitGroupId || (
            context.semesterSettings.treatLabAsSingleUnit && subject.type === 'lab' && nextP.labGroupKey
              ? `lab_${nextP.labGroupKey}`
              : undefined
          );
          if (nextUnitGroupId !== activeUnitGroupId) {
            break;
          }

          // Check substitution for next period
          let nextSubSubject = subjectMap.get(nextP.subjectId);
          const nextSub = context.substitutions.find(
            s => s.date === dateStr && s.periodNumber === nextP.periodNumber
          );
          if (nextSub) {
            const subCandidate = subjectMap.get(nextSub.substituteSubjectId);
            if (subCandidate) nextSubSubject = subCandidate;
          }

          // If substituted to a different subject, cannot form a single attendance unit
          if (nextSubSubject?.id !== subject.id) {
            break;
          }

          grouped.push(nextP);
          j++;
        }
        i = j;
      } else {
        i++;
      }

      const startP = grouped[0].periodNumber;
      const endP = grouped[grouped.length - 1].periodNumber;
      const isMultiPeriod = grouped.length > 1;
      const periodLabel = isMultiPeriod ? `P${startP}–P${endP}` : `P${startP}`;
      const slotKey = activeUnitGroupId
        ? `${dateStr}_unit_${activeUnitGroupId}`
        : `${dateStr}_p${startP}_${subject.id}`;

      // Check attendance record: first by slotKey, then fallback to individual period keys for backwards compatibility
      let record = context.attendanceRecords.find(r => r.id === slotKey);
      if (!record) {
        record = context.attendanceRecords.find(
          r => r.date === dateStr && grouped.some(g => g.periodNumber === r.periodNumber && r.subjectId === subject!.id)
        );
      }

      classes.push({
        slotKey,
        date: dateStr,
        periodNumber: startP,
        periodLabel,
        periodNumbers: grouped.map(g => g.periodNumber),
        unitGroupId: activeUnitGroupId,
        unitSize: grouped.length,
        subject,
        originalSubject,
        source,
        sourceRefId: grouped[0].id,
        status: record ? record.status : 'unmarked',
        attendanceRecordId: record?.id,
        note: record?.note || note,
      });
    }
  }

  // Extra classes for this date (always included even on non-working days)
  const extras = context.extraClasses.filter(e => e.date === dateStr);
  for (const extra of extras) {
    const subject = subjectMap.get(extra.subjectId);
    if (subject) {
      const slotKey = `${dateStr}_extra_${extra.id}`;
      const record = context.attendanceRecords.find(r => r.id === slotKey || (r.source === 'extra' && r.sourceRefId === extra.id));
      const pCount = extra.periodsCount || 1;
      const periodLabel = pCount > 1 ? `Extra (${pCount} Periods)` : 'Extra';

      classes.push({
        slotKey,
        date: dateStr,
        periodNumber: 900 + classes.length + 1,
        periodLabel,
        periodNumbers: [900 + classes.length + 1],
        unitSize: pCount,
        subject,
        source: 'extra',
        sourceRefId: extra.id,
        status: record ? record.status : extra.status,
        attendanceRecordId: record?.id,
        note: extra.description,
      });
    }
  }

  // Enrich with resolved class timings if configured
  if (context.classTimingSettings) {
    const dayTiming = resolveDayTiming(dateStr, context.classTimingSettings);
    for (const cls of classes) {
      const times = resolveClassTimes(cls, dayTiming);
      if (times.isConfigured) {
        cls.startTime = times.startTime;
        cls.endTime = times.endTime;
      }
    }
  }

  const hasClasses = classes.length > 0;
  const allMarked = hasClasses && classes.every(c => c.status !== 'unmarked');

  return {
    date: dateStr,
    isWorkingDay: isWorking || extras.length > 0,
    statusReason,
    classes,
    allMarked,
    hasClasses,
  };
}

export function getOrdinalSuffix(n: number): string {
  if (n === 1) return 'st';
  if (n === 2) return 'nd';
  if (n === 3) return 'rd';
  return 'th';
}

/**
 * Attendance formula calculations
 */

// Bunk calculator: max X such that Present / (Present + Absent + X) >= Target
export function calculateBunk(present: number, absent: number, targetPercentage: number): number {
  if (present <= 0) return 0;
  const target = targetPercentage / 100;
  if (target <= 0) return 999;
  if (target >= 1) return 0; // target 100% allows 0 bunks

  const total = present + absent;
  if (total === 0) return 0;

  const currentPct = (present / total) * 100;
  if (currentPct < targetPercentage) return 0;

  // X <= (present - target * (present + absent)) / target
  const maxBunk = Math.floor((present - target * total) / target);
  return Math.max(0, maxBunk);
}

// Recovery calculator: min Y such that (Present + Y) / (Present + Absent + Y) >= Target
export function calculateRecovery(present: number, absent: number, targetPercentage: number): number {
  const target = targetPercentage / 100;
  if (target <= 0) return 0;
  if (target >= 1) {
    return absent > 0 ? Infinity : 0;
  }

  const total = present + absent;
  if (total === 0) return 0;

  const currentPct = (present / total) * 100;
  if (currentPct >= targetPercentage) return 0;

  // (present + Y) / (total + Y) >= target
  // present + Y >= target * total + target * Y
  // Y * (1 - target) >= target * total - present
  // Y >= (target * total - present) / (1 - target)
  const numerator = target * total - present;
  const denominator = 1 - target;
  const needed = Math.ceil(numerator / denominator);
  return Math.max(0, needed);
}

// Projected Attendance Simulation
export function calculateProjection(present: number, absent: number, deltaAttended: number, deltaMissed: number): number {
  const newPresent = present + deltaAttended;
  const newTotal = present + absent + deltaAttended + deltaMissed;
  if (newTotal <= 0) return 100;
  return Math.round(((newPresent / newTotal) * 100) * 100) / 100;
}

/**
 * Computes attendance stats for all subjects and overall
 */
export function calculateAttendanceMetrics(
  subjects: Subject[],
  records: AttendanceRecord[],
  targetPercentage: number,
  treatLabAsSingleUnit: boolean = false
): {
  subjectStats: SubjectAttendanceStats[];
  overall: OverallAttendanceStats;
} {
  // Aggregate per subject
  const statsMap = new Map<string, {
    present: number;
    absent: number;
    cancelled: number;
    unmarked: number;
  }>();

  for (const s of subjects) {
    statsMap.set(s.id, {
      present: s.initialPresent || 0,
      absent: s.initialAbsent || 0,
      cancelled: 0,
      unmarked: 0,
    });
  }

  for (const r of records) {
    let stat = statsMap.get(r.subjectId);
    if (!stat) {
      stat = { present: 0, absent: 0, cancelled: 0, unmarked: 0 };
      statsMap.set(r.subjectId, stat);
    }

    if (r.status === 'present') stat.present += 1;
    else if (r.status === 'absent') stat.absent += 1;
    else if (r.status === 'cancelled') stat.cancelled += 1;
    else if (r.status === 'unmarked') stat.unmarked += 1;
  }

  let totalPresent = 0;
  let totalAbsent = 0;
  let totalCancelled = 0;
  let totalUnmarked = 0;

  const subjectStats: SubjectAttendanceStats[] = subjects.map(subject => {
    const s = statsMap.get(subject.id) || { present: 0, absent: 0, cancelled: 0, unmarked: 0 };
    const conducted = s.present + s.absent;
    const pct = conducted > 0 ? Math.round((s.present / conducted) * 10000) / 100 : 100;
    const canMiss = calculateBunk(s.present, s.absent, targetPercentage);
    const needToAttend = calculateRecovery(s.present, s.absent, targetPercentage);

    totalPresent += s.present;
    totalAbsent += s.absent;
    totalCancelled += s.cancelled;
    totalUnmarked += s.unmarked;

    let status: 'safe' | 'warning' | 'critical' = 'safe';
    if (conducted > 0) {
      if (pct < targetPercentage) status = 'critical';
      else if (pct - targetPercentage < 5) status = 'warning';
    }

    return {
      subject,
      present: s.present,
      absent: s.absent,
      conducted,
      cancelled: s.cancelled,
      unmarked: s.unmarked,
      percentage: pct,
      target: targetPercentage,
      canMiss,
      needToAttend,
      status,
    };
  });

  const overallConducted = totalPresent + totalAbsent;
  const overallPct = overallConducted > 0 ? Math.round((totalPresent / overallConducted) * 10000) / 100 : 100;
  const overallCanMiss = calculateBunk(totalPresent, totalAbsent, targetPercentage);
  const overallNeedToAttend = calculateRecovery(totalPresent, totalAbsent, targetPercentage);

  let overallStatus: 'safe' | 'warning' | 'critical' = 'safe';
  if (overallConducted > 0) {
    if (overallPct < targetPercentage) overallStatus = 'critical';
    else if (overallPct - targetPercentage < 5) overallStatus = 'warning';
  }

  const overall: OverallAttendanceStats = {
    present: totalPresent,
    absent: totalAbsent,
    conducted: overallConducted,
    cancelled: totalCancelled,
    unmarked: totalUnmarked,
    percentage: overallPct,
    target: targetPercentage,
    canMiss: overallCanMiss,
    needToAttend: overallNeedToAttend,
    status: overallStatus,
  };

  return { subjectStats, overall };
}
