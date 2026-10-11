import { registerPlugin, Capacitor } from '@capacitor/core';
import type { OverallAttendanceStats, ClassTimingSettings } from '../types';
import type {
  EngineContext,
  getClassesForDate,
  formatDate,
} from './attendanceEngine';
import { resolveDayTiming, resolveClassTimes, getScheduleTimeline } from './timingEngine';

export interface WidgetClassItem {
  slotKey: string;
  date: string;
  periodNumber: number;
  periodLabel: string;
  unitGroupId?: string;
  unitSize: number;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  status: 'unmarked' | 'present' | 'absent' | 'cancelled';
  startTime?: string;
  endTime?: string;
}

export interface WidgetSnapshot {
  overallPercentage: number;
  overallPresent: number;
  overallAbsent: number;
  overallConduct: number;
  overallCancelled: number;
  overallTarget: number;
  baselinePresent: number;
  baselineAbsent: number;
  baselineCancelled: number;
  status: 'safe' | 'warning' | 'critical';
  todayDate: string;
  todayStatusReason: string;
  isWorkingDay: boolean;
  classes: WidgetClassItem[];
  activeSlotKey?: string;
  timelineBadge?: string;
  timelineMessage?: string;
}

export interface PendingWidgetAction {
  id: string;
  slotKey: string;
  date: string;
  periodNumber: number;
  subjectId: string;
  unitGroupId?: string;
  unitSize?: number;
  status: 'unmarked' | 'present' | 'absent' | 'cancelled';
  timestamp: number;
}

interface NativeBridgePlugin {
  syncWidgetData(data: WidgetSnapshot): Promise<void>;
  getPendingWidgetActions(): Promise<{ actions: PendingWidgetAction[] }>;
  clearPendingWidgetActions(): Promise<void>;
}

const NativeBridge = registerPlugin<NativeBridgePlugin>('AttndNativeBridge');

export async function syncWidgetState(
  context: EngineContext,
  todayStr: string,
  todayClasses: ReturnType<typeof getClassesForDate>['classes'],
  todayReason: string,
  isWorkingDay: boolean,
  overallStats: OverallAttendanceStats,
  timingSettings?: ClassTimingSettings | null
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const dayTiming = resolveDayTiming(todayStr, timingSettings !== undefined ? timingSettings : context.classTimingSettings);
    const timeline = getScheduleTimeline(todayStr, undefined, todayClasses, dayTiming, isWorkingDay);

    let activeSlotKey: string | undefined;
    let timelineBadge: string | undefined;
    let timelineMessage: string | undefined = timeline.message;

    if (timeline.state === 'in_class' && timeline.currentClass) {
      activeSlotKey = timeline.currentClass.slotKey;
      timelineBadge = 'NOW';
    } else if (timeline.nextClass) {
      activeSlotKey = timeline.nextClass.slotKey;
      timelineBadge = timeline.nextClassStartsInMinutes !== null
        ? `NEXT (${timeline.nextClassStartsInMinutes}m)`
        : 'NEXT';
    }

    // Calculate baseline counts (everything before today's classes)
    let todayPresent = 0;
    let todayAbsent = 0;
    let todayCancelled = 0;

    const classItems: WidgetClassItem[] = todayClasses.map(cls => {
      if (cls.status === 'present') todayPresent++;
      else if (cls.status === 'absent') todayAbsent++;
      else if (cls.status === 'cancelled') todayCancelled++;

      // Resolve period start/end time
      const times = resolveClassTimes(cls, dayTiming);

      return {
        slotKey: cls.slotKey,
        date: cls.date,
        periodNumber: cls.periodNumber,
        periodLabel: cls.periodLabel || `P${cls.periodNumber}`,
        unitGroupId: cls.unitGroupId,
        unitSize: cls.unitSize || 1,
        subjectId: cls.subject.id,
        subjectName: cls.subject.name,
        subjectCode: cls.subject.code,
        status: cls.status,
        startTime: times.isConfigured ? times.startTime : cls.startTime,
        endTime: times.isConfigured ? times.endTime : cls.endTime,
      };
    });

    const baselinePresent = Math.max(0, overallStats.present - todayPresent);
    const baselineAbsent = Math.max(0, overallStats.absent - todayAbsent);
    const baselineCancelled = Math.max(0, overallStats.cancelled - todayCancelled);

    const snapshot: WidgetSnapshot = {
      overallPercentage: overallStats.percentage,
      overallPresent: overallStats.present,
      overallAbsent: overallStats.absent,
      overallConduct: overallStats.conducted,
      overallCancelled: overallStats.cancelled,
      overallTarget: overallStats.target,
      baselinePresent,
      baselineAbsent,
      baselineCancelled,
      status: overallStats.status,
      todayDate: todayStr,
      todayStatusReason: todayReason,
      isWorkingDay,
      classes: classItems,
      activeSlotKey,
      timelineBadge,
      timelineMessage,
    };

    await NativeBridge.syncWidgetData(snapshot);
  } catch (err) {
    console.warn('Failed to sync widget data:', err);
  }
}

export async function fetchPendingWidgetActions(): Promise<PendingWidgetAction[]> {
  if (!Capacitor.isNativePlatform()) {
    return [];
  }
  try {
    const res = await NativeBridge.getPendingWidgetActions();
    return res.actions || [];
  } catch (err) {
    console.warn('Failed to fetch pending widget actions:', err);
    return [];
  }
}

export async function clearPendingWidgetActions(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }
  try {
    await NativeBridge.clearPendingWidgetActions();
  } catch (err) {
    console.warn('Failed to clear pending widget actions:', err);
  }
}
