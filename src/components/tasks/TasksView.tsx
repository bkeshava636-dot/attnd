import React, { useState, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Bell,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  Tag,
  BookOpen,
  Filter,
  CheckSquare,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Task, TaskPriority, TaskType } from '../../types';
import { TaskModal } from './TaskModal';
import { formatDate } from '../../services/attendanceEngine';
import { formatTimeDisplay } from '../../services/timingEngine';

type TaskFilter = 'all' | 'pending' | 'overdue' | 'completed';

export const TasksView: React.FC = () => {
  const { tasks, subjects, saveTask, deleteTask, toggleTaskComplete } = useApp();

  const [activeFilter, setActiveFilter] = useState<TaskFilter>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const todayStr = useMemo(() => formatDate(new Date()), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDate(d);
  }, []);

  // Helper map for subjects
  const subjectMap = useMemo(() => {
    const map = new Map<string, (typeof subjects)[0]>();
    for (const sub of subjects) {
      map.set(sub.id, sub);
    }
    return map;
  }, [subjects]);

  // Determine if a task is overdue
  const isTaskOverdue = (task: Task): boolean => {
    if (task.completed) return false;
    const now = new Date();
    if (task.dueDate < todayStr) return true;
    if (task.dueDate === todayStr && task.dueTime) {
      const [h, m] = task.dueTime.split(':').map(Number);
      const dueDateTime = new Date();
      dueDateTime.setHours(h, m, 0, 0);
      return now.getTime() > dueDateTime.getTime();
    }
    return false;
  };

  // Grouped tasks calculation
  const {
    allCount,
    pendingCount,
    overdueCount,
    completedCount,
    overdueTasks,
    todayTasks,
    upcomingTasks,
    completedTasks,
  } = useMemo(() => {
    const overdue: Task[] = [];
    const today: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    // Sort tasks by due date & time
    const sorted = [...tasks].sort((a, b) => {
      if (a.dueDate !== b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      return (a.dueTime || '23:59').localeCompare(b.dueTime || '23:59');
    });

    for (const task of sorted) {
      if (task.completed) {
        completed.push(task);
      } else if (isTaskOverdue(task)) {
        overdue.push(task);
      } else if (task.dueDate === todayStr) {
        today.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return {
      allCount: tasks.length,
      pendingCount: overdue.length + today.length + upcoming.length,
      overdueCount: overdue.length,
      completedCount: completed.length,
      overdueTasks: overdue,
      todayTasks: today,
      upcomingTasks: upcoming,
      completedTasks: completed,
    };
  }, [tasks, todayStr]);

  const handleOpenAdd = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  const formatDueDisplay = (task: Task): { text: string; isOverdue: boolean } => {
    const overdue = isTaskOverdue(task);
    const timeStr = task.dueTime ? ` at ${formatTimeDisplay(task.dueTime)}` : '';

    if (overdue) {
      if (task.dueDate === todayStr) {
        return { text: `Overdue today${timeStr}`, isOverdue: true };
      }
      return { text: `Overdue (${task.dueDate}${timeStr})`, isOverdue: true };
    }

    if (task.dueDate === todayStr) {
      return { text: `Today${timeStr}`, isOverdue: false };
    }
    if (task.dueDate === tomorrowStr) {
      return { text: `Tomorrow${timeStr}`, isOverdue: false };
    }

    const parts = task.dueDate.split('-');
    const formatted = `${parts[2]}/${parts[1]}`;
    return { text: `${formatted}${timeStr}`, isOverdue: false };
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-500 border border-rose-500/30">
            HIGH
          </span>
        );
      case 'medium':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500 border border-amber-500/30">
            MED
          </span>
        );
      case 'low':
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-500/15 text-slate-400 border border-slate-500/30">
            LOW
          </span>
        );
    }
  };

  const getTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'assignment':
        return 'Assignment';
      case 'test':
        return 'Test / Exam';
      case 'submission':
        return 'Submission';
      case 'project':
        return 'Project';
      case 'presentation':
        return 'Presentation';
      case 'other':
      default:
        return 'Task';
    }
  };

  const renderTaskCard = (task: Task) => {
    const subject = subjectMap.get(task.subjectId);
    const { text: dueText, isOverdue } = formatDueDisplay(task);

    return (
      <div
        key={task.id}
        className={`p-3.5 sm:p-4 rounded-2xl transition-all duration-200 border ${
          task.completed
            ? 'bg-slate-50/60 dark:bg-gotham-900/40 border-slate-200 dark:border-gotham-800 opacity-60'
            : isOverdue
            ? 'bg-rose-500/5 dark:bg-rose-950/20 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.1)]'
            : task.priority === 'high'
            ? 'bg-white dark:bg-gotham-850 border-amber-500/40 shadow-sm'
            : 'bg-white dark:bg-gotham-850 border-slate-200 dark:border-gotham-750/70 shadow-sm'
        }`}
      >
        <div className="flex items-start gap-3">
          {/* Checkbox button */}
          <button
            onClick={() => toggleTaskComplete(task.id)}
            className="mt-0.5 text-slate-400 hover:text-bat-accent transition-colors shrink-0 p-1 -m-1"
            aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
          >
            {task.completed ? (
              <CheckCircle2 size={22} className="text-emerald-500" />
            ) : (
              <Circle size={22} className="hover:text-bat-accent text-slate-300 dark:text-gotham-600" />
            )}
          </button>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Top row badges */}
            <div className="flex items-center flex-wrap gap-1.5 mb-1.5">
              {/* Subject pill */}
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-gotham-800 text-slate-700 dark:text-gotham-200 border border-slate-200 dark:border-gotham-700 truncate max-w-[150px]">
                {subject ? subject.name : 'General'}
              </span>

              {/* Type pill */}
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-bat-gold/10 text-bat-accent border border-bat-gold/20">
                {getTypeLabel(task.type)}
              </span>

              {/* Priority */}
              {getPriorityBadge(task.priority)}

              {/* Reminder indicator */}
              {task.reminderEnabled && !task.completed && (
                <span
                  title="Reminder scheduled"
                  className="p-1 text-bat-accent flex items-center"
                >
                  <Bell size={12} />
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className={`text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-snug ${
                task.completed ? 'line-through text-slate-400 dark:text-gotham-400' : ''
              }`}
            >
              {task.title}
            </h3>

            {/* Description */}
            {task.description && (
              <p className="text-xs text-slate-500 dark:text-gotham-400 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}

            {/* Due date & footer */}
            <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100 dark:border-gotham-800/60 text-xs">
              <div
                className={`flex items-center gap-1 font-mono text-[11px] ${
                  task.completed
                    ? 'text-slate-400 dark:text-gotham-500'
                    : isOverdue
                    ? 'text-rose-500 font-bold'
                    : 'text-slate-500 dark:text-gotham-400'
                }`}
              >
                <Clock size={12} className={isOverdue && !task.completed ? 'text-rose-500 animate-pulse' : ''} />
                <span>{dueText}</span>
              </div>

              {/* Edit button */}
              <button
                onClick={() => handleOpenEdit(task)}
                className="px-2 py-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gotham-800 text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <Edit2 size={12} />
                <span>Edit</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Tasks & Deadlines
          </h1>
          <p className="text-xs text-slate-500 dark:text-gotham-400 mt-0.5">
            Track class assignments, tests, and announcements
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-bat-gold to-yellow-500 text-slate-950 font-bold text-xs sm:text-sm shadow-bat-glow-sm hover:brightness-110 active:scale-95 transition-all"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-200/70 dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 overflow-x-auto">
        {[
          { id: 'all', label: 'All', count: allCount },
          { id: 'pending', label: 'Pending', count: pendingCount },
          { id: 'overdue', label: 'Overdue', count: overdueCount, highlight: overdueCount > 0 },
          { id: 'completed', label: 'Completed', count: completedCount },
        ].map(tab => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id as TaskFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white dark:bg-gotham-800 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-gotham-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  tab.highlight
                    ? 'bg-rose-500 text-white font-bold'
                    : isActive
                    ? 'bg-slate-100 dark:bg-gotham-700 text-slate-700 dark:text-gotham-300'
                    : 'bg-slate-300/50 dark:bg-gotham-800 text-slate-500 dark:text-gotham-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content based on filter */}
      <div className="space-y-6">
        {/* OVERDUE SECTION */}
        {(activeFilter === 'all' || activeFilter === 'pending' || activeFilter === 'overdue') &&
          overdueTasks.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-wider">
                <AlertCircle size={14} />
                <span>Overdue ({overdueTasks.length})</span>
              </div>
              <div className="space-y-2.5">
                {overdueTasks.map(renderTaskCard)}
              </div>
            </div>
          )}

        {/* TODAY SECTION */}
        {(activeFilter === 'all' || activeFilter === 'pending') && todayTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-bat-accent font-bold text-xs uppercase tracking-wider">
              <Calendar size={14} />
              <span>Today ({todayTasks.length})</span>
            </div>
            <div className="space-y-2.5">
              {todayTasks.map(renderTaskCard)}
            </div>
          </div>
        )}

        {/* UPCOMING SECTION */}
        {(activeFilter === 'all' || activeFilter === 'pending') && upcomingTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500 dark:text-gotham-400 font-bold text-xs uppercase tracking-wider">
              <Clock size={14} />
              <span>Upcoming ({upcomingTasks.length})</span>
            </div>
            <div className="space-y-2.5">
              {upcomingTasks.map(renderTaskCard)}
            </div>
          </div>
        )}

        {/* COMPLETED SECTION */}
        {(activeFilter === 'all' || activeFilter === 'completed') && completedTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-400 dark:text-gotham-500 font-bold text-xs uppercase tracking-wider">
              <CheckSquare size={14} />
              <span>Completed ({completedTasks.length})</span>
            </div>
            <div className="space-y-2.5">
              {completedTasks.map(renderTaskCard)}
            </div>
          </div>
        )}

        {/* Empty States */}
        {activeFilter === 'all' && tasks.length === 0 && (
          <div className="p-8 text-center rounded-3xl bg-slate-100/60 dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-bat-gold/10 text-bat-accent mx-auto flex items-center justify-center text-xl">
              📝
            </div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              No tasks yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-gotham-400 max-w-sm mx-auto">
              Record upcoming tests, assignment deadlines, and lab submissions to keep everything in one place.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 rounded-xl bg-bat-gold/15 text-bat-accent border border-bat-gold/30 font-bold text-xs hover:bg-bat-gold/25 transition-all"
            >
              + Create First Task
            </button>
          </div>
        )}

        {activeFilter === 'pending' && pendingCount === 0 && tasks.length > 0 && (
          <div className="p-8 text-center rounded-3xl bg-slate-100/60 dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 space-y-2">
            <div className="text-2xl">🎉</div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              All caught up!
            </h3>
            <p className="text-xs text-slate-500 dark:text-gotham-400">
              You have no pending tasks or submissions.
            </p>
          </div>
        )}

        {activeFilter === 'overdue' && overdueCount === 0 && (
          <div className="p-8 text-center rounded-3xl bg-slate-100/60 dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 space-y-2">
            <div className="text-2xl">✨</div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              No overdue tasks
            </h3>
            <p className="text-xs text-slate-500 dark:text-gotham-400">
              Great job! All your deadlines are on track.
            </p>
          </div>
        )}

        {activeFilter === 'completed' && completedCount === 0 && (
          <div className="p-8 text-center rounded-3xl bg-slate-100/60 dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800 space-y-2">
            <div className="text-2xl">📌</div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">
              No completed tasks yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-gotham-400">
              When you finish tasks, check them off to archive them here.
            </p>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setTaskToEdit(null);
        }}
        onSave={saveTask}
        onDelete={deleteTask}
        taskToEdit={taskToEdit}
        subjects={subjects}
      />
    </div>
  );
};
