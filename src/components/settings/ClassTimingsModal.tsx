import React, { useState, useMemo } from 'react';
import {
  Clock,
  Coffee,
  Plus,
  Trash2,
  Edit2,
  AlertCircle,
  Check,
  Calendar,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import type {
  PeriodTiming,
  BreakTiming,
  DayTimingConfig,
  DaySpecificTiming,
  DayOfWeek,
} from '../../types';
import {
  formatTimeDisplay,
  validateScheduleTimings,
  isValidTimeInterval,
  timeToMinutes,
} from '../../services/timingEngine';

interface ClassTimingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAY_LABELS: { dayOfWeek: DayOfWeek; label: string; name: string }[] = [
  { dayOfWeek: 1, label: 'Mon', name: 'Monday' },
  { dayOfWeek: 2, label: 'Tue', name: 'Tuesday' },
  { dayOfWeek: 3, label: 'Wed', name: 'Wednesday' },
  { dayOfWeek: 4, label: 'Thu', name: 'Thursday' },
  { dayOfWeek: 5, label: 'Fri', name: 'Friday' },
  { dayOfWeek: 6, label: 'Sat', name: 'Saturday' },
];

export const ClassTimingsModal: React.FC<ClassTimingsModalProps> = ({ isOpen, onClose }) => {
  const {
    classTimingSettings,
    saveClassTimingSettings,
  } = useApp();

  // Active tab: 'default' or dayOfWeek (1..6)
  const [activeTab, setActiveTab] = useState<'default' | DayOfWeek>('default');

  // Sub-modal state for Add/Edit Period
  const [isPeriodFormOpen, setIsPeriodFormOpen] = useState(false);
  const [editingPeriodNumber, setEditingPeriodNumber] = useState<number | null>(null);
  const [periodNumInput, setPeriodNumInput] = useState<number>(1);
  const [periodStartInput, setPeriodStartInput] = useState<string>('09:00');
  const [periodEndInput, setPeriodEndInput] = useState<string>('10:00');
  const [periodError, setPeriodError] = useState<string | null>(null);

  // Sub-modal state for Add/Edit Break
  const [isBreakFormOpen, setIsBreakFormOpen] = useState(false);
  const [editingBreakId, setEditingBreakId] = useState<string | null>(null);
  const [breakNameInput, setBreakNameInput] = useState<string>('');
  const [breakStartInput, setBreakStartInput] = useState<string>('11:00');
  const [breakEndInput, setBreakEndInput] = useState<string>('11:15');
  const [breakError, setBreakError] = useState<string | null>(null);

  const [savedToast, setSavedToast] = useState(false);

  // Active configuration for the current tab
  const activeConfig: DayTimingConfig = useMemo(() => {
    if (!classTimingSettings) {
      return { periods: [], breaks: [] };
    }
    if (activeTab === 'default') {
      return classTimingSettings.defaultTiming || { periods: [], breaks: [] };
    }
    const daySpecific = classTimingSettings.daySpecificTimings?.find(d => d.dayOfWeek === activeTab);
    return daySpecific || classTimingSettings.defaultTiming || { periods: [], breaks: [] };
  }, [classTimingSettings, activeTab]);

  // Is this day using custom timing or default timing?
  const isCustomDay = useMemo(() => {
    if (activeTab === 'default') return false;
    return !!classTimingSettings?.daySpecificTimings?.some(d => d.dayOfWeek === activeTab);
  }, [classTimingSettings, activeTab]);

  // Validation of the active configuration
  const validation = useMemo(() => {
    return validateScheduleTimings(activeConfig.periods || [], activeConfig.breaks || []);
  }, [activeConfig]);

  // Helper to commit new settings
  const commitConfig = async (newConfig: DayTimingConfig) => {
    const current = classTimingSettings || {
      defaultTiming: { periods: [], breaks: [] },
      daySpecificTimings: [],
      dateOverrides: [],
    };

    if (activeTab === 'default') {
      const updated = {
        ...current,
        defaultTiming: newConfig,
      };
      await saveClassTimingSettings(updated);
    } else {
      const daySpecifics = [...(current.daySpecificTimings || [])].filter(d => d.dayOfWeek !== activeTab);
      daySpecifics.push({
        dayOfWeek: activeTab,
        periods: newConfig.periods,
        breaks: newConfig.breaks,
      });
      const updated = {
        ...current,
        daySpecificTimings: daySpecifics,
      };
      await saveClassTimingSettings(updated);
    }
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  // Toggle day customization on/off
  const toggleDayCustomization = async (enable: boolean) => {
    if (activeTab === 'default') return;
    const current = classTimingSettings || {
      defaultTiming: { periods: [], breaks: [] },
      daySpecificTimings: [],
      dateOverrides: [],
    };

    if (enable) {
      // Clone default timing into this day
      const daySpecifics = [...(current.daySpecificTimings || [])].filter(d => d.dayOfWeek !== activeTab);
      daySpecifics.push({
        dayOfWeek: activeTab,
        periods: [...(current.defaultTiming?.periods || [])],
        breaks: [...(current.defaultTiming?.breaks || [])],
      });
      await saveClassTimingSettings({ ...current, daySpecificTimings: daySpecifics });
    } else {
      // Remove day customization and revert to default
      const daySpecifics = (current.daySpecificTimings || []).filter(d => d.dayOfWeek !== activeTab);
      await saveClassTimingSettings({ ...current, daySpecificTimings: daySpecifics });
    }
  };

  // Open period form
  const handleOpenAddPeriod = () => {
    const nextNum = (activeConfig.periods.length > 0)
      ? Math.max(...activeConfig.periods.map(p => p.periodNumber)) + 1
      : 1;

    let defaultStart = '09:00';
    let defaultEnd = '10:00';

    if (activeConfig.periods.length > 0) {
      const lastP = [...activeConfig.periods].sort((a, b) => a.periodNumber - b.periodNumber).pop();
      if (lastP?.endTime) {
        defaultStart = lastP.endTime;
        const endM = timeToMinutes(defaultStart) + 60;
        if (endM < 1440) {
          const h = Math.floor(endM / 60);
          const m = endM % 60;
          defaultEnd = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
      }
    }

    setEditingPeriodNumber(null);
    setPeriodNumInput(nextNum);
    setPeriodStartInput(defaultStart);
    setPeriodEndInput(defaultEnd);
    setPeriodError(null);
    setIsPeriodFormOpen(true);
  };

  const handleOpenEditPeriod = (p: PeriodTiming) => {
    setEditingPeriodNumber(p.periodNumber);
    setPeriodNumInput(p.periodNumber);
    setPeriodStartInput(p.startTime);
    setPeriodEndInput(p.endTime);
    setPeriodError(null);
    setIsPeriodFormOpen(true);
  };

  const handleSavePeriod = async () => {
    setPeriodError(null);
    const intervalCheck = isValidTimeInterval(periodStartInput, periodEndInput);
    if (!intervalCheck.isValid) {
      setPeriodError(intervalCheck.error || 'Invalid interval');
      return;
    }

    const otherPeriods = activeConfig.periods.filter(
      p => editingPeriodNumber === null ? p.periodNumber !== periodNumInput : p.periodNumber !== editingPeriodNumber
    );

    const updatedPeriods = [...otherPeriods, {
      periodNumber: periodNumInput,
      startTime: periodStartInput,
      endTime: periodEndInput,
    }].sort((a, b) => a.periodNumber - b.periodNumber);

    const testValidation = validateScheduleTimings(updatedPeriods, activeConfig.breaks);
    if (!testValidation.isValid) {
      setPeriodError(testValidation.error || 'Timings overlap with an existing period or break.');
      return;
    }

    await commitConfig({
      periods: updatedPeriods,
      breaks: activeConfig.breaks,
    });
    setIsPeriodFormOpen(false);
  };

  const handleDeletePeriod = async (periodNumber: number) => {
    const updatedPeriods = activeConfig.periods.filter(p => p.periodNumber !== periodNumber);
    await commitConfig({
      periods: updatedPeriods,
      breaks: activeConfig.breaks,
    });
  };

  // Open break form
  const handleOpenAddBreak = () => {
    setEditingBreakId(null);
    setBreakNameInput('Short Break');
    setBreakStartInput('11:00');
    setBreakEndInput('11:15');
    setBreakError(null);
    setIsBreakFormOpen(true);
  };

  const handleOpenEditBreak = (b: BreakTiming) => {
    setEditingBreakId(b.id);
    setBreakNameInput(b.name);
    setBreakStartInput(b.startTime);
    setBreakEndInput(b.endTime);
    setBreakError(null);
    setIsBreakFormOpen(true);
  };

  const handleSaveBreak = async () => {
    setBreakError(null);
    if (!breakNameInput.trim()) {
      setBreakError('Break name is required (e.g. Lunch, Tea Break).');
      return;
    }

    const intervalCheck = isValidTimeInterval(breakStartInput, breakEndInput);
    if (!intervalCheck.isValid) {
      setBreakError(intervalCheck.error || 'Invalid interval');
      return;
    }

    const breakId = editingBreakId || `brk_${Date.now()}`;
    const otherBreaks = activeConfig.breaks.filter(b => b.id !== breakId);
    const updatedBreaks = [...otherBreaks, {
      id: breakId,
      name: breakNameInput.trim(),
      startTime: breakStartInput,
      endTime: breakEndInput,
    }].sort((a, b) => a.startTime.localeCompare(b.startTime));

    const testValidation = validateScheduleTimings(activeConfig.periods, updatedBreaks);
    if (!testValidation.isValid) {
      setBreakError(testValidation.error || 'Break overlaps with an existing class or break.');
      return;
    }

    await commitConfig({
      periods: activeConfig.periods,
      breaks: updatedBreaks,
    });
    setIsBreakFormOpen(false);
  };

  const handleDeleteBreak = async (breakId: string) => {
    const updatedBreaks = activeConfig.breaks.filter(b => b.id !== breakId);
    await commitConfig({
      periods: activeConfig.periods,
      breaks: updatedBreaks,
    });
  };

  // Quick preset template
  const handleApplyPreset = async () => {
    const presetPeriods: PeriodTiming[] = [
      { periodNumber: 1, startTime: '09:00', endTime: '10:00' },
      { periodNumber: 2, startTime: '10:00', endTime: '11:00' },
      { periodNumber: 3, startTime: '11:15', endTime: '12:15' },
      { periodNumber: 4, startTime: '12:15', endTime: '13:15' },
      { periodNumber: 5, startTime: '14:00', endTime: '15:00' },
      { periodNumber: 6, startTime: '15:00', endTime: '16:00' },
    ];
    const presetBreaks: BreakTiming[] = [
      { id: 'brk_tea', name: 'Short Break', startTime: '11:00', endTime: '11:15' },
      { id: 'brk_lunch', name: 'Lunch', startTime: '13:15', endTime: '14:00' },
    ];
    await commitConfig({
      periods: presetPeriods,
      breaks: presetBreaks,
    });
  };

  const sortedPeriods = useMemo(() => {
    return [...(activeConfig.periods || [])].sort((a, b) => a.periodNumber - b.periodNumber);
  }, [activeConfig.periods]);

  const sortedBreaks = useMemo(() => {
    return [...(activeConfig.breaks || [])].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activeConfig.breaks]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Class Timings & Breaks"
      maxWidth="max-w-xl"
    >
      <div className="space-y-5 text-slate-800 dark:text-gotham-100">
        {/* Intro */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-gotham-300">
          Configure start and end hours for your periods and breaks. Timings power next-class notifications, widget status, and the home-screen timeline.
        </p>

        {/* Saved Toast */}
        {savedToast && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-fadeIn">
            <Check size={14} />
            <span>Timings saved successfully</span>
          </div>
        )}

        {/* Scope Tabs (Default vs Days) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200 dark:border-gotham-800">
          <button
            onClick={() => setActiveTab('default')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'default'
                ? 'bg-amber-400 text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800'
            }`}
          >
            Default (All Days)
          </button>
          {DAY_LABELS.map(d => (
            <button
              key={d.dayOfWeek}
              onClick={() => setActiveTab(d.dayOfWeek)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1 ${
                activeTab === d.dayOfWeek
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800'
              }`}
            >
              <span>{d.label}</span>
              {classTimingSettings?.daySpecificTimings?.some(ds => ds.dayOfWeek === d.dayOfWeek) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          ))}
        </div>

        {/* Day-specific override banner */}
        {activeTab !== 'default' && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-100 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-800 text-xs">
            <div>
              <span className="font-semibold text-slate-800 dark:text-white">
                {DAY_LABELS.find(d => d.dayOfWeek === activeTab)?.name} Schedule
              </span>
              <p className="text-[11px] text-slate-500 dark:text-gotham-400">
                {isCustomDay
                  ? 'Customized for this weekday.'
                  : 'Currently using the Default Schedule.'}
              </p>
            </div>
            {isCustomDay ? (
              <button
                onClick={() => toggleDayCustomization(false)}
                className="px-2.5 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 font-medium transition-colors text-[11px]"
              >
                Reset to Default
              </button>
            ) : (
              <button
                onClick={() => toggleDayCustomization(true)}
                className="px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30 hover:bg-amber-400/20 font-medium transition-colors text-[11px]"
              >
                Customize Day
              </button>
            )}
          </div>
        )}

        {/* Validation Warning */}
        {!validation.isValid && (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{validation.error}</span>
          </div>
        )}

        {/* Quick preset when empty */}
        {sortedPeriods.length === 0 && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gotham-850/60 border border-slate-200 dark:border-gotham-800 text-center space-y-3">
            <Clock size={28} className="mx-auto text-amber-400" />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                No Timings Configured
              </h4>
              <p className="text-xs text-slate-500 dark:text-gotham-400 mt-0.5">
                Add periods and breaks manually, or start with a standard college template.
              </p>
            </div>
            <button
              onClick={handleApplyPreset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm"
            >
              <Sparkles size={14} />
              <span>Apply Standard Template (P1–P6 + Lunch)</span>
            </button>
          </div>
        )}

        {/* SECTION 1: PERIOD TIMINGS */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-200">
                Class Periods ({sortedPeriods.length})
              </h3>
            </div>
            <button
              onClick={handleOpenAddPeriod}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-400/15 text-amber-400 border border-amber-400/30 hover:bg-amber-400/25 text-xs font-semibold transition-colors"
            >
              <Plus size={13} />
              <span>Add Period</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {sortedPeriods.map(p => {
              const sMin = timeToMinutes(p.startTime);
              const eMin = timeToMinutes(p.endTime);
              const duration = !isNaN(sMin) && !isNaN(eMin) && eMin > sMin ? eMin - sMin : 0;

              return (
                <div
                  key={p.periodNumber}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gotham-850 border border-slate-200 dark:border-gotham-800/80 transition-all hover:border-slate-300 dark:hover:border-gotham-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-amber-400/15 text-amber-400 border border-amber-400/30 flex items-center justify-center font-mono font-bold text-xs">
                      P{p.periodNumber}
                    </span>
                    <div>
                      <div className="font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {formatTimeDisplay(p.startTime)} — {formatTimeDisplay(p.endTime)}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-gotham-400">
                        {duration > 0 ? `${duration} min` : 'Duration invalid'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditPeriod(p)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-100 dark:hover:bg-gotham-750 transition-colors"
                      aria-label="Edit period"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeletePeriod(p.periodNumber)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      aria-label="Delete period"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: BREAKS */}
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-gotham-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coffee size={16} className="text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-200">
                Breaks ({sortedBreaks.length})
              </h3>
            </div>
            <button
              onClick={handleOpenAddBreak}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 dark:bg-gotham-800 text-slate-300 dark:text-gotham-300 border border-slate-300 dark:border-gotham-700 hover:bg-slate-100 dark:hover:bg-gotham-750 text-xs font-semibold transition-colors"
            >
              <Plus size={13} />
              <span>Add Break</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {sortedBreaks.map(b => {
              const sMin = timeToMinutes(b.startTime);
              const eMin = timeToMinutes(b.endTime);
              const duration = !isNaN(sMin) && !isNaN(eMin) && eMin > sMin ? eMin - sMin : 0;

              return (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl bg-white dark:bg-gotham-850 border border-slate-200 dark:border-gotham-800/80 transition-all hover:border-slate-300 dark:hover:border-gotham-700"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-gotham-800 text-slate-600 dark:text-gotham-300 border border-slate-200 dark:border-gotham-700 flex items-center justify-center">
                      <Coffee size={14} />
                    </span>
                    <div>
                      <div className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {b.name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-gotham-400">
                        {formatTimeDisplay(b.startTime)} — {formatTimeDisplay(b.endTime)} ({duration}m)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditBreak(b)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-100 dark:hover:bg-gotham-750 transition-colors"
                      aria-label="Edit break"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteBreak(b.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      aria-label="Delete break"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-gotham-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm"
          >
            Done
          </button>
        </div>
      </div>

      {/* SUB-MODAL: Add / Edit Period */}
      {isPeriodFormOpen && (
        <Modal
          isOpen={isPeriodFormOpen}
          onClose={() => setIsPeriodFormOpen(false)}
          title={editingPeriodNumber === null ? 'Add Period Timing' : `Edit P${editingPeriodNumber} Timing`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-slate-800 dark:text-gotham-100">
            {periodError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{periodError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
                Period Number
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={periodNumInput}
                onChange={e => setPeriodNumInput(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-700 text-sm font-mono text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={periodStartInput}
                  onChange={e => setPeriodStartInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-700 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={periodEndInput}
                  onChange={e => setPeriodEndInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-700 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-gotham-800">
              <button
                onClick={() => setIsPeriodFormOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gotham-700 text-xs font-medium text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePeriod}
                className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* SUB-MODAL: Add / Edit Break */}
      {isBreakFormOpen && (
        <Modal
          isOpen={isBreakFormOpen}
          onClose={() => setIsBreakFormOpen(false)}
          title={editingBreakId === null ? 'Add Break' : 'Edit Break'}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-slate-800 dark:text-gotham-100">
            {breakError && (
              <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{breakError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
                Break Name
              </label>
              <input
                type="text"
                placeholder="e.g. Lunch, Short Break, Tea Break"
                value={breakNameInput}
                onChange={e => setBreakNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-700 text-sm text-slate-900 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={breakStartInput}
                  onChange={e => setBreakStartInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-700 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={breakEndInput}
                  onChange={e => setBreakEndInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-700 text-sm font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-gotham-800">
              <button
                onClick={() => setIsBreakFormOpen(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gotham-700 text-xs font-medium text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBreak}
                className="px-4 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs hover:bg-amber-300 transition-colors shadow-sm"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
