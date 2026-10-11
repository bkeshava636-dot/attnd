import React from 'react';
import { Shield, Target } from 'lucide-react';
import type { OverallAttendanceStats } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { BatGlyph } from '../layout/AppLayout';

interface HomeAttendanceHeroProps {
  overallStats: OverallAttendanceStats;
  targetPct: number;
  onSetTarget: (target: number) => void;
  onOpenCustomTarget: () => void;
}

export const HomeAttendanceHero: React.FC<HomeAttendanceHeroProps> = ({
  overallStats,
  targetPct,
  onSetTarget,
  onOpenCustomTarget,
}) => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gotham-900 via-gotham-850 to-gotham-950 text-white p-5 sm:p-7 border border-gotham-750/90 shadow-2xl">
      {/* Subtle top gold accent line */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-bat-gold/10 via-bat-gold to-bat-gold/10 shadow-[0_0_12px_#facc15]" />

      {/* Watermark Bat Silhouette in Background */}
      <div className="absolute -right-8 -bottom-8 opacity-[0.04] dark:opacity-[0.07] pointer-events-none text-bat-accent">
        <BatGlyph className="w-64 h-64" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-gotham-400 text-[11px] font-mono font-bold tracking-widest uppercase">
            <Shield size={14} className="text-bat-accent" />
            <span>ATTENDANCE</span>
            <span className="text-gotham-600">•</span>
            <span className="text-bat-accent font-black">TARGET: {targetPct}%</span>
          </div>

          {/* Attendance Big Number */}
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white drop-shadow-md">
              {overallStats.percentage.toFixed(1)}%
            </span>
            <div className="text-sm sm:text-base font-mono font-bold text-gotham-400">
              <span className="text-white">{overallStats.present}</span> / {overallStats.conducted} CONDUCTED
            </div>
          </div>

          {/* Attendance telemetry pills */}
          <div className="pt-2 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              {overallStats.present} Present
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-rose-950/50 text-rose-400 border border-rose-800/40 font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shadow-[0_0_6px_#ef4444]" />
              {overallStats.absent} Absent
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-gotham-800 text-gotham-300 border border-gotham-700/60 font-bold flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-gotham-400" />
              {overallStats.cancelled} Cancelled
            </span>
          </div>

          <p className="text-[11px] text-gotham-400 italic pt-1">
            Cancelled classes do not count against your attendance.
          </p>
        </div>

        {/* Target Presets & Tactical Progress */}
        <div className="flex flex-col sm:items-end gap-2.5">
          <div className="flex items-center gap-1 text-[11px] font-mono text-gotham-300 uppercase tracking-wider">
            <Target size={13} className="text-bat-accent" />
            <span>Target Presets</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-gotham-950/80 p-1.5 rounded-xl border border-gotham-750">
            {[75, 80, 85, 90].map((t) => (
              <button
                key={t}
                onClick={() => onSetTarget(t)}
                className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-mono font-bold transition-all ${
                  targetPct === t
                    ? 'bg-bat-gold text-gotham-950 shadow-[0_0_10px_rgba(234,179,8,0.4)] font-black'
                    : 'text-gotham-300 hover:text-white hover:bg-gotham-800'
                }`}
              >
                {t}%
              </button>
            ))}
            <button
              onClick={onOpenCustomTarget}
              className={`px-3 py-1.5 min-h-[36px] rounded-lg text-xs font-mono font-bold transition-all ${
                ![75, 80, 85, 90].includes(targetPct)
                  ? 'bg-bat-gold text-gotham-950 shadow-[0_0_10px_rgba(234,179,8,0.4)] font-black'
                  : 'text-gotham-300 hover:text-white hover:bg-gotham-800'
              }`}
            >
              {![75, 80, 85, 90].includes(targetPct) ? `${targetPct}%` : 'CUSTOM'}
            </button>
          </div>

          <div className="w-full sm:w-52 mt-1">
            <ProgressBar value={overallStats.percentage} target={targetPct} height="h-2" />
          </div>
        </div>
      </div>
    </div>
  );
};
