import React, { useState } from 'react';
import {
  Plus,
  Clock,
  Edit2,
  Trash2,
  Link2,
  Unlink,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TimetablePeriodModal } from './TimetablePeriodModal';
import { ShareTemplateModal } from '../settings/ShareTemplateModal';
import { DAY_NAMES } from '../../services/attendanceEngine';
import type { DayOfWeek, TimetablePeriod } from '../../types';

export const TimetableManager: React.FC = () => {
  const {
    timetable,
    subjects,
    semesterSettings,
    saveTimetablePeriod,
    deleteTimetablePeriod,
    setActiveTab,
  } = useApp();

  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(1);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [editingPeriod, setEditingPeriod] = useState<TimetablePeriod | null>(null);

  const availableDays: DayOfWeek[] = [1, 2, 3, 4, 5, 6];
  if (semesterSettings?.includeSundayInTimetable) {
    availableDays.push(0);
  }

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));

  const dayPeriods = timetable
    .filter((p) => p.dayOfWeek === selectedDay)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  const handleOpenAdd = () => {
    setEditingPeriod(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: TimetablePeriod) => {
    setEditingPeriod(p);
    setIsModalOpen(true);
  };

  const handleDelete = async (periodId: string) => {
    await deleteTimetablePeriod(periodId);
  };

  const handleGroupWithNext = async (p1: TimetablePeriod, p2: TimetablePeriod) => {
    const unitId = p1.unitGroupId || `unit_${Date.now()}`;
    await saveTimetablePeriod({ ...p1, unitGroupId: unitId });
    await saveTimetablePeriod({ ...p2, unitGroupId: unitId });
  };

  const handleUngroupUnit = async (unitGroupId: string) => {
    const periodsInUnit = dayPeriods.filter((p) => p.unitGroupId === unitGroupId);
    for (const p of periodsInUnit) {
      const updated = { ...p };
      delete updated.unitGroupId;
      await saveTimetablePeriod(updated);
    }
  };

  // Group contiguous periods for display
  type DisplayPeriodGroup = {
    key: string;
    isGroup: boolean;
    unitGroupId?: string;
    periodLabel: string;
    periods: TimetablePeriod[];
    subjectName: string;
    startTime?: string;
    endTime?: string;
  };

  const displayGroups: DisplayPeriodGroup[] = [];
  let i = 0;
  while (i < dayPeriods.length) {
    const p = dayPeriods[i];
    const sub = subjectMap.get(p.subjectId);
    const subName = sub ? sub.name : 'Unknown Subject';

    if (p.unitGroupId) {
      const grouped: TimetablePeriod[] = [p];
      let j = i + 1;
      while (j < dayPeriods.length && dayPeriods[j].unitGroupId === p.unitGroupId) {
        grouped.push(dayPeriods[j]);
        j++;
      }
      const startP = grouped[0].periodNumber;
      const endP = grouped[grouped.length - 1].periodNumber;
      displayGroups.push({
        key: `group_${p.unitGroupId}_${startP}`,
        isGroup: true,
        unitGroupId: p.unitGroupId,
        periodLabel: `P${startP}–P${endP}`,
        periods: grouped,
        subjectName: subName,
        startTime: grouped[0].startTime,
        endTime: grouped[grouped.length - 1].endTime,
      });
      i = j;
    } else {
      displayGroups.push({
        key: `p_${p.id}`,
        isGroup: false,
        periodLabel: `P${p.periodNumber}`,
        periods: [p],
        subjectName: subName,
        startTime: p.startTime,
        endTime: p.endTime,
      });
      i++;
    }
  }

  return (
    <div className="space-y-6 animate-fadeIn max-w-xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('settings')}
            className="p-2 -ml-1 text-slate-500 dark:text-gotham-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Back to settings"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Weekly Timetable
            </h2>
            <p className="text-xs text-slate-500 dark:text-gotham-400">
              Set scheduled classes for each day of the week
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 min-h-[44px] min-w-[44px] rounded-xl border border-bat-accent/30 bg-bat-accent/10 hover:bg-bat-accent/20 text-bat-accent flex items-center justify-center transition-all shadow-sm active:scale-95"
            title="Share Class Schedule Template"
            aria-label="Share Class Schedule Template"
          >
            <Share2 size={16} />
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 min-h-[44px] rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 font-bold text-xs flex items-center gap-1 shadow-sm"
          >
            <Plus size={15} /> Add Period
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {availableDays.map((d) => {
          const isActive = selectedDay === d;
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-bat-gold text-gotham-950 shadow-sm'
                  : 'bg-white dark:bg-[#12151e] border border-slate-200 dark:border-gotham-800 text-slate-600 dark:text-gotham-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {DAY_NAMES[d]}
            </button>
          );
        })}
      </div>

      {/* Day Periods List */}
      <section className="bg-white dark:bg-[#10131c] border border-slate-200/90 dark:border-gotham-800 rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gotham-400">
          <span className="font-bold uppercase tracking-wider">{DAY_NAMES[selectedDay]}</span>
          <span className="font-mono">{dayPeriods.length} {dayPeriods.length === 1 ? 'period' : 'periods'} scheduled</span>
        </div>

        {displayGroups.length === 0 ? (
          <p className="text-xs text-center py-8 text-slate-500 dark:text-gotham-500">
            No classes scheduled for {DAY_NAMES[selectedDay]}
          </p>
        ) : (
          <div className="space-y-2.5 pt-1">
            {displayGroups.map((grp, idx) => {
              const firstPeriod = grp.periods[0];
              const nextGrp = displayGroups[idx + 1];
              const canGroupWithNext =
                !grp.isGroup &&
                nextGrp &&
                !nextGrp.isGroup &&
                nextGrp.periods[0].periodNumber === firstPeriod.periodNumber + 1 &&
                nextGrp.periods[0].subjectId === firstPeriod.subjectId;

              return (
                <div
                  key={grp.key}
                  className={`p-4 rounded-2xl border transition-all ${
                    grp.isGroup
                      ? 'border-bat-gold/40 bg-bat-gold/[0.04] dark:bg-[#141722] border-l-4 border-l-bat-gold'
                      : 'border-slate-200/90 dark:border-gotham-800 bg-slate-50/50 dark:bg-[#12151e] hover:border-slate-300 dark:hover:border-gotham-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md bg-bat-gold/15 text-bat-accent font-mono font-bold text-xs border border-bat-gold/30">
                          {grp.periodLabel}
                        </span>
                        {grp.isGroup && (
                          <span className="px-2 py-0.5 rounded-md bg-bat-gold/10 text-bat-accent font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border border-bat-gold/25">
                            <Link2 size={11} /> Grouped Unit ({grp.periods.length} periods)
                          </span>
                        )}
                        {grp.startTime && (
                          <span className="text-xs font-mono text-slate-400 dark:text-gotham-400">
                            {grp.startTime} {grp.endTime ? `– ${grp.endTime}` : ''}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-base text-slate-900 dark:text-white truncate">
                        {grp.subjectName}
                      </h4>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {grp.isGroup && grp.unitGroupId && (
                        <button
                          onClick={() => handleUngroupUnit(grp.unitGroupId!)}
                          className="px-2.5 py-1.5 min-h-[44px] rounded-xl text-xs font-bold text-slate-600 dark:text-gotham-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-gotham-800 hover:bg-slate-200 dark:hover:bg-gotham-750 flex items-center gap-1 transition-all active:scale-95"
                          title="Ungroup into individual periods"
                        >
                          <Unlink size={14} /> Ungroup
                        </button>
                      )}

                      {canGroupWithNext && (
                        <button
                          onClick={() => handleGroupWithNext(firstPeriod, nextGrp.periods[0])}
                          className="px-2.5 py-1.5 min-h-[44px] rounded-xl text-xs font-bold text-bat-accent bg-bat-gold/10 hover:bg-bat-gold/20 border border-bat-gold/30 flex items-center gap-1 transition-all active:scale-95"
                          title="Group with next period into 1 unit"
                        >
                          <Link2 size={14} /> Group
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenEdit(firstPeriod)}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 transition-all active:scale-90"
                        title="Edit period"
                        aria-label="Edit period"
                      >
                        <Edit2 size={16} />
                      </button>

                      <button
                        onClick={() => {
                          grp.periods.forEach((p) => handleDelete(p.id));
                        }}
                        className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-gotham-800 transition-all active:scale-90"
                        title="Delete period"
                        aria-label="Delete period"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Edit/Add Period Modal */}
      <TimetablePeriodModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        dayOfWeek={selectedDay}
        subjects={subjects}
        periodToEdit={editingPeriod}
        existingPeriods={dayPeriods}
        onSave={saveTimetablePeriod}
        onSaveMultiLab={async (periods) => {
          for (const p of periods) {
            await saveTimetablePeriod(p);
          }
        }}
      />

      {/* Share Template Modal */}
      <ShareTemplateModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
};
