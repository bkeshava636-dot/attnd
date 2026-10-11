import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
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
  FullExportData,
  ClassTimingSettings,
  Task,
  ClassSetupTemplate,
  TemplateIncludeOptions,
  TemplateApplyOptions,
} from '../types';

interface AttndDBSchema extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-dueDate': string; 'by-subject': string; 'by-completed': string };
  };
  classTimings: {
    key: string;
    value: ClassTimingSettings & { id: string };
  };
  semesterSettings: {
    key: string;
    value: SemesterSettings;
  };
  subjects: {
    key: string;
    value: Subject;
    indexes: { 'by-order': number };
  };
  timetable: {
    key: string;
    value: TimetablePeriod;
    indexes: { 'by-day': number };
  };
  saturdayRules: {
    key: number;
    value: SaturdayRule;
  };
  dateSpecificSaturdayRules: {
    key: string;
    value: DateSpecificSaturdayRule;
    indexes: { 'by-date': string };
  };
  dateOverrides: {
    key: string;
    value: DateOverride;
    indexes: { 'by-date': string };
  };
  holidays: {
    key: string;
    value: Holiday;
  };
  academicEvents: {
    key: string;
    value: AcademicEvent;
  };
  extraClasses: {
    key: string;
    value: ExtraClass;
    indexes: { 'by-date': string };
  };
  substitutions: {
    key: string;
    value: Substitution;
    indexes: { 'by-date': string };
  };
  attendanceRecords: {
    key: string;
    value: AttendanceRecord;
    indexes: { 'by-date': string; 'by-subject': string };
  };
}

const DB_NAME = 'attnd-db';
const DB_VERSION = 4;

let dbPromise: Promise<IDBPDatabase<AttndDBSchema>> | null = null;

export function getDB(): Promise<IDBPDatabase<AttndDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AttndDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-dueDate', 'dueDate');
          taskStore.createIndex('by-subject', 'subjectId');
          taskStore.createIndex('by-completed', 'completed');
        }
        if (!db.objectStoreNames.contains('classTimings')) {
          db.createObjectStore('classTimings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('semesterSettings')) {
          db.createObjectStore('semesterSettings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('subjects')) {
          const subStore = db.createObjectStore('subjects', { keyPath: 'id' });
          subStore.createIndex('by-order', 'order');
        }
        if (!db.objectStoreNames.contains('timetable')) {
          const ttStore = db.createObjectStore('timetable', { keyPath: 'id' });
          ttStore.createIndex('by-day', 'dayOfWeek');
        }
        if (!db.objectStoreNames.contains('saturdayRules')) {
          db.createObjectStore('saturdayRules', { keyPath: 'occurrence' });
        }
        if (!db.objectStoreNames.contains('dateSpecificSaturdayRules')) {
          const dssrStore = db.createObjectStore('dateSpecificSaturdayRules', { keyPath: 'id' });
          dssrStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('dateOverrides')) {
          const doStore = db.createObjectStore('dateOverrides', { keyPath: 'id' });
          doStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('holidays')) {
          db.createObjectStore('holidays', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('academicEvents')) {
          db.createObjectStore('academicEvents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('extraClasses')) {
          const ecStore = db.createObjectStore('extraClasses', { keyPath: 'id' });
          ecStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('substitutions')) {
          const subStore = db.createObjectStore('substitutions', { keyPath: 'id' });
          subStore.createIndex('by-date', 'date');
        }
        if (!db.objectStoreNames.contains('attendanceRecords')) {
          const arStore = db.createObjectStore('attendanceRecords', { keyPath: 'id' });
          arStore.createIndex('by-date', 'date');
          arStore.createIndex('by-subject', 'subjectId');
        }
      },
    });
  }
  return dbPromise;
}

// Default Saturday Rules generator
export function getDefaultSaturdayRules(): SaturdayRule[] {
  return [
    { occurrence: 1, status: 'holiday', followsDay: 6 },
    { occurrence: 2, status: 'holiday', followsDay: 6 },
    { occurrence: 3, status: 'working', followsDay: 6 },
    { occurrence: 4, status: 'working', followsDay: 6 },
    { occurrence: 5, status: 'holiday', followsDay: 6 },
  ];
}

// Semester Settings
export async function getSemesterSettings(): Promise<SemesterSettings | null> {
  const db = await getDB();
  const settings = await db.get('semesterSettings', 'current');
  return settings || null;
}

export async function saveSemesterSettings(settings: SemesterSettings): Promise<void> {
  const db = await getDB();
  await db.put('semesterSettings', { ...settings, id: 'current', updatedAt: new Date().toISOString() });
}

// Subjects
export async function getSubjects(): Promise<Subject[]> {
  const db = await getDB();
  const list = await db.getAll('subjects');
  return list.sort((a, b) => a.order - b.order);
}

export async function saveSubject(subject: Subject): Promise<void> {
  const db = await getDB();
  await db.put('subjects', subject);
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['subjects', 'timetable', 'attendanceRecords', 'extraClasses', 'substitutions'], 'readwrite');
  
  await tx.objectStore('subjects').delete(subjectId);
  
  // Clean up timetable periods with this subject
  const ttPeriods = await tx.objectStore('timetable').getAll();
  for (const p of ttPeriods) {
    if (p.subjectId === subjectId) {
      await tx.objectStore('timetable').delete(p.id);
    }
  }

  await tx.done;
}

// Timetable
export async function getTimetable(): Promise<TimetablePeriod[]> {
  const db = await getDB();
  const list = await db.getAll('timetable');
  return list.sort((a, b) => (a.dayOfWeek - b.dayOfWeek) || (a.periodNumber - b.periodNumber));
}

export async function saveTimetablePeriod(period: TimetablePeriod): Promise<void> {
  const db = await getDB();
  await db.put('timetable', period);
}

export async function deleteTimetablePeriod(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('timetable', id);
}

export async function setDayTimetable(dayOfWeek: number, periods: TimetablePeriod[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('timetable', 'readwrite');
  const all = await tx.store.getAll();
  for (const p of all) {
    if (p.dayOfWeek === dayOfWeek) {
      await tx.store.delete(p.id);
    }
  }
  for (const p of periods) {
    await tx.store.put(p);
  }
  await tx.done;
}

// Saturday Rules
export async function getSaturdayRules(): Promise<SaturdayRule[]> {
  const db = await getDB();
  const rules = await db.getAll('saturdayRules');
  if (!rules || rules.length === 0) {
    const defaults = getDefaultSaturdayRules();
    const tx = db.transaction('saturdayRules', 'readwrite');
    for (const r of defaults) {
      await tx.store.put(r);
    }
    await tx.done;
    return defaults;
  }
  return rules.sort((a, b) => a.occurrence - b.occurrence);
}

export async function saveSaturdayRule(rule: SaturdayRule): Promise<void> {
  const db = await getDB();
  await db.put('saturdayRules', rule);
}

// Date-Specific Working Saturday Rules (College Circulars / Special Mappings)
export async function getDateSpecificSaturdayRules(): Promise<DateSpecificSaturdayRule[]> {
  const db = await getDB();
  const rules = await db.getAll('dateSpecificSaturdayRules');
  return rules.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveDateSpecificSaturdayRule(rule: DateSpecificSaturdayRule): Promise<void> {
  const db = await getDB();
  await db.put('dateSpecificSaturdayRules', rule);
}

export async function deleteDateSpecificSaturdayRule(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('dateSpecificSaturdayRules', id);
}

// Date Overrides
export async function getDateOverrides(): Promise<DateOverride[]> {
  const db = await getDB();
  return db.getAll('dateOverrides');
}

export async function saveDateOverride(override: DateOverride): Promise<void> {
  const db = await getDB();
  await db.put('dateOverrides', override);
}

export async function deleteDateOverride(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('dateOverrides', id);
}

// Holidays
export async function getHolidays(): Promise<Holiday[]> {
  const db = await getDB();
  const list = await db.getAll('holidays');
  return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function saveHoliday(holiday: Holiday): Promise<void> {
  const db = await getDB();
  await db.put('holidays', holiday);
}

export async function deleteHoliday(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('holidays', id);
}

// Academic Events
export async function getAcademicEvents(): Promise<AcademicEvent[]> {
  const db = await getDB();
  const list = await db.getAll('academicEvents');
  return list.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function saveAcademicEvent(event: AcademicEvent): Promise<void> {
  const db = await getDB();
  await db.put('academicEvents', event);
}

export async function deleteAcademicEvent(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('academicEvents', id);
}

// Extra Classes
export async function getExtraClasses(): Promise<ExtraClass[]> {
  const db = await getDB();
  return db.getAll('extraClasses');
}

export async function saveExtraClass(extra: ExtraClass): Promise<void> {
  const db = await getDB();
  await db.put('extraClasses', extra);
}

export async function deleteExtraClass(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('extraClasses', id);
}

// Substitutions
export async function getSubstitutions(): Promise<Substitution[]> {
  const db = await getDB();
  return db.getAll('substitutions');
}

export async function saveSubstitution(sub: Substitution): Promise<void> {
  const db = await getDB();
  await db.put('substitutions', sub);
}

export async function deleteSubstitution(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('substitutions', id);
}

// Attendance Records
export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  const db = await getDB();
  return db.getAll('attendanceRecords');
}

export async function getAttendanceForDate(dateStr: string): Promise<AttendanceRecord[]> {
  const db = await getDB();
  const idx = db.transaction('attendanceRecords').store.index('by-date');
  return idx.getAll(dateStr);
}

export async function saveAttendanceRecord(record: AttendanceRecord): Promise<void> {
  const db = await getDB();
  await db.put('attendanceRecords', { ...record, updatedAt: new Date().toISOString() });
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('attendanceRecords', id);
}

export async function saveBatchAttendanceRecords(records: AttendanceRecord[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('attendanceRecords', 'readwrite');
  const now = new Date().toISOString();
  for (const r of records) {
    await tx.store.put({ ...r, updatedAt: now });
  }
  await tx.done;
}

// Reset Current Semester completely
export async function resetCurrentSemester(options: {
  newSemesterName: string;
  newStartDate: string;
  newEndDate: string | null;
  keepSubjectsAndTimetable: boolean;
}): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ['attendanceRecords', 'extraClasses', 'substitutions', 'academicEvents', 'dateOverrides', 'dateSpecificSaturdayRules', 'holidays', 'subjects', 'semesterSettings'],
    'readwrite'
  );

  // 1. Purge attendance records, extra classes, substitutions, date overrides, date-specific saturdays
  await tx.objectStore('attendanceRecords').clear();
  await tx.objectStore('extraClasses').clear();
  await tx.objectStore('substitutions').clear();
  await tx.objectStore('dateOverrides').clear();
  await tx.objectStore('dateSpecificSaturdayRules').clear();
  await tx.objectStore('academicEvents').clear();
  await tx.objectStore('holidays').clear();

  // 2. Handle subjects
  if (options.keepSubjectsAndTimetable) {
    // Reset initial attendance counts to 0
    const subjects = await tx.objectStore('subjects').getAll();
    for (const sub of subjects) {
      await tx.objectStore('subjects').put({
        ...sub,
        initialPresent: 0,
        initialAbsent: 0,
      });
    }
  } else {
    await tx.objectStore('subjects').clear();
  }

  // 3. Set new semester settings
  const now = new Date().toISOString();
  const existingSettings = await tx.objectStore('semesterSettings').get('current');
  await tx.objectStore('semesterSettings').put({
    id: 'current',
    semesterName: options.newSemesterName,
    startDate: options.newStartDate,
    endDate: options.newEndDate,
    defaultTarget: existingSettings?.defaultTarget || 85,
    treatLabAsSingleUnit: existingSettings?.treatLabAsSingleUnit || false,
    includeSundayInTimetable: existingSettings?.includeSundayInTimetable || false,
    createdAt: now,
    updatedAt: now,
  });

  await tx.done;

  if (!options.keepSubjectsAndTimetable) {
    const ttTx = db.transaction('timetable', 'readwrite');
    await ttTx.store.clear();
    await ttTx.done;
  }
}

// Class Timings & Breaks
export const DEFAULT_CLASS_TIMINGS: ClassTimingSettings = {
  defaultTiming: {
    periods: [],
    breaks: [],
  },
  daySpecificTimings: [],
  dateOverrides: [],
};

const CLASS_TIMINGS_STORAGE_KEY = 'attnd_class_timings';

export async function getClassTimingSettings(): Promise<ClassTimingSettings> {
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains('classTimings')) {
      const res = await db.get('classTimings', 'current');
      if (res) {
        return {
          defaultTiming: res.defaultTiming || { periods: [], breaks: [] },
          daySpecificTimings: res.daySpecificTimings || [],
          dateOverrides: res.dateOverrides || [],
        };
      }
    }
  } catch (err) {
    console.warn('Failed to load class timings from IndexedDB, using fallback:', err);
  }

  try {
    const raw = localStorage.getItem(CLASS_TIMINGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return DEFAULT_CLASS_TIMINGS;
}

export async function saveClassTimingSettings(settings: ClassTimingSettings): Promise<void> {
  try {
    const db = await getDB();
    if (db.objectStoreNames.contains('classTimings')) {
      await db.put('classTimings', { ...settings, id: 'current' });
    }
  } catch (err) {
    console.warn('Failed to save class timings to IndexedDB:', err);
  }

  try {
    localStorage.setItem(CLASS_TIMINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// ==========================================
// TASKS
// ==========================================

export async function getAllTasks(): Promise<Task[]> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('tasks')) return [];
  return db.getAll('tasks');
}

export async function getTaskById(id: string): Promise<Task | undefined> {
  const db = await getDB();
  if (!db.objectStoreNames.contains('tasks')) return undefined;
  return db.get('tasks', id);
}

export async function saveTask(task: Task): Promise<void> {
  const db = await getDB();
  if (db.objectStoreNames.contains('tasks')) {
    await db.put('tasks', task);
  }
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  if (db.objectStoreNames.contains('tasks')) {
    await db.delete('tasks', id);
  }
}

// Export / Import
export async function exportAllData(): Promise<FullExportData> {
  const db = await getDB();
  const semesterSettings = (await db.get('semesterSettings', 'current')) || {
    id: 'current',
    semesterName: '1st Semester',
    startDate: new Date().toISOString().split('T')[0],
    endDate: null,
    defaultTarget: 85,
    treatLabAsSingleUnit: false,
    includeSundayInTimetable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const [subjects, timetable, saturdayRules, dateSpecificSaturdayRules, dateOverrides, holidays, academicEvents, extraClasses, substitutions, attendanceRecords, classTimingSettings, tasks] =
    await Promise.all([
      db.getAll('subjects'),
      db.getAll('timetable'),
      db.getAll('saturdayRules'),
      db.getAll('dateSpecificSaturdayRules'),
      db.getAll('dateOverrides'),
      db.getAll('holidays'),
      db.getAll('academicEvents'),
      db.getAll('extraClasses'),
      db.getAll('substitutions'),
      db.getAll('attendanceRecords'),
      getClassTimingSettings(),
      db.objectStoreNames.contains('tasks') ? db.getAll('tasks') : Promise.resolve([]),
    ]);

  return {
    version: 4,
    exportDate: new Date().toISOString(),
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
    tasks,
  };
}

export async function importAllData(data: FullExportData): Promise<void> {
  if (!data || !data.semesterSettings) {
    throw new Error('Invalid backup file: Missing semester settings');
  }

  const db = await getDB();
  const stores: (
    | 'semesterSettings'
    | 'subjects'
    | 'timetable'
    | 'saturdayRules'
    | 'dateSpecificSaturdayRules'
    | 'dateOverrides'
    | 'holidays'
    | 'academicEvents'
    | 'extraClasses'
    | 'substitutions'
    | 'attendanceRecords'
    | 'classTimings'
    | 'tasks'
  )[] = [
    'semesterSettings',
    'subjects',
    'timetable',
    'saturdayRules',
    'dateSpecificSaturdayRules',
    'dateOverrides',
    'holidays',
    'academicEvents',
    'extraClasses',
    'substitutions',
    'attendanceRecords',
  ];

  if (db.objectStoreNames.contains('classTimings')) {
    stores.push('classTimings');
  }
  if (db.objectStoreNames.contains('tasks')) {
    stores.push('tasks');
  }

  const tx = db.transaction(stores, 'readwrite');

  // Clear existing
  await tx.objectStore('semesterSettings').clear();
  await tx.objectStore('subjects').clear();
  await tx.objectStore('timetable').clear();
  await tx.objectStore('saturdayRules').clear();
  await tx.objectStore('dateSpecificSaturdayRules').clear();
  await tx.objectStore('dateOverrides').clear();
  await tx.objectStore('holidays').clear();
  await tx.objectStore('academicEvents').clear();
  await tx.objectStore('extraClasses').clear();
  await tx.objectStore('substitutions').clear();
  await tx.objectStore('attendanceRecords').clear();
  if (db.objectStoreNames.contains('classTimings')) {
    await tx.objectStore('classTimings').clear();
  }
  if (db.objectStoreNames.contains('tasks')) {
    await tx.objectStore('tasks').clear();
  }

  // Populate new
  await tx.objectStore('semesterSettings').put({ ...data.semesterSettings, id: 'current' });
  for (const s of data.subjects || []) await tx.objectStore('subjects').put(s);
  for (const t of data.timetable || []) await tx.objectStore('timetable').put(t);
  for (const r of data.saturdayRules || []) await tx.objectStore('saturdayRules').put(r);
  for (const d of data.dateSpecificSaturdayRules || []) await tx.objectStore('dateSpecificSaturdayRules').put(d);
  for (const o of data.dateOverrides || []) await tx.objectStore('dateOverrides').put(o);
  for (const h of data.holidays || []) await tx.objectStore('holidays').put(h);
  for (const e of data.academicEvents || []) await tx.objectStore('academicEvents').put(e);
  for (const ec of data.extraClasses || []) await tx.objectStore('extraClasses').put(ec);
  for (const sb of data.substitutions || []) await tx.objectStore('substitutions').put(sb);
  for (const a of data.attendanceRecords || []) await tx.objectStore('attendanceRecords').put(a);
  if (data.tasks && db.objectStoreNames.contains('tasks')) {
    for (const tk of data.tasks) await tx.objectStore('tasks').put(tk);
  }

  if (data.classTimingSettings && db.objectStoreNames.contains('classTimings')) {
    await tx.objectStore('classTimings').put({ ...data.classTimingSettings, id: 'current' });
  }

  await tx.done;

  if (data.classTimingSettings) {
    try {
      localStorage.setItem(CLASS_TIMINGS_STORAGE_KEY, JSON.stringify(data.classTimingSettings));
    } catch {}
  }
}

// ==========================================
// CLASS SETUP TEMPLATE (SHARING & IMPORT)
// ==========================================

export async function exportClassTemplate(
  includeOptions: TemplateIncludeOptions,
  templateName: string,
  description?: string
): Promise<ClassSetupTemplate> {
  const db = await getDB();
  const template: ClassSetupTemplate = {
    isTemplate: true,
    templateVersion: 1,
    templateName: templateName.trim() || 'Class Setup Template',
    createdAt: new Date().toISOString(),
    description: description?.trim() || undefined,
    includedSettings: { ...includeOptions },
  };

  if (includeOptions.semesterSettings) {
    const sem = await db.get('semesterSettings', 'current');
    if (sem) {
      template.semesterSettings = { ...sem };
    }
  }

  if (includeOptions.subjectsAndTimetable) {
    const subs = await db.getAll('subjects');
    // Sanitize subjects: personal attendance baselines must never be exported in templates
    template.subjects = subs.map(s => ({
      ...s,
      initialPresent: 0,
      initialAbsent: 0,
    }));
    template.timetable = await db.getAll('timetable');
  }

  if (includeOptions.classTimings) {
    template.classTimingSettings = await getClassTimingSettings();
  }

  if (includeOptions.saturdayRules) {
    template.saturdayRules = await db.getAll('saturdayRules');
    template.dateSpecificSaturdayRules = await db.getAll('dateSpecificSaturdayRules');
  }

  if (includeOptions.academicEvents) {
    template.academicEvents = await db.getAll('academicEvents');
  }

  if (includeOptions.holidays) {
    template.holidays = await db.getAll('holidays');
    template.dateOverrides = await db.getAll('dateOverrides');
  }

  return template;
}

export async function applyClassTemplate(
  template: ClassSetupTemplate,
  applyOptions: TemplateApplyOptions
): Promise<void> {
  const db = await getDB();

  // If user chose NOT to preserve existing attendance (explicit fresh reset)
  if (!applyOptions.preserveExistingAttendance) {
    const clearTx = db.transaction(
      ['attendanceRecords', 'extraClasses', 'substitutions'],
      'readwrite'
    );
    await clearTx.objectStore('attendanceRecords').clear();
    await clearTx.objectStore('extraClasses').clear();
    await clearTx.objectStore('substitutions').clear();
    await clearTx.done;
  }

  // 1. Semester Settings
  if (applyOptions.applySemesterSettings && template.semesterSettings) {
    const existing = await db.get('semesterSettings', 'current');
    const merged: SemesterSettings = {
      ...(existing || {}),
      ...template.semesterSettings,
      id: 'current',
      updatedAt: new Date().toISOString(),
    };
    await db.put('semesterSettings', merged);
  }

  // 2. Subjects & Timetable
  if (applyOptions.applySubjectsAndTimetable && template.subjects) {
    const existingSubjects = await db.getAll('subjects');
    const existingRecords = await db.getAll('attendanceRecords');

    const existingById = new Map<string, Subject>(existingSubjects.map(s => [s.id, s]));
    const existingByName = new Map<string, Subject>(
      existingSubjects.map(s => [s.name.trim().toLowerCase(), s])
    );
    const existingByCode = new Map<string, Subject>(
      existingSubjects.filter(s => !!s.code).map(s => [s.code!.trim().toLowerCase(), s])
    );

    const subTx = db.transaction(['subjects', 'attendanceRecords'], 'readwrite');
    const recordsStore = subTx.objectStore('attendanceRecords');
    const subjectsStore = subTx.objectStore('subjects');

    for (const tmplSub of template.subjects) {
      let matchedExisting: Subject | undefined = existingById.get(tmplSub.id);
      let oldIdToMigrate: string | null = null;

      if (!matchedExisting) {
        if (tmplSub.code && existingByCode.has(tmplSub.code.trim().toLowerCase())) {
          matchedExisting = existingByCode.get(tmplSub.code.trim().toLowerCase());
          if (matchedExisting) oldIdToMigrate = matchedExisting.id;
        } else if (existingByName.has(tmplSub.name.trim().toLowerCase())) {
          matchedExisting = existingByName.get(tmplSub.name.trim().toLowerCase());
          if (matchedExisting) oldIdToMigrate = matchedExisting.id;
        }
      }

      if (matchedExisting) {
        const targetId = tmplSub.id;
        if (oldIdToMigrate && oldIdToMigrate !== targetId) {
          for (const rec of existingRecords) {
            if (rec.subjectId === oldIdToMigrate) {
              await recordsStore.put({ ...rec, subjectId: targetId });
            }
          }
          await subjectsStore.delete(oldIdToMigrate);
        }

        await subjectsStore.put({
          ...tmplSub,
          initialPresent: applyOptions.preserveExistingAttendance
            ? (matchedExisting.initialPresent || 0)
            : 0,
          initialAbsent: applyOptions.preserveExistingAttendance
            ? (matchedExisting.initialAbsent || 0)
            : 0,
        });
      } else {
        await subjectsStore.put({
          ...tmplSub,
          initialPresent: 0,
          initialAbsent: 0,
        });
      }
    }
    await subTx.done;

    if (template.timetable && template.timetable.length > 0) {
      const ttTx = db.transaction('timetable', 'readwrite');
      await ttTx.store.clear();
      for (const t of template.timetable) {
        await ttTx.store.put(t);
      }
      await ttTx.done;
    }
  }

  // 3. Class Timings & Breaks
  if (applyOptions.applyClassTimings && template.classTimingSettings) {
    await saveClassTimingSettings(template.classTimingSettings);
  }

  // 4. Saturday Rules
  if (applyOptions.applySaturdayRules) {
    if (template.saturdayRules && template.saturdayRules.length > 0) {
      const satTx = db.transaction('saturdayRules', 'readwrite');
      await satTx.store.clear();
      for (const r of template.saturdayRules) {
        await satTx.store.put(r);
      }
      await satTx.done;
    }

    if (template.dateSpecificSaturdayRules) {
      const dSatTx = db.transaction('dateSpecificSaturdayRules', 'readwrite');
      await dSatTx.store.clear();
      for (const d of template.dateSpecificSaturdayRules) {
        await dSatTx.store.put(d);
      }
      await dSatTx.done;
    }
  }

  // 5. Academic Events & Exams
  if (applyOptions.applyAcademicEvents && template.academicEvents) {
    const evTx = db.transaction('academicEvents', 'readwrite');
    await evTx.store.clear();
    for (const ev of template.academicEvents) {
      await evTx.store.put(ev);
    }
    await evTx.done;
  }

  // 6. Holidays & Calendar Overrides
  if (applyOptions.applyHolidays) {
    if (template.holidays) {
      const holTx = db.transaction('holidays', 'readwrite');
      await holTx.store.clear();
      for (const h of template.holidays) {
        await holTx.store.put(h);
      }
      await holTx.done;
    }

    if (template.dateOverrides) {
      const ovTx = db.transaction('dateOverrides', 'readwrite');
      await ovTx.store.clear();
      for (const o of template.dateOverrides) {
        await ovTx.store.put(o);
      }
      await ovTx.done;
    }
  }
}

