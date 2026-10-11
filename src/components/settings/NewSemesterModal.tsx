import React, { useState } from 'react';
import { Download, ShieldAlert } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useApp } from '../../context/AppContext';
import { formatDate } from '../../services/attendanceEngine';

interface NewSemesterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewSemesterModal: React.FC<NewSemesterModalProps> = ({ isOpen, onClose }) => {
  const { exportJSON, resetSemester, setActiveTab } = useApp();

  const [newSemesterName, setNewSemesterName] = useState('4th Semester');
  const [newStartDate, setNewStartDate] = useState(() => formatDate(new Date()));
  const [newEndDate, setNewEndDate] = useState('');
  const [keepSubjectsAndTimetable, setKeepSubjectsAndTimetable] = useState(true);
  const [hasConfirmedWarning, setHasConfirmedWarning] = useState(false);

  const handleStart = async (shouldExportFirst: boolean) => {
    if (!hasConfirmedWarning) return;

    if (shouldExportFirst) {
      await exportJSON();
    }

    await resetSemester({
      newSemesterName: newSemesterName.trim() || 'New Semester',
      newStartDate,
      newEndDate: newEndDate || null,
      keepSubjectsAndTimetable,
    });

    onClose();
    setActiveTab('home');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Initiate New Semester" maxWidth="max-w-lg">
      <div className="space-y-4 font-mono">
        {/* Warning Banner */}
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-200 flex items-start gap-3 shadow-inner">
          <div className="p-2 bg-rose-600 text-white rounded-xl flex-shrink-0 mt-0.5 shadow-md">
            <ShieldAlert size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-xs uppercase tracking-widest text-rose-300">
              PERMANENT DATA PURGE WARNING
            </h4>
            <p className="text-xs leading-relaxed font-sans">
              Starting a new semester will{' '}
              <strong className="font-bold underline decoration-rose-400">
                permanently erase all current semester attendance records
              </strong>{' '}
              from this device. Create a backup JSON file before proceeding.
            </p>
          </div>
        </div>

        {/* New Semester Details */}
        <div className="space-y-3 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              New Semester Designation *
            </label>
            <input
              type="text"
              required
              value={newSemesterName}
              onChange={(e) => setNewSemesterName(e.target.value)}
              placeholder="e.g. 4th Semester, Fall 2026"
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={newEndDate}
                min={newStartDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
              />
            </div>
          </div>

          {/* Keep Structure Option */}
          <div className="p-3 bg-slate-50 dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-750">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={keepSubjectsAndTimetable}
                onChange={(e) => setKeepSubjectsAndTimetable(e.target.checked)}
                className="w-4 h-4 rounded text-bat-gold focus:ring-bat-gold border-slate-300 dark:border-gotham-700 bg-gotham-900"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-gotham-200 uppercase tracking-wider">
                Preserve subjects and timetable structure (reset attendance to 0)
              </span>
            </label>
          </div>

          {/* Mandatory Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2 cursor-pointer p-2.5 rounded-xl border border-rose-800/40 bg-rose-950/20">
              <input
                type="checkbox"
                checked={hasConfirmedWarning}
                onChange={(e) => setHasConfirmedWarning(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-rose-700 bg-gotham-900"
              />
              <span className="text-xs font-bold text-rose-300">
                I understand this will permanently purge current attendance records.
              </span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-slate-200 dark:border-gotham-750 flex flex-col sm:flex-row items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
          >
            Cancel
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              disabled={!hasConfirmedWarning}
              onClick={() => handleStart(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-bat-gold/60 text-bat-accent hover:bg-bat-gold/10 disabled:opacity-40 transition-colors"
            >
              <Download size={14} /> Export & Proceed
            </button>

            <button
              type="button"
              disabled={!hasConfirmedWarning}
              onClick={() => handleStart(false)}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/25 disabled:opacity-40 transition-colors"
            >
              Confirm Reset
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
