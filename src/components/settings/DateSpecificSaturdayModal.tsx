import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { getSaturdayOccurrence, parseDate, formatDate } from '../../services/attendanceEngine';
import type { DateSpecificSaturdayRule, SaturdayOccurrence } from '../../types';
import { AlertCircle, Calendar } from 'lucide-react';

interface DateSpecificSaturdayModalProps {
  isOpen: boolean;
  onClose: () => void;
  ruleToEdit?: DateSpecificSaturdayRule | null;
  onSave: (rule: DateSpecificSaturdayRule) => Promise<void>;
}

export const DateSpecificSaturdayModal: React.FC<DateSpecificSaturdayModalProps> = ({
  isOpen,
  onClose,
  ruleToEdit,
  onSave,
}) => {
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<'working' | 'holiday'>('working');
  const [followsDay, setFollowsDay] = useState<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'>('monday');
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (ruleToEdit) {
      setDate(ruleToEdit.date);
      setStatus(ruleToEdit.status);
      const dayMap: Record<number, 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = {
        1: 'monday',
        2: 'tuesday',
        3: 'wednesday',
        4: 'thursday',
        5: 'friday',
        6: 'saturday',
      };
      const fDay = typeof ruleToEdit.followsDay === 'number'
        ? dayMap[ruleToEdit.followsDay] || 'monday'
        : (ruleToEdit.followsDay || 'monday');
      setFollowsDay(fDay);
      setNote(ruleToEdit.note || '');
    } else {
      // Find next Saturday
      const now = new Date();
      const currentDay = now.getDay();
      const daysUntilSaturday = (6 - currentDay + 7) % 7 || 7;
      const nextSat = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSaturday);
      setDate(formatDate(nextSat));
      setStatus('working');
      setFollowsDay('monday');
      setNote('');
    }
  }, [ruleToEdit, isOpen]);

  let isSaturday = false;
  let occurrence: SaturdayOccurrence = 1;
  let occurrenceText = '';

  if (date) {
    const d = parseDate(date);
    isSaturday = d.getDay() === 6;
    occurrence = getSaturdayOccurrence(d);
    const suffix = occurrence === 1 ? '1st' : occurrence === 2 ? '2nd' : occurrence === 3 ? '3rd' : `${occurrence}th`;
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    occurrenceText = `${suffix} Saturday of ${monthName} ${d.getFullYear()}`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    const rule: DateSpecificSaturdayRule = {
      id: ruleToEdit?.id || `sat_${date}`,
      date,
      saturdayOccurrence: occurrence,
      status,
      followsDay,
      note: note.trim() || undefined,
    };

    await onSave(rule);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ruleToEdit ? 'Edit Special Saturday Rule' : 'Add College Circular Saturday'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Saturday Date *
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
            />
          </div>
          {date && (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs">
              <Calendar size={13} className="text-bat-accent" />
              <span className="font-bold text-bat-accent">{occurrenceText}</span>
              {!isSaturday && (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle size={12} /> Not a Saturday
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Saturday Status *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setStatus('working')}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                status === 'working'
                  ? 'bg-bat-gold text-gotham-950 border-bat-gold shadow-bat-glow-sm font-black'
                  : 'bg-white dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 border-slate-300 dark:border-gotham-700'
              }`}
            >
              WORKING DAY
            </button>
            <button
              type="button"
              onClick={() => setStatus('holiday')}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                status === 'holiday'
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md font-black'
                  : 'bg-white dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 border-slate-300 dark:border-gotham-700'
              }`}
            >
              SPECIAL HOLIDAY
            </button>
          </div>
        </div>

        {status === 'working' && (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              Timetable Schedule to Follow *
            </label>
            <select
              value={followsDay}
              onChange={(e) => setFollowsDay(e.target.value as any)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-bat-gold uppercase"
            >
              <option value="monday">Follow Monday Timetable</option>
              <option value="tuesday">Follow Tuesday Timetable</option>
              <option value="wednesday">Follow Wednesday Timetable</option>
              <option value="thursday">Follow Thursday Timetable</option>
              <option value="friday">Follow Friday Timetable</option>
              <option value="saturday">Follow Saturday Timetable</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            College Circular Note / Reason (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Circular Ref #402 - Compensatory Day"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-gotham-750">
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
            {ruleToEdit ? 'Update Rule' : 'Save Rule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
