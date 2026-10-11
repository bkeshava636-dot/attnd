import React from 'react';
import {
  Check,
  X,
  Ban,
  CheckCircle2,
  Calendar as CalendarIcon,
  Plus,
  Undo2,
} from 'lucide-react';
import type { DayClassSummary } from '../../types';
import { Badge } from '../common/Badge';

interface HomeDailyClassesProps {
  currentSummary: DayClassSummary;
  currentDateStr: string;
  formattedDateHeader: string;
  fullDateLabel: string;
  isViewingToday: boolean;
  onRecordAttendance: (
    dateStr: string,
    periodNumber: number,
    subjectId: string,
    status: 'present' | 'absent' | 'cancelled' | 'unmarked',
    source?: any,
    sourceRefId?: string,
    note?: string,
    slotKey?: string
  ) => Promise<void>;
  onOpenExtraClassModal: () => void;
  onOpenReviewModal: () => void;
  onNavigateToTimetable: () => void;
}

export const HomeDailyClasses: React.FC<HomeDailyClassesProps> = ({
  currentSummary,
  currentDateStr,
  fullDateLabel,
  isViewingToday,
  onRecordAttendance,
  onOpenExtraClassModal,
  onOpenReviewModal,
  onNavigateToTimetable,
}) => {
  return (
    <div className="space-y-3 pt-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>{isViewingToday ? `TODAY • ${fullDateLabel}` : fullDateLabel}</span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-gotham-800 text-slate-700 dark:text-gotham-200 border border-slate-300 dark:border-gotham-700">
              {currentSummary.classes.length} {currentSummary.classes.length === 1 ? 'class' : 'classes'}
            </span>
          </h3>
          <p className="text-xs font-mono text-slate-500 dark:text-gotham-400 mt-0.5">
            {currentSummary.statusReason}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenExtraClassModal}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-gotham-750 bg-white dark:bg-gotham-850 hover:bg-slate-100 dark:hover:bg-gotham-800 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-200 transition-colors shadow-sm"
          >
            <Plus size={15} className="text-bat-accent" /> Extra Class
          </button>
          {currentSummary.hasClasses && (
            <button
              onClick={onOpenReviewModal}
              className="flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 text-xs font-black uppercase tracking-wider shadow-bat-glow-sm transition-all"
            >
              <CheckCircle2 size={16} /> Confirm Day
            </button>
          )}
        </div>
      </div>

      {/* Classes List */}
      {currentSummary.classes.length === 0 ? (
        <div className="p-8 sm:p-10 text-center rounded-3xl border border-dashed border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900/60 shadow-inner">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-gotham-800 flex items-center justify-center text-slate-400 dark:text-gotham-400 mx-auto mb-3 border border-slate-200 dark:border-gotham-700">
            <CalendarIcon size={24} />
          </div>
          <h4 className="font-bold text-base text-slate-800 dark:text-gotham-200">
            No classes scheduled
          </h4>
          <p className="text-xs text-slate-500 dark:text-gotham-400 max-w-sm mx-auto mt-1">
            {currentSummary.statusReason || 'Enjoy your day off, or log an extra class if conducted.'}
          </p>
          <div className="flex items-center justify-center gap-2.5 mt-5">
            <button
              onClick={onOpenExtraClassModal}
              className="px-4 py-2 min-h-[44px] rounded-xl border border-slate-300 dark:border-gotham-700 bg-slate-100 dark:bg-gotham-800 hover:bg-slate-200 dark:hover:bg-gotham-750 text-slate-700 dark:text-gotham-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} className="text-bat-accent" /> Extra Class
            </button>
            <button
              onClick={onNavigateToTimetable}
              className="px-4 py-2 min-h-[44px] rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 font-black text-xs uppercase tracking-wider shadow-bat-glow-sm transition-all"
            >
              Edit Timetable
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {currentSummary.classes.map((cls) => {
            const isPresent = cls.status === 'present';
            const isAbsent = cls.status === 'absent';
            const isCancelled = cls.status === 'cancelled';

            return (
              <div
                key={cls.slotKey}
                className={`p-3.5 sm:p-4 rounded-2xl border transition-all shadow-md bg-white dark:bg-gotham-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isPresent
                    ? 'border-emerald-500/50 dark:border-emerald-800/60 ring-1 ring-emerald-500/20'
                    : isAbsent
                    ? 'border-rose-500/50 dark:border-rose-800/60 ring-1 ring-rose-500/20'
                    : isCancelled
                    ? 'border-gotham-600 dark:border-gotham-700'
                    : 'border-slate-200 dark:border-gotham-750'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="min-w-[44px] px-2 h-11 rounded-xl flex items-center justify-center font-black font-mono text-xs flex-shrink-0 text-white shadow-md border border-white/10"
                    style={{ backgroundColor: cls.subject.color || '#3b82f6' }}
                  >
                    {cls.source === 'extra' ? 'EX' : cls.periodLabel || `P${cls.periodNumber}`}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {cls.subject.name}
                      </h4>
                      {cls.subject.code && (
                        <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-gotham-400">
                          {cls.subject.code}
                        </span>
                      )}
                      {cls.unitSize && cls.unitSize > 1 && (
                        <Badge variant="gold" size="sm">
                          {cls.unitSize} PERIODS • 1 UNIT
                        </Badge>
                      )}
                      <Badge
                        variant={
                          cls.subject.type === 'lab'
                            ? 'purple'
                            : cls.subject.type === 'tutorial'
                            ? 'info'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {cls.subject.type}
                      </Badge>
                      {cls.source === 'extra' && (
                        <Badge variant="warning" size="sm">
                          EXTRA
                        </Badge>
                      )}
                      {cls.source === 'substitution' && cls.originalSubject && (
                        <Badge variant="gold" size="sm">
                          SUB: {cls.originalSubject.shortName}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-gotham-400 mt-1">
                      <span>
                        STATUS:{' '}
                        <strong
                          className={`font-black ${
                            isPresent
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : isAbsent
                              ? 'text-rose-600 dark:text-rose-400'
                              : isCancelled
                              ? 'text-gotham-400'
                              : 'text-slate-400 dark:text-gotham-500'
                          }`}
                        >
                          {cls.status.toUpperCase()}
                        </strong>
                      </span>
                      {cls.note && <span>• {cls.note}</span>}
                    </div>
                  </div>
                </div>

                {/* 1-Tap Attendance Buttons with Guaranteed 44px Touch Targets */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {/* Present */}
                  <button
                    onClick={() =>
                      onRecordAttendance(
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
                    aria-label="Mark Present"
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] min-w-[44px] ${
                      isPresent
                        ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.35)] ring-1 ring-emerald-400'
                        : 'bg-slate-100 dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 hover:bg-emerald-500/10 hover:text-emerald-400 border border-slate-200 dark:border-gotham-700'
                    }`}
                  >
                    <Check size={16} strokeWidth={2.5} /> Present
                  </button>

                  {/* Absent */}
                  <button
                    onClick={() =>
                      onRecordAttendance(
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
                    aria-label="Mark Absent"
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] min-w-[44px] ${
                      isAbsent
                        ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.35)] ring-1 ring-rose-400'
                        : 'bg-slate-100 dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 hover:bg-rose-500/10 hover:text-rose-400 border border-slate-200 dark:border-gotham-700'
                    }`}
                  >
                    <X size={16} strokeWidth={2.5} /> Absent
                  </button>

                  {/* Cancelled */}
                  <button
                    onClick={() =>
                      onRecordAttendance(
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
                    className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] min-w-[44px] ${
                      isCancelled
                        ? 'bg-gotham-700 text-white shadow-sm ring-1 ring-gotham-500'
                        : 'bg-slate-100 dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 hover:bg-gotham-700/50 border border-slate-200 dark:border-gotham-700'
                    }`}
                    title="Mark Cancelled (Excluded from attendance)"
                    aria-label="Mark Cancelled"
                  >
                    <Ban size={16} strokeWidth={2.5} />
                  </button>

                  {/* Undo / Unmark */}
                  {cls.status !== 'unmarked' && (
                    <button
                      onClick={() =>
                        onRecordAttendance(
                          currentDateStr,
                          cls.periodNumber,
                          cls.subject.id,
                          'unmarked',
                          cls.source,
                          cls.sourceRefId,
                          cls.note,
                          cls.slotKey
                        )
                      }
                      className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all min-h-[44px] min-w-[44px] bg-amber-500/15 text-amber-500 dark:text-bat-accent hover:bg-amber-500/25 border border-amber-500/30 shadow-sm"
                      title="Undo attendance"
                      aria-label="Undo attendance"
                    >
                      <Undo2 size={16} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
