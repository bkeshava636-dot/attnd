import React, { useState } from 'react';
import { Sliders, Plus, Minus, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { calculateProjection } from '../../services/attendanceEngine';

export const AttendanceProjection: React.FC = () => {
  const { overallStats, subjectStats } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('overall');
  const [deltaAttended, setDeltaAttended] = useState<number>(0);
  const [deltaMissed, setDeltaMissed] = useState<number>(0);

  // Find base present and absent
  let basePresent = overallStats.present;
  let baseAbsent = overallStats.absent;
  let target = overallStats.target;

  if (selectedSubjectId !== 'overall') {
    const s = subjectStats.find((sub) => sub.subject.id === selectedSubjectId);
    if (s) {
      basePresent = s.present;
      baseAbsent = s.absent;
      target = s.target;
    }
  }

  const currentTotal = basePresent + baseAbsent;
  const currentPct = currentTotal > 0 ? (basePresent / currentTotal) * 100 : 100;
  const projectedPct = calculateProjection(basePresent, baseAbsent, deltaAttended, deltaMissed);

  const resetSimulation = () => {
    setDeltaAttended(0);
    setDeltaMissed(0);
  };

  return (
    <div className="p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-gotham-750 bg-white dark:bg-gotham-850 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-bat-gold/10 text-bat-accent border border-bat-gold/20 shadow-bat-glow-sm">
            <Sliders size={18} />
          </div>
          <div>
            <h3 className="font-mono font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
              Tactical Attendance Simulator
            </h3>
            <p className="text-[11px] font-mono text-slate-500 dark:text-gotham-400">
              Project future attendance standing based on attendance actions
            </p>
          </div>
        </div>

        {/* Scope selector */}
        <select
          value={selectedSubjectId}
          onChange={(e) => {
            setSelectedSubjectId(e.target.value);
            resetSimulation();
          }}
          className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gotham-750 bg-slate-50 dark:bg-gotham-900 text-slate-800 dark:text-gotham-200 focus:outline-none focus:ring-2 focus:ring-bat-gold"
        >
          <option value="overall">All Subjects (Overall)</option>
          {subjectStats.map((s) => (
            <option key={s.subject.id} value={s.subject.id}>
              {s.subject.name}
            </option>
          ))}
        </select>
      </div>

      {/* Projection Result Card */}
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gotham-900 border border-slate-200 dark:border-gotham-750/90 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-gotham-400 uppercase tracking-widest">
            PROJECTED STANDING
          </span>
          <div className="flex items-baseline gap-2 mt-0.5 font-mono">
            <span
              className={`text-3xl sm:text-4xl font-black ${
                projectedPct >= target
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {projectedPct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400 dark:text-gotham-400 font-bold">
              (CURRENT: {currentPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {(deltaAttended > 0 || deltaMissed > 0) && (
          <button
            onClick={resetSimulation}
            className="flex items-center gap-1 text-xs font-mono font-bold text-bat-accent hover:text-white px-2.5 py-1 rounded-lg bg-gotham-800 border border-bat-gold/30 transition-colors"
          >
            <RotateCcw size={13} /> RESET
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Attend More */}
        <div className="p-3.5 rounded-2xl border border-emerald-800/30 bg-emerald-950/20 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between mb-2 font-mono">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              If I attend next
            </span>
            <span className="text-sm font-black text-emerald-400">
              +{deltaAttended} {deltaAttended === 1 ? 'class' : 'classes'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeltaAttended((prev) => Math.max(0, prev - 1))}
              disabled={deltaAttended <= 0}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 border border-slate-200 dark:border-gotham-700 disabled:opacity-40 transition-colors"
              title="Decrease attended"
              aria-label="Decrease attended classes"
            >
              <Minus size={16} />
            </button>
            <input
              type="range"
              min="0"
              max="20"
              value={deltaAttended}
              onChange={(e) => setDeltaAttended(parseInt(e.target.value, 10))}
              className="flex-1 accent-emerald-500 h-2 rounded-lg bg-gotham-800 cursor-pointer"
            />
            <button
              onClick={() => setDeltaAttended((prev) => prev + 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm hover:bg-emerald-500 transition-colors"
              title="Increase attended"
              aria-label="Increase attended classes"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Miss More */}
        <div className="p-3.5 rounded-2xl border border-rose-800/30 bg-rose-950/20 dark:bg-rose-950/20">
          <div className="flex items-center justify-between mb-2 font-mono">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              If I miss next
            </span>
            <span className="text-sm font-black text-rose-400">
              +{deltaMissed} {deltaMissed === 1 ? 'class' : 'classes'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDeltaMissed((prev) => Math.max(0, prev - 1))}
              disabled={deltaMissed <= 0}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-gotham-800 text-slate-700 dark:text-gotham-300 border border-slate-200 dark:border-gotham-700 disabled:opacity-40 transition-colors"
              title="Decrease missed"
              aria-label="Decrease missed classes"
            >
              <Minus size={16} />
            </button>
            <input
              type="range"
              min="0"
              max="20"
              value={deltaMissed}
              onChange={(e) => setDeltaMissed(parseInt(e.target.value, 10))}
              className="flex-1 accent-rose-500 h-2 rounded-lg bg-gotham-800 cursor-pointer"
            />
            <button
              onClick={() => setDeltaMissed((prev) => prev + 1)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-rose-600 text-white shadow-sm hover:bg-rose-500 transition-colors"
              title="Increase missed"
              aria-label="Increase missed classes"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
