import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import type { Substitution, Subject, GeneratedClassInstance } from '../../types';

interface SubstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  classInstance: GeneratedClassInstance | null;
  subjects: Subject[];
  existingSubstitutions: Substitution[];
  onSave: (sub: Substitution) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export const SubstitutionModal: React.FC<SubstitutionModalProps> = ({
  isOpen,
  onClose,
  dateStr,
  classInstance,
  subjects,
  existingSubstitutions,
  onSave,
  onDelete,
}) => {
  const [substituteSubjectId, setSubstituteSubjectId] = useState<string>('');
  const [note, setNote] = useState<string>('');

  const currentSub = existingSubstitutions.find(
    (s) => s.date === dateStr && s.periodNumber === classInstance?.periodNumber
  );

  useEffect(() => {
    if (currentSub) {
      setSubstituteSubjectId(currentSub.substituteSubjectId);
      setNote(currentSub.note || '');
    } else if (classInstance) {
      const other = subjects.find((s) => s.id !== classInstance.subject.id);
      setSubstituteSubjectId(other ? other.id : '');
      setNote('');
    }
  }, [currentSub, classInstance, isOpen, subjects]);

  if (!classInstance) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!substituteSubjectId) return;

    const sub: Substitution = {
      id: currentSub?.id || `subst_${dateStr}_p${classInstance.periodNumber}_${Date.now()}`,
      date: dateStr,
      periodNumber: classInstance.periodNumber,
      originalSubjectId: classInstance.originalSubject?.id || classInstance.subject.id,
      substituteSubjectId,
      note: note.trim() || undefined,
    };

    await onSave(sub);
    onClose();
  };

  const handleDelete = async () => {
    if (currentSub && onDelete) {
      await onDelete(currentSub.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Substitute Period ${classInstance.periodNumber} (${dateStr})`}
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-mono">
        <div className="p-3 bg-slate-50 dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-750 text-xs space-y-1">
          <span className="text-gotham-400">Scheduled Subject:</span>
          <div className="font-bold text-sm text-slate-800 dark:text-slate-200">
            {classInstance.originalSubject?.name || classInstance.subject.name}
          </div>
          <p className="text-[11px] text-gotham-500">
            Substituting for this single date will not alter your regular weekly timetable.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Substitute With Subject *
          </label>
          <select
            required
            value={substituteSubjectId}
            onChange={(e) => setSubstituteSubjectId(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-bat-gold"
          >
            <option value="">Select replacement subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.shortName})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 mb-1">
            Note / Reason (Optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Faculty exchange, extra lab session"
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-bat-gold"
          />
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-slate-200 dark:border-gotham-750">
          {currentSub && onDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-950/40 rounded-lg transition-colors"
            >
              Revert
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
              Save Substitution
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
