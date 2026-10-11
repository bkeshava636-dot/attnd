import React, { useEffect, useRef, Suspense, lazy } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { AppProvider, useApp } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomeDashboard } from './components/home/HomeDashboard';

const TimetableManager = lazy(() => import('./components/timetable/TimetableManager').then(m => ({ default: m.TimetableManager })));
const AttendanceView = lazy(() => import('./components/attendance/AttendanceView').then(m => ({ default: m.AttendanceView })));
const TasksView = lazy(() => import('./components/tasks/TasksView').then(m => ({ default: m.TasksView })));
const CalendarView = lazy(() => import('./components/calendar/CalendarView').then(m => ({ default: m.CalendarView })));
const SettingsView = lazy(() => import('./components/settings/SettingsView').then(m => ({ default: m.SettingsView })));

const GothamSkeleton: React.FC = () => (
  <div className="space-y-4 animate-pulse p-1 font-mono">
    <div className="h-10 bg-slate-200 dark:bg-gotham-850 rounded-2xl w-2/3 border border-slate-300 dark:border-gotham-750/70" />
    <div className="h-36 bg-slate-200 dark:bg-gotham-850 rounded-3xl w-full border border-slate-300 dark:border-gotham-750/70" />
    <div className="h-52 bg-slate-200 dark:bg-gotham-850 rounded-3xl w-full border border-slate-300 dark:border-gotham-750/70" />
  </div>
);

const NativeInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab, setActiveTab } = useApp();
  const lastBackPressRef = useRef<number>(0);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    // Configure Dark Gotham Status Bar
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#07080c' }).catch(() => {});
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});

    // Handle Hardware Back Button
    const backListener = CapApp.addListener('backButton', () => {
      // Check if any modal is currently open in the DOM
      const openModal = document.querySelector('.animate-scaleUp');
      if (openModal) {
        // Pressing back when modal is open should dismiss the modal
        const closeBtn = document.querySelector('button[aria-label="Close"]') as HTMLElement;
        if (closeBtn) {
          closeBtn.click();
          return;
        }
      }

      if (activeTab !== 'home') {
        // Navigate back to Home first
        setActiveTab('home');
      } else {
        // Double tap back to exit app
        const now = Date.now();
        if (now - lastBackPressRef.current < 2000) {
          CapApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          // Toast or gentle feedback
        }
      }
    });

    return () => {
      backListener.then(l => l.remove()).catch(() => {});
    };
  }, [activeTab, setActiveTab]);

  return <>{children}</>;
};

const MainContent: React.FC = () => {
  const { activeTab, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 font-mono">
        <div className="w-10 h-10 border-4 border-bat-gold border-t-transparent rounded-full animate-spin shadow-bat-glow-sm" />
        <span className="text-xs font-bold text-gotham-400 uppercase tracking-widest">
          INITIALIZING ATTND...
        </span>
      </div>
    );
  }

  switch (activeTab) {
    case 'home':
      return <HomeDashboard />;
    case 'timetable':
      return (
        <Suspense fallback={<GothamSkeleton />}>
          <TimetableManager />
        </Suspense>
      );
    case 'attendance':
      return (
        <Suspense fallback={<GothamSkeleton />}>
          <AttendanceView />
        </Suspense>
      );
    case 'tasks':
      return (
        <Suspense fallback={<GothamSkeleton />}>
          <TasksView />
        </Suspense>
      );
    case 'calendar':
      return (
        <Suspense fallback={<GothamSkeleton />}>
          <CalendarView />
        </Suspense>
      );
    case 'settings':
      return (
        <Suspense fallback={<GothamSkeleton />}>
          <SettingsView />
        </Suspense>
      );
    default:
      return <HomeDashboard />;
  }
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <NativeInitializer>
        <AppLayout>
          <MainContent />
        </AppLayout>
      </NativeInitializer>
    </AppProvider>
  );
};

export default App;
