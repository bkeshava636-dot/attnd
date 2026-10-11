import React from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';
import type { OverallAttendanceStats } from '../../types';

interface HomeBunkStatusProps {
  overallStats: OverallAttendanceStats;
  targetPct: number;
  isAboveTarget: boolean;
}

export const HomeBunkStatus: React.FC<HomeBunkStatusProps> = ({
  overallStats,
  targetPct,
  isAboveTarget,
}) => {
  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl border shadow-lg flex items-start gap-3.5 transition-all ${
        isAboveTarget
          ? 'bg-emerald-950/25 dark:bg-emerald-950/30 border-emerald-800/40 text-emerald-900 dark:text-emerald-100'
          : 'bg-amber-950/25 dark:bg-amber-950/30 border-amber-800/40 text-amber-900 dark:text-amber-100'
      }`}
    >
      <div
        className={`p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
          isAboveTarget
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
        }`}
      >
        {isAboveTarget ? <TrendingUp size={20} /> : <AlertCircle size={20} />}
      </div>

      <div className="flex-1">
        <div className="font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-2">
          <span>{isAboveTarget ? 'ON TRACK' : 'ATTENTION NEEDED'}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 font-mono">
            TARGET: {targetPct}%
          </span>
        </div>
        <p className="text-xs sm:text-sm mt-1 leading-relaxed font-medium">
          {isAboveTarget ? (
            overallStats.canMiss > 0 ? (
              <>
                You're above your {targetPct}% target. You can miss{' '}
                <strong className="font-extrabold text-bat-accent underline decoration-bat-gold decoration-2">
                  {overallStats.canMiss} more {overallStats.canMiss === 1 ? 'class' : 'classes'}
                </strong>{' '}
                without falling below target.
              </>
            ) : (
              <>You are currently right at your target ({targetPct}%). Do not miss your next classes.</>
            )
          ) : (
            <>
              You're below your {targetPct}% target. Attend the next{' '}
              <strong className="font-extrabold text-rose-400 underline decoration-rose-500 decoration-2">
                {overallStats.needToAttend} consecutive {overallStats.needToAttend === 1 ? 'class' : 'classes'}
              </strong>{' '}
              to get back on track.
            </>
          )}
        </p>
      </div>
    </div>
  );
};
