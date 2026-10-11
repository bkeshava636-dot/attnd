import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { DateOverride, DayOfWeek } from '../../types';
import { DAY_NAMES } from '../../services/attendanceEngine';

interface DateOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  existingOverride?: DateOverride;
  onSave: (override: DateOverride) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const DateOverrideModal: React.FC<DateOverrideModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  existingOverride,
  onSave,
  onDelete,
}) => {
  const [status, setStatus] = useState<'working' | 'holiday'>('working');
  const [followsDay, setFollowsDay] = useState<DayOfWeek>(1);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (existingOverride) {
      setStatus(existingOverride.status);
      setFollowsDay(
        existingOverride.followsDay !== undefined && existingOverride.followsDay !== 'custom'
          ? (existingOverride.followsDay as DayOfWeek)
          : 1
      );
      setNote(existingOverride.note || '');
    } else {
      setStatus('working');
      setFollowsDay(1);
      setNote('');
    }
  }, [existingOverride, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const override: DateOverride = {
      id: existingOverride?.id || `ov_${dateStr}_${Date.now()}`,
      date: dateStr,
      status,
      followsDay: status === 'working' ? followsDay : undefined,
      note: note.trim() || undefined,
    };
    await onSave(override);
    onClose();
  };

  const handleDelete = async () => {
    if (existingOverride && onDelete) {
      await onDelete(existingOverride.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Date Override: ${dateStr}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono">
        <div className="p-3 bg-bat-gold/10 dark:bg-gotham-900 rounded-xl border border-bat-gold/30 text-xs text-slate-800 dark:text-gotham-200">
          <p className="font-bold text-bat-accent uppercase">Top Priority Override:</p>
          <p className="mt-0.5 text-gotham-300">
            Overrides regular timetables, Saturday rules, and academic events for this specific date.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('working')}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                status === 'working'
                  ? 'bg-bat-gold text-gotham-950 border-bat-gold shadow-sm font-black'
                  : 'bg-white dark:bg-gotham-900 text-slate-700 dark:text-gotham-300 border-slate-300 dark:border-gotham-750'
              }`}
            >
              Working Day
            </button>
            <button
              type="button"
              onClick={() => setStatus('holiday')}
              className={`py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition-all ${
                status === 'holiday'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm font-black'
                  : 'bg-white dark:bg-gotham-900 text-slate-700 dark:text-gotham-300 border-slate-300 dark:border-gotham-750'
              }`}
            >
              Holiday / Off
            </button>
          </div>
        </div>

        {status === 'working' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              Follows Timetable of:
            </label>
            <select
              value={followsDay}
              onChange={(e) => setFollowsDay(parseInt(e.target.value, 10) as DayOfWeek)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
            >
              {[1, 2, 3, 4, 5, 6].map((day) => (
                <option key={day} value={day}>
                  {DAY_NAMES[day]} Timetable
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Reason / Note (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Tuesday timetable followed due to festival swap"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-gotham-750">
          {existingOverride && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              Remove Override
            </button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-bat-glow-sm"
            >
              Save Override
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
