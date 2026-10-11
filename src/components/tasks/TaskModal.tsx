import React, { useState, useMemo } from 'react';
import { X, Calendar, Clock, Bell, AlertTriangle, Trash2, Tag, BookOpen, AlertCircle } from 'lucide-react';
import type { Task, TaskType, TaskPriority, TaskReminderOption, Subject } from '../../types';
import { formatDate } from '../../services/attendanceEngine';
import { formatTimeDisplay } from '../../services/timingEngine';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => Promise<void>;
  onDelete?: (taskId: string) => Promise<void>;
  taskToEdit?: Task | null;
  subjects: Subject[];
}

const TASK_TYPES: { id: TaskType; label: string; icon: string }[] = [
  { id: 'assignment', label: 'Assignment', icon: '📝' },
  { id: 'test', label: 'Test / Exam', icon: '📋' },
  { id: 'submission', label: 'Submission', icon: '📤' },
  { id: 'project', label: 'Project', icon: '💻' },
  { id: 'presentation', label: 'Presentation', icon: '🎤' },
  { id: 'other', label: 'Other', icon: '📌' },
];

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  taskToEdit,
  subjects,
}) => {
  if (!isOpen) return null;

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }, []);

  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [subjectId, setSubjectId] = useState(
    taskToEdit?.subjectId || (subjects.length > 0 ? subjects[0].id : '')
  );
  const [type, setType] = useState<TaskType>(taskToEdit?.type || 'assignment');
  const [dueDate, setDueDate] = useState(taskToEdit?.dueDate || tomorrowStr);
  const [dueTime, setDueTime] = useState(taskToEdit?.dueTime || '10:00');
  const [priority, setPriority] = useState<TaskPriority>(taskToEdit?.priority || 'medium');
  const [reminderEnabled, setReminderEnabled] = useState(taskToEdit?.reminderEnabled ?? true);
  const [reminderOption, setReminderOption] = useState<TaskReminderOption>(
    taskToEdit?.reminderOption || '1_day_before'
  );
  const [reminderDateTime, setReminderDateTime] = useState(
    taskToEdit?.reminderDateTime || ''
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute calculated reminder time for preview and validation
  const calculatedReminderTime = useMemo(() => {
    if (!reminderEnabled || reminderOption === 'none') return null;

    if (reminderOption === 'custom') {
      return reminderDateTime ? new Date(reminderDateTime) : null;
    }

    if (reminderOption === 'on_due_date') {
      if (dueTime) {
        const d = new Date(`${dueDate}T${dueTime}:00`);
        const [h, m] = dueTime.split(':').map(Number);
        if (h > 9) {
          d.setHours(h - 2, m, 0, 0);
        } else {
          d.setHours(8, 0, 0, 0);
        }
        return d;
      } else {
        const parts = dueDate.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2], 8, 0, 0, 0);
      }
    }

    if (reminderOption === '1_day_before') {
      const parts = dueDate.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2] - 1, 19, 0, 0, 0);
    }

    if (reminderOption === '2_days_before') {
      const parts = dueDate.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2] - 2, 19, 0, 0, 0);
    }

    return null;
  }, [reminderEnabled, reminderOption, reminderDateTime, dueDate, dueTime]);

  const isReminderInPast = useMemo(() => {
    if (!calculatedReminderTime) return false;
    return calculatedReminderTime.getTime() <= Date.now();
  }, [calculatedReminderTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please enter a task title');
      return;
    }
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }
    if (!dueDate) {
      setError('Please select a due date');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const nowIso = new Date().toISOString();
      const task: Task = {
        id: taskToEdit?.id || `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: title.trim(),
        description: description.trim() || undefined,
        subjectId,
        type,
        dueDate,
        dueTime: dueTime || undefined,
        priority,
        reminderEnabled: reminderEnabled && reminderOption !== 'none' && !isReminderInPast,
        reminderOption,
        reminderDateTime: calculatedReminderTime ? calculatedReminderTime.toISOString() : undefined,
        completed: taskToEdit?.completed || false,
        completedAt: taskToEdit?.completedAt,
        createdAt: taskToEdit?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      await onSave(task);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit || !onDelete) return;
    if (window.confirm(`Are you sure you want to delete "${taskToEdit.title}"?`)) {
      setIsSubmitting(true);
      try {
        await onDelete(taskToEdit.id);
        onClose();
      } catch (err: any) {
        setError(err?.message || 'Failed to delete task');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-750 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scaleUp my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-gotham-800">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-xl bg-bat-gold/15 text-bat-accent flex items-center justify-center font-bold text-sm">
              {taskToEdit ? '✏️' : '➕'}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {taskToEdit ? 'Edit Task' : 'Add New Task'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-gotham-400">
                Record class assignments, tests, and deadlines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. DSA Internal Test, Java Lab Record"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gotham-500 text-sm focus:outline-none focus:border-bat-gold transition-colors"
            />
          </div>

          {/* Subject & Type Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1 flex items-center gap-1.5">
                <BookOpen size={13} className="text-bat-accent" />
                <span>Subject</span> <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-bat-gold transition-colors"
              >
                {subjects.length === 0 ? (
                  <option value="">No subjects found</option>
                ) : (
                  subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.code || 'Sub'})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1 flex items-center gap-1.5">
                <Tag size={13} className="text-bat-accent" />
                <span>Task Type</span>
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as TaskType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-bat-gold transition-colors"
              >
                {TASK_TYPES.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1">
              Description / Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Chapters 1-3, submission instructions, room number..."
              rows={2}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gotham-500 text-xs sm:text-sm focus:outline-none focus:border-bat-gold transition-colors resize-none"
            />
          </div>

          {/* Due Date & Due Time Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1 flex items-center gap-1.5">
                <Calendar size={13} className="text-bat-accent" />
                <span>Due Date</span> <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-bat-gold transition-colors font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1 flex items-center gap-1.5">
                <Clock size={13} className="text-bat-accent" />
                <span>Due Time (Optional)</span>
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:border-bat-gold transition-colors font-mono"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-gotham-300 mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as TaskPriority[]).map(p => {
                const isSelected = priority === p;
                let activeColor = '';
                if (p === 'high') {
                  activeColor = isSelected
                    ? 'bg-rose-500/20 text-rose-500 border-rose-500 font-bold'
                    : 'text-slate-600 dark:text-gotham-400 border-slate-200 dark:border-gotham-800';
                } else if (p === 'medium') {
                  activeColor = isSelected
                    ? 'bg-amber-500/20 text-amber-500 border-amber-500 font-bold'
                    : 'text-slate-600 dark:text-gotham-400 border-slate-200 dark:border-gotham-800';
                } else {
                  activeColor = isSelected
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500 font-bold'
                    : 'text-slate-600 dark:text-gotham-400 border-slate-200 dark:border-gotham-800';
                }

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-3 rounded-xl border text-xs capitalize transition-all ${activeColor}`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reminders Section */}
          <div className="pt-2 border-t border-slate-200 dark:border-gotham-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={15} className={reminderEnabled ? 'text-bat-accent' : 'text-slate-400'} />
                <span className="text-xs font-semibold text-slate-700 dark:text-gotham-200">
                  Notification Reminder
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={e => setReminderEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-gotham-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gotham-700 peer-checked:bg-bat-gold"></div>
              </label>
            </div>

            {reminderEnabled && (
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750/70 space-y-2.5">
                <label className="block text-[11px] font-semibold text-slate-500 dark:text-gotham-400">
                  When should we remind you?
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '1_day_before', label: '1 day before' },
                    { id: '2_days_before', label: '2 days before' },
                    { id: 'on_due_date', label: 'On due date' },
                    { id: 'custom', label: 'Custom date & time' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setReminderOption(opt.id as TaskReminderOption)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left border transition-all ${
                        reminderOption === opt.id
                          ? 'bg-bat-gold/15 text-bat-accent border-bat-gold/50 font-bold'
                          : 'bg-white dark:bg-gotham-800 text-slate-600 dark:text-gotham-400 border-slate-200 dark:border-gotham-750'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {reminderOption === 'custom' && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-gotham-750">
                    <label className="block text-[11px] font-medium text-slate-500 dark:text-gotham-400 mb-1">
                      Choose reminder date & time:
                    </label>
                    <input
                      type="datetime-local"
                      value={reminderDateTime}
                      onChange={e => setReminderDateTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-gotham-800 border border-slate-200 dark:border-gotham-750 text-slate-900 dark:text-white text-xs font-mono"
                    />
                  </div>
                )}

                {/* Preview and Past Warning */}
                {calculatedReminderTime && (
                  <div
                    className={`mt-2 p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                      isReminderInPast
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-slate-200/50 dark:bg-gotham-800 text-slate-600 dark:text-gotham-300'
                    }`}
                  >
                    {isReminderInPast ? (
                      <AlertCircle size={14} className="shrink-0 text-rose-500" />
                    ) : (
                      <Bell size={13} className="shrink-0 text-bat-accent" />
                    )}
                    <span>
                      {isReminderInPast
                        ? 'Past date: reminder cannot be scheduled for the past'
                        : `Scheduled for: ${calculatedReminderTime.toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-gotham-800">
            {taskToEdit && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-3 py-2 text-rose-500 hover:bg-rose-500/10 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800 rounded-xl text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-bat-gold to-yellow-500 text-slate-950 font-bold rounded-xl text-xs shadow-bat-glow-sm hover:brightness-110 active:scale-95 transition-all"
              >
                {isSubmitting ? 'Saving...' : taskToEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
