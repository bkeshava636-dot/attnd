import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { TimetablePeriod, Subject, DayOfWeek } from '../../types';

interface TimetablePeriodModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayOfWeek: DayOfWeek;
  subjects: Subject[];
  periodToEdit?: TimetablePeriod | null;
  existingPeriods: TimetablePeriod[];
  onSave: (period: TimetablePeriod) => Promise<void>;
  onSaveMultiLab?: (periods: TimetablePeriod[]) => Promise<void>;
}

export const TimetablePeriodModal: React.FC<TimetablePeriodModalProps> = ({
  isOpen,
  onClose,
  dayOfWeek,
  subjects,
  periodToEdit,
  existingPeriods,
  onSave,
  onSaveMultiLab,
}) => {
  const [periodNumber, setPeriodNumber] = useState<number>(1);
  const [subjectId, setSubjectId] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isMultiPeriodLab, setIsMultiPeriodLab] = useState<boolean>(false);
  const [groupAsUnit, setGroupAsUnit] = useState<boolean>(true);
  const [consecutivePeriodsCount, setConsecutivePeriodsCount] = useState<number>(2);

  useEffect(() => {
    if (periodToEdit) {
      setPeriodNumber(periodToEdit.periodNumber);
      setSubjectId(periodToEdit.subjectId);
      setStartTime(periodToEdit.startTime || '');
      setEndTime(periodToEdit.endTime || '');
      setIsMultiPeriodLab(false);
      setGroupAsUnit(!!periodToEdit.unitGroupId);
    } else {
      const nextNum = existingPeriods.length > 0
        ? Math.max(...existingPeriods.map((p) => p.periodNumber)) + 1
        : 1;
      setPeriodNumber(nextNum);
      setSubjectId(subjects[0]?.id || '');
      setStartTime('');
      setEndTime('');
      setIsMultiPeriodLab(false);
      setGroupAsUnit(true);
    }
  }, [periodToEdit, isOpen, existingPeriods, subjects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) return;

    if (!periodToEdit && isMultiPeriodLab && onSaveMultiLab) {
      const newPeriods: TimetablePeriod[] = [];
      const labKey = `block_${Date.now()}`;
      const unitKey = groupAsUnit ? `unit_${Date.now()}` : undefined;
      for (let i = 0; i < consecutivePeriodsCount; i++) {
        newPeriods.push({
          id: `tt_${dayOfWeek}_p${periodNumber + i}_${Date.now() + i}`,
          dayOfWeek,
          periodNumber: periodNumber + i,
          subjectId,
          startTime: i === 0 ? startTime || undefined : undefined,
          endTime: i === consecutivePeriodsCount - 1 ? endTime || undefined : undefined,
          labGroupKey: labKey,
          unitGroupId: unitKey,
        });
      }
      await onSaveMultiLab(newPeriods);
    } else {
      await onSave({
        id: periodToEdit?.id || `tt_${dayOfWeek}_p${periodNumber}_${Date.now()}`,
        dayOfWeek,
        periodNumber,
        subjectId,
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        unitGroupId: periodToEdit?.unitGroupId,
        labGroupKey: periodToEdit?.labGroupKey,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={periodToEdit ? 'Edit Timetable Slot' : 'Add Timetable Slot'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Subject *
          </label>
          <select
            required
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Period Slot Number (e.g. 1, 2, 3) *
          </label>
          <input
            type="number"
            inputMode="numeric"
            min="1"
            max="15"
            required
            value={periodNumber}
            onChange={(e) => setPeriodNumber(parseInt(e.target.value, 10) || 1)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px]"
          />
        </div>

        {!periodToEdit && (
          <div className="p-3 bg-slate-50 dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-750 space-y-2.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isMultiPeriodLab}
                onChange={(e) => setIsMultiPeriodLab(e.target.checked)}
                className="w-4 h-4 rounded text-bat-gold focus:ring-bat-gold border-slate-300 dark:border-gotham-700 bg-gotham-900"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-gotham-200 uppercase tracking-wider">
                Continuous Multi-Period Block (2 or 3 Periods)
              </span>
            </label>

            {isMultiPeriodLab && (
              <div className="pt-2 border-t border-slate-200 dark:border-gotham-750 space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-gotham-400 mb-1">
                    Consecutive periods occupied:
                  </label>
                  <div className="flex items-center gap-2">
                    {[2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setConsecutivePeriodsCount(count)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border transition-all ${
                          consecutivePeriodsCount === count
                            ? 'bg-bat-gold text-gotham-950 border-bat-gold shadow-sm font-black'
                            : 'bg-white dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 border-slate-300 dark:border-gotham-700'
                        }`}
                      >
                        {count} Periods (P{periodNumber} to P{periodNumber + count - 1})
                      </button>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={groupAsUnit}
                    onChange={(e) => setGroupAsUnit(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-bat-gold focus:ring-bat-gold border-slate-300 dark:border-gotham-700 bg-gotham-900"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-bat-accent uppercase tracking-wider block">
                      Treat as 1 Attendance Unit
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-gotham-400">
                      Marking attendance once will mark the entire block (counts as 1 class in percentage calculations).
                    </span>
                  </div>
                </label>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200 dark:border-gotham-750">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-400 mb-1">
              Start Time (Optional)
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-400 mb-1">
              End Time (Optional)
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-gotham-750">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-wider rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-bat-glow-sm"
          >
            {periodToEdit ? 'Save Slot' : 'Add Slot'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
