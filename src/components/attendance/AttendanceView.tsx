import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Sliders, FileSpreadsheet, Edit2, Trash2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SubjectModal } from './SubjectModal';
import { ManualAdjustModal } from './ManualAdjustModal';
import { SubjectAuditModal } from './SubjectAuditModal';
import { AttendanceProjection } from './AttendanceProjection';
import type { Subject, SubjectAttendanceStats } from '../../types';

export const AttendanceView: React.FC = () => {
  const {
    subjects,
    subjectStats,
    saveSubject,
    deleteSubject,
    overallStats,
    semesterSettings,
  } = useApp();

  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [adjustingSubject, setAdjustingSubject] = useState<Subject | null>(null);
  const [auditStats, setAuditStats] = useState<SubjectAttendanceStats | null>(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [showInsights, setShowInsights] = useState<boolean>(false);

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setIsSubjectModalOpen(true);
  };

  const handleOpenEdit = (sub: Subject) => {
    setEditingSubject(sub);
    setIsSubjectModalOpen(true);
  };

  const handleDelete = async (sub: Subject) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${sub.name}"? This will also remove its timetable slots and records.`
      )
    ) {
      await deleteSubject(sub.id);
    }
  };

  const handleSaveAdjustment = async (subjectId: string, present: number, absent: number) => {
    const sub = subjects.find((s) => s.id === subjectId);
    if (!sub) return;
    await saveSubject({
      ...sub,
      initialPresent: present,
      initialAbsent: absent,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedSubjectId(prev => (prev === id ? null : id));
  };

  const isOverallSafe = overallStats.percentage >= overallStats.target;

  return (
    <div className="space-y-6 animate-fadeIn max-w-xl mx-auto pb-12">
      {/* 1. TOP OVERVIEW CARD */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 dark:from-[#141724] dark:via-[#10121c] dark:to-[#090b10] border border-slate-800 dark:border-gotham-750/70 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 right-10 w-48 h-20 bg-bat-accent/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gotham-400 font-medium relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-bat-gold shadow-bat-glow-sm" />
            <span className="uppercase tracking-widest text-[11px] font-bold text-slate-300 dark:text-gotham-300">
              Overall Attendance
            </span>
          </div>
          <span className="bg-white/5 dark:bg-gotham-800/80 px-2.5 py-1 rounded-full border border-white/10 dark:border-gotham-700 text-slate-300 dark:text-gotham-300">
            Target: <strong className="text-bat-accent font-mono">{overallStats.target}%</strong>
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between relative z-10">
          <span
            className={`text-4xl sm:text-5xl font-black font-mono tracking-tight ${
              isOverallSafe ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {overallStats.percentage.toFixed(1)}%
          </span>
          <span className="text-xs font-mono text-slate-400 dark:text-gotham-400">
            {overallStats.present} / {overallStats.conducted} attended
          </span>
        </div>

        {/* Visual Overall Progress Bar */}
        <div className="w-full h-2 bg-slate-800 dark:bg-gotham-800/90 rounded-full overflow-hidden my-3 relative z-10">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isOverallSafe
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : 'bg-gradient-to-r from-rose-500 to-amber-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, overallStats.percentage))}%` }}
          />
        </div>

        <div className="pt-3 border-t border-white/10 dark:border-gotham-800 flex items-center justify-between relative z-10">
          <button
            onClick={() => setShowInsights(!showInsights)}
            className="text-xs font-bold text-bat-accent hover:underline flex items-center gap-1.5 min-h-[44px]"
          >
            <Sparkles size={15} />
            {showInsights ? 'Hide What-if Simulator' : 'What-if Simulator & Insights'}
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 min-h-[44px] rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 font-bold text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95"
          >
            <Plus size={14} /> Add Subject
          </button>
        </div>
      </section>

      {/* 2. OPTIONAL WHAT-IF SIMULATOR */}
      {showInsights && (
        <div className="p-1 animate-fadeIn">
          <AttendanceProjection />
        </div>
      )}

      {/* 3. VISUALLY RICH SUBJECT CARDS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-gotham-400">
            Subjects ({subjectStats.length})
          </h2>
          <span className="text-xs text-slate-400 dark:text-gotham-500">
            Tap card for actions
          </span>
        </div>

        {subjectStats.length === 0 ? (
          <div className="p-8 text-center rounded-3xl border border-dashed border-slate-200 dark:border-gotham-800 bg-white dark:bg-gotham-900/40">
            <p className="text-sm font-medium text-slate-700 dark:text-gotham-300">
              No subjects registered yet
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 min-h-[44px] rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 font-bold text-xs"
            >
              Add Subject
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {subjectStats.map((stat) => {
              const { subject } = stat;
              const isExpanded = expandedSubjectId === subject.id;
              const isAbove = stat.percentage >= stat.target;
              const delta = stat.percentage - stat.target;

              return (
                <div
                  key={subject.id}
                  className={`border rounded-2xl overflow-hidden transition-all duration-200 shadow-sm ${
                    isAbove
                      ? 'bg-white dark:bg-[#12151e] border-slate-200/90 dark:border-gotham-800'
                      : 'bg-white dark:bg-[#191015] border-rose-500/30'
                  }`}
                >
                  {/* Primary Interactive Card Area */}
                  <button
                    onClick={() => toggleExpand(subject.id)}
                    className="w-full p-4 text-left block min-h-[56px] hover:bg-slate-50/50 dark:hover:bg-gotham-850/50 transition-colors"
                  >
                    {/* Top Row: Name and Big Percentage */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                          {subject.name}
                        </h3>
                        <div className="text-xs text-slate-500 dark:text-gotham-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-bat-accent font-semibold">{subject.shortName}</span>
                          {subject.code && <span>• {subject.code}</span>}
                          <span className="capitalize">• {subject.type}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span
                          className={`text-2xl font-black font-mono tracking-tight ${
                            isAbove ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'
                          }`}
                        >
                          {stat.percentage.toFixed(1)}%
                        </span>
                        <div className="text-slate-400 dark:text-gotham-400 p-1">
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar (Visual representation) */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-gotham-800/80 rounded-full overflow-hidden my-2.5">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isAbove
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                            : 'bg-gradient-to-r from-rose-500 to-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, stat.percentage))}%` }}
                      />
                    </div>

                    {/* Meta Row: Counts & Target Delta Pill */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-600 dark:text-gotham-300 font-medium">
                        {stat.present} Present · {stat.absent} Absent
                        {stat.cancelled > 0 ? ` · ${stat.cancelled} Cancel` : ''}
                      </span>
                      <span
                        className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isAbove
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        }`}
                      >
                        {delta >= 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`} {delta >= 0 ? 'above' : 'below'} target
                      </span>
                    </div>
                  </button>

                  {/* Expanded Details Panel */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-gotham-800 bg-slate-50/70 dark:bg-gotham-950/60 text-xs font-mono space-y-3 animate-fadeIn">
                      {/* Breakdown Counts */}
                      <div className="grid grid-cols-4 gap-2 text-center py-2.5 bg-white dark:bg-gotham-900 rounded-xl border border-slate-200 dark:border-gotham-800 shadow-inner">
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase tracking-wider">Present</div>
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                            {stat.present}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase tracking-wider">Absent</div>
                          <div className="font-bold text-rose-600 dark:text-rose-400 text-sm mt-0.5">
                            {stat.absent}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase tracking-wider">Cancelled</div>
                          <div className="font-bold text-slate-500 dark:text-gotham-400 text-sm mt-0.5">
                            {stat.cancelled}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500 dark:text-gotham-400 uppercase tracking-wider">Total</div>
                          <div className="font-bold text-slate-900 dark:text-white text-sm mt-0.5">
                            {stat.conducted}
                          </div>
                        </div>
                      </div>

                      {/* Status Advice */}
                      <p className="text-slate-700 dark:text-gotham-300 font-sans">
                        {isAbove ? (
                          <span>
                            Above target ({stat.target}%). You can safely miss{' '}
                            <strong className="text-slate-900 dark:text-white">{stat.canMiss}</strong> more {stat.canMiss === 1 ? 'class' : 'classes'}.
                          </span>
                        ) : (
                          <span>
                            Below target ({stat.target}%). Need to attend{' '}
                            <strong className="text-rose-600 dark:text-rose-400">{stat.needToAttend}</strong> consecutive classes to reach target.
                          </span>
                        )}
                      </p>

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-gotham-800">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setAuditStats(stat)}
                            className="px-2.5 py-1.5 min-h-[44px] rounded-lg text-slate-600 dark:text-gotham-300 hover:bg-slate-200 dark:hover:bg-gotham-800 flex items-center gap-1 font-sans font-medium"
                          >
                            <FileSpreadsheet size={14} className="text-bat-accent" /> History
                          </button>
                          <button
                            onClick={() => setAdjustingSubject(subject)}
                            className="px-2.5 py-1.5 min-h-[44px] rounded-lg text-slate-600 dark:text-gotham-300 hover:bg-slate-200 dark:hover:bg-gotham-800 flex items-center gap-1 font-sans font-medium"
                          >
                            <Sliders size={14} /> Adjust baseline
                          </button>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEdit(subject)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-gotham-800"
                            title="Edit"
                            aria-label="Edit subject"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(subject)}
                            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete"
                            aria-label="Delete subject"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modals */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={saveSubject}
        subjectToEdit={editingSubject}
        totalSubjects={subjects.length}
      />

      {adjustingSubject && (
        <ManualAdjustModal
          isOpen={true}
          onClose={() => setAdjustingSubject(null)}
          subject={adjustingSubject}
          currentStats={subjectStats.find((s) => s.subject.id === adjustingSubject.id)}
          targetPercentage={semesterSettings?.defaultTarget || 85}
          onSaveAdjustment={handleSaveAdjustment}
        />
      )}

      {auditStats && (
        <SubjectAuditModal
          isOpen={true}
          onClose={() => setAuditStats(null)}
          stats={auditStats}
        />
      )}
    </div>
  );
};
