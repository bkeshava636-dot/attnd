import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'info' | 'purple' | 'gold';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  const variantStyles = {
    gold: 'bg-bat-gold/10 text-bat-accent border-bat-gold/30 shadow-[0_0_8px_rgba(234,179,8,0.15)]',
    success: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/40',
    danger: 'bg-rose-950/40 text-rose-400 border-rose-800/40 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700/40',
    warning: 'bg-amber-950/40 text-amber-400 border-amber-800/40 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/40',
    info: 'bg-blue-950/40 text-blue-400 border-blue-800/40 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700/40',
    purple: 'bg-purple-950/40 text-purple-400 border-purple-800/40 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700/40',
    neutral: 'bg-gotham-800/80 text-gotham-300 border-gotham-700/60 dark:bg-gotham-850 dark:text-gotham-300 dark:border-gotham-750',
  };

  const sizeStyles = {
    sm: 'text-[10px] sm:text-xs px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border',
    md: 'text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider border',
  };

  return (
    <span className={`inline-flex items-center gap-1 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};
