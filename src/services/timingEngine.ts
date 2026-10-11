import type {
  DayOfWeek,
  GeneratedClassInstance,
  PeriodTiming,
  BreakTiming,
  DayTimingConfig,
  DaySpecificTiming,
  DateTimingOverride,
  ClassTimingSettings,
  ScheduleTimelineStatus,
  TimelineStateType,
} from '../types';

/**
 * Converts a 24-hour time string "HH:mm" into minutes from midnight (0..1439).
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return NaN;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return NaN;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return NaN;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return NaN;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight into a 24-hour "HH:mm" string.
 */
export function minutesToTime(minutes: number): string {
  const bounded = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(bounded / 60);
  const m = bounded % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formats a 24-hour time string "HH:mm" into a user-friendly string (e.g. "9:00 AM" or "09:00").
 */
export function formatTimeDisplay(timeStr?: string, use12Hour: boolean = true): string {
  if (!timeStr) return '';
  const totalMin = timeToMinutes(timeStr);
  if (isNaN(totalMin)) return timeStr;

  if (!use12Hour) {
    return minutesToTime(totalMin);
  }

  const hours = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMins = mins.toString().padStart(2, '0');
  return `${displayHours}:${displayMins} ${ampm}`;
}

/**
 * Formats a duration in minutes into a friendly string (e.g. "15 min", "1 hr 10 min").
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} hr ${m} min` : `${h} hr`;
}

/**
 * Validates a single time interval.
 * Returns true if valid and start is strictly before end.
 */
export function isValidTimeInterval(start: string, end: string): { isValid: boolean; error?: string } {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (isNaN(s)) return { isValid: false, error: 'Invalid start time.' };
  if (isNaN(e)) return { isValid: false, error: 'Invalid end time.' };
  if (s >= e) return { isValid: false, error: 'End time must be after start time.' };
  return { isValid: true };
}

interface ScheduleInterval {
  id: string;
  type: 'period' | 'break';
  label: string;
  start: number;
  end: number;
  periodNumber?: number;
}

/**
 * Validates a complete daily timing schedule (periods and breaks).
 * Checks:
 * - Start < End
 * - Non-zero duration
 * - No overlapping periods
 * - No overlapping breaks
 * - No break overlapping a period
 * - Allows adjacent periods (e.g. 9:00-10:00 and 10:00-11:00)
 * - Allows adjacent breaks
 */
export function validateScheduleTimings(
  periods: PeriodTiming[],
  breaks: BreakTiming[]
): { isValid: boolean; error?: string } {
  const intervals: ScheduleInterval[] = [];

  // Check period numbers uniqueness and interval validity
  const seenPeriods = new Set<number>();
  for (const p of periods) {
    if (seenPeriods.has(p.periodNumber)) {
      return { isValid: false, error: `Duplicate period number P${p.periodNumber}.` };
    }
    seenPeriods.add(p.periodNumber);

    const check = isValidTimeInterval(p.startTime, p.endTime);
    if (!check.isValid) {
      return { isValid: false, error: `P${p.periodNumber}: ${check.error}` };
    }

    intervals.push({
      id: `p_${p.periodNumber}`,
      type: 'period',
      label: `P${p.periodNumber}`,
      start: timeToMinutes(p.startTime),
      end: timeToMinutes(p.endTime),
      periodNumber: p.periodNumber,
    });
  }

  // Check breaks
  for (const b of breaks) {
    if (!b.name || b.name.trim().length === 0) {
      return { isValid: false, error: 'Break name cannot be empty.' };
    }
    const check = isValidTimeInterval(b.startTime, b.endTime);
    if (!check.isValid) {
      return { isValid: false, error: `Break '${b.name}': ${check.error}` };
    }

    intervals.push({
      id: `b_${b.id}`,
      type: 'break',
      label: b.name.trim(),
      start: timeToMinutes(b.startTime),
      end: timeToMinutes(b.endTime),
    });
  }

  // Check pairwise overlaps: max(S_A, S_B) < min(E_A, E_B)
  for (let i = 0; i < intervals.length; i++) {
    for (let j = i + 1; j < intervals.length; j++) {
      const a = intervals[i];
      const b = intervals[j];
      const overlapStart = Math.max(a.start, b.start);
      const overlapEnd = Math.min(a.end, b.end);

      if (overlapStart < overlapEnd) {
        if (a.type === 'period' && b.type === 'period') {
          return {
            isValid: false,
            error: `${a.label} and ${b.label} timings overlap.`,
          };
        } else if (a.type === 'break' && b.type === 'break') {
          return {
            isValid: false,
            error: `Break '${a.label}' and break '${b.label}' timings overlap.`,
          };
        } else {
          const breakItem = a.type === 'break' ? a : b;
          const periodItem = a.type === 'period' ? a : b;
          return {
            isValid: false,
            error: `Break '${breakItem.label}' overlaps with ${periodItem.label}.`,
          };
        }
      }
    }
  }

  return { isValid: true };
}

/**
 * Resolves the active DayTimingConfig for a given date according to the precedence:
 * 1. Specific Date Timing Override (dateOverrides)
 * 2. Day-Specific Timing (daySpecificTimings for Monday..Saturday)
 * 3. Default Timing (defaultTiming)
 */
export function resolveDayTiming(
  dateStr: string,
  settings?: ClassTimingSettings | null
): DayTimingConfig | null {
  if (!settings || !settings.defaultTiming) return null;

  // 1. Date override
  if (settings.dateOverrides && settings.dateOverrides.length > 0) {
    const override = settings.dateOverrides.find(o => o.date === dateStr);
    if (override && override.periods.length > 0) {
      return {
        periods: override.periods,
        breaks: override.breaks || [],
      };
    }
  }

  // 2. Day-specific timing
  const dateObj = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = (isNaN(dateObj.getDay()) ? 1 : dateObj.getDay()) as DayOfWeek;

  if (settings.daySpecificTimings && settings.daySpecificTimings.length > 0) {
    const daySpecific = settings.daySpecificTimings.find(d => d.dayOfWeek === dayOfWeek);
    if (daySpecific && daySpecific.periods.length > 0) {
      return {
        periods: daySpecific.periods,
        breaks: daySpecific.breaks || [],
      };
    }
  }

  // 3. Default timing
  return settings.defaultTiming;
}

/**
 * Resolves the start and end times for a class instance (including multi-period grouped units).
 * For grouped periods (e.g. P1–P2 or P1–P3):
 * - startTime is the startTime of earliest period (e.g. P1)
 * - endTime is the endTime of latest period (e.g. P2 or P3)
 */
export function resolveClassTimes(
  cls: GeneratedClassInstance,
  dayTiming: DayTimingConfig | null
): { startTime?: string; endTime?: string; isConfigured: boolean } {
  if (!dayTiming || !dayTiming.periods || dayTiming.periods.length === 0) {
    return { isConfigured: false };
  }

  if (cls.periodNumbers && cls.periodNumbers.length > 0) {
    const sorted = [...cls.periodNumbers].sort((a, b) => a - b);
    const earliestNum = sorted[0];
    const latestNum = sorted[sorted.length - 1];

    const startPeriod = dayTiming.periods.find(p => p.periodNumber === earliestNum);
    const endPeriod = dayTiming.periods.find(p => p.periodNumber === latestNum);

    if (startPeriod?.startTime && endPeriod?.endTime) {
      return {
        startTime: startPeriod.startTime,
        endTime: endPeriod.endTime,
        isConfigured: true,
      };
    }
    return { isConfigured: false };
  }

  // Single period
  const pt = dayTiming.periods.find(p => p.periodNumber === cls.periodNumber);
  if (pt?.startTime && pt?.endTime) {
    return {
      startTime: pt.startTime,
      endTime: pt.endTime,
      isConfigured: true,
    };
  }

  return { isConfigured: false };
}

export interface TimelineEntry {
  type: 'class' | 'break';
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  classInstance?: GeneratedClassInstance;
  breakTiming?: BreakTiming;
}

/**
 * Assembles the full daily schedule timeline (classes + breaks) and detects:
 * - currentClass / currentBreak
 * - nextClass and startsInMinutes
 * - state ('in_class' | 'in_break' | 'before_first' | 'between_classes' | 'after_last' | 'non_working' | 'no_classes' | 'unconfigured')
 */
function makeTimelineStatus(
  currentClass: GeneratedClassInstance | null,
  currentBreak: BreakTiming | null,
  nextClass: GeneratedClassInstance | null,
  nextClassStartsInMinutes: number | null,
  state: TimelineStateType,
  message: string
): ScheduleTimelineStatus {
  return {
    currentClass,
    currentBreak,
    nextClass,
    nextClassStartsInMinutes,
    state,
    message,
    activeClass: currentClass,
    activeBreak: currentBreak,
    minutesUntilNext: nextClassStartsInMinutes,
  };
}

export function getScheduleTimeline(
  dateStr: string,
  currentTimeStr: string | undefined,
  classes: GeneratedClassInstance[],
  dayTiming: DayTimingConfig | null,
  isWorkingDay: boolean
): ScheduleTimelineStatus {
  if (!isWorkingDay) {
    return makeTimelineStatus(null, null, null, null, 'non_working', 'Non-working day');
  }

  if (classes.length === 0) {
    return makeTimelineStatus(null, null, null, null, 'no_classes', 'No classes scheduled today');
  }

  // Build timeline items for classes that have configured timings
  const timeline: TimelineEntry[] = [];
  let configuredClassCount = 0;

  for (const cls of classes) {
    const times = resolveClassTimes(cls, dayTiming);
    if (times.isConfigured && times.startTime && times.endTime) {
      configuredClassCount++;
      const sMin = timeToMinutes(times.startTime);
      const eMin = timeToMinutes(times.endTime);
      timeline.push({
        type: 'class',
        id: cls.slotKey,
        label: cls.periodLabel || `P${cls.periodNumber}`,
        startTime: times.startTime,
        endTime: times.endTime,
        startMinutes: sMin,
        endMinutes: eMin,
        classInstance: { ...cls, startTime: times.startTime, endTime: times.endTime },
      });
    }
  }

  // If no classes have configured timings
  if (configuredClassCount === 0) {
    return makeTimelineStatus(null, null, classes[0] || null, null, 'unconfigured', 'Class timings not configured');
  }

  // Add breaks
  if (dayTiming?.breaks) {
    for (const b of dayTiming.breaks) {
      const sMin = timeToMinutes(b.startTime);
      const eMin = timeToMinutes(b.endTime);
      if (!isNaN(sMin) && !isNaN(eMin) && sMin < eMin) {
        timeline.push({
          type: 'break',
          id: b.id,
          label: b.name,
          startTime: b.startTime,
          endTime: b.endTime,
          startMinutes: sMin,
          endMinutes: eMin,
          breakTiming: b,
        });
      }
    }
  }

  // Sort timeline chronologically
  timeline.sort((a, b) => a.startMinutes - b.startMinutes);

  // Determine current minutes from midnight
  let curM: number;
  if (currentTimeStr) {
    curM = timeToMinutes(currentTimeStr);
  } else {
    const now = new Date();
    curM = now.getHours() * 60 + now.getMinutes();
  }

  const firstItem = timeline[0];
  const lastItem = timeline[timeline.length - 1];

  // 1. Before first scheduled item
  if (curM < firstItem.startMinutes) {
    const firstClassItem = timeline.find(it => it.type === 'class');
    const nextCls = firstClassItem?.classInstance || null;
    const startsIn = firstClassItem ? firstClassItem.startMinutes - curM : null;
    return makeTimelineStatus(
      null,
      null,
      nextCls,
      startsIn,
      'before_first',
      startsIn !== null ? `First class starts in ${formatDuration(startsIn)}` : 'Classes start soon'
    );
  }

  // 2. After last scheduled item
  if (curM >= lastItem.endMinutes) {
    return makeTimelineStatus(null, null, null, null, 'after_last', 'No more classes today');
  }

  // 3. Inside an item (class or break)
  for (let i = 0; i < timeline.length; i++) {
    const it = timeline[i];
    if (curM >= it.startMinutes && curM < it.endMinutes) {
      // Find next upcoming class
      const upcomingClassItem = timeline.slice(i + 1).find(x => x.type === 'class');
      const nextCls = upcomingClassItem?.classInstance || null;
      const startsIn = upcomingClassItem ? upcomingClassItem.startMinutes - curM : null;

      if (it.type === 'class') {
        return makeTimelineStatus(
          it.classInstance || null,
          null,
          nextCls,
          startsIn,
          'in_class',
          `${it.classInstance?.subject.name} in progress`
        );
      } else {
        return makeTimelineStatus(
          null,
          it.breakTiming || null,
          nextCls,
          startsIn,
          'in_break',
          `On break: ${it.label}`
        );
      }
    }
  }

  // 4. Between classes (gap)
  const nextClassItem = timeline.find(x => x.startMinutes > curM && x.type === 'class');
  const nextCls = nextClassItem?.classInstance || null;
  const startsIn = nextClassItem ? nextClassItem.startMinutes - curM : null;

  return makeTimelineStatus(
    null,
    null,
    nextCls,
    startsIn,
    'between_classes',
    startsIn !== null ? `Next class starts in ${formatDuration(startsIn)}` : 'Between classes'
  );
}

/**
 * Returns the currently active class instance, or null.
 */
export function getCurrentClass(
  dateStr: string,
  currentTimeStr: string | undefined,
  classes: GeneratedClassInstance[],
  dayTiming: DayTimingConfig | null,
  isWorkingDay: boolean
): GeneratedClassInstance | null {
  const status = getScheduleTimeline(dateStr, currentTimeStr, classes, dayTiming, isWorkingDay);
  return status.currentClass;
}

/**
 * Returns the next upcoming class instance and minutes remaining, or null.
 */
export function getNextClass(
  dateStr: string,
  currentTimeStr: string | undefined,
  classes: GeneratedClassInstance[],
  dayTiming: DayTimingConfig | null,
  isWorkingDay: boolean
): { classInstance: GeneratedClassInstance | null; startsInMinutes: number | null } {
  const status = getScheduleTimeline(dateStr, currentTimeStr, classes, dayTiming, isWorkingDay);
  return {
    classInstance: status.nextClass,
    startsInMinutes: status.nextClassStartsInMinutes,
  };
}
