import React from 'react';
import { Check, X, Ban, CheckCircle2, Undo2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';

interface DailyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
}

export const DailyReviewModal: React.FC<DailyReviewModalProps> = ({ isOpen, onClose, dateStr }) => {
  const { getSummaryForDate, recordAttendance, confirmDayAttendance } = useApp();
  const summary = getSummaryForDate(dateStr);

  const handleConfirm = async () => {
    await confirmDayAttendance(dateStr);
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#facc15', '#eab308', '#ca8a04', '#ffffff'],
      });
    } catch {
      // Graceful fallback if confetti fails or is skipped
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Daily Operations Review">
      <div className="space-y-4">
        <div className="p-3 bg-slate-100 dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-750 text-xs text-slate-700 dark:text-gotham-300 font-mono">
          <p className="font-bold text-slate-900 dark:text-white uppercase">
            {summary.statusReason}
          </p>
          <p className="mt-0.5 text-slate-500 dark:text-gotham-400">
            Verify attendance records for today's scheduled classes before confirmation.
          </p>
        </div>

        {summary.classes.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-gotham-400 text-xs font-mono">
            No classes scheduled for this date.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {summary.classes.map((cls) => (
              <div
                key={cls.slotKey}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-gotham-750 bg-white dark:bg-gotham-850 shadow-sm"
              >
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-bat-accent">
                      {cls.periodLabel || (cls.source === 'extra' ? 'EXTRA' : `P${cls.periodNumber}`)}
                    </span>
                    {cls.unitSize && cls.unitSize > 1 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-600 dark:text-bat-accent font-bold border border-amber-500/30">
                        {cls.unitSize}P • 1 UNIT
                      </span>
                    )}
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {cls.subject.name}
                    </h4>
                  </div>
                  {cls.source === 'substitution' && cls.originalSubject && (
                    <span className="text-[11px] font-mono text-bat-gold">
                      SUB FOR {cls.originalSubject.shortName}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      recordAttendance(
                        dateStr,
                        cls.periodNumber,
                        cls.subject.id,
                        'present',
                        cls.source,
                        cls.sourceRefId,
                        cls.note,
                        cls.slotKey
                      )
                    }
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all ${
                      cls.status === 'present'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-gotham-800 text-slate-500 dark:text-gotham-400 hover:text-emerald-400'
                    }`}
                    title="Mark Present"
                    aria-label="Mark Present"
                  >
                    <Check size={18} strokeWidth={2.5} />
                  </button>

                  <button
                    onClick={() =>
                      recordAttendance(
                        dateStr,
                        cls.periodNumber,
                        cls.subject.id,
                        'absent',
                        cls.source,
                        cls.sourceRefId,
                        cls.note,
                        cls.slotKey
                      )
                    }
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all ${
                      cls.status === 'absent'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-gotham-800 text-slate-500 dark:text-gotham-400 hover:text-rose-400'
                    }`}
                    title="Mark Absent"
                    aria-label="Mark Absent"
                  >
                    <X size={18} strokeWidth={2.5} />
                  </button>

                  <button
                    onClick={() =>
                      recordAttendance(
                        dateStr,
                        cls.periodNumber,
                        cls.subject.id,
                        'cancelled',
                        cls.source,
                        cls.sourceRefId,
                        cls.note,
                        cls.slotKey
                      )
                    }
                    className={`min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all ${
                      cls.status === 'cancelled'
                        ? 'bg-gotham-700 text-white shadow-md'
                        : 'bg-slate-100 dark:bg-gotham-800 text-slate-500 dark:text-gotham-400 hover:text-amber-400'
                    }`}
                    title="Mark Cancelled"
                    aria-label="Mark Cancelled"
                  >
                    <Ban size={18} strokeWidth={2.5} />
                  </button>

                  {cls.status !== 'unmarked' && (
                    <button
                      onClick={() =>
                        recordAttendance(
                          dateStr,
                          cls.periodNumber,
                          cls.subject.id,
                          'unmarked',
                          cls.source,
                          cls.sourceRefId,
                          cls.note,
                          cls.slotKey
                        )
                      }
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl transition-all bg-amber-500/15 text-amber-500 dark:text-bat-accent hover:bg-amber-500/25 border border-amber-500/30"
                      title="Undo attendance"
                      aria-label="Undo attendance"
                    >
                      <Undo2 size={18} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-gotham-750 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-bat-glow-sm transition-all"
          >
            <CheckCircle2 size={16} /> Confirm Day
          </button>
        </div>
      </div>
    </Modal>
  );
};
