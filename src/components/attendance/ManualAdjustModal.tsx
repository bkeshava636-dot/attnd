import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import type { Subject, SubjectAttendanceStats, AttendanceRecord } from '../../types';
import { Percent, Hash, Sparkles, Calendar, RotateCcw } from 'lucide-react';
import { formatDate } from '../../services/attendanceEngine';

interface ManualAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  currentStats?: SubjectAttendanceStats;
  targetPercentage?: number;
  records?: AttendanceRecord[];
  onSaveAdjustment: (
    subjectId: string,
    present: number,
    absent: number,
    baselineDate?: string
  ) => Promise<void>;
}

export function calculateFromPercentage(
  percentage: number,
  totalClasses?: number
): { present: number; absent: number; total: number; actualPercentage: number } {
  const pct = Math.min(100, Math.max(0, percentage));

  if (totalClasses && totalClasses > 0) {
    const present = Math.min(totalClasses, Math.max(0, Math.round((pct / 100) * totalClasses)));
    const absent = totalClasses - present;
    const actualPercentage = totalClasses > 0 ? (present / totalClasses) * 100 : 100;
    return { present, absent, total: totalClasses, actualPercentage };
  }

  // If no total classes provided or 0, find best whole number ratio with denominator <= 100
  if (pct === 0) return { present: 0, absent: 1, total: 1, actualPercentage: 0 };
  if (pct === 100) return { present: 10, absent: 0, total: 10, actualPercentage: 100 };

  let bestPresent = Math.round(pct);
  let bestTotal = 100;
  let minDiff = Infinity;

  for (let d = 1; d <= 100; d++) {
    const p = Math.round((pct / 100) * d);
    const diff = Math.abs((p / d) * 100 - pct);
    if (diff < minDiff - 0.0001) {
      minDiff = diff;
      bestPresent = p;
      bestTotal = d;
      if (diff === 0) break;
    }
  }

  const absent = bestTotal - bestPresent;
  const actualPercentage = (bestPresent / bestTotal) * 100;
  return { present: bestPresent, absent, total: bestTotal, actualPercentage };
}

export const ManualAdjustModal: React.FC<ManualAdjustModalProps> = ({
  isOpen,
  onClose,
  subject,
  currentStats,
  targetPercentage = 85,
  records = [],
  onSaveAdjustment,
}) => {
  const [mode, setMode] = useState<'counts' | 'percentage'>('percentage');

  // As-of date cutoff (official report date)
  const todayStr = useMemo(() => formatDate(new Date()), []);
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);

  // Mode: Class Counts
  const [present, setPresent] = useState<string>('0');
  const [absent, setAbsent] = useState<string>('0');

  // Mode: Percentage
  const [percentageInput, setPercentageInput] = useState<string>('85');
  const [totalClassesInput, setTotalClassesInput] = useState<string>('20');

  // Subject records
  const subjectRecords = useMemo(() => {
    if (!subject) return [];
    return records.filter(r => r.subjectId === subject.id);
  }, [subject, records]);

  useEffect(() => {
    if (subject) {
      const initP = subject.initialPresent || 0;
      const initA = subject.initialAbsent || 0;
      const total = initP + initA;

      // Initialize date: use subject's existing baselineDate, otherwise default to today
      const defaultDate = subject.baselineDate || todayStr;
      setAsOfDate(defaultDate);

      // Determine default total classes conducted up to date
      const recordedUpToDate = subjectRecords.filter(
        r => (!defaultDate || r.date <= defaultDate) && (r.status === 'present' || r.status === 'absent')
      ).length;

      if (total > 0) {
        const pct = Math.round((initP / total) * 10000) / 100;
        setPercentageInput(pct.toString());
        setTotalClassesInput(total.toString());
        setPresent(initP.toString());
        setAbsent(initA.toString());
      } else if (recordedUpToDate > 0) {
        const pCount = subjectRecords.filter(
          r => (!defaultDate || r.date <= defaultDate) && r.status === 'present'
        ).length;
        const aCount = recordedUpToDate - pCount;
        const pct = Math.round((pCount / recordedUpToDate) * 10000) / 100;
        setPercentageInput(pct.toString());
        setTotalClassesInput(recordedUpToDate.toString());
        setPresent(pCount.toString());
        setAbsent(aCount.toString());
      } else if (currentStats && currentStats.conducted > 0) {
        setPercentageInput(currentStats.percentage.toFixed(1));
        setTotalClassesInput(currentStats.conducted.toString());
        setPresent(currentStats.present.toString());
        setAbsent(currentStats.absent.toString());
      } else {
        setPercentageInput('85');
        setTotalClassesInput('20');
        setPresent('17');
        setAbsent('3');
      }
    }
  }, [subject, currentStats, isOpen, todayStr]);

  // Derived effective baseline values
  const effectiveBaseline = useMemo(() => {
    if (mode === 'counts') {
      const p = Math.max(0, parseInt(present, 10) || 0);
      const a = Math.max(0, parseInt(absent, 10) || 0);
      const total = p + a;
      const pct = total > 0 ? Math.round((p / total) * 10000) / 100 : 100;
      return { present: p, absent: a, total, percentage: pct };
    } else {
      const parsedPct = parseFloat(percentageInput) || 0;
      const parsedTotal = parseInt(totalClassesInput, 10);
      const res = calculateFromPercentage(parsedPct, parsedTotal > 0 ? parsedTotal : undefined);
      return {
        present: res.present,
        absent: res.absent,
        total: res.total,
        percentage: Math.round(res.actualPercentage * 100) / 100,
      };
    }
  }, [mode, present, absent, percentageInput, totalClassesInput]);

  // Records strictly AFTER the selected as-of date (which will be added to the baseline)
  const postDateStats = useMemo(() => {
    if (!asOfDate) {
      return { present: 0, absent: 0, total: 0 };
    }
    const postRecords = subjectRecords.filter(
      r => r.date > asOfDate && (r.status === 'present' || r.status === 'absent')
    );
    const p = postRecords.filter(r => r.status === 'present').length;
    const a = postRecords.filter(r => r.status === 'absent').length;
    return { present: p, absent: a, total: p + a };
  }, [subjectRecords, asOfDate]);

  // Projected Final Subject Attendance
  const projectedFinal = useMemo(() => {
    const totalP = effectiveBaseline.present + postDateStats.present;
    const totalA = effectiveBaseline.absent + postDateStats.absent;
    const totalCond = totalP + totalA;
    const pct = totalCond > 0 ? Math.round((totalP / totalCond) * 10000) / 100 : 100;
    return {
      present: totalP,
      absent: totalA,
      conducted: totalCond,
      percentage: pct,
    };
  }, [effectiveBaseline, postDateStats]);

  if (!subject) return null;

  const handleSwitchToCounts = () => {
    setPresent(effectiveBaseline.present.toString());
    setAbsent(effectiveBaseline.absent.toString());
    setMode('counts');
  };

  const handleSwitchToPercentage = () => {
    setPercentageInput(effectiveBaseline.percentage.toString());
    if (effectiveBaseline.total > 0) {
      setTotalClassesInput(effectiveBaseline.total.toString());
    }
    setMode('percentage');
  };

  const handlePresetPercentage = (pct: number) => {
    setPercentageInput(pct.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAdjustment(
      subject.id,
      effectiveBaseline.present,
      effectiveBaseline.absent,
      asOfDate || undefined
    );
    onClose();
  };

  const handleClearBaseline = async () => {
    if (window.confirm(`Clear baseline for ${subject.name}? Attendance will be calculated strictly from individual class records.`)) {
      await onSaveAdjustment(subject.id, 0, 0, undefined);
      onClose();
    }
  };

  const isSafe = projectedFinal.percentage >= targetPercentage;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Baseline: ${subject.name}`} maxWidth="max-w-lg">
      <form onSubmit={handleSave} className="space-y-4">
        {/* Info banner */}
        <div className="p-3 bg-bat-gold/10 dark:bg-gotham-900 rounded-xl border border-bat-gold/30 text-xs text-slate-800 dark:text-gotham-200 font-mono leading-relaxed">
          <strong className="font-bold text-bat-accent">OFFICIAL PROCTOR / ERP PORTAL SYNC:</strong>
          <p className="mt-0.5 text-slate-600 dark:text-gotham-300">
            Enter your official attendance as reported on your portal. Past records up to that date will be synchronized to this baseline, and future classes will count forward.
          </p>
        </div>

        {/* 1. AS OF DATE (Official Report Date) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750 space-y-2">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-bat-accent" />
              As of Date (Official Report Date)
            </span>
            <span className="text-[10px] text-slate-400 dark:text-gotham-500 font-normal">
              Cutoff Date
            </span>
          </label>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-gotham-700 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-1 focus:ring-bat-gold min-h-[40px]"
            />
            <button
              type="button"
              onClick={() => setAsOfDate(todayStr)}
              className={`px-3 py-2 rounded-xl border text-xs font-mono font-bold min-h-[40px] transition-colors ${
                asOfDate === todayStr
                  ? 'bg-bat-gold/20 text-bat-accent border-bat-gold'
                  : 'bg-white dark:bg-gotham-900 text-slate-600 dark:text-gotham-400 border-slate-300 dark:border-gotham-700 hover:bg-slate-100 dark:hover:bg-gotham-800'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setAsOfDate('')}
              className={`px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors ${
                !asOfDate
                  ? 'bg-bat-gold/20 text-bat-accent border-bat-gold font-bold'
                  : 'bg-white dark:bg-gotham-900 text-slate-400 dark:text-gotham-500 border-slate-300 dark:border-gotham-700 hover:bg-slate-100 dark:hover:bg-gotham-800'
              }`}
              title="Apply baseline from semester start (no date cutoff)"
            >
              All Time
            </button>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-gotham-400 font-sans leading-tight">
            {asOfDate ? (
              <span>
                Classes on or before <strong>{asOfDate}</strong> are covered by this baseline (not double-counted).
              </span>
            ) : (
              <span>Baseline applies to the entire semester.</span>
            )}
          </p>
        </div>

        {/* 2. MODE SELECTOR */}
        <div className="flex p-1 bg-slate-100 dark:bg-gotham-950 rounded-xl border border-slate-200 dark:border-gotham-800 gap-1">
          <button
            type="button"
            onClick={handleSwitchToPercentage}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'percentage'
                ? 'bg-bat-gold text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-gotham-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Percent size={14} />
            <span>By Percentage (%)</span>
          </button>

          <button
            type="button"
            onClick={handleSwitchToCounts}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              mode === 'counts'
                ? 'bg-bat-gold text-slate-950 shadow-sm'
                : 'text-slate-600 dark:text-gotham-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Hash size={14} />
            <span>By Class Counts</span>
          </button>
        </div>

        {/* 3. INPUT FIELDS */}
        {mode === 'percentage' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Percentage input */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-bat-accent mb-1 flex items-center gap-1">
                  <Percent size={13} /> Official Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    required
                    autoFocus
                    value={percentageInput}
                    onChange={(e) => setPercentageInput(e.target.value)}
                    placeholder="e.g. 90"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gotham-500 font-bold font-mono">
                    %
                  </span>
                </div>
              </div>

              {/* Total classes input */}
              <div>
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-gotham-300 mb-1 flex items-center gap-1">
                  <Hash size={13} /> Conducted as of this date
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={totalClassesInput}
                  onChange={(e) => setTotalClassesInput(e.target.value)}
                  placeholder="e.g. 40"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px]"
                />
              </div>
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-mono text-slate-400 dark:text-gotham-400 mr-1">
                Presets:
              </span>
              {[75, 80, 85, 90, 95, 100].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handlePresetPercentage(preset)}
                  className={`px-2 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    parseFloat(percentageInput) === preset
                      ? 'bg-bat-gold/20 text-bat-accent border-bat-gold'
                      : 'bg-slate-100 dark:bg-gotham-850 text-slate-600 dark:text-gotham-400 border-slate-200 dark:border-gotham-750 hover:bg-slate-200 dark:hover:bg-gotham-800'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>
          </div>
        )}

        {mode === 'counts' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                Official Present
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                required
                autoFocus
                value={present}
                onChange={(e) => setPresent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                Official Absent
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                required
                value={absent}
                onChange={(e) => setAbsent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-rose-500 min-h-[44px]"
              />
            </div>
          </div>
        )}

        {/* 4. LIVE TELEMETRY BREAKDOWN & PROJECTION CARD */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gotham-850/80 border border-slate-200 dark:border-gotham-750 space-y-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-gotham-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={13} className="text-bat-accent" />
              Baseline as of {asOfDate || 'Semester Start'}
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isSafe
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : 'bg-rose-500/15 text-rose-500'
              }`}
            >
              {isSafe ? '✓ Above Target' : '! Below Target'}
            </span>
          </div>

          {/* Baseline Counts */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                PRESENT
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {effectiveBaseline.present}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                ABSENT
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {effectiveBaseline.absent}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800">
              <span className="text-[10px] text-bat-accent font-bold block">
                BASELINE %
              </span>
              <span
                className={`text-base font-black ${
                  effectiveBaseline.percentage >= targetPercentage ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {effectiveBaseline.percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Projection Preview: Resulting Overall Attendance */}
          <div className="pt-2 border-t border-slate-200 dark:border-gotham-750/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-gotham-300 font-bold">
                Resulting Subject Attendance:
              </span>
              <span
                className={`text-sm font-black ${
                  isSafe ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {projectedFinal.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gotham-400">
              <span>
                Total Conducted: <strong className="text-slate-800 dark:text-white">{projectedFinal.conducted} classes</strong> ({projectedFinal.present} Present)
              </span>
              <span>
                Target: <strong className="text-bat-accent">{targetPercentage}%</strong>
              </span>
            </div>

            {postDateStats.total > 0 && asOfDate && (
              <p className="text-[10px] text-slate-500 dark:text-gotham-400 italic pt-1">
                Includes {postDateStats.total} class{postDateStats.total > 1 ? 'es' : ''} marked after {asOfDate} ({postDateStats.present} present, {postDateStats.absent} absent).
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-gotham-750">
          <div>
            {(subject.initialPresent > 0 || subject.initialAbsent > 0 || subject.baselineDate) && (
              <button
                type="button"
                onClick={handleClearBaseline}
                className="px-2.5 py-2 text-xs font-mono text-rose-500 hover:text-rose-600 hover:underline flex items-center gap-1 min-h-[44px]"
              >
                <RotateCcw size={13} />
                <span>Reset to 0</span>
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 min-h-[44px] text-xs font-bold rounded-xl text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 min-h-[44px] text-xs font-black uppercase tracking-wider rounded-xl bg-bat-gold hover:bg-bat-accent text-gotham-950 shadow-bat-glow-sm transition-transform active:scale-95"
            >
              Update Baseline
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
