export type ClassType = 'lecture' | 'lab' | 'tutorial' | 'other';
export type AttendanceStatus = 'present' | 'absent' | 'cancelled' | 'unmarked';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
export type SaturdayOccurrence = 1 | 2 | 3 | 4 | 5;
export type AcademicEventType = 'ias' | 'exam' | 'workshop' | 'fest' | 'event' | 'other';
export type ClassSource = 'regular' | 'extra' | 'substitution';

export interface SemesterSettings {
  id: string;
  semesterName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD or null
  defaultTarget: number; // e.g. 85
  treatLabAsSingleUnit: boolean;
  includeSundayInTimetable: boolean;
  isConfirmedDayPromptDisabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  code?: string;
  type: ClassType;
  color: string;
  isActive: boolean;
  initialPresent: number;
  initialAbsent: number;
  order: number;
  createdAt: string;
}

export interface TimetablePeriod {
  id: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  subjectId: string;
  startTime?: string;
  endTime?: string;
  labGroupKey?: string;
  unitGroupId?: string; // Grouping ID for consecutive periods forming 1 attendance unit
}

export interface SaturdayRule {
  occurrence: SaturdayOccurrence;
  status: 'holiday' | 'working';
  followsDay?: DayOfWeek | 'custom';
}

export type WeekdayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface DateSpecificSaturdayRule {
  id: string;
  date: string; // YYYY-MM-DD
  saturdayOccurrence: SaturdayOccurrence; // 1 | 2 | 3 | 4 | 5
  status: 'working' | 'holiday';
  followsDay?: DayOfWeek | WeekdayName; // Day of week to follow (1=Mon, 'monday', etc.)
  note?: string;
}

export interface DateOverride {
  id: string;
  date: string; // YYYY-MM-DD
  status: 'working' | 'holiday';
  followsDay?: DayOfWeek | 'custom';
  note?: string;
}

export interface Holiday {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  description: string;
}

export interface AcademicEvent {
  id: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: AcademicEventType;
  description: string;
  regularClassesRun: boolean;
}

export interface ExtraClass {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  periodsCount: number;
  description?: string;
  status: AttendanceStatus;
}

export interface Substitution {
  id: string;
  date: string; // YYYY-MM-DD
  periodNumber: number;
  originalSubjectId: string;
  substituteSubjectId: string;
  note?: string;
}

export interface AttendanceRecord {
  id: string; // Unique: _p_ or _extra_
  date: string; // YYYY-MM-DD
  periodNumber: number;
  subjectId: string;
  status: AttendanceStatus;
  source: ClassSource;
  sourceRefId?: string;
  note?: string;
  updatedAt: string;
}

export interface GeneratedClassInstance {
  slotKey: string;
  date: string;
  periodNumber: number;
  periodLabel?: string; // e.g. "P1–P2", "P6–P8", "P3"
  periodNumbers?: number[]; // [1, 2]
  unitGroupId?: string;
  unitSize?: number; // count of periods in this attendance unit
  subject: Subject;
  originalSubject?: Subject;
  source: ClassSource;
  sourceRefId?: string;
  status: AttendanceStatus;
  attendanceRecordId?: string;
  note?: string;
  startTime?: string;
  endTime?: string;
}

export interface SubjectAttendanceStats {
  subject: Subject;
  present: number;
  absent: number;
  conducted: number;
  cancelled: number;
  unmarked: number;
  percentage: number;
  target: number;
  canMiss: number;
  needToAttend: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface OverallAttendanceStats {
  present: number;
  absent: number;
  conducted: number;
  cancelled: number;
  unmarked: number;
  percentage: number;
  target: number;
  canMiss: number;
  needToAttend: number;
  status: 'safe' | 'warning' | 'critical';
}

export interface DayClassSummary {
  date: string;
  isWorkingDay: boolean;
  statusReason: string; // e.g. "Monday Timetable", "3rd Saturday -> Monday Timetable", "Holiday: Dasara", "IAS: Regular Classes OFF", "Override: Tuesday Timetable"
  classes: GeneratedClassInstance[];
  allMarked: boolean;
  hasClasses: boolean;
}

export interface FullExportData {
  version: number;
  exportDate: string;
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
  tasks?: Task[];
}

export type TaskType = 'assignment' | 'test' | 'submission' | 'project' | 'presentation' | 'other';
export type TaskPriority = 'low' | 'medium' | 'high';
export type TaskReminderOption = 'none' | '1_day_before' | '2_days_before' | 'on_due_date' | 'custom';

export interface Task {
  id: string; // e.g. task_1789...
  title: string;
  description?: string;
  subjectId: string;
  type: TaskType;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  priority: TaskPriority;
  reminderEnabled: boolean;
  reminderOption: TaskReminderOption;
  reminderDateTime?: string; // YYYY-MM-DDTHH:mm or ISO
  notificationId?: number; // Unique number for LocalNotifications
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationSettings {
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:mm format, e.g. "20:30"
  lowAttendanceWarningEnabled: boolean;
  nextClassReminderEnabled: boolean;
  nextClassLeadMinutes: number; // in minutes, e.g. 10
}

export interface PeriodTiming {
  periodNumber: number;
  startTime: string; // HH:mm format (e.g. "09:00")
  endTime: string;   // HH:mm format (e.g. "10:00")
}

export interface BreakTiming {
  id: string;
  name: string;      // e.g. "Short Break", "Lunch"
  startTime: string; // HH:mm format (e.g. "11:00")
  endTime: string;   // HH:mm format (e.g. "11:15")
}

export interface DayTimingConfig {
  periods: PeriodTiming[];
  breaks: BreakTiming[];
}

export interface DaySpecificTiming {
  dayOfWeek: DayOfWeek; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  periods: PeriodTiming[];
  breaks: BreakTiming[];
}

export interface DateTimingOverride {
  id: string;
  date: string; // YYYY-MM-DD
  periods: PeriodTiming[];
  breaks: BreakTiming[];
  note?: string;
}

export interface ClassTimingSettings {
  defaultTiming: DayTimingConfig;
  daySpecificTimings?: DaySpecificTiming[];
  dateOverrides?: DateTimingOverride[];
}

export type TimelineStateType =
  | 'before_first'
  | 'in_class'
  | 'in_break'
  | 'between_classes'
  | 'after_last'
  | 'non_working'
  | 'no_classes'
  | 'unconfigured';

export interface ScheduleTimelineStatus {
  currentClass: GeneratedClassInstance | null;
  currentBreak: BreakTiming | null;
  nextClass: GeneratedClassInstance | null;
  nextClassStartsInMinutes: number | null;
  state: TimelineStateType;
  message: string;
  activeClass?: GeneratedClassInstance | null;
  activeBreak?: BreakTiming | null;
  minutesUntilNext?: number | null;
}

export interface TemplateIncludeOptions {
  semesterSettings: boolean;
  subjectsAndTimetable: boolean;
  classTimings: boolean;
  saturdayRules: boolean;
  academicEvents: boolean;
  holidays: boolean;
}

export interface ClassSetupTemplate {
  isTemplate: true;
  templateVersion: number;
  templateName: string;
  createdAt: string;
  description?: string;
  includedSettings: TemplateIncludeOptions;
  semesterSettings?: SemesterSettings;
  subjects?: Subject[];
  timetable?: TimetablePeriod[];
  classTimingSettings?: ClassTimingSettings;
  saturdayRules?: SaturdayRule[];
  dateSpecificSaturdayRules?: DateSpecificSaturdayRule[];
  academicEvents?: AcademicEvent[];
  holidays?: Holiday[];
  dateOverrides?: DateOverride[];
}

export interface TemplateApplyOptions {
  applySemesterSettings: boolean;
  applySubjectsAndTimetable: boolean;
  applyClassTimings: boolean;
  applySaturdayRules: boolean;
  applyAcademicEvents: boolean;
  applyHolidays: boolean;
  preserveExistingAttendance: boolean;
}

