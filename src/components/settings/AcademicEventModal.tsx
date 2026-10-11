import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { AcademicEvent, AcademicEventType } from '../../types';

interface AcademicEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventToEdit?: AcademicEvent | null;
  onSave: (event: AcademicEvent) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const AcademicEventModal: React.FC<AcademicEventModalProps> = ({
  isOpen,
  onClose,
  eventToEdit,
  onSave,
  onDelete,
}) => {
  const [description, setDescription] = useState<string>('');
  const [type, setType] = useState<AcademicEventType>('ias');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [regularClassesRun, setRegularClassesRun] = useState<boolean>(false);

  useEffect(() => {
    if (eventToEdit) {
      setDescription(eventToEdit.description);
      setType(eventToEdit.type);
      setStartDate(eventToEdit.startDate);
      setEndDate(eventToEdit.endDate);
      setRegularClassesRun(eventToEdit.regularClassesRun);
    } else {
      setDescription('');
      setType('ias');
      const today = new Date().toISOString().split('T')[0];
      setStartDate(today);
      setEndDate(today);
      setRegularClassesRun(false);
    }
  }, [eventToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !startDate) return;

    const end = endDate && endDate >= startDate ? endDate : startDate;
    await onSave({
      id: eventToEdit?.id || `event_${Date.now()}`,
      description: description.trim(),
      type,
      startDate,
      endDate: end,
      regularClassesRun,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (eventToEdit && onDelete) {
      await onDelete(eventToEdit.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={eventToEdit ? 'Edit Academic Event' : 'Add Academic Event'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Event Classification *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AcademicEventType)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
          >
            <option value="ias">Internal Assessment (IAS)</option>
            <option value="exam">University / Final Exam</option>
            <option value="fest">College Fest / Cultural</option>
            <option value="workshop">Workshop / Seminar</option>
            <option value="event">College Event</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Description / Title *
          </label>
          <input
            type="text"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 1st Internal Assessment (IAS-1)"
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

        <div className="p-3 bg-slate-50 dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-750">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-gotham-200 uppercase tracking-wider">
                Regular Timetable Runs
              </div>
              <div className="text-[11px] text-gotham-400">
                Turn OFF if standard lectures are suspended
              </div>
            </div>
            <input
              type="checkbox"
              checked={regularClassesRun}
              onChange={(e) => setRegularClassesRun(e.target.checked)}
              className="w-4 h-4 rounded text-bat-gold focus:ring-bat-gold border-slate-300 dark:border-gotham-700 bg-gotham-900"
            />
          </label>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-gotham-750">
          {eventToEdit && onDelete ? (
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
              Save Event
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
