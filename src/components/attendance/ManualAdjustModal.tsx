import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import type { Subject, SubjectAttendanceStats } from '../../types';
import { Percent, Hash, Sparkles, Check, AlertCircle } from 'lucide-react';

interface ManualAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
  currentStats?: SubjectAttendanceStats;
  targetPercentage?: number;
  onSaveAdjustment: (subjectId: string, present: number, absent: number) => Promise<void>;
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
  onSaveAdjustment,
}) => {
  const [mode, setMode] = useState<'counts' | 'percentage'>('percentage');

  // Mode: Class Counts
  const [present, setPresent] = useState<string>('0');
  const [absent, setAbsent] = useState<string>('0');

  // Mode: Percentage
  const [percentageInput, setPercentageInput] = useState<string>('85');
  const [totalClassesInput, setTotalClassesInput] = useState<string>('20');

  useEffect(() => {
    if (subject) {
      const initP = subject.initialPresent || 0;
      const initA = subject.initialAbsent || 0;
      const total = initP + initA;

      setPresent(initP.toString());
      setAbsent(initA.toString());

      if (total > 0) {
        const pct = Math.round((initP / total) * 10000) / 100;
        setPercentageInput(pct.toString());
        setTotalClassesInput(total.toString());
      } else if (currentStats && currentStats.conducted > 0) {
        setPercentageInput(currentStats.percentage.toFixed(1));
        setTotalClassesInput(currentStats.conducted.toString());
      } else {
        setPercentageInput('85');
        setTotalClassesInput('20');
      }
    }
  }, [subject, currentStats, isOpen]);

  // Derived effective values
  const effectiveValues = useMemo(() => {
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

  if (!subject) return null;

  const handleSwitchToCounts = () => {
    setPresent(effectiveValues.present.toString());
    setAbsent(effectiveValues.absent.toString());
    setMode('counts');
  };

  const handleSwitchToPercentage = () => {
    setPercentageInput(effectiveValues.percentage.toString());
    if (effectiveValues.total > 0) {
      setTotalClassesInput(effectiveValues.total.toString());
    }
    setMode('percentage');
  };

  const handlePresetPercentage = (pct: number) => {
    setPercentageInput(pct.toString());
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveAdjustment(subject.id, effectiveValues.present, effectiveValues.absent);
    onClose();
  };

  const isSafe = effectiveValues.percentage >= targetPercentage;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Adjust Baseline: ${subject.name}`}>
      <form onSubmit={handleSave} className="space-y-4">
        {/* Info banner */}
        <div className="p-3 bg-bat-gold/10 dark:bg-gotham-900 rounded-xl border border-bat-gold/30 text-xs text-slate-800 dark:text-gotham-200 font-mono leading-relaxed">
          <strong className="font-bold text-bat-accent">OFFICIAL COLLEGE PORTAL SYNC:</strong>
          <p className="mt-0.5 text-gotham-300">
            Set your current baseline from your college ERP or portal. Attnd will calculate future attendance starting from this baseline.
          </p>
        </div>

        {/* Mode Selector Tabs */}
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

        {/* PERCENTAGE MODE INPUTS */}
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
                    placeholder="e.g. 85.5"
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
                  <Hash size={13} /> Total Classes (Conducted)
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={totalClassesInput}
                  onChange={(e) => setTotalClassesInput(e.target.value)}
                  placeholder="e.g. 35 (or leave empty)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gotham-750 bg-white dark:bg-gotham-900 text-slate-900 dark:text-white font-mono font-black text-lg focus:outline-none focus:ring-2 focus:ring-bat-gold min-h-[44px]"
                />
              </div>
            </div>

            {/* Quick Percentage Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-mono text-slate-400 dark:text-gotham-400 mr-1">
                Presets:
              </span>
              {[75, 80, 85, 90, 100].map((preset) => (
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

        {/* CLASS COUNTS MODE INPUTS */}
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

        {/* LIVE CALCULATION BREAKDOWN CARD */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gotham-850/80 border border-slate-200 dark:border-gotham-750 space-y-2.5 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-gotham-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles size={13} className="text-bat-accent" />
              Calculated Baseline
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

          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            <div className="p-2 rounded-xl bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800">
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                PRESENT
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {effectiveValues.present}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800">
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block">
                ABSENT
              </span>
              <span className="text-base font-black text-slate-900 dark:text-white">
                {effectiveValues.absent}
              </span>
            </div>

            <div className="p-2 rounded-xl bg-white dark:bg-gotham-900 border border-slate-200 dark:border-gotham-800">
              <span className="text-[10px] text-bat-accent font-bold block">
                ATTENDANCE
              </span>
              <span
                className={`text-base font-black ${
                  isSafe ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {effectiveValues.percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-gotham-400 flex items-center justify-between pt-1">
            <span>
              Total Conducted:{' '}
              <strong className="text-slate-800 dark:text-white">
                {effectiveValues.total} classes
              </strong>
            </span>
            <span>
              Target:{' '}
              <strong className="text-bat-accent">{targetPercentage}%</strong>
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-gotham-750">
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
      </form>
    </Modal>
  );
};
