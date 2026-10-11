import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Plus,
  ArrowLeftRight,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, parseDate, DAY_NAMES } from '../../services/attendanceEngine';
import { DateOverrideModal } from './DateOverrideModal';
import { SubstitutionModal } from './SubstitutionModal';
import { Modal } from '../common/Modal';
import type { GeneratedClassInstance } from '../../types';

export const CalendarView: React.FC = () => {
  const {
    getSummaryForDate,
    recordAttendance,
    dateOverrides,
    dateSpecificSaturdayRules,
    saveDateOverride,
    deleteDateOverride,
    substitutions,
    saveSubstitution,
    deleteSubstitution,
    saveExtraClass,
    subjects,
    holidays,
    academicEvents,
  } = useApp();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => formatDate(new Date()));

  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState<boolean>(false);
  const [isSubstModalOpen, setIsSubstModalOpen] = useState<boolean>(false);
  const [substClassInstance, setSubstClassInstance] = useState<GeneratedClassInstance | null>(null);
  const [isExtraClassModalOpen, setIsExtraClassModalOpen] = useState<boolean>(false);
  const [extraSubId, setExtraSubId] = useState<string>('');
  const [extraDesc, setExtraDesc] = useState<string>('');

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const prevMonth = () => setCurrentMonthDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonthDate(new Date(year, month + 1, 1));
  const jumpToToday = () => {
    const today = new Date();
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(formatDate(today));
  };

  const days = useMemo(() => {
    const list: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];
    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevDate = new Date(year, month - 1, d);
      list.push({
        dateStr: formatDate(prevDate),
        dayNum: d,
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const curDate = new Date(year, month, i);
      list.push({
        dateStr: formatDate(curDate),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    const remaining = (7 - (list.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      list.push({
        dateStr: formatDate(nextDate),
        dayNum: i,
        isCurrentMonth: false,
      });
    }

    return list;
  }, [year, month]);

  const daysWithSummaries = useMemo(() => {
    return days.map(({ dateStr, dayNum, isCurrentMonth }) => {
      const summary = getSummaryForDate(dateStr);
      let dotColor: string | null = null;
      if (summary.classes.length > 0) {
        const hasAbsent = summary.classes.some((c) => c.status === 'absent');
        const allPresent = summary.classes.every((c) => c.status === 'present');
        if (hasAbsent) dotColor = 'bg-rose-500';
        else if (allPresent) dotColor = 'bg-emerald-500';
        else if (summary.classes.some((c) => c.status !== 'unmarked')) dotColor = 'bg-bat-gold';
        else dotColor = 'bg-slate-400 dark:bg-gotham-600';
      } else if (!summary.isWorkingDay) {
        dotColor = 'bg-slate-300 dark:bg-gotham-750';
      }

      return {
        dateStr,
        dayNum,
        isCurrentMonth,
        summary,
        dotColor,
      };
    });
  }, [days, getSummaryForDate]);

  const selectedSummary = useMemo(
    () => getSummaryForDate(selectedDateStr),
    [selectedDateStr, getSummaryForDate]
  );

  const selectedDateCounts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let cancelled = 0;
    for (const c of selectedSummary.classes) {
      if (c.status === 'present') present++;
      else if (c.status === 'absent') absent++;
      else if (c.status === 'cancelled') cancelled++;
    }
    return {
      total: selectedSummary.classes.length,
      present,
      absent,
      cancelled,
    };
  }, [selectedSummary]);

  const selectedDateObj = parseDate(selectedDateStr);
  const selectedDateFormatted = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const monthTitle = currentMonthDate.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const handleAddExtraClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraSubId) return;
    await saveExtraClass({
      id: `extra_${Date.now()}`,
      date: selectedDateStr,
      subjectId: extraSubId,
      periodsCount: 1,
      description: extraDesc.trim() || 'Extra Class',
      status: 'unmarked',
    });
    setExtraSubId('');
    setExtraDesc('');
    setIsExtraClassModalOpen(false);
  };

  const handleOpenSubstitution = (cls: GeneratedClassInstance) => {
    setSubstClassInstance(cls);
    setIsSubstModalOpen(true);
  };

  const existingOverride = dateOverrides.find((o) => o.date === selectedDateStr);

  return (
    <div className="space-y-6 animate-fadeIn max-w-xl mx-auto pb-12">
      {/* 1. MONTH NAVIGATION */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
            aria-label="Previous Month"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {monthTitle}
            </h2>
            <button
              onClick={jumpToToday}
              className="text-xs px-2.5 py-1 min-h-[32px] rounded-lg bg-slate-100 dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 hover:bg-slate-200 dark:hover:bg-gotham-700 font-medium"
            >
              Today
            </button>
          </div>

          <button
            onClick={nextMonth}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
            aria-label="Next Month"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Weekday Labels */}
        <div className="grid grid-cols-7 text-center mb-1 text-[11px] font-bold text-slate-400 dark:text-gotham-500 uppercase">
          <div>Su</div>
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
        </div>

        {/* Clean Day Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {daysWithSummaries.map(({ dateStr, dayNum, isCurrentMonth, dotColor }) => {
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === formatDate(new Date());

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`min-h-[44px] h-11 rounded-xl flex flex-col items-center justify-center transition-all relative ${
                  isSelected
                    ? 'bg-bat-gold text-gotham-950 font-bold ring-2 ring-bat-gold/50 shadow-sm'
                    : isToday
                    ? 'bg-slate-100 dark:bg-gotham-800 text-slate-900 dark:text-white font-bold'
                    : isCurrentMonth
                    ? 'text-slate-800 dark:text-gotham-200 hover:bg-slate-100 dark:hover:bg-gotham-800'
                    : 'text-slate-300 dark:text-gotham-600'
                }`}
              >
                <span className="text-xs font-mono">{dayNum}</span>
                {dotColor && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      isSelected ? 'bg-gotham-950' : dotColor
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. SELECTED DATE SUMMARY (Exact User Specification) */}
      <section className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-gotham-400">
            Selected Date
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {selectedDateFormatted}
          </h3>
          <p className="text-xs text-slate-500 dark:text-gotham-400 mt-0.5">
            {selectedSummary.statusReason}
          </p>
        </div>

        {/* Clean Stats Row */}
        <div className="grid grid-cols-4 gap-2 text-center py-2.5 bg-slate-50 dark:bg-gotham-850 rounded-2xl border border-slate-200 dark:border-gotham-800 font-mono">
          <div>
            <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase">Classes</div>
            <div className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
              {selectedDateCounts.total}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase">Present</div>
            <div className="font-bold text-emerald-600 dark:text-emerald-400 text-base mt-0.5">
              {selectedDateCounts.present}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase">Absent</div>
            <div className="font-bold text-rose-600 dark:text-rose-400 text-base mt-0.5">
              {selectedDateCounts.absent}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase">Cancelled</div>
            <div className="font-bold text-slate-500 dark:text-gotham-400 text-base mt-0.5">
              {selectedDateCounts.cancelled}
            </div>
          </div>
        </div>

        {/* Classes List */}
        {selectedSummary.classes.length === 0 ? (
          <p className="text-xs text-center py-3 text-slate-500 dark:text-gotham-500 font-medium">
            No classes on this date
          </p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {selectedSummary.classes.map((cls) => {
              const isMarked = cls.status !== 'unmarked';
              const isPresent = cls.status === 'present';
              const isAbsent = cls.status === 'absent';

              return (
                <div
                  key={cls.slotKey}
                  className="p-3.5 rounded-2xl border border-slate-200 dark:border-gotham-800 bg-slate-50/50 dark:bg-gotham-850/50 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {cls.subject.name}
                      </h4>
                      <span className="text-xs font-mono text-bat-accent">
                        {cls.periodLabel || `P${cls.periodNumber}`}
                      </span>
                    </div>

                    {isMarked ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold font-mono px-2 py-0.5 rounded-lg ${
                            isPresent
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : isAbsent
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-slate-200 dark:bg-gotham-800 text-slate-600 dark:text-gotham-400'
                          }`}
                        >
                          {isPresent ? '✓ Present' : isAbsent ? '✕ Absent' : 'Cancelled'}
                        </span>
                        <button
                          onClick={() =>
                            recordAttendance(
                              selectedDateStr,
                              cls.periodNumber,
                              cls.subject.id,
                              'unmarked',
                              cls.source,
                              cls.sourceRefId,
                              undefined,
                              cls.slotKey
                            )
                          }
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          title="Undo"
                          aria-label="Undo"
                        >
                          <RotateCcw size={15} />
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {!isMarked && (
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() =>
                          recordAttendance(
                            selectedDateStr,
                            cls.periodNumber,
                            cls.subject.id,
                            'present',
                            cls.source,
                            cls.sourceRefId,
                            cls.note,
                            cls.slotKey
                          )
                        }
                        className="min-h-[44px] py-2 px-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Check size={14} /> Present
                      </button>
                      <button
                        onClick={() =>
                          recordAttendance(
                            selectedDateStr,
                            cls.periodNumber,
                            cls.subject.id,
                            'absent',
                            cls.source,
                            cls.sourceRefId,
                            cls.note,
                            cls.slotKey
                          )
                        }
                        className="min-h-[44px] py-2 px-2 rounded-xl bg-rose-600 text-white font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <X size={14} /> Absent
                      </button>
                      <button
                        onClick={() =>
                          recordAttendance(
                            selectedDateStr,
                            cls.periodNumber,
                            cls.subject.id,
                            'cancelled',
                            cls.source,
                            cls.sourceRefId,
                            cls.note,
                            cls.slotKey
                          )
                        }
                        className="min-h-[44px] py-2 px-2 rounded-xl bg-slate-200 dark:bg-gotham-750 text-slate-700 dark:text-gotham-300 font-medium text-xs flex items-center justify-center"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions Bar */}
        <div className="pt-2 border-t border-slate-100 dark:border-gotham-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExtraClassModalOpen(true)}
              className="px-3 py-1.5 min-h-[44px] text-xs font-medium text-slate-700 dark:text-gotham-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 flex items-center gap-1"
            >
              <Plus size={14} className="text-bat-accent" /> Extra class
            </button>
            <button
              onClick={() => setIsOverrideModalOpen(true)}
              className="px-3 py-1.5 min-h-[44px] text-xs font-medium text-slate-700 dark:text-gotham-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 flex items-center gap-1"
            >
              <SlidersHorizontal size={14} /> Override day
            </button>
          </div>
        </div>
      </section>

      {/* Modals */}
      <DateOverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        dateStr={selectedDateStr}
        existingOverride={existingOverride}
        onSave={saveDateOverride}
        onDelete={deleteDateOverride}
      />

      {isSubstModalOpen && substClassInstance && (
        <SubstitutionModal
          isOpen={true}
          onClose={() => {
            setIsSubstModalOpen(false);
            setSubstClassInstance(null);
          }}
          dateStr={selectedDateStr}
          classInstance={substClassInstance}
          subjects={subjects}
          onSave={saveSubstitution}
          onDelete={deleteSubstitution}
          existingSubstitutions={substitutions}
        />
      )}

      {/* Add Extra Class Modal */}
      <Modal
        isOpen={isExtraClassModalOpen}
        onClose={() => setIsExtraClassModalOpen(false)}
        title={`Add Extra Class (${selectedDateFormatted})`}
      >
        <form onSubmit={handleAddExtraClass} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
              Subject
            </label>
            <select
              value={extraSubId}
              onChange={(e) => setExtraSubId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium text-sm focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px]"
            >
              <option value="">Select subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.shortName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
              Note (Optional)
            </label>
            <input
              type="text"
              value={extraDesc}
              onChange={(e) => setExtraDesc(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px]"
              placeholder="e.g. Remedial lab"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsExtraClassModalOpen(false)}
              className="px-4 py-2 min-h-[44px] text-xs font-medium rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 min-h-[44px] text-xs font-bold rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-sm"
            >
              Add Class
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
