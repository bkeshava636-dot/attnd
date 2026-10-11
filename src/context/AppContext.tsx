import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
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
  AttendanceStatus,
  ClassSource,
  DayClassSummary,
  OverallAttendanceStats,
  SubjectAttendanceStats,
  FullExportData,
  ClassTimingSettings,
  PeriodTiming,
  BreakTiming,
  DaySpecificTiming,
  ScheduleTimelineStatus,
  DayOfWeek,
  Task,
  ClassSetupTemplate,
  TemplateIncludeOptions,
  TemplateApplyOptions,
} from '../types';
import * as db from '../db';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  formatDate,
  getClassesForDate,
  calculateAttendanceMetrics,
  type EngineContext,
} from '../services/attendanceEngine';
import { resolveDayTiming, getScheduleTimeline } from '../services/timingEngine';
import {
  scheduleAllNotifications,
  scheduleTaskReminder,
  cancelTaskNotification,
} from '../services/notificationService';
import {
  syncWidgetState,
  fetchPendingWidgetActions,
  clearPendingWidgetActions,
} from '../services/nativeBridge';

interface AppContextType {
  semesterSettings: SemesterSettings | null;
  engineContext: EngineContext;
  subjects: Subject[];
  timetable: TimetablePeriod[];
  saturdayRules: SaturdayRule[];
  dateSpecificSaturdayRules: DateSpecificSaturdayRule[];
  dateOverrides: DateOverride[];
  holidays: Holiday[];
  academicEvents: AcademicEvent[];
  extraClasses: ExtraClass[];
  substitutions: Substitution[];
  attendanceRecords: AttendanceRecord[];
  classTimingSettings: ClassTimingSettings | null;
  tasks: Task[];
  isLoading: boolean;
  activeTab: 'home' | 'timetable' | 'attendance' | 'calendar' | 'settings' | 'tasks';
  setActiveTab: (tab: 'home' | 'timetable' | 'attendance' | 'calendar' | 'settings' | 'tasks') => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  lastBackupDate: string | null;
  overallStats: OverallAttendanceStats;
  subjectStats: SubjectAttendanceStats[];
  todaySummary: DayClassSummary;
  todayTimeline: ScheduleTimelineStatus;
  getSummaryForDate: (dateStr: string) => DayClassSummary;
  getTimelineForDate: (dateStr: string, currentTimeStr?: string) => ScheduleTimelineStatus;
  saveClassTimingSettings: (settings: ClassTimingSettings) => Promise<void>;
  savePeriodTiming: (period: PeriodTiming, dayOfWeek?: number) => Promise<void>;
  deletePeriodTiming: (periodNumber: number, dayOfWeek?: number) => Promise<void>;
  saveBreakTiming: (breakItem: BreakTiming, dayOfWeek?: number) => Promise<void>;
  deleteBreakTiming: (breakId: string, dayOfWeek?: number) => Promise<void>;
  saveDaySpecificTiming: (dayTiming: DaySpecificTiming) => Promise<void>;
  deleteDaySpecificTiming: (dayOfWeek: number) => Promise<void>;
  saveTask: (task: Task) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  toggleTaskComplete: (taskId: string) => Promise<void>;
  updateSemesterSettings: (settings: SemesterSettings) => Promise<void>;
  saveSubject: (subject: Subject) => Promise<void>;
  deleteSubject: (subjectId: string) => Promise<void>;
  saveTimetablePeriod: (period: TimetablePeriod) => Promise<void>;
  deleteTimetablePeriod: (periodId: string) => Promise<void>;
  setDayTimetable: (day: number, periods: TimetablePeriod[]) => Promise<void>;
  saveSaturdayRule: (rule: SaturdayRule) => Promise<void>;
  saveDateSpecificSaturdayRule: (rule: DateSpecificSaturdayRule) => Promise<void>;
  deleteDateSpecificSaturdayRule: (ruleId: string) => Promise<void>;
  saveDateOverride: (override: DateOverride) => Promise<void>;
  deleteDateOverride: (id: string) => Promise<void>;
  saveHoliday: (holiday: Holiday) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  saveAcademicEvent: (event: AcademicEvent) => Promise<void>;
  deleteAcademicEvent: (id: string) => Promise<void>;
  saveExtraClass: (extra: ExtraClass) => Promise<void>;
  deleteExtraClass: (id: string) => Promise<void>;
  saveSubstitution: (sub: Substitution) => Promise<void>;
  deleteSubstitution: (id: string) => Promise<void>;
  recordAttendance: (
    date: string,
    periodNumber: number,
    subjectId: string,
    status: AttendanceStatus,
    source?: ClassSource,
    sourceRefId?: string,
    note?: string,
    customRecordId?: string
  ) => Promise<void>;
  deleteAttendanceRecord: (recordId: string) => Promise<void>;
  confirmDayAttendance: (dateStr: string) => Promise<void>;
  resetSemester: (options: {
    newSemesterName: string;
    newStartDate: string;
    newEndDate: string | null;
    keepSubjectsAndTimetable: boolean;
  }) => Promise<void>;
  loadSampleSetup: () => Promise<void>;
  exportJSON: () => Promise<void>;
  importJSON: (data: FullExportData) => Promise<void>;
  exportClassTemplate: (
    includeOptions: TemplateIncludeOptions,
    templateName: string,
    description?: string
  ) => Promise<ClassSetupTemplate>;
  shareClassTemplate: (template: ClassSetupTemplate) => Promise<void>;
  applyClassTemplate: (
    template: ClassSetupTemplate,
    applyOptions: TemplateApplyOptions
  ) => Promise<void>;
  exportCSV: () => Promise<void>;
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [semesterSettings, setSemesterSettings] = useState<SemesterSettings | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [timetable, setTimetable] = useState<TimetablePeriod[]>([]);
  const [saturdayRules, setSaturdayRules] = useState<SaturdayRule[]>([]);
  const [dateSpecificSaturdayRules, setDateSpecificSaturdayRules] = useState<DateSpecificSaturdayRule[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [academicEvents, setAcademicEvents] = useState<AcademicEvent[]>([]);
  const [extraClasses, setExtraClasses] = useState<ExtraClass[]>([]);
  const [substitutions, setSubstitutions] = useState<Substitution[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [classTimingSettings, setClassTimingSettings] = useState<ClassTimingSettings | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<'home' | 'timetable' | 'attendance' | 'calendar' | 'settings' | 'tasks'>('home');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDate(new Date()));
  const [theme, setThemeState] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('attnd_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'dark'; // Default sleek dark
  });

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(() => {
    return localStorage.getItem('attnd_last_backup');
  });

  const pendingRecordLock = useRef<Set<string>>(new Set());

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('attnd_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Load initial data
  const refreshData = useCallback(async () => {
    try {
      const [
        settings,
        subList,
        ttList,
        satRules,
        dateSpecificSatRules,
        overrides,
        hols,
        events,
        extras,
        subs,
        records,
        timings,
        taskList,
      ] = await Promise.all([
        db.getSemesterSettings(),
        db.getSubjects(),
        db.getTimetable(),
        db.getSaturdayRules(),
        db.getDateSpecificSaturdayRules(),
        db.getDateOverrides(),
        db.getHolidays(),
        db.getAcademicEvents(),
        db.getExtraClasses(),
        db.getSubstitutions(),
        db.getAttendanceRecords(),
        db.getClassTimingSettings(),
        db.getAllTasks(),
      ]);

      if (!settings) {
        // First-time default settings: today until 4 months later
        const today = new Date();
        const fourMonthsLater = new Date();
        fourMonthsLater.setMonth(today.getMonth() + 4);

        const initialSettings: SemesterSettings = {
          id: 'current',
          semesterName: '1st Semester',
          startDate: formatDate(today),
          endDate: formatDate(fourMonthsLater),
          defaultTarget: 85,
          treatLabAsSingleUnit: false,
          includeSundayInTimetable: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await db.saveSemesterSettings(initialSettings);
        setSemesterSettings(initialSettings);
      } else {
        setSemesterSettings(settings);
      }

      setSubjects(subList);
      setTimetable(ttList);
      setSaturdayRules(satRules);
      setDateSpecificSaturdayRules(dateSpecificSatRules);
      setDateOverrides(overrides);
      setHolidays(hols);
      setAcademicEvents(events);
      setExtraClasses(extras);
      setSubstitutions(subs);
      setAttendanceRecords(records);
      setClassTimingSettings(timings || db.DEFAULT_CLASS_TIMINGS);
      setTasks(taskList || []);
    } catch (err) {
      console.error('Failed to load database:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Build current engine context
  const engineContext: EngineContext = useMemo(() => {
    const defaultSettings: SemesterSettings = semesterSettings || {
      id: 'current',
      semesterName: 'Current Semester',
      startDate: formatDate(new Date()),
      endDate: null,
      defaultTarget: 85,
      treatLabAsSingleUnit: false,
      includeSundayInTimetable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return {
      semesterSettings: defaultSettings,
      subjects,
      timetable,
      saturdayRules,
      dateSpecificSaturdayRules,
      dateOverrides,
      holidays,
      academicEvents,
      extraClasses,
      substitutions,
      attendanceRecords,
      classTimingSettings: classTimingSettings || undefined,
    };
  }, [
    semesterSettings,
    subjects,
    timetable,
    saturdayRules,
    dateSpecificSaturdayRules,
    dateOverrides,
    holidays,
    academicEvents,
    extraClasses,
    substitutions,
    attendanceRecords,
    classTimingSettings,
  ]);

  // Attendance metrics
  const targetPct = semesterSettings?.defaultTarget || 85;
  const { subjectStats, overall } = useMemo(() => {
    return calculateAttendanceMetrics(
      subjects,
      attendanceRecords,
      targetPct,
      semesterSettings?.treatLabAsSingleUnit || false
    );
  }, [subjects, attendanceRecords, targetPct, semesterSettings?.treatLabAsSingleUnit]);

  // Helper to query any date
  const getSummaryForDate = useCallback(
    (dateStr: string): DayClassSummary => {
      return getClassesForDate(dateStr, engineContext);
    },
    [engineContext]
  );

  // Today's summary
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const todaySummary = useMemo(() => {
    return getClassesForDate(todayStr, engineContext);
  }, [todayStr, engineContext]);

  // Timeline helper for date and current time
  const getTimelineForDate = useCallback(
    (dateStr: string, currentTimeStr?: string): ScheduleTimelineStatus => {
      const summary = getClassesForDate(dateStr, engineContext);
      const dayTiming = resolveDayTiming(dateStr, classTimingSettings);
      return getScheduleTimeline(dateStr, currentTimeStr, summary.classes, dayTiming, summary.isWorkingDay);
    },
    [engineContext, classTimingSettings]
  );

  const todayTimeline = useMemo(() => {
    return getTimelineForDate(todayStr);
  }, [getTimelineForDate, todayStr]);

  // Action: Update Semester Settings
  const updateSemesterSettings = useCallback(async (newSettings: SemesterSettings) => {
    await db.saveSemesterSettings(newSettings);
    setSemesterSettings(newSettings);
  }, []);

  // Action: Subjects
  const saveSubject = useCallback(async (sub: Subject) => {
    await db.saveSubject(sub);
    setSubjects(prev => {
      const idx = prev.findIndex(s => s.id === sub.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = sub;
        return copy.sort((a, b) => a.order - b.order);
      }
      return [...prev, sub].sort((a, b) => a.order - b.order);
    });
  }, []);

  const deleteSubject = useCallback(async (subjectId: string) => {
    await db.deleteSubject(subjectId);
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
    setTimetable(prev => prev.filter(p => p.subjectId !== subjectId));
  }, []);

  // Action: Timetable
  const saveTimetablePeriod = useCallback(async (period: TimetablePeriod) => {
    await db.saveTimetablePeriod(period);
    setTimetable(prev => {
      const filtered = prev.filter(p => p.id !== period.id);
      return [...filtered, period].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber);
    });
  }, []);

  const deleteTimetablePeriod = useCallback(async (periodId: string) => {
    await db.deleteTimetablePeriod(periodId);
    setTimetable(prev => prev.filter(p => p.id !== periodId));
  }, []);

  const setDayTimetable = useCallback(async (day: number, periods: TimetablePeriod[]) => {
    await db.setDayTimetable(day, periods);
    setTimetable(prev => {
      const otherDays = prev.filter(p => p.dayOfWeek !== day);
      return [...otherDays, ...periods].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.periodNumber - b.periodNumber);
    });
  }, []);

  // Action: Saturday Rules
  const saveSaturdayRule = useCallback(async (rule: SaturdayRule) => {
    await db.saveSaturdayRule(rule);
    setSaturdayRules(prev => {
      const copy = prev.filter(r => r.occurrence !== rule.occurrence);
      return [...copy, rule].sort((a, b) => a.occurrence - b.occurrence);
    });
  }, []);

  // Action: Date-Specific Saturday Rules
  const saveDateSpecificSaturdayRule = useCallback(async (rule: DateSpecificSaturdayRule) => {
    await db.saveDateSpecificSaturdayRule(rule);
    setDateSpecificSaturdayRules(prev => {
      const copy = prev.filter(r => r.id !== rule.id);
      return [...copy, rule].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, []);

  const deleteDateSpecificSaturdayRule = useCallback(async (id: string) => {
    await db.deleteDateSpecificSaturdayRule(id);
    setDateSpecificSaturdayRules(prev => prev.filter(r => r.id !== id));
  }, []);

  // Action: Date Overrides
  const saveDateOverride = useCallback(async (override: DateOverride) => {
    await db.saveDateOverride(override);
    setDateOverrides(prev => {
      const copy = prev.filter(o => o.id !== override.id);
      return [...copy, override];
    });
  }, []);

  const deleteDateOverride = useCallback(async (id: string) => {
    await db.deleteDateOverride(id);
    setDateOverrides(prev => prev.filter(o => o.id !== id));
  }, []);

  // Action: Holidays
  const saveHoliday = useCallback(async (holiday: Holiday) => {
    await db.saveHoliday(holiday);
    setHolidays(prev => {
      const copy = prev.filter(h => h.id !== holiday.id);
      return [...copy, holiday].sort((a, b) => a.startDate.localeCompare(b.startDate));
    });
  }, []);

  const deleteHoliday = useCallback(async (id: string) => {
    await db.deleteHoliday(id);
    setHolidays(prev => prev.filter(h => h.id !== id));
  }, []);

  // Action: Academic Events
  const saveAcademicEvent = useCallback(async (event: AcademicEvent) => {
    await db.saveAcademicEvent(event);
    setAcademicEvents(prev => {
      const copy = prev.filter(e => e.id !== event.id);
      return [...copy, event].sort((a, b) => a.startDate.localeCompare(b.startDate));
    });
  }, []);

  const deleteAcademicEvent = useCallback(async (id: string) => {
    await db.deleteAcademicEvent(id);
    setAcademicEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  // Action: Extra Classes
  const saveExtraClass = useCallback(async (extra: ExtraClass) => {
    await db.saveExtraClass(extra);
    setExtraClasses(prev => {
      const copy = prev.filter(e => e.id !== extra.id);
      return [...copy, extra];
    });
  }, []);

  const deleteExtraClass = useCallback(async (id: string) => {
    await db.deleteExtraClass(id);
    setExtraClasses(prev => prev.filter(e => e.id !== id));
  }, []);

  // Action: Substitutions
  const saveSubstitution = useCallback(async (sub: Substitution) => {
    await db.saveSubstitution(sub);
    setSubstitutions(prev => {
      const copy = prev.filter(s => s.id !== sub.id);
      return [...copy, sub];
    });
  }, []);

  const deleteSubstitution = useCallback(async (id: string) => {
    await db.deleteSubstitution(id);
    setSubstitutions(prev => prev.filter(s => s.id !== id));
  }, []);

  // Action: Class Timings & Breaks
  const saveClassTimingSettings = useCallback(async (settings: ClassTimingSettings) => {
    await db.saveClassTimingSettings(settings);
    setClassTimingSettings(settings);
  }, []);

  const savePeriodTiming = useCallback(async (period: PeriodTiming, dayOfWeek?: number) => {
    const current = classTimingSettings || db.DEFAULT_CLASS_TIMINGS;
    if (dayOfWeek !== undefined) {
      const daySpecifics = [...(current.daySpecificTimings || [])];
      const idx = daySpecifics.findIndex(d => d.dayOfWeek === dayOfWeek);
      if (idx >= 0) {
        const existing = daySpecifics[idx];
        const periods = existing.periods.filter(p => p.periodNumber !== period.periodNumber);
        periods.push(period);
        periods.sort((a, b) => a.periodNumber - b.periodNumber);
        daySpecifics[idx] = { ...existing, periods };
      } else {
        daySpecifics.push({
          dayOfWeek: dayOfWeek as DayOfWeek,
          periods: [period],
          breaks: [],
        });
      }
      const updated: ClassTimingSettings = { ...current, daySpecificTimings: daySpecifics };
      await saveClassTimingSettings(updated);
    } else {
      const periods = current.defaultTiming.periods.filter(p => p.periodNumber !== period.periodNumber);
      periods.push(period);
      periods.sort((a, b) => a.periodNumber - b.periodNumber);
      const updated: ClassTimingSettings = {
        ...current,
        defaultTiming: { ...current.defaultTiming, periods },
      };
      await saveClassTimingSettings(updated);
    }
  }, [classTimingSettings, saveClassTimingSettings]);

  const deletePeriodTiming = useCallback(async (periodNumber: number, dayOfWeek?: number) => {
    const current = classTimingSettings || db.DEFAULT_CLASS_TIMINGS;
    if (dayOfWeek !== undefined) {
      const daySpecifics = [...(current.daySpecificTimings || [])];
      const idx = daySpecifics.findIndex(d => d.dayOfWeek === dayOfWeek);
      if (idx >= 0) {
        const existing = daySpecifics[idx];
        const periods = existing.periods.filter(p => p.periodNumber !== periodNumber);
        daySpecifics[idx] = { ...existing, periods };
        const updated: ClassTimingSettings = { ...current, daySpecificTimings: daySpecifics };
        await saveClassTimingSettings(updated);
      }
    } else {
      const periods = current.defaultTiming.periods.filter(p => p.periodNumber !== periodNumber);
      const updated: ClassTimingSettings = {
        ...current,
        defaultTiming: { ...current.defaultTiming, periods },
      };
      await saveClassTimingSettings(updated);
    }
  }, [classTimingSettings, saveClassTimingSettings]);

  const saveBreakTiming = useCallback(async (breakItem: BreakTiming, dayOfWeek?: number) => {
    const current = classTimingSettings || db.DEFAULT_CLASS_TIMINGS;
    if (dayOfWeek !== undefined) {
      const daySpecifics = [...(current.daySpecificTimings || [])];
      const idx = daySpecifics.findIndex(d => d.dayOfWeek === dayOfWeek);
      if (idx >= 0) {
        const existing = daySpecifics[idx];
        const breaks = existing.breaks.filter(b => b.id !== breakItem.id);
        breaks.push(breakItem);
        daySpecifics[idx] = { ...existing, breaks };
      } else {
        daySpecifics.push({
          dayOfWeek: dayOfWeek as DayOfWeek,
          periods: [],
          breaks: [breakItem],
        });
      }
      const updated: ClassTimingSettings = { ...current, daySpecificTimings: daySpecifics };
      await saveClassTimingSettings(updated);
    } else {
      const breaks = current.defaultTiming.breaks.filter(b => b.id !== breakItem.id);
      breaks.push(breakItem);
      const updated: ClassTimingSettings = {
        ...current,
        defaultTiming: { ...current.defaultTiming, breaks },
      };
      await saveClassTimingSettings(updated);
    }
  }, [classTimingSettings, saveClassTimingSettings]);

  const deleteBreakTiming = useCallback(async (breakId: string, dayOfWeek?: number) => {
    const current = classTimingSettings || db.DEFAULT_CLASS_TIMINGS;
    if (dayOfWeek !== undefined) {
      const daySpecifics = [...(current.daySpecificTimings || [])];
      const idx = daySpecifics.findIndex(d => d.dayOfWeek === dayOfWeek);
      if (idx >= 0) {
        const existing = daySpecifics[idx];
        const breaks = existing.breaks.filter(b => b.id !== breakId);
        daySpecifics[idx] = { ...existing, breaks };
        const updated: ClassTimingSettings = { ...current, daySpecificTimings: daySpecifics };
        await saveClassTimingSettings(updated);
      }
    } else {
      const breaks = current.defaultTiming.breaks.filter(b => b.id !== breakId);
      const updated: ClassTimingSettings = {
        ...current,
        defaultTiming: { ...current.defaultTiming, breaks },
      };
      await saveClassTimingSettings(updated);
    }
  }, [classTimingSettings, saveClassTimingSettings]);

  const saveDaySpecificTiming = useCallback(async (dayTiming: DaySpecificTiming) => {
    const current = classTimingSettings || db.DEFAULT_CLASS_TIMINGS;
    const daySpecifics = [...(current.daySpecificTimings || [])].filter(d => d.dayOfWeek !== dayTiming.dayOfWeek);
    daySpecifics.push(dayTiming);
    const updated: ClassTimingSettings = { ...current, daySpecificTimings: daySpecifics };
    await saveClassTimingSettings(updated);
  }, [classTimingSettings, saveClassTimingSettings]);

  const deleteDaySpecificTiming = useCallback(async (dayOfWeek: number) => {
    const current = classTimingSettings || db.DEFAULT_CLASS_TIMINGS;
    const daySpecifics = (current.daySpecificTimings || []).filter(d => d.dayOfWeek !== dayOfWeek);
    const updated: ClassTimingSettings = { ...current, daySpecificTimings: daySpecifics };
    await saveClassTimingSettings(updated);
  }, [classTimingSettings, saveClassTimingSettings]);

  // Action: Tasks
  const saveTask = useCallback(async (task: Task) => {
    await db.saveTask(task);
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = task;
        return copy;
      }
      return [...prev, task];
    });

    const subject = subjects.find(s => s.id === task.subjectId);
    await scheduleTaskReminder(task, subject?.name);
  }, [subjects]);

  const deleteTask = useCallback(async (taskId: string) => {
    await db.deleteTask(taskId);
    await cancelTaskNotification(taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
  }, []);

  const toggleTaskComplete = useCallback(async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const nowCompleted = !task.completed;
    const updated: Task = {
      ...task,
      completed: nowCompleted,
      completedAt: nowCompleted ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };
    await db.saveTask(updated);
    if (nowCompleted) {
      await cancelTaskNotification(taskId);
    } else {
      const subject = subjects.find(s => s.id === task.subjectId);
      await scheduleTaskReminder(updated, subject?.name);
    }
    setTasks(prev => prev.map(t => (t.id === taskId ? updated : t)));
  }, [tasks, subjects]);

  // Action: Record Attendance (with Duplicate Protection, Unit SlotKey support, and double-tap prevention)
  const recordAttendance = useCallback(async (
    date: string,
    periodNumber: number,
    subjectId: string,
    status: AttendanceStatus,
    source: ClassSource = 'regular',
    sourceRefId?: string,
    note?: string,
    customRecordId?: string
  ) => {
    const recordId = customRecordId || (
      source === 'extra' && sourceRefId
        ? `${date}_extra_${sourceRefId}`
        : `${date}_p${periodNumber}_${subjectId}`
    );

    if (pendingRecordLock.current.has(recordId)) {
      return;
    }
    pendingRecordLock.current.add(recordId);

    try {
      const newRecord: AttendanceRecord = {
        id: recordId,
        date,
        periodNumber,
        subjectId,
        status,
        source,
        sourceRefId,
        note,
        updatedAt: new Date().toISOString(),
      };

      await db.saveAttendanceRecord(newRecord);
      setAttendanceRecords(prev => {
        const copy = prev.filter(r => r.id !== recordId);
        return [...copy, newRecord];
      });
    } catch (err) {
      console.error('Failed to record attendance:', err);
      alert("Couldn't save your attendance. Please try again.");
    } finally {
      setTimeout(() => {
        pendingRecordLock.current.delete(recordId);
      }, 250);
    }
  }, []);

  const deleteAttendanceRecord = useCallback(async (recordId: string) => {
    await db.deleteAttendanceRecord(recordId);
    setAttendanceRecords(prev => prev.filter(r => r.id !== recordId));
  }, []);

  // Confirm day
  const confirmDayAttendance = useCallback(async (dateStr: string) => {
    const summary = getClassesForDate(dateStr, engineContext);
    const updates: AttendanceRecord[] = [];
    for (const c of summary.classes) {
      if (c.status !== 'unmarked') {
        const recId = c.attendanceRecordId || c.slotKey;
        updates.push({
          id: recId,
          date: dateStr,
          periodNumber: c.periodNumber,
          subjectId: c.subject.id,
          status: c.status,
          source: c.source,
          sourceRefId: c.sourceRefId,
          note: c.note,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    if (updates.length > 0) {
      await db.saveBatchAttendanceRecords(updates);
      await refreshData();
    }
  }, [engineContext, refreshData]);

  // Reconcile actions taken on native Android widget
  const reconcilePendingWidgetActions = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const pending = await fetchPendingWidgetActions();
      if (pending && pending.length > 0) {
        for (const act of pending) {
          if (act.status === 'unmarked') {
            if (act.slotKey) {
              await db.deleteAttendanceRecord(act.slotKey);
            }
            await db.deleteAttendanceRecord(`${act.date}_p${act.periodNumber}_${act.subjectId}`);
          } else {
            const recId = act.slotKey || `${act.date}_p${act.periodNumber}_${act.subjectId}`;
            const newRecord: AttendanceRecord = {
              id: recId,
              date: act.date,
              periodNumber: act.periodNumber,
              subjectId: act.subjectId,
              status: act.status,
              source: 'regular',
              updatedAt: new Date().toISOString(),
            };
            await db.saveAttendanceRecord(newRecord);
          }
        }
        await clearPendingWidgetActions();
        await refreshData();
      }
    } catch (err) {
      console.warn('Error reconciling widget actions:', err);
    }
  }, [refreshData]);

  // Listen to app resume to reconcile widget actions
  useEffect(() => {
    reconcilePendingWidgetActions();

    if (Capacitor.isNativePlatform()) {
      const listenerPromise = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          reconcilePendingWidgetActions();
        }
      });
      return () => {
        listenerPromise.then(l => l.remove());
      };
    }
  }, [reconcilePendingWidgetActions]);

  // Sync state to home-screen widget and schedule local notifications
  useEffect(() => {
    if (isLoading) return;
    syncWidgetState(
      engineContext,
      todaySummary.date,
      todaySummary.classes,
      todaySummary.statusReason,
      todaySummary.isWorkingDay,
      overall,
      classTimingSettings
    );
    scheduleAllNotifications(engineContext, undefined, classTimingSettings);
  }, [engineContext, todaySummary, overall, isLoading, classTimingSettings]);

  // Action: Reset Semester
  const resetSemester = useCallback(async (options: {
    newSemesterName: string;
    newStartDate: string;
    newEndDate: string | null;
    keepSubjectsAndTimetable: boolean;
  }) => {
    await db.resetCurrentSemester(options);
    await refreshData();
  }, [refreshData]);

  // Sample Setup (3rd Semester realistic seed)
  const loadSampleSetup = useCallback(async () => {
    const today = new Date();
    const startDate = formatDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)); // 1 month ago
    const endDate = formatDate(new Date(today.getFullYear(), today.getMonth() + 3, 30)); // 3 months ahead

    const sampleSubs: Subject[] = [
      { id: 'sub-ds', name: 'Data Structures', shortName: 'DS', code: 'CS301', type: 'lecture', color: '#3b82f6', isActive: true, initialPresent: 18, initialAbsent: 2, order: 1, createdAt: new Date().toISOString() },
      { id: 'sub-dbms', name: 'Database Management Systems', shortName: 'DBMS', code: 'CS302', type: 'lecture', color: '#10b981', isActive: true, initialPresent: 20, initialAbsent: 3, order: 2, createdAt: new Date().toISOString() },
      { id: 'sub-os', name: 'Operating Systems', shortName: 'OS', code: 'CS303', type: 'lecture', color: '#8b5cf6', isActive: true, initialPresent: 16, initialAbsent: 4, order: 3, createdAt: new Date().toISOString() },
      { id: 'sub-math', name: 'Mathematics III', shortName: 'Math', code: 'MAT301', type: 'lecture', color: '#f59e0b', isActive: true, initialPresent: 22, initialAbsent: 1, order: 4, createdAt: new Date().toISOString() },
      { id: 'sub-dslab', name: 'Data Structures Lab', shortName: 'DS Lab', code: 'CSL301', type: 'lab', color: '#06b6d4', isActive: true, initialPresent: 8, initialAbsent: 0, order: 5, createdAt: new Date().toISOString() },
    ];

    const sampleTimetable: TimetablePeriod[] = [
      // Monday
      { id: 'tt-m1', dayOfWeek: 1, periodNumber: 1, subjectId: 'sub-math' },
      { id: 'tt-m2', dayOfWeek: 1, periodNumber: 2, subjectId: 'sub-dbms' },
      { id: 'tt-m3', dayOfWeek: 1, periodNumber: 3, subjectId: 'sub-ds' },
      { id: 'tt-m4', dayOfWeek: 1, periodNumber: 4, subjectId: 'sub-dslab' },
      { id: 'tt-m5', dayOfWeek: 1, periodNumber: 5, subjectId: 'sub-dslab' },
      { id: 'tt-m6', dayOfWeek: 1, periodNumber: 6, subjectId: 'sub-os' },
      // Tuesday
      { id: 'tt-t1', dayOfWeek: 2, periodNumber: 1, subjectId: 'sub-os' },
      { id: 'tt-t2', dayOfWeek: 2, periodNumber: 2, subjectId: 'sub-math' },
      { id: 'tt-t3', dayOfWeek: 2, periodNumber: 3, subjectId: 'sub-dbms' },
      { id: 'tt-t4', dayOfWeek: 2, periodNumber: 4, subjectId: 'sub-ds' },
      // Wednesday
      { id: 'tt-w1', dayOfWeek: 3, periodNumber: 1, subjectId: 'sub-ds' },
      { id: 'tt-w2', dayOfWeek: 3, periodNumber: 2, subjectId: 'sub-os' },
      { id: 'tt-w3', dayOfWeek: 3, periodNumber: 3, subjectId: 'sub-math' },
      { id: 'tt-w4', dayOfWeek: 3, periodNumber: 4, subjectId: 'sub-dbms' },
      // Thursday
      { id: 'tt-th1', dayOfWeek: 4, periodNumber: 1, subjectId: 'sub-dbms' },
      { id: 'tt-th2', dayOfWeek: 4, periodNumber: 2, subjectId: 'sub-ds' },
      { id: 'tt-th3', dayOfWeek: 4, periodNumber: 3, subjectId: 'sub-math' },
      { id: 'tt-th4', dayOfWeek: 4, periodNumber: 4, subjectId: 'sub-os' },
      // Friday
      { id: 'tt-f1', dayOfWeek: 5, periodNumber: 1, subjectId: 'sub-math' },
      { id: 'tt-f2', dayOfWeek: 5, periodNumber: 2, subjectId: 'sub-dbms' },
      { id: 'tt-f3', dayOfWeek: 5, periodNumber: 3, subjectId: 'sub-os' },
      { id: 'tt-f4', dayOfWeek: 5, periodNumber: 4, subjectId: 'sub-ds' },
    ];

    const sampleSatRules: SaturdayRule[] = [
      { occurrence: 1, status: 'holiday', followsDay: 6 },
      { occurrence: 2, status: 'holiday', followsDay: 6 },
      { occurrence: 3, status: 'working', followsDay: 6 },
      { occurrence: 4, status: 'working', followsDay: 6 },
      { occurrence: 5, status: 'holiday', followsDay: 6 },
    ];

    const sampleSettings: SemesterSettings = {
      id: 'current',
      semesterName: '3rd Semester',
      startDate,
      endDate,
      defaultTarget: 85,
      treatLabAsSingleUnit: false,
      includeSundayInTimetable: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const database = await db.getDB();
    const tx = database.transaction(
      ['semesterSettings', 'subjects', 'timetable', 'saturdayRules', 'holidays', 'academicEvents', 'attendanceRecords'],
      'readwrite'
    );
    await tx.objectStore('semesterSettings').put(sampleSettings);
    await tx.objectStore('subjects').clear();
    for (const s of sampleSubs) await tx.objectStore('subjects').put(s);
    await tx.objectStore('timetable').clear();
    for (const t of sampleTimetable) await tx.objectStore('timetable').put(t);
    await tx.objectStore('saturdayRules').clear();
    for (const r of sampleSatRules) await tx.objectStore('saturdayRules').put(r);
    await tx.objectStore('holidays').clear();
    await tx.objectStore('academicEvents').clear();
    await tx.objectStore('attendanceRecords').clear();
    await tx.done;

    await refreshData();
  }, [refreshData]);

  // Export JSON
  const exportJSON = useCallback(async () => {
    try {
      const data = await db.exportAllData();
      const fileName = `attnd-backup-${formatDate(new Date())}.json`;
      const jsonContent = JSON.stringify(data, null, 2);

      // Record last backup date in localStorage & state
      const nowIso = new Date().toISOString();
      localStorage.setItem('attnd_last_backup', nowIso);
      setLastBackupDate(nowIso);

      if (Capacitor.isNativePlatform()) {
        try {
          const writeRes = await Filesystem.writeFile({
            path: fileName,
            data: jsonContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });

          await Share.share({
            title: 'Attnd Attendance Backup',
            text: `Attnd Attendance Backup (${fileName})`,
            url: writeRes.uri,
            dialogTitle: 'Save / Share Attendance Backup',
          });
          return;
        } catch (nativeErr: any) {
          console.warn('Native Filesystem/Share error, attempting clipboard/browser fallback:', nativeErr);
        }
      }

      // Browser fallback
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to export JSON backup:', err);
      alert('Backup export failed: ' + (err?.message || err));
    }
  }, []);

  // Import JSON
  const importJSON = useCallback(async (data: FullExportData) => {
    if ((data as any)?.isTemplate) {
      throw new Error('This file is a Class Setup Template, not a full backup. Please use "Import Class Template" to apply it safely without losing attendance.');
    }
    await db.importAllData(data);
    await refreshData();
  }, [refreshData]);

  // Class Setup Template Export & Share
  const exportClassTemplate = useCallback(async (
    includeOptions: TemplateIncludeOptions,
    templateName: string,
    description?: string
  ): Promise<ClassSetupTemplate> => {
    return await db.exportClassTemplate(includeOptions, templateName, description);
  }, []);

  const shareClassTemplate = useCallback(async (template: ClassSetupTemplate) => {
    try {
      const sanitizedName = (template.templateName || 'class_setup')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
      const fileName = `attnd-template-${sanitizedName}.json`;
      const jsonContent = JSON.stringify(template, null, 2);

      if (Capacitor.isNativePlatform()) {
        try {
          const writeRes = await Filesystem.writeFile({
            path: fileName,
            data: jsonContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });

          await Share.share({
            title: template.templateName,
            text: `Attnd Class Setup Template: ${template.templateName}`,
            url: writeRes.uri,
            dialogTitle: 'Share Class Template',
          });
          return;
        } catch (nativeErr: any) {
          console.warn('Native Share failed, attempting browser fallback:', nativeErr);
        }
      }

      // Browser fallback
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to share template:', err);
      alert('Failed to share template: ' + (err?.message || err));
    }
  }, []);

  const applyClassTemplate = useCallback(async (
    template: ClassSetupTemplate,
    applyOptions: TemplateApplyOptions
  ) => {
    await db.applyClassTemplate(template, applyOptions);
    await refreshData();
  }, [refreshData]);

  // Export CSV
  const exportCSV = useCallback(async () => {
    try {
      const subMap = new Map<string, string>(subjects.map(s => [s.id, s.name]));
      const headers = ['Date', 'Period', 'Subject', 'Status', 'Type', 'Note'];
      const rows = attendanceRecords.map(r => [
        r.date,
        r.periodNumber.toString(),
        `"${subMap.get(r.subjectId) || r.subjectId}"`,
        r.status,
        r.source,
        `"${r.note || ''}"`,
      ]);

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const fileName = `attnd_records_${formatDate(new Date())}.csv`;

      if (Capacitor.isNativePlatform()) {
        try {
          const writeRes = await Filesystem.writeFile({
            path: fileName,
            data: csvContent,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
          });

          await Share.share({
            title: 'Attnd Attendance Records CSV',
            text: `Attnd Attendance Records CSV (${fileName})`,
            url: writeRes.uri,
            dialogTitle: 'Save / Share Attendance CSV',
          });
          return;
        } catch (nativeErr: any) {
          console.warn('Native Filesystem/Share error, attempting browser fallback:', nativeErr);
        }
      }

      // Browser fallback
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.setAttribute('download', fileName);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) {
          document.body.removeChild(link);
        }
        URL.revokeObjectURL(url);
      }, 3000);
    } catch (err: any) {
      console.error('Failed to export CSV:', err);
      alert('CSV export failed: ' + (err?.message || err));
    }
  }, [subjects, attendanceRecords]);

  const contextValue = useMemo(() => ({
    semesterSettings,
    engineContext,
    subjects,
    timetable,
    saturdayRules,
    dateSpecificSaturdayRules,
    dateOverrides,
    holidays,
    academicEvents,
    extraClasses,
    substitutions,
    attendanceRecords,
    classTimingSettings,
    isLoading,
    lastBackupDate,
    theme,
    activeTab,
    selectedDate,
    overallStats: overall,
    subjectStats,
    todaySummary,
    todayTimeline,
    getSummaryForDate,
    getTimelineForDate,
    saveClassTimingSettings,
    savePeriodTiming,
    deletePeriodTiming,
    saveBreakTiming,
    deleteBreakTiming,
    saveDaySpecificTiming,
    deleteDaySpecificTiming,
    tasks,
    saveTask,
    deleteTask,
    toggleTaskComplete,
    setActiveTab,
    setTheme,
    toggleTheme,
    setSelectedDate,
    updateSemesterSettings,
    saveSubject,
    deleteSubject,
    saveTimetablePeriod,
    deleteTimetablePeriod,
    setDayTimetable,
    saveSaturdayRule,
    saveDateSpecificSaturdayRule,
    deleteDateSpecificSaturdayRule,
    saveDateOverride,
    deleteDateOverride,
    saveHoliday,
    deleteHoliday,
    saveAcademicEvent,
    deleteAcademicEvent,
    saveExtraClass,
    deleteExtraClass,
    saveSubstitution,
    deleteSubstitution,
    recordAttendance,
    deleteAttendanceRecord,
    confirmDayAttendance,
    resetSemester,
    loadSampleSetup,
    exportJSON,
    importJSON,
    exportClassTemplate,
    shareClassTemplate,
    applyClassTemplate,
    exportCSV,
    refreshData,
  }), [
    semesterSettings,
    engineContext,
    subjects,
    timetable,
    saturdayRules,
    dateSpecificSaturdayRules,
    dateOverrides,
    holidays,
    academicEvents,
    extraClasses,
    substitutions,
    attendanceRecords,
    classTimingSettings,
    tasks,
    saveTask,
    deleteTask,
    toggleTaskComplete,
    isLoading,
    lastBackupDate,
    theme,
    activeTab,
    selectedDate,
    overall,
    subjectStats,
    todaySummary,
    todayTimeline,
    getSummaryForDate,
    getTimelineForDate,
    saveClassTimingSettings,
    savePeriodTiming,
    deletePeriodTiming,
    saveBreakTiming,
    deleteBreakTiming,
    saveDaySpecificTiming,
    deleteDaySpecificTiming,
    setActiveTab,
    setTheme,
    toggleTheme,
    setSelectedDate,
    updateSemesterSettings,
    saveSubject,
    deleteSubject,
    saveTimetablePeriod,
    deleteTimetablePeriod,
    setDayTimetable,
    saveSaturdayRule,
    saveDateSpecificSaturdayRule,
    deleteDateSpecificSaturdayRule,
    saveDateOverride,
    deleteDateOverride,
    saveHoliday,
    deleteHoliday,
    saveAcademicEvent,
    deleteAcademicEvent,
    saveExtraClass,
    deleteExtraClass,
    saveSubstitution,
    deleteSubstitution,
    recordAttendance,
    deleteAttendanceRecord,
    confirmDayAttendance,
    resetSemester,
    loadSampleSetup,
    exportJSON,
    importJSON,
    exportClassTemplate,
    shareClassTemplate,
    applyClassTemplate,
    exportCSV,
    refreshData,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
