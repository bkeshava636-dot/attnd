import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  Check,
  Edit2,
  Sparkles,
  BookOpen,
  Bell,
  Sliders,
  AlertTriangle,
  Copy,
  FileText,
  ChevronRight,
  Share2,
  Layers,
} from 'lucide-react';
import * as db from '../../db';
import { useApp } from '../../context/AppContext';
import { DAY_NAMES, getOrdinalSuffix } from '../../services/attendanceEngine';
import {
  getStoredNotificationSettings,
  saveStoredNotificationSettings,
  checkNotificationPermission,
  requestNotificationPermission,
  scheduleAllNotifications,
  sendTestNotification,
  scheduleTestNotification,
  getNotificationDiagnostics,
  type NotificationDiagnostics,
} from '../../services/notificationService';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { HolidayModal } from './HolidayModal';
import { AcademicEventModal } from './AcademicEventModal';
import { NewSemesterModal } from './NewSemesterModal';
import { DateSpecificSaturdayModal } from './DateSpecificSaturdayModal';
import { ClassTimingsModal } from './ClassTimingsModal';
import { ShareTemplateModal } from './ShareTemplateModal';
import { ImportTemplateModal } from './ImportTemplateModal';
import type { SaturdayRule, DayOfWeek, Holiday, AcademicEvent, DateSpecificSaturdayRule, NotificationSettings, ClassSetupTemplate } from '../../types';

export const SettingsView: React.FC = () => {
  const {
    semesterSettings,
    updateSemesterSettings,
    saturdayRules,
    saveSaturdayRule,
    dateSpecificSaturdayRules,
    saveDateSpecificSaturdayRule,
    deleteDateSpecificSaturdayRule,
    holidays,
    saveHoliday,
    deleteHoliday,
    academicEvents,
    saveAcademicEvent,
    deleteAcademicEvent,
    exportJSON,
    importJSON,
    exportCSV,
    loadSampleSetup,
    lastBackupDate,
    engineContext,
    setActiveTab,
    classTimingSettings,
  } = useApp();

  const [isClassTimingsModalOpen, setIsClassTimingsModalOpen] = useState(false);

  const [semesterName, setSemesterName] = useState(semesterSettings?.semesterName || '1st Semester');
  const [startDate, setStartDate] = useState(semesterSettings?.startDate || '');
  const [endDate, setEndDate] = useState(semesterSettings?.endDate || '');
  const [defaultTarget, setDefaultTarget] = useState(semesterSettings?.defaultTarget?.toString() || '85');
  const [treatLabAsSingleUnit, setTreatLabAsSingleUnit] = useState(semesterSettings?.treatLabAsSingleUnit || false);
  const [includeSundayInTimetable, setIncludeSundayInTimetable] = useState(semesterSettings?.includeSundayInTimetable || false);
  const [isSemesterSavedNotice, setIsSemesterSavedNotice] = useState(false);

  // Notifications state
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(() => getStoredNotificationSettings());
  const [notifPermission, setNotifPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isNotifSavedNotice, setIsNotifSavedNotice] = useState(false);
  const [diagnostics, setDiagnostics] = useState<NotificationDiagnostics | null>(null);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [testResultMsg, setTestResultMsg] = useState<{ text: string; error?: boolean } | null>(null);

  const refreshDiagnostics = async () => {
    try {
      const diag = await getNotificationDiagnostics();
      setDiagnostics(diag);
      setNotifPermission(diag.permission);
    } catch {}
  };

  useEffect(() => {
    refreshDiagnostics();
  }, []);

  const updateNotifSetting = (newSettings: NotificationSettings) => {
    setNotifSettings(newSettings);
    saveStoredNotificationSettings(newSettings);
    scheduleAllNotifications(engineContext, newSettings);
    setIsNotifSavedNotice(true);
    refreshDiagnostics();
    setTimeout(() => setIsNotifSavedNotice(false), 2000);
  };

  const handleRequestPerm = async () => {
    const granted = await requestNotificationPermission();
    setNotifPermission(granted ? 'granted' : 'denied');
    if (granted) {
      scheduleAllNotifications(engineContext, notifSettings);
    }
    refreshDiagnostics();
  };

  const handleSendImmediateTest = async () => {
    setIsTestingNotif(true);
    setTestResultMsg(null);
    try {
      const success = await sendTestNotification();
      if (success) {
        setTestResultMsg({ text: 'Immediate test notification sent! Look for it in your notification drawer.' });
      } else {
        setTestResultMsg({ text: 'Failed to send test. Please check notification permissions.', error: true });
      }
      await refreshDiagnostics();
    } catch (err: any) {
      setTestResultMsg({ text: err?.message || 'Error sending test notification', error: true });
    } finally {
      setIsTestingNotif(false);
    }
  };

  const handleScheduleMinuteTest = async () => {
    setIsTestingNotif(true);
    setTestResultMsg(null);
    try {
      const success = await scheduleTestNotification(1);
      if (success) {
        setTestResultMsg({ text: '1-minute test alarm scheduled! Close or minimize the app to test background delivery.' });
      } else {
        setTestResultMsg({ text: 'Failed to schedule alarm. Please check notification permissions.', error: true });
      }
      await refreshDiagnostics();
    } catch (err: any) {
      setTestResultMsg({ text: err?.message || 'Error scheduling test notification', error: true });
    } finally {
      setIsTestingNotif(false);
    }
  };

  const [isDateSpecificModalOpen, setIsDateSpecificModalOpen] = useState(false);
  const [editingDateSpecificRule, setEditingDateSpecificRule] = useState<DateSpecificSaturdayRule | null>(null);

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<AcademicEvent | null>(null);

  const [isNewSemesterModalOpen, setIsNewSemesterModalOpen] = useState(false);

  const [restoreData, setRestoreData] = useState<any | null>(null);
  const [restoreFileName, setRestoreFileName] = useState<string>('');
  const [isRestoreConfirmOpen, setIsRestoreConfirmOpen] = useState(false);

  const [isShareTemplateModalOpen, setIsShareTemplateModalOpen] = useState(false);
  const [isImportTemplateModalOpen, setIsImportTemplateModalOpen] = useState(false);
  const [importingTemplate, setImportingTemplate] = useState<ClassSetupTemplate | null>(null);

  const [isCopiedNotice, setIsCopiedNotice] = useState(false);
  const [isViewJsonOpen, setIsViewJsonOpen] = useState(false);
  const [rawJsonView, setRawJsonView] = useState('');
  const [isRawJsonCopied, setIsRawJsonCopied] = useState(false);

  const handleCopyJSON = async () => {
    try {
      const data = await db.exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setIsCopiedNotice(true);
      setTimeout(() => setIsCopiedNotice(false), 3000);
    } catch (err: any) {
      alert('Failed to copy to clipboard: ' + (err?.message || err));
    }
  };

  const handleViewJSON = async () => {
    try {
      const data = await db.exportAllData();
      setRawJsonView(JSON.stringify(data, null, 2));
      setIsViewJsonOpen(true);
    } catch (err: any) {
      alert('Failed to load JSON: ' + (err?.message || err));
    }
  };

  useEffect(() => {
    if (semesterSettings) {
      setSemesterName(semesterSettings.semesterName);
      setStartDate(semesterSettings.startDate);
      setEndDate(semesterSettings.endDate || '');
      setDefaultTarget(semesterSettings.defaultTarget.toString());
      setTreatLabAsSingleUnit(semesterSettings.treatLabAsSingleUnit);
      setIncludeSundayInTimetable(semesterSettings.includeSundayInTimetable);
    }
  }, [semesterSettings]);

  const handleSaveSemesterInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!semesterSettings) return;

    await updateSemesterSettings({
      ...semesterSettings,
      semesterName: semesterName.trim() || 'Current Semester',
      startDate,
      endDate: endDate || null,
      defaultTarget: parseFloat(defaultTarget) || 85,
      treatLabAsSingleUnit,
      includeSundayInTimetable,
    });

    setIsSemesterSavedNotice(true);
    setTimeout(() => setIsSemesterSavedNotice(false), 2500);
  };

  const handleSaturdayRuleChange = async (
    occurrence: 1 | 2 | 3 | 4 | 5,
    status: 'holiday' | 'working'
  ) => {
    const updated: SaturdayRule = {
      occurrence,
      status,
      followsDay: 6,
    };
    await saveSaturdayRule(updated);
  };

  const formattedLastBackup = lastBackupDate
    ? new Date(lastBackupDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Never';

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const content = evt.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.isTemplate) {
          setImportingTemplate(parsed);
          setIsImportTemplateModalOpen(true);
        } else {
          setRestoreData(parsed);
          setIsRestoreConfirmOpen(true);
        }
      } catch (err: any) {
        alert(`Failed to parse JSON file: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!restoreData) return;
    try {
      await importJSON(restoreData);
      setIsRestoreConfirmOpen(false);
      setRestoreData(null);
      alert('Backup restored successfully!');
    } catch (err: any) {
      alert(`Import failed: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-xl mx-auto pb-16 font-sans">
      {/* Page Title */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
          Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-gotham-400">
          Configure semester parameters, schedule, alerts & backups
        </p>
      </div>

      {/* 1. SEMESTER SETTINGS */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-bat-accent" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Semester
            </h3>
          </div>
          {isSemesterSavedNotice && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <Check size={14} /> Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSemesterInfo} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
              Semester Name
            </label>
            <input
              type="text"
              required
              value={semesterName}
              onChange={(e) => setSemesterName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-bat-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-bat-gold"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-bat-gold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
              Target Attendance (%)
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.5"
              required
              value={defaultTarget}
              onChange={(e) => setDefaultTarget(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-850 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-bat-gold"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gotham-300 cursor-pointer">
              <input
                type="checkbox"
                checked={treatLabAsSingleUnit}
                onChange={(e) => setTreatLabAsSingleUnit(e.target.checked)}
                className="rounded border-slate-300 text-bat-accent focus:ring-bat-gold"
              />
              Treat multi-period lab as 1 attendance unit
            </label>

            <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-gotham-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSundayInTimetable}
                onChange={(e) => setIncludeSundayInTimetable(e.target.checked)}
                className="rounded border-slate-300 text-bat-accent focus:ring-bat-gold"
              />
              Include Sunday in timetable
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 min-h-[44px] rounded-xl bg-slate-900 dark:bg-gotham-800 hover:bg-slate-800 text-white dark:text-bat-accent font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Save Semester Settings
            </button>
          </div>
        </form>
      </section>

      {/* 2. TIMETABLE & WORKING DAYS */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-bat-accent" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            Timetable & Schedule
          </h3>
        </div>

        <button
          onClick={() => setActiveTab('timetable')}
          className="w-full p-3.5 min-h-[48px] rounded-2xl bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 border border-slate-200 dark:border-gotham-750 flex items-center justify-between text-left transition-colors"
        >
          <div>
            <span className="text-xs font-bold text-slate-900 dark:text-white block">
              Manage Weekly Timetable
            </span>
            <span className="text-[11px] text-slate-500 dark:text-gotham-400">
              Configure scheduled classes for Monday through Saturday
            </span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* Class Timings & Breaks */}
        <button
          onClick={() => setIsClassTimingsModalOpen(true)}
          className="w-full p-3.5 min-h-[48px] rounded-2xl bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 border border-slate-200 dark:border-gotham-750 flex items-center justify-between text-left transition-colors"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Class Timings & Breaks
              </span>
              {(classTimingSettings?.defaultTiming?.periods?.length || 0) > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {classTimingSettings?.defaultTiming?.periods?.length} Periods
                  {(classTimingSettings?.defaultTiming?.breaks?.length || 0) > 0
                    ? ` · ${classTimingSettings?.defaultTiming?.breaks?.length} Breaks`
                    : ''}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-400/15 text-amber-400 border border-amber-400/30">
                  Not Configured
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 dark:text-gotham-400">
              Set period start/end hours and breaks for accurate notifications and widget status
            </span>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        {/* Saturday Rules */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-slate-700 dark:text-gotham-300 block">
            Saturday Rules (Monthly Defaults)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[1, 2, 3, 4, 5].map((occ) => {
              const rule = saturdayRules.find((r) => r.occurrence === occ);
              const isWorking = rule?.status === 'working';

              return (
                <div
                  key={occ}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 text-xs"
                >
                  <span className="font-medium text-slate-800 dark:text-gotham-200">
                    {occ}{getOrdinalSuffix(occ)} Saturday
                  </span>
                  <select
                    value={isWorking ? 'working' : 'holiday'}
                    onChange={(e) =>
                      handleSaturdayRuleChange(occ as any, e.target.value as any)
                    }
                    className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-800 text-slate-900 dark:text-white font-medium"
                  >
                    <option value="holiday">Holiday</option>
                    <option value="working">Working</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* College Circular Working Saturdays */}
        <div className="pt-3 border-t border-slate-100 dark:border-gotham-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-gotham-300">
              College Circular Working Saturdays ({dateSpecificSaturdayRules.length})
            </span>
            <button
              onClick={() => {
                setEditingDateSpecificRule(null);
                setIsDateSpecificModalOpen(true);
              }}
              className="text-xs font-bold text-bat-accent hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Saturday
            </button>
          </div>

          {dateSpecificSaturdayRules.length > 0 && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {dateSpecificSaturdayRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {rule.date}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                      {rule.status === 'working' ? 'Working' : 'Holiday'}
                      {rule.note ? ` (${rule.note})` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingDateSpecificRule(rule);
                        setIsDateSpecificModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteDateSpecificSaturdayRule(rule.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 3. ACADEMIC CALENDAR (Holidays & Events) */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Calendar size={18} className="text-bat-accent" />
          <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
            Academic Calendar
          </h3>
        </div>

        {/* Holidays */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-gotham-300">
              Holidays ({holidays.length})
            </span>
            <button
              onClick={() => {
                setEditingHoliday(null);
                setIsHolidayModalOpen(true);
              }}
              className="text-xs font-bold text-bat-accent hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Holiday
            </button>
          </div>

          {holidays.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-gotham-500 italic py-1">
              No holidays added yet
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {holidays.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white block">
                      {h.description}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                      {h.startDate} {h.endDate !== h.startDate ? `to ${h.endDate}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingHoliday(h);
                        setIsHolidayModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteHoliday(h.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Academic Events / Exams */}
        <div className="pt-3 border-t border-slate-100 dark:border-gotham-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-gotham-300">
              Events & Exams ({academicEvents.length})
            </span>
            <button
              onClick={() => {
                setEditingEvent(null);
                setIsEventModalOpen(true);
              }}
              className="text-xs font-bold text-bat-accent hover:underline flex items-center gap-1"
            >
              <Plus size={14} /> Add Event
            </button>
          </div>

          {academicEvents.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-gotham-500 italic py-1">
              No academic events added
            </p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {academicEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {e.description}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-bat-accent">
                        [{e.type}]
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                      {e.startDate} {e.endDate !== e.startDate ? `to ${e.endDate}` : ''} •{' '}
                      {e.regularClassesRun ? 'Classes run' : 'Classes OFF'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingEvent(e);
                        setIsEventModalOpen(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => deleteAcademicEvent(e.id)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. NOTIFICATIONS */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-bat-accent" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Notifications
            </h3>
          </div>

          {notifPermission === 'granted' ? (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Check size={14} /> Active
            </span>
          ) : (
            <button
              type="button"
              onClick={handleRequestPerm}
              className="text-xs font-bold text-bat-accent hover:underline"
            >
              Enable permissions
            </button>
          )}
        </div>

        <div className="space-y-3 pt-1">
          {/* Daily Reminder */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Daily Attendance Reminder
              </span>
              <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                Evening reminder to mark classes
              </span>
            </div>

            <div className="flex items-center gap-2">
              {notifSettings.dailyReminderEnabled && (
                <input
                  type="time"
                  value={notifSettings.dailyReminderTime}
                  onChange={(e) =>
                    updateNotifSetting({ ...notifSettings, dailyReminderTime: e.target.value })
                  }
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-800 text-slate-900 dark:text-white font-mono font-bold"
                />
              )}
              <input
                type="checkbox"
                checked={notifSettings.dailyReminderEnabled}
                onChange={(e) =>
                  updateNotifSetting({ ...notifSettings, dailyReminderEnabled: e.target.checked })
                }
                className="rounded border-slate-300 text-bat-accent focus:ring-bat-gold"
              />
            </div>
          </div>

          {/* Next Class Alert */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Next Class Alert
              </span>
              <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                1 unified alert for multi-period units
              </span>
            </div>

            <div className="flex items-center gap-2">
              {notifSettings.nextClassReminderEnabled && (
                <select
                  value={notifSettings.nextClassLeadMinutes}
                  onChange={(e) =>
                    updateNotifSetting({
                      ...notifSettings,
                      nextClassLeadMinutes: Number(e.target.value),
                    })
                  }
                  className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value={5}>5m before</option>
                  <option value={10}>10m before</option>
                  <option value={15}>15m before</option>
                  <option value={30}>30m before</option>
                </select>
              )}
              <input
                type="checkbox"
                checked={notifSettings.nextClassReminderEnabled}
                onChange={(e) =>
                  updateNotifSetting({
                    ...notifSettings,
                    nextClassReminderEnabled: e.target.checked,
                  })
                }
                className="rounded border-slate-300 text-bat-accent focus:ring-bat-gold"
              />
            </div>
          </div>

          {/* Low Attendance Warning */}
          <div className="p-3 rounded-2xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                Low Attendance Warning
              </span>
              <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                Alerts when percentage falls below target
              </span>
            </div>

            <input
              type="checkbox"
              checked={notifSettings.lowAttendanceWarningEnabled}
              onChange={(e) =>
                updateNotifSetting({
                  ...notifSettings,
                  lowAttendanceWarningEnabled: e.target.checked,
                })
              }
              className="rounded border-slate-300 text-bat-accent focus:ring-bat-gold"
            />
          </div>

          {/* Diagnostics & Test System */}
          <div className="pt-3 border-t border-slate-200 dark:border-gotham-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-gotham-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} className="text-bat-accent" />
                Notification Test & Diagnostics
              </span>
              <button
                type="button"
                onClick={refreshDiagnostics}
                className="text-[11px] text-slate-400 hover:text-bat-accent transition-colors"
              >
                Refresh
              </button>
            </div>

            {/* Diagnostic Metrics Chips */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750 text-center">
                <span className="text-[10px] text-slate-500 dark:text-gotham-400 block font-medium">
                  Permission
                </span>
                <span
                  className={`text-xs font-bold capitalize ${
                    notifPermission === 'granted'
                      ? 'text-emerald-500'
                      : notifPermission === 'denied'
                      ? 'text-rose-500'
                      : 'text-amber-500'
                  }`}
                >
                  {notifPermission}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750 text-center">
                <span className="text-[10px] text-slate-500 dark:text-gotham-400 block font-medium">
                  Channels
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-white">
                  {diagnostics?.channels?.length ? `${diagnostics.channels.length} active` : 'Configured'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750 text-center">
                <span className="text-[10px] text-slate-500 dark:text-gotham-400 block font-medium">
                  Scheduled
                </span>
                <span className="text-xs font-bold text-bat-accent font-mono">
                  {diagnostics?.pendingCount ?? 0}
                </span>
              </div>
            </div>

            {/* Test Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleSendImmediateTest}
                disabled={isTestingNotif}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-200/80 dark:bg-gotham-800 hover:bg-slate-300 dark:hover:bg-gotham-750 border border-slate-300/80 dark:border-gotham-700 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Bell size={13} className="text-bat-accent" />
                <span>Send Test Notification (Now)</span>
              </button>

              <button
                type="button"
                onClick={handleScheduleMinuteTest}
                disabled={isTestingNotif}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-200/80 dark:bg-gotham-800 hover:bg-slate-300 dark:hover:bg-gotham-750 border border-slate-300/80 dark:border-gotham-700 text-xs font-bold text-slate-800 dark:text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
              >
                <Clock size={13} className="text-bat-accent" />
                <span>Schedule Test (in 1 min)</span>
              </button>
            </div>

            {/* Test Message Result */}
            {testResultMsg && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  testResultMsg.error
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                <span className="text-sm">{testResultMsg.error ? '⚠️' : '✅'}</span>
                <span>{testResultMsg.text}</span>
              </div>
            )}

            {/* Denied Help Text */}
            {notifPermission === 'denied' && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs space-y-1">
                <span className="font-bold block">Notifications are blocked</span>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-gotham-300">
                  Android has blocked notifications for Attnd. To fix this, open your phone's{' '}
                  <span className="font-semibold text-slate-800 dark:text-white">
                    Settings → Apps → Attnd → Notifications
                  </span>{' '}
                  and switch on "Allow notifications".
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 5. CLASS SETUP TEMPLATE (SHARE WITH CLASS) */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 size={18} className="text-bat-accent" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Class Setup Template
            </h3>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-bat-accent/15 text-bat-accent border border-bat-accent/30 font-mono">
            Class Sharing
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-gotham-400 leading-relaxed">
          Share semester schedule, timetable, period timings, Saturday rules, and academic events with classmates. Applying a template keeps existing personal attendance records safe.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => setIsShareTemplateModalOpen(true)}
            className="p-3 min-h-[44px] rounded-xl border border-bat-accent/40 bg-bat-accent/10 hover:bg-bat-accent/20 text-xs font-bold text-bat-accent flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Share2 size={15} />
            <span>Share Class Template</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setImportingTemplate(null);
              setIsImportTemplateModalOpen(true);
            }}
            className="p-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-gotham-750 bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-gotham-200 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Upload size={15} className="text-blue-400" />
            <span>Import Class Template</span>
          </button>
        </div>
      </section>

      {/* 6. BACKUP & EXPORT */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-bat-accent" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Backup & Export
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-gotham-500 font-mono">
            Last: {formattedLastBackup}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={exportJSON}
            className="p-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-gotham-750 bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-gotham-200 flex items-center justify-center gap-1.5"
          >
            <Download size={15} className="text-bat-accent" /> Export JSON
          </button>

          <label className="p-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-gotham-750 bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-gotham-200 flex items-center justify-center gap-1.5 cursor-pointer">
            <Upload size={15} className="text-blue-400" /> Restore JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            onClick={exportCSV}
            className="p-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-gotham-750 bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-gotham-200 flex items-center justify-center gap-1.5"
          >
            <FileSpreadsheet size={15} className="text-emerald-500" /> Export CSV
          </button>

          <button
            onClick={handleCopyJSON}
            className="p-3 min-h-[44px] rounded-xl border border-slate-200 dark:border-gotham-750 bg-slate-50 dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold text-slate-800 dark:text-gotham-200 flex items-center justify-center gap-1.5"
          >
            <Copy size={15} className="text-bat-accent" />
            {isCopiedNotice ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>

        <button
          onClick={handleViewJSON}
          className="text-xs text-slate-500 dark:text-gotham-400 hover:underline flex items-center gap-1 pt-1"
        >
          <FileText size={14} /> View Raw JSON Data
        </button>
      </section>

      {/* 6. ADVANCED / SEMESTER RESET */}
      <section className="p-5 rounded-3xl border border-rose-200 dark:border-rose-950/50 bg-rose-50/30 dark:bg-rose-950/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={18} />
            <h3 className="font-bold text-xs uppercase tracking-wider">
              Danger Zone
            </h3>
          </div>
          <button
            onClick={() => setIsNewSemesterModalOpen(true)}
            className="px-3 py-1.5 min-h-[36px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
          >
            Start New Semester
          </button>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-gotham-400">
          Archives current semester and begins fresh tracking.
        </p>
      </section>

      {/* Modals */}
      <DateSpecificSaturdayModal
        isOpen={isDateSpecificModalOpen}
        onClose={() => setIsDateSpecificModalOpen(false)}
        onSave={saveDateSpecificSaturdayRule}
        ruleToEdit={editingDateSpecificRule}
      />

      <HolidayModal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        onSave={saveHoliday}
        holidayToEdit={editingHoliday}
      />

      <AcademicEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={saveAcademicEvent}
        eventToEdit={editingEvent}
      />

      <NewSemesterModal
        isOpen={isNewSemesterModalOpen}
        onClose={() => setIsNewSemesterModalOpen(false)}
      />

      {/* View Raw JSON Modal */}
      <Modal
        isOpen={isViewJsonOpen}
        onClose={() => setIsViewJsonOpen(false)}
        title="Raw Semester JSON"
      >
        <div className="space-y-3 font-mono text-xs">
          <textarea
            readOnly
            value={rawJsonView}
            className="w-full h-80 p-3 rounded-xl border border-slate-300 dark:border-gotham-750 bg-slate-900 text-emerald-400 text-xs overflow-auto font-mono select-all"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(rawJsonView);
                setIsRawJsonCopied(true);
                setTimeout(() => setIsRawJsonCopied(false), 2000);
              }}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-bat-gold text-gotham-950 font-bold text-xs"
            >
              {isRawJsonCopied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setIsRestoreConfirmOpen(false)}
        title="Restore Semester Data?"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-gotham-300">
            Are you sure you want to restore <strong>{restoreFileName}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsRestoreConfirmOpen(false)}
              className="px-4 py-2 min-h-[44px] rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800 font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRestore}
              className="px-5 py-2 min-h-[44px] rounded-xl bg-bat-gold text-gotham-950 font-bold uppercase tracking-wider"
            >
              Confirm Restore
            </button>
          </div>
        </div>
      </Modal>

      {/* Class Timings & Breaks Modal */}
      {isClassTimingsModalOpen && (
        <ClassTimingsModal
          isOpen={isClassTimingsModalOpen}
          onClose={() => setIsClassTimingsModalOpen(false)}
        />
      )}

      {/* Share Class Setup Template Modal */}
      <ShareTemplateModal
        isOpen={isShareTemplateModalOpen}
        onClose={() => setIsShareTemplateModalOpen(false)}
      />

      {/* Import Class Setup Template Modal */}
      <ImportTemplateModal
        isOpen={isImportTemplateModalOpen}
        onClose={() => {
          setIsImportTemplateModalOpen(false);
          setImportingTemplate(null);
        }}
        initialTemplate={importingTemplate}
      />
    </div>
  );
};
