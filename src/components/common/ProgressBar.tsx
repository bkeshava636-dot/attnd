import React from 'react';

interface ProgressBarProps {
  value: number; // 0 to 100
  target?: number; // target percentage marker (e.g. 85)
  showLabels?: boolean;
  height?: string;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  target,
  showLabels = false,
  height = 'h-2',
  className = '',
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  // Determine bar color based on relationship to target
  let barColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
  if (target !== undefined) {
    if (clampedValue < target) {
      barColor = clampedValue < target - 10
        ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
        : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
    } else {
      barColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]';
    }
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex justify-between items-center text-xs font-mono font-bold mb-1 text-gotham-400">
          <span>{clampedValue.toFixed(1)}%</span>
          {target !== undefined && (
            <span className="text-bat-gold/90">Target: {target}%</span>
          )}
        </div>
      )}
      <div className={`w-full bg-gotham-900 border border-gotham-750/70 rounded-full ${height} overflow-hidden relative shadow-inner`}>
        <div
          className={`h-full rounded-full ${barColor} transition-all duration-500 ease-out`}
          style={{ width: `${clampedValue}%` }}
        />
        {target !== undefined && target > 0 && target < 100 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-bat-accent z-10 opacity-90 shadow-[0_0_4px_#facc15]"
            style={{ left: `${target}%` }}
            title={`Target: ${target}%`}
          />
        )}
      </div>
    </div>
  );
};
