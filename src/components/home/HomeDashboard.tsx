import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Plus,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Coffee,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDate, parseDate } from '../../services/attendanceEngine';
import { formatTimeDisplay, formatDuration, resolveDayTiming, timeToMinutes } from '../../services/timingEngine';
import { DailyReviewModal } from './DailyReviewModal';
import { Modal } from '../common/Modal';

export const HomeDashboard: React.FC = () => {
  const {
    semesterSettings,
    overallStats,
    getSummaryForDate,
    recordAttendance,
    updateSemesterSettings,
    setActiveTab,
    saveExtraClass,
    subjects,
    timetable,
    classTimingSettings,
    todayTimeline,
    getTimelineForDate,
  } = useApp();

  const [currentDateStr, setCurrentDateStr] = useState<string>(() => formatDate(new Date()));
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isCustomTargetOpen, setIsCustomTargetOpen] = useState<boolean>(false);
  const [customTargetInput, setCustomTargetInput] = useState<string>(
    (semesterSettings?.defaultTarget || 85).toString()
  );
  const [isExtraClassModalOpen, setIsExtraClassModalOpen] = useState<boolean>(false);
  const [extraSubId, setExtraSubId] = useState<string>('');
  const [extraDesc, setExtraDesc] = useState<string>('');

  const todayStr = formatDate(new Date());
  const isViewingToday = currentDateStr === todayStr;

  const currentSummary = getSummaryForDate(currentDateStr);
  const activeDayTiming = useMemo(() => {
    return resolveDayTiming(currentDateStr, classTimingSettings);
  }, [currentDateStr, classTimingSettings]);
  const activeTimeline = useMemo(() => {
    return getTimelineForDate(currentDateStr);
  }, [getTimelineForDate, currentDateStr]);

  const targetPct = semesterSettings?.defaultTarget || 85;
  const isAboveTarget = overallStats.percentage >= targetPct;

  const changeDateBy = (days: number) => {
    const d = parseDate(currentDateStr);
    d.setDate(d.getDate() + days);
    setCurrentDateStr(formatDate(d));
  };

  const setTarget = async (newTarget: number) => {
    if (!semesterSettings) return;
    await updateSemesterSettings({
      ...semesterSettings,
      defaultTarget: newTarget,
    });
  };

  const handleCustomTargetSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customTargetInput);
    if (!isNaN(val) && val > 0 && val <= 100) {
      await setTarget(val);
      setIsCustomTargetOpen(false);
    }
  };

  const handleAddExtraClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extraSubId) return;
    await saveExtraClass({
      id: `extra_${Date.now()}`,
      date: currentDateStr,
      subjectId: extraSubId,
      periodsCount: 1,
      description: extraDesc.trim() || 'Extra Class',
      status: 'unmarked',
    });
    setExtraSubId('');
    setExtraDesc('');
    setIsExtraClassModalOpen(false);
  };

  const dateObj = parseDate(currentDateStr);
  const weekdayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
      {/* 1. TOP ATTENDANCE HERO (Premium Gotham Ring Visualization) */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 dark:from-[#141724] dark:via-[#10121c] dark:to-[#090b10] border border-slate-800 dark:border-gotham-750/70 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Subtle Ambient Gotham Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 bg-bat-accent/15 rounded-full blur-2xl pointer-events-none" />

        {/* Top Meta Bar */}
        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gotham-400 font-medium relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-bat-gold shadow-bat-glow-sm" />
            <span className="uppercase tracking-widest text-[11px] font-bold text-slate-300 dark:text-gotham-300">
              Attendance
            </span>
          </div>
          <button
            onClick={() => setIsCustomTargetOpen(true)}
            className="hover:underline flex items-center gap-1 text-slate-300 dark:text-gotham-300 bg-white/5 dark:bg-gotham-800/80 px-2.5 py-1 rounded-full border border-white/10 dark:border-gotham-700 transition-colors"
          >
            <span>Target:</span>
            <strong className="text-bat-accent font-mono">{targetPct}%</strong>
          </button>
        </div>

        {/* Hero Centerpiece: Big, Majestic Percentage + Secondary Stats */}
        <div className="flex flex-col items-center justify-center text-center relative z-10 py-1">
          <div className="flex items-baseline justify-center gap-1">
            <span
              className={`text-5xl sm:text-6xl font-black font-mono tracking-tight ${
                isAboveTarget ? 'text-emerald-400' : 'text-rose-400'
              }`}
              style={{
                textShadow: isAboveTarget
                  ? '0 0 24px rgba(52, 211, 153, 0.3)'
                  : '0 0 24px rgba(251, 113, 133, 0.3)',
              }}
            >
              {overallStats.percentage.toFixed(1)}%
            </span>
          </div>

          <p className="text-xs sm:text-sm font-medium text-slate-300 dark:text-gotham-300 mt-1">
            {overallStats.conducted > 0 ? (
              <span>
                <strong className="text-white font-mono">{overallStats.present}</strong> of{' '}
                <strong className="text-white font-mono">{overallStats.conducted}</strong> classes attended
              </span>
            ) : (
              <span className="text-slate-400 dark:text-gotham-400">No classes conducted yet</span>
            )}
          </p>

          {/* Sleek Progress Bar with Target Notch */}
          <div className="w-full max-w-sm mt-4 mb-2 px-2">
            <div className="h-2.5 w-full bg-slate-800/90 dark:bg-gotham-800/90 rounded-full overflow-hidden relative border border-white/5 dark:border-gotham-700/50">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  isAboveTarget
                    ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                    : 'bg-gradient-to-r from-rose-600 via-rose-500 to-red-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overallStats.percentage))}%` }}
              />
              {/* Target Marker Notch */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-10 pointer-events-none"
                style={{ left: `${Math.min(99, Math.max(1, targetPct))}%` }}
                title={`Target: ${targetPct}%`}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 dark:text-gotham-400 mt-1.5 px-0.5">
              <span>0%</span>
              <span className="text-amber-400/90 flex items-center gap-1 font-semibold">
                ▲ Target {targetPct}%
              </span>
              <span>100%</span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-1">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                isAboveTarget
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isAboveTarget ? (
                <>
                  <CheckCircle2 size={13} className="stroke-[2.5]" />
                  <span>On Track</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="stroke-[2.5]" />
                  <span>Below Target</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Natural Language Status Banner */}
        <div className="relative z-10 bg-white/5 dark:bg-gotham-850/80 border border-white/10 dark:border-gotham-750/70 rounded-2xl px-4 py-2.5 text-center text-xs sm:text-sm text-slate-300 dark:text-gotham-200">
          {isAboveTarget ? (
            <span>
              You're above target.{' '}
              {overallStats.canMiss > 0 ? (
                <span>
                  You can miss <strong className="text-bat-accent font-mono text-sm">{overallStats.canMiss}</strong> more {overallStats.canMiss === 1 ? 'class' : 'classes'} without going below {targetPct}%.
                </span>
              ) : (
                <span>Maintain perfect attendance to remain on track.</span>
              )}
            </span>
          ) : (
            <span>
              You're below target.{' '}
              {overallStats.needToAttend > 0 && (
                <span>
                  Attend next <strong className="text-rose-400 font-mono text-sm">{overallStats.needToAttend}</strong> {overallStats.needToAttend === 1 ? 'class' : 'classes'} in a row to recover.
                </span>
              )}
            </span>
          )}
        </div>
      </section>

      {/* 2. DATE SELECTOR BAR */}
      <div className="flex items-center justify-between bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 rounded-2xl px-3 py-2">
        <button
          onClick={() => changeDateBy(-1)}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={() => setCurrentDateStr(todayStr)}
          className="text-center px-4 py-1 min-h-[44px] flex flex-col justify-center"
        >
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            {isViewingToday ? 'Today' : weekdayName}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-gotham-400">
            {dateFormatted}
          </span>
        </button>

        <button
          onClick={() => changeDateBy(1)}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
          aria-label="Next day"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 3. TODAY'S CLASSES (Vertical List with 1-Tap Attendance) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gotham-400">
            {isViewingToday ? `Today · ${weekdayName}` : `${weekdayName} · ${dateFormatted}`}
          </h2>
          <span className="text-xs text-slate-500 dark:text-gotham-400">
            {currentSummary.classes.length} {currentSummary.classes.length === 1 ? 'class' : 'classes'}
          </span>
        </div>

        {currentSummary.classes.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-dashed border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900/40">
            <p className="text-sm font-medium text-slate-700 dark:text-gotham-300">
              No classes scheduled
            </p>
            <p className="text-xs text-slate-500 dark:text-gotham-500 mt-0.5">
              {currentSummary.statusReason || 'Enjoy your day off'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsExtraClassModalOpen(true)}
                className="px-3.5 py-2 min-h-[44px] rounded-xl border border-slate-200 dark:border-gotham-750 text-xs font-medium text-slate-700 dark:text-gotham-200 hover:bg-slate-100 dark:hover:bg-gotham-800"
              >
                + Extra Class
              </button>
              <button
                onClick={() => setActiveTab('timetable')}
                className="px-3.5 py-2 min-h-[44px] rounded-xl bg-slate-900 dark:bg-gotham-800 text-white dark:text-bat-accent text-xs font-medium hover:bg-slate-800"
              >
                Timetable
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {/* Active Break Banner */}
            {isViewingToday && activeTimeline.state === 'in_break' && activeTimeline.activeBreak && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-600 dark:text-amber-400 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Coffee size={18} className="animate-pulse flex-shrink-0" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Break In Progress
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {activeTimeline.activeBreak.name} ({formatTimeDisplay(activeTimeline.activeBreak.startTime)} – {formatTimeDisplay(activeTimeline.activeBreak.endTime)})
                    </p>
                  </div>
                </div>
                {activeTimeline.nextClass && activeTimeline.minutesUntilNext !== undefined && (
                  <div className="text-right flex-shrink-0">
                    <span className="text-[10px] font-mono block opacity-75 uppercase">Next class</span>
                    <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                      in {activeTimeline.minutesUntilNext}m
                    </span>
                  </div>
                )}
              </div>
            )}

            {currentSummary.classes.map((cls, idx) => {
              const isMarked = cls.status !== 'unmarked';
              const isPresent = cls.status === 'present';
              const isAbsent = cls.status === 'absent';
              const isCancelled = cls.status === 'cancelled';

              const timeDisplay = cls.startTime && cls.endTime
                ? `${formatTimeDisplay(cls.startTime)} – ${formatTimeDisplay(cls.endTime)}`
                : cls.startTime
                ? formatTimeDisplay(cls.startTime)
                : 'Timing unconfigured';

              const isCurrent = isViewingToday && activeTimeline.state === 'in_class' && activeTimeline.activeClass?.slotKey === cls.slotKey;
              const isNext = isViewingToday && (activeTimeline.state === 'before_first' || activeTimeline.state === 'between_classes' || activeTimeline.state === 'in_break') && activeTimeline.nextClass?.slotKey === cls.slotKey;

              const prevClass = idx > 0 ? currentSummary.classes[idx - 1] : null;
              const interveningBreak = prevClass && activeDayTiming?.breaks?.find((b) => {
                if (!prevClass.endTime || !cls.startTime) return false;
                const bStart = timeToMinutes(b.startTime);
                const prevEnd = timeToMinutes(prevClass.endTime);
                const currStart = timeToMinutes(cls.startTime);
                return bStart >= prevEnd && bStart < currStart;
              });

              return (
                <React.Fragment key={cls.slotKey}>
                  {/* Intervening Break between consecutive periods */}
                  {interveningBreak && (
                    <div className="flex items-center justify-between py-1.5 px-3.5 rounded-xl bg-slate-100/70 dark:bg-gotham-900/60 border border-dashed border-slate-200 dark:border-gotham-800 text-[11px] font-mono text-slate-500 dark:text-gotham-400">
                      <div className="flex items-center gap-1.5">
                        <Coffee size={13} className="text-amber-500" />
                        <span className="font-semibold text-slate-700 dark:text-gotham-300">{interveningBreak.name}</span>
                      </div>
                      <span>
                        {formatTimeDisplay(interveningBreak.startTime)} – {formatTimeDisplay(interveningBreak.endTime)}
                      </span>
                    </div>
                  )}

                  <div
                    className={`p-4 rounded-2xl border transition-all duration-200 ${
                      isPresent
                        ? 'bg-emerald-500/5 dark:bg-[#0c1a16] border-emerald-500/40 border-l-4 border-l-emerald-500 shadow-sm'
                        : isAbsent
                        ? 'bg-rose-500/5 dark:bg-[#1c0f14] border-rose-500/40 border-l-4 border-l-rose-500 shadow-sm'
                        : isCancelled
                        ? 'bg-slate-100/50 dark:bg-[#10131b] border-slate-200 dark:border-gotham-800 border-l-4 border-l-slate-400 opacity-75'
                        : isCurrent
                        ? 'bg-white dark:bg-[#12151e] border-bat-accent border-l-4 border-l-bat-accent shadow-md ring-1 ring-bat-accent/20'
                        : 'bg-white dark:bg-[#12151e] border-slate-200/90 dark:border-gotham-800 border-l-4 border-l-bat-gold/60 shadow-sm hover:border-slate-300 dark:hover:border-gotham-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-bat-gold/10 text-bat-accent font-mono font-bold text-[11px] border border-bat-gold/25 tracking-wider">
                            {cls.periodLabel || `P${cls.periodNumber}`}
                          </span>
                          <span className="text-xs font-mono text-slate-500 dark:text-gotham-400">
                            {timeDisplay}
                          </span>
                          {isCurrent && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-bold text-[10px] uppercase tracking-wider animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              In Progress
                            </span>
                          )}
                          {isNext && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bat-gold/20 text-bat-accent font-mono font-bold text-[10px] uppercase tracking-wider">
                              <Clock size={11} />
                              {activeTimeline.minutesUntilNext !== undefined ? `Starts in ${activeTimeline.minutesUntilNext}m` : 'Next Class'}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 dark:text-gotham-500 capitalize">
                            • {cls.subject.type || 'Lecture'}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
                          {cls.subject.name}
                        </h3>
                        {cls.unitSize && cls.unitSize > 1 && (
                          <span className="inline-block mt-0.5 text-[10px] font-mono text-bat-accent/90 uppercase tracking-wider font-semibold">
                            Grouped Unit ({cls.unitSize} periods)
                          </span>
                        )}
                      </div>

                      {/* If marked: show status pill and Undo button */}
                      {isMarked && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`text-xs font-bold font-mono px-3 py-1.5 rounded-xl flex items-center gap-1 border ${
                            isPresent
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : isAbsent
                              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                              : 'bg-slate-200 dark:bg-gotham-800 text-slate-600 dark:text-gotham-300 border-slate-300 dark:border-gotham-700'
                          }`}
                        >
                          {isPresent && <Check size={13} strokeWidth={3} />}
                          {isAbsent && <X size={13} strokeWidth={3} />}
                          {isPresent ? 'Present' : isAbsent ? 'Absent' : 'Cancelled'}
                        </span>
                        <button
                          onClick={() =>
                            recordAttendance(
                              currentDateStr,
                              cls.periodNumber,
                              cls.subject.id,
                              'unmarked',
                              cls.source,
                              cls.sourceRefId,
                              undefined,
                              cls.slotKey
                            )
                          }
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-xs text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 transition-all active:scale-90"
                          title="Undo attendance"
                          aria-label="Undo attendance"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* If unmarked: show prominent, high-contrast action buttons */}
                  {!isMarked && (
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() =>
                          recordAttendance(
                            currentDateStr,
                            cls.periodNumber,
                            cls.subject.id,
                            'present',
                            cls.source,
                            cls.sourceRefId,
                            cls.note,
                            cls.slotKey
                          )
                        }
                        className="min-h-[44px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <Check size={16} strokeWidth={3} /> Present
                      </button>

                      <button
                        onClick={() =>
                          recordAttendance(
                            currentDateStr,
                            cls.periodNumber,
                            cls.subject.id,
                            'absent',
                            cls.source,
                            cls.sourceRefId,
                            cls.note,
                            cls.slotKey
                          )
                        }
                        className="min-h-[44px] py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                      >
                        <X size={16} strokeWidth={3} /> Absent
                      </button>

                      <button
                        onClick={() =>
                          recordAttendance(
                            currentDateStr,
                            cls.periodNumber,
                            cls.subject.id,
                            'cancelled',
                            cls.source,
                            cls.sourceRefId,
                            cls.note,
                            cls.slotKey
                          )
                        }
                        className="min-h-[44px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-gotham-800 dark:hover:bg-gotham-750 text-slate-700 dark:text-gotham-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center transition-all border border-slate-200 dark:border-gotham-700 active:scale-95"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Action footer */}
        {currentSummary.hasClasses && (
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setIsExtraClassModalOpen(true)}
              className="text-xs font-medium text-slate-600 dark:text-gotham-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 min-h-[44px]"
            >
              <Plus size={15} className="text-bat-accent" /> Add extra class
            </button>

            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="text-xs font-bold text-bat-accent hover:underline flex items-center gap-1 min-h-[44px]"
            >
              <CheckCircle2 size={16} /> Confirm day
            </button>
          </div>
        )}
      </section>

      {/* Review Modal */}
      <DailyReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        dateStr={currentDateStr}
      />

      {/* Custom Target Modal */}
      <Modal
        isOpen={isCustomTargetOpen}
        onClose={() => setIsCustomTargetOpen(false)}
        title="Set Target Attendance"
      >
        <form onSubmit={handleCustomTargetSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-gotham-300 mb-1">
              Target Percentage (%)
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="1"
              max="100"
              step="0.5"
              value={customTargetInput}
              onChange={(e) => setCustomTargetInput(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-bold text-lg focus:outline-none focus:ring-2 focus:ring-bat-gold"
              placeholder="e.g. 85"
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsCustomTargetOpen(false)}
              className="px-4 py-2 min-h-[44px] text-xs font-medium rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 min-h-[44px] text-xs font-bold rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-sm"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Extra Class Modal */}
      <Modal
        isOpen={isExtraClassModalOpen}
        onClose={() => setIsExtraClassModalOpen(false)}
        title={`Add Extra Class (${dateFormatted})`}
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
              placeholder="e.g. Remedial lecture"
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
