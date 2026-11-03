import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Modal } from '../common/Modal';
import type { Subject, SubjectAttendanceStats, AttendanceRecord } from '../../types';
import { Percent, Hash, Sparkles, Calendar, RotateCcw, Check, AlertCircle, Zap } from 'lucide-react';
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

/**
 * Calculates present & absent integers that match the desired percentage as closely as possible,
 * prioritizing exact whole-number percentages with denominators close to preferredTotal.
 */
export function calculateFromPercentage(
  percentage: number,
  preferredTotal: number = 40,
  strictTotal?: number
): { present: number; absent: number; total: number; actualPercentage: number; isExact: boolean } {
  const pct = Math.min(100, Math.max(0, percentage));

  // If user explicitly provided a strict custom total:
  if (strictTotal && strictTotal > 0) {
    const present = Math.min(strictTotal, Math.max(0, Math.round((pct / 100) * strictTotal)));
    const absent = strictTotal - present;
    const actualPercentage = strictTotal > 0 ? (present / strictTotal) * 100 : 100;
    const isExact = Math.abs(actualPercentage - pct) < 0.0001;
    return { present, absent, total: strictTotal, actualPercentage, isExact };
  }

  if (pct === 0) {
    const t = preferredTotal > 0 ? preferredTotal : 20;
    return { present: 0, absent: t, total: t, actualPercentage: 0, isExact: true };
  }
  if (pct === 100) {
    const t = preferredTotal > 0 ? preferredTotal : 20;
    return { present: t, absent: 0, total: t, actualPercentage: 100, isExact: true };
  }

  // Search denominators <= 100 for an EXACT match (within 0.0001)
  const exactMatches: Array<{
    present: number;
    absent: number;
    total: number;
    actualPercentage: number;
    diff: number;
  }> = [];

  for (let t = 1; t <= 100; t++) {
    const p = Math.round((pct / 100) * t);
    const calculated = (p / t) * 100;
    if (Math.abs(calculated - pct) < 0.0001) {
      exactMatches.push({
        present: p,
        absent: t - p,
        total: t,
        actualPercentage: pct,
        diff: Math.abs(t - preferredTotal),
      });
    }
  }

  if (exactMatches.length > 0) {
    // Prioritize proximity to preferredTotal, then cleaner denominator
    exactMatches.sort((a, b) => a.diff - b.diff || a.total - b.total);
    const match = exactMatches[0];
    return {
      present: match.present,
      absent: match.absent,
      total: match.total,
      actualPercentage: match.actualPercentage,
      isExact: true,
    };
  }

  // Fallback: closest denominator <= 100
  let best = {
    present: Math.round(pct),
    absent: 100 - Math.round(pct),
    total: 100,
    actualPercentage: Math.round(pct),
    isExact: false,
  };
  let minDiff = Infinity;
  for (let t = 1; t <= 100; t++) {
    const p = Math.round((pct / 100) * t);
    const calculated = (p / t) * 100;
    const diff = Math.abs(calculated - pct);
    if (diff < minDiff - 0.00001) {
      minDiff = diff;
      best = {
        present: p,
        absent: t - p,
        total: t,
        actualPercentage: calculated,
        isExact: Math.abs(calculated - pct) < 0.0001,
      };
    }
  }
  return best;
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
  const [totalClassesInput, setTotalClassesInput] = useState<string>('40');
  const [userCustomizedTotal, setUserCustomizedTotal] = useState<boolean>(false);

  // Subject records
  const subjectRecords = useMemo(() => {
    if (!subject) return [];
    return records.filter((r) => r.subjectId === subject.id);
  }, [subject, records]);

  // Preferred total classes reference
  const preferredTotal = useMemo(() => {
    if (subject && (subject.initialPresent || 0) + (subject.initialAbsent || 0) > 0) {
      return (subject.initialPresent || 0) + (subject.initialAbsent || 0);
    }
    if (currentStats && currentStats.conducted > 0) {
      return currentStats.conducted;
    }
    return 40;
  }, [subject, currentStats]);

  // Synchronize on modal open
  useEffect(() => {
    if (subject && isOpen) {
      const initP = subject.initialPresent || 0;
      const initA = subject.initialAbsent || 0;
      const total = initP + initA;

      // When opening, default asOfDate to todayStr so current attendance adjusts cleanly.
      // If subject has a past baselineDate, user can easily tap the shortcut to use it.
      setAsOfDate(todayStr);
      setUserCustomizedTotal(false);

      if (total > 0) {
        const pct = Math.round((initP / total) * 10000) / 100;
        setPercentageInput(pct.toString());
        setTotalClassesInput(total.toString());
        setPresent(initP.toString());
        setAbsent(initA.toString());
      } else if (currentStats && currentStats.conducted > 0) {
        const pct = Math.round(currentStats.percentage * 100) / 100;
        setPercentageInput(pct.toString());
        setTotalClassesInput(currentStats.conducted.toString());
        setPresent(currentStats.present.toString());
        setAbsent(currentStats.absent.toString());
      } else {
        const exactRatio = calculateFromPercentage(85, preferredTotal);
        setPercentageInput('85');
        setTotalClassesInput(exactRatio.total.toString());
        setPresent(exactRatio.present.toString());
        setAbsent(exactRatio.absent.toString());
      }
    }
  }, [subject, isOpen, todayStr]);

  // Handle Percentage Input Change
  const handlePercentageChange = useCallback((value: string) => {
    setPercentageInput(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      // Find exact ratio near preferred total
      const exact = calculateFromPercentage(parsed, preferredTotal);
      setTotalClassesInput(exact.total.toString());
      setUserCustomizedTotal(false);
    }
  }, [preferredTotal]);

  // Handle Preset Click
  const handlePresetPercentage = useCallback((preset: number) => {
    setPercentageInput(preset.toString());
    const exact = calculateFromPercentage(preset, preferredTotal);
    setTotalClassesInput(exact.total.toString());
    setUserCustomizedTotal(false);
  }, [preferredTotal]);

  // Handle Total Classes Input Change
  const handleTotalClassesChange = useCallback((value: string) => {
    setTotalClassesInput(value);
    setUserCustomizedTotal(true);
  }, []);

  // Snap to exact percentage
  const handleSnapToExact = useCallback(() => {
    const parsed = parseFloat(percentageInput) || 85;
    const exact = calculateFromPercentage(parsed, preferredTotal);
    setTotalClassesInput(exact.total.toString());
    setUserCustomizedTotal(false);
  }, [percentageInput, preferredTotal]);

  // Derived effective baseline values
  const effectiveBaseline = useMemo(() => {
    if (mode === 'counts') {
      const p = Math.max(0, parseInt(present, 10) || 0);
      const a = Math.max(0, parseInt(absent, 10) || 0);
      const total = p + a;
      const pct = total > 0 ? Math.round((p / total) * 10000) / 100 : 100;
      return { present: p, absent: a, total, percentage: pct, isExact: true };
    } else {
      const parsedPct = parseFloat(percentageInput) || 0;
      const parsedTotal = parseInt(totalClassesInput, 10);
      const res = calculateFromPercentage(
        parsedPct,
        preferredTotal,
        userCustomizedTotal && parsedTotal > 0 ? parsedTotal : undefined
      );
      return {
        present: res.present,
        absent: res.absent,
        total: res.total,
        percentage: Math.round(res.actualPercentage * 100) / 100,
        isExact: res.isExact,
      };
    }
  }, [mode, present, absent, percentageInput, totalClassesInput, userCustomizedTotal, preferredTotal]);

  // Records strictly AFTER the selected as-of date
  const postDateStats = useMemo(() => {
    if (!asOfDate) {
      return { present: 0, absent: 0, total: 0 };
    }
    const postRecords = subjectRecords.filter(
      (r) => r.date > asOfDate && (r.status === 'present' || r.status === 'absent')
    );
    const p = postRecords.filter((r) => r.status === 'present').length;
    const a = postRecords.filter((r) => r.status === 'absent').length;
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
    setTotalClassesInput(effectiveBaseline.total.toString());
    setUserCustomizedTotal(false);
    setMode('percentage');
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
    if (
      window.confirm(
        `Clear baseline for ${subject.name}? Attendance will be calculated strictly from individual class records.`
      )
    ) {
      await onSaveAdjustment(subject.id, 0, 0, undefined);
      onClose();
    }
  };

  const isSafe = projectedFinal.percentage >= targetPercentage;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjust Baseline: ${subject.name}`}
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Info banner */}
        <div className="p-3 bg-bat-gold/10 dark:bg-gotham-900 rounded-xl border border-bat-gold/30 text-xs text-slate-800 dark:text-gotham-200 font-mono leading-relaxed">
          <strong className="font-bold text-bat-accent">OFFICIAL PROCTOR / ERP PORTAL SYNC:</strong>
          <p className="mt-0.5 text-slate-600 dark:text-gotham-300">
            Set your authoritative attendance percentage or class counts. Historical records on or before the cutoff date are synchronized to this baseline so numbers match your portal exactly without double-counting.
          </p>
        </div>

        {/* 1. AS OF DATE (Official Report Date) */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gotham-850 border border-slate-200 dark:border-gotham-750 space-y-2">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-700 dark:text-gotham-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} className="text-bat-accent" />
              As of Date (Cutoff Date)
            </span>
            <span className="text-[10px] text-slate-400 dark:text-gotham-500 font-normal">
              {asOfDate === todayStr ? 'Current (Today)' : 'Official Past Cutoff'}
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
                  ? 'bg-bat-gold text-slate-950 border-bat-gold shadow-sm'
                  : 'bg-white dark:bg-gotham-900 text-slate-600 dark:text-gotham-400 border-slate-300 dark:border-gotham-700 hover:bg-slate-100 dark:hover:bg-gotham-800'
              }`}
            >
              Today
            </button>
            {subject.baselineDate && subject.baselineDate !== todayStr && (
              <button
                type="button"
                onClick={() => setAsOfDate(subject.baselineDate || todayStr)}
                className={`px-2.5 py-2 rounded-xl border text-xs font-mono transition-colors ${
                  asOfDate === subject.baselineDate
                    ? 'bg-bat-gold/20 text-bat-accent border-bat-gold font-bold'
                    : 'bg-white dark:bg-gotham-900 text-slate-600 dark:text-gotham-400 border-slate-300 dark:border-gotham-700 hover:bg-slate-100 dark:hover:bg-gotham-800'
                }`}
                title={`Use saved cutoff date: ${subject.baselineDate}`}
              >
                {subject.baselineDate}
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-500 dark:text-gotham-400 font-sans leading-tight">
            {asOfDate === todayStr ? (
              <span>
                All classes up to <strong>Today</strong> will be set to this baseline. New classes will count forward.
              </span>
            ) : asOfDate ? (
              <span>
                Classes on or before <strong>{asOfDate}</strong> are covered by this baseline. Classes marked after {asOfDate} accumulate forward.
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
                  <Percent size={13} /> Desired Percentage
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
                    onChange={(e) => handlePercentageChange(e.target.value)}
                    placeholder="e.g. 85"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-black text-xl focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px] pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gotham-500 font-bold font-mono">
                    %
                  </span>
                </div>
              </div>

              {/* Total classes input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-gotham-300 flex items-center gap-1">
                    <Hash size={13} /> Base Total Classes
                  </label>
                  {userCustomizedTotal && !effectiveBaseline.isExact && (
                    <button
                      type="button"
                      onClick={handleSnapToExact}
                      className="text-[10px] font-mono text-bat-accent hover:underline flex items-center gap-0.5"
                    >
                      <Zap size={11} /> Snap Exact
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="500"
                  value={totalClassesInput}
                  onChange={(e) => handleTotalClassesChange(e.target.value)}
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
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    parseFloat(percentageInput) === preset
                      ? 'bg-bat-gold text-slate-950 border-bat-gold shadow-sm'
                      : 'bg-slate-100 dark:bg-gotham-850 text-slate-600 dark:text-gotham-400 border-slate-200 dark:border-gotham-750 hover:bg-slate-200 dark:hover:bg-gotham-800'
                  }`}
                >
                  {preset}%
                </button>
              ))}
            </div>

            {/* Non-exact warning if user custom-typed an odd total */}
            {userCustomizedTotal && !effectiveBaseline.isExact && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 font-mono">
                <span className="flex items-center gap-1">
                  <AlertCircle size={13} />
                  {effectiveBaseline.present}/{effectiveBaseline.total} gives {effectiveBaseline.percentage.toFixed(2)}%
                </span>
                <button
                  type="button"
                  onClick={handleSnapToExact}
                  className="font-bold underline text-bat-accent"
                >
                  Snap to exact {percentageInput}%
                </button>
              </div>
            )}
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
              Baseline as of {asOfDate === todayStr ? 'Today' : asOfDate}
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
                  effectiveBaseline.percentage >= targetPercentage
                    ? 'text-emerald-500'
                    : 'text-rose-500'
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
                className={`text-base font-black ${
                  isSafe ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {projectedFinal.percentage.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gotham-400">
              <span>
                Total Conducted:{' '}
                <strong className="text-slate-800 dark:text-white">
                  {projectedFinal.conducted} classes
                </strong>{' '}
                ({projectedFinal.present} Present)
              </span>
              <span>
                Target: <strong className="text-bat-accent">{targetPercentage}%</strong>
              </span>
            </div>

            {postDateStats.total > 0 && asOfDate && (
              <div className="p-2 rounded-xl bg-bat-gold/10 border border-bat-gold/20 space-y-1">
                <p className="text-[10px] text-slate-600 dark:text-gotham-300 leading-snug">
                  Includes <strong>{postDateStats.total} class{postDateStats.total > 1 ? 'es' : ''}</strong> marked after {asOfDate} ({postDateStats.present} present, {postDateStats.absent} absent).
                </p>
                <button
                  type="button"
                  onClick={() => setAsOfDate(todayStr)}
                  className="text-[11px] text-bat-accent font-bold hover:underline flex items-center gap-1"
                >
                  <Zap size={11} /> Make Current Attendance Exactly {effectiveBaseline.percentage.toFixed(1)}% (Set Cutoff to Today)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-gotham-750">
          <div>
            {(subject.initialPresent > 0 ||
              subject.initialAbsent > 0 ||
              subject.baselineDate) && (
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
