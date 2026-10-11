import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { Holiday } from '../../types';

interface HolidayModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidayToEdit?: Holiday | null;
  onSave: (holiday: Holiday) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const HolidayModal: React.FC<HolidayModalProps> = ({
  isOpen,
  onClose,
  holidayToEdit,
  onSave,
  onDelete,
}) => {
  const [description, setDescription] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    if (holidayToEdit) {
      setDescription(holidayToEdit.description);
      setStartDate(holidayToEdit.startDate);
      setEndDate(holidayToEdit.endDate);
    } else {
      setDescription('');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
    }
  }, [holidayToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !startDate) return;

    const end = endDate && endDate >= startDate ? endDate : startDate;
    await onSave({
      id: holidayToEdit?.id || `hol_${Date.now()}`,
      description: description.trim(),
      startDate,
      endDate: end,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (holidayToEdit && onDelete) {
      await onDelete(holidayToEdit.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={holidayToEdit ? 'Edit Holiday' : 'Add Holiday'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Holiday Description *
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Foundation Day, State Festival"
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
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (!endDate || endDate < e.target.value) {
                  setEndDate(e.target.value);
                }
              }}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-gotham-750">
          {holidayToEdit && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              Delete
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
              Save Holiday
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
