import React, { useMemo } from 'react';
import { Home, Calendar as CalendarIcon, Clock, CheckSquare, Settings, Sun, Moon, ListTodo } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { activeTab, setActiveTab, theme, toggleTheme, semesterSettings, overallStats, tasks } = useApp();

  const pendingTasksCount = useMemo(
    () => tasks.filter(t => !t.completed).length,
    [tasks]
  );

  interface NavItem {
    id: 'home' | 'attendance' | 'tasks' | 'calendar' | 'timetable' | 'settings';
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
    badge?: number;
  }

  const desktopNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: pendingTasksCount },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'timetable', label: 'Timetable', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const mobileNavItems: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, badge: pendingTasksCount },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const isSafe = overallStats.percentage >= overallStats.target;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gotham-950 text-slate-900 dark:text-gotham-100 flex flex-col md:flex-row pb-20 md:pb-0 font-sans selection:bg-bat-gold/20 selection:text-bat-accent">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 left-0 bg-white dark:bg-gotham-900 border-r border-slate-200 dark:border-gotham-800 z-30 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gotham-800 text-bat-accent flex items-center justify-center font-black text-sm border border-gotham-750">
              A
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 dark:text-white leading-none">
                Attnd
              </h1>
              <span className="text-xs text-slate-500 dark:text-gotham-400">
                {semesterSettings?.semesterName || 'Semester Tracker'}
              </span>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:text-gotham-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gotham-800 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        {/* Minimal Semester Standing Card */}
        <div className="mb-6 p-3 rounded-2xl bg-slate-100/80 dark:bg-gotham-850/80 border border-slate-200 dark:border-gotham-800">
          <div className="text-[11px] font-bold text-slate-500 dark:text-gotham-400 mb-1">
            Overall Attendance
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold font-mono ${
                isSafe ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {overallStats.percentage.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-gotham-400">
              Target: {overallStats.target}%
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1">
          {desktopNavItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-200 dark:bg-gotham-800 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-600 dark:text-gotham-400 hover:bg-slate-100 dark:hover:bg-gotham-850 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-bat-accent' : 'text-slate-400 dark:text-gotham-400'} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-bat-gold/20 text-bat-accent">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Clean Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-gotham-800 text-xs text-slate-400 dark:text-gotham-500">
          Offline & Local Data
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 bg-white/90 dark:bg-[#07080c]/90 backdrop-blur-xl border-b border-slate-200 dark:border-gotham-800/80 px-4 py-3 flex items-center justify-between safe-top">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gotham-750 to-gotham-850 text-bat-accent flex items-center justify-center font-black text-xs border border-bat-gold/30 shadow-bat-glow-sm">
            A
          </div>
          <div>
            <span className="font-bold text-base text-slate-900 dark:text-white block leading-tight tracking-tight">
              Attnd
            </span>
            <span className="text-[11px] text-slate-500 dark:text-gotham-400 block -mt-0.5 font-medium">
              {semesterSettings?.semesterName || 'Attendance Tracker'}
            </span>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-gotham-300 hover:bg-slate-100 dark:hover:bg-gotham-800/80 transition-all active:scale-90"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} className="text-bat-accent" /> : <Moon size={18} />}
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 p-3.5 sm:p-6 md:p-8 max-w-4xl mx-auto w-full pb-24">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 dark:bg-[#07080c]/95 backdrop-blur-2xl border-t border-slate-200 dark:border-gotham-800/90 z-40 px-1 pt-1 pb-3 safe-bottom flex justify-around items-center shadow-lg">
        {mobileNavItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              aria-label={item.label}
              className={`flex-1 flex flex-col items-center justify-center min-h-[50px] py-1 px-0.5 rounded-2xl transition-all duration-200 ${
                isActive
                  ? 'text-bat-accent font-bold'
                  : 'text-slate-400 dark:text-gotham-400 hover:text-slate-700 dark:hover:text-gotham-200'
              }`}
            >
              <div className={`p-1 relative transition-all duration-200 ${isActive ? 'scale-110 -translate-y-0.5' : ''}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 px-1 min-w-[14px] h-[14px] rounded-full bg-bat-accent text-slate-950 font-black text-[9px] flex items-center justify-center leading-none">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-bat-accent shadow-[0_0_6px_rgba(234,179,8,1)]" />
                )}
              </div>
              <span className={`text-[10.5px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-bat-accent' : 'font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export function BatGlyph({ className = "w-4 h-4 text-bat-accent" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1z" />
    </svg>
  );
}

