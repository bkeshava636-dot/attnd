import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type Channel } from '@capacitor/local-notifications';
import type { NotificationSettings, ClassTimingSettings } from '../types';
import {
  type EngineContext,
  getClassesForDate,
  formatDate,
  parseDate,
  calculateAttendanceMetrics,
} from './attendanceEngine';
import { resolveDayTiming, resolveClassTimes, formatTimeDisplay } from './timingEngine';

export const NOTIFICATION_SETTINGS_KEY = 'attnd_notification_settings';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyReminderEnabled: true,
  dailyReminderTime: '20:30',
  lowAttendanceWarningEnabled: true,
  nextClassReminderEnabled: true,
  nextClassLeadMinutes: 10,
};

export function getStoredNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

export function saveStoredNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save notification settings:', e);
  }
}

export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification !== 'undefined') {
      return Notification.permission as 'granted' | 'denied' | 'prompt';
    }
    return 'granted';
  }
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return 'granted';
    if (status.display === 'denied') return 'denied';
    return 'prompt';
  } catch (err) {
    console.warn('Error checking notification permissions:', err);
    return 'denied';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    if (typeof Notification !== 'undefined') {
      const res = await Notification.requestPermission();
      return res === 'granted';
    }
    return true;
  }
  try {
    const res = await LocalNotifications.requestPermissions();
    return res.display === 'granted';
  } catch (err) {
    console.error('Failed to request notification permission:', err);
    return false;
  }
}

export async function initNotificationChannels(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const channels: Channel[] = [
      {
        id: 'attnd_reminders',
        name: 'Daily Attendance Reminders',
        description: 'Reminders to record your daily college attendance',
        importance: 3,
        visibility: 1,
      },
      {
        id: 'attnd_classes',
        name: 'Upcoming Class Alerts',
        description: 'Timely reminders before classes start',
        importance: 4,
        visibility: 1,
      },
      {
        id: 'attnd_tasks',
        name: 'Tasks & Deadlines',
        description: 'Reminders for assignment submissions, exams, and projects',
        importance: 4,
        visibility: 1,
      },
      {
        id: 'attnd_alerts',
        name: 'Attendance Warnings',
        description: 'Warnings when attendance falls below target threshold',
        importance: 4,
        visibility: 1,
      },
      {
        id: 'attnd_test',
        name: 'Diagnostic Tests',
        description: 'Notification self-test channel',
        importance: 4,
        visibility: 1,
      },
    ];

    for (const ch of channels) {
      await LocalNotifications.createChannel(ch);
    }
  } catch (err) {
    console.warn('Error setting up notification channels:', err);
  }
}

export function getTaskNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = ((hash << 5) - hash) + taskId.charCodeAt(i);
    hash |= 0;
  }
  return 50000 + (Math.abs(hash) % 39999);
}

export async function cancelAllNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }
  } catch (err) {
    console.warn('Error cancelling local notifications:', err);
  }
}

export async function cancelAttendanceNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const pending = await LocalNotifications.getPending();
    const attendanceNotifs = pending.notifications.filter(
      (n) => n.id >= 1000 && n.id < 50000
    );
    if (attendanceNotifs.length > 0) {
      await LocalNotifications.cancel({ notifications: attendanceNotifs });
    }
  } catch (err) {
    console.warn('Error cancelling attendance notifications:', err);
  }
}

export async function cancelTaskNotification(taskId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const notifId = getTaskNotificationId(taskId);
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch (err) {
    console.warn('Error cancelling task notification:', err);
  }
}

export async function scheduleTaskReminder(
  task: import('../types').Task,
  subjectName?: string
): Promise<{ scheduled: boolean; reason?: string; scheduledAt?: Date }> {
  if (!Capacitor.isNativePlatform()) {
    return { scheduled: false, reason: 'Non-native platform' };
  }

  // Cancel any existing notification for this task first
  await cancelTaskNotification(task.id);

  if (!task.reminderEnabled || task.completed || task.reminderOption === 'none') {
    return { scheduled: false, reason: 'Reminder disabled or completed' };
  }

  const notifId = getTaskNotificationId(task.id);
  const now = new Date();

  let targetDate: Date | null = null;

  if (task.reminderOption === 'custom') {
    if (task.reminderDateTime) {
      targetDate = new Date(task.reminderDateTime);
    }
  } else if (task.reminderOption === 'on_due_date') {
    if (task.dueTime) {
      targetDate = new Date(`${task.dueDate}T${task.dueTime}:00`);
      // If due time is after 08:00 AM, send reminder 2 hours before; otherwise at 08:00 AM or dueTime
      const [dueH, dueM] = task.dueTime.split(':').map(Number);
      if (dueH > 9) {
        targetDate.setHours(dueH - 2, dueM, 0, 0);
      } else {
        targetDate.setHours(8, 0, 0, 0);
      }
    } else {
      const parts = task.dueDate.split('-').map(Number);
      targetDate = new Date(parts[0], parts[1] - 1, parts[2], 8, 0, 0, 0);
    }
  } else if (task.reminderOption === '1_day_before') {
    const parts = task.dueDate.split('-').map(Number);
    targetDate = new Date(parts[0], parts[1] - 1, parts[2] - 1, 19, 0, 0, 0);
  } else if (task.reminderOption === '2_days_before') {
    const parts = task.dueDate.split('-').map(Number);
    targetDate = new Date(parts[0], parts[1] - 1, parts[2] - 2, 19, 0, 0, 0);
  }

  if (!targetDate || isNaN(targetDate.getTime())) {
    return { scheduled: false, reason: 'Invalid reminder date' };
  }

  if (targetDate.getTime() <= now.getTime()) {
    return { scheduled: false, reason: 'Reminder time is in the past' };
  }

  await initNotificationChannels();

  const formattedDueTime = task.dueTime ? ` at ${formatTimeDisplay(task.dueTime)}` : '';
  const dueDayParts = task.dueDate.split('-');
  const dueDayFormatted = `${dueDayParts[2]}/${dueDayParts[1]}`;

  let body = '';
  if (task.type === 'test') {
    body = `${subjectName ? `${subjectName}: ` : ''}${task.title} is coming up on ${dueDayFormatted}${formattedDueTime}.`;
  } else if (task.type === 'assignment' || task.type === 'submission') {
    body = `${subjectName ? `${subjectName}: ` : ''}${task.title} is due on ${dueDayFormatted}${formattedDueTime}.`;
  } else {
    body = `${subjectName ? `${subjectName}: ` : ''}${task.title} scheduled for ${dueDayFormatted}${formattedDueTime}.`;
  }

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notifId,
        title: task.title,
        body,
        schedule: { at: targetDate, allowWhileIdle: true },
        channelId: 'attnd_tasks',
        sound: 'beep.wav',
      },
    ],
  });

  return { scheduled: true, scheduledAt: targetDate };
}

export async function sendTestNotification(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await initNotificationChannels();
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 40001,
          title: 'Attnd Test Notification',
          body: 'Local notifications are active and working properly! 🚀',
          schedule: { at: new Date(Date.now() + 1500), allowWhileIdle: true },
          channelId: 'attnd_test',
        },
      ],
    });
    return true;
  } catch (err) {
    console.error('Failed to send immediate test notification:', err);
    return false;
  }
}

export async function scheduleTestNotification(delayMinutes: number = 1): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    await initNotificationChannels();
    const scheduledAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 40002,
          title: 'Attnd 1-Minute Test',
          body: `Notification test delivered after ${delayMinutes} minute! System alarms are functional.`,
          schedule: { at: scheduledAt, allowWhileIdle: true },
          channelId: 'attnd_test',
        },
      ],
    });
    return true;
  } catch (err) {
    console.error('Failed to schedule delayed test notification:', err);
    return false;
  }
}

export interface NotificationDiagnostics {
  isNative: boolean;
  permission: 'granted' | 'denied' | 'prompt';
  channels: Array<{ id: string; name: string }>;
  pendingCount: number;
  pendingNotifications: Array<{ id: number; title: string; body: string; date?: string }>;
}

export async function getNotificationDiagnostics(): Promise<NotificationDiagnostics> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) {
    return {
      isNative: false,
      permission: (typeof Notification !== 'undefined' ? Notification.permission : 'granted') as any,
      channels: [],
      pendingCount: 0,
      pendingNotifications: [],
    };
  }

  try {
    const perm = await checkNotificationPermission();
    let channels: Array<{ id: string; name: string }> = [];
    try {
      const channelResult = await LocalNotifications.listChannels();
      channels = channelResult.channels || [];
    } catch {}

    const pending = await LocalNotifications.getPending();
    const pendingList = pending.notifications.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      date: n.schedule?.at ? new Date(n.schedule.at).toISOString() : undefined,
    }));

    return {
      isNative: true,
      permission: perm,
      channels,
      pendingCount: pending.notifications.length,
      pendingNotifications: pendingList,
    };
  } catch (err) {
    console.error('Failed to get notification diagnostics:', err);
    return {
      isNative: true,
      permission: 'denied',
      channels: [],
      pendingCount: 0,
      pendingNotifications: [],
    };
  }
}

export async function scheduleAllNotifications(
  context: EngineContext,
  customSettings?: NotificationSettings,
  timingSettings?: ClassTimingSettings | null
): Promise<void> {
  const settings = customSettings || getStoredNotificationSettings();

  // If running in browser or unsupported, skip scheduling
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const permStatus = await LocalNotifications.checkPermissions();
    if (permStatus.display !== 'granted') {
      return;
    }

    await initNotificationChannels();

    // Cancel ONLY existing attendance notifications before re-scheduling (protecting task notifications)
    await cancelAttendanceNotifications();

    const notificationsToSchedule: Array<{
      id: number;
      title: string;
      body: string;
      schedule: { at: Date; allowWhileIdle?: boolean };
      sound?: string;
      channelId?: string;
    }> = [];

    const now = new Date();
    const todayStr = formatDate(now);

    // 1. DAILY ATTENDANCE REMINDERS (Look ahead 7 days)
    if (settings.dailyReminderEnabled) {
      const [remHour, remMin] = (settings.dailyReminderTime || '20:30')
        .split(':')
        .map(Number);

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + dayOffset);
        const dateStr = formatDate(targetDate);

        const summary = getClassesForDate(dateStr, context);
        // Skip if not working day or no classes scheduled
        if (!summary.isWorkingDay || summary.classes.length === 0) {
          continue;
        }

        // If today and all classes already marked, skip today's reminder
        if (dateStr === todayStr && summary.allMarked) {
          continue;
        }

        const scheduledAt = new Date(targetDate);
        scheduledAt.setHours(remHour, remMin, 0, 0);

        // If today and the time has already passed, skip
        if (scheduledAt.getTime() <= now.getTime()) {
          continue;
        }

        notificationsToSchedule.push({
          id: 1000 + dayOffset,
          title: 'Daily Attendance Reminder',
          body: `Review and confirm attendance for your ${summary.classes.length} classes on ${dateStr}.`,
          schedule: { at: scheduledAt, allowWhileIdle: true },
          channelId: 'attnd_reminders',
        });
      }
    }

    // 2. NEXT CLASS REMINDERS (For today and tomorrow)
    if (settings.nextClassReminderEnabled) {
      const leadMs = (settings.nextClassLeadMinutes || 10) * 60 * 1000;

      for (let dayOffset = 0; dayOffset < 2; dayOffset++) {
        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + dayOffset);
        const dateStr = formatDate(targetDate);

        const summary = getClassesForDate(dateStr, context);
        if (!summary.isWorkingDay || summary.classes.length === 0) {
          continue;
        }

        const effectiveTimingSettings = timingSettings !== undefined ? timingSettings : context.classTimingSettings;
        const dayTiming = resolveDayTiming(dateStr, effectiveTimingSettings);

        // Each class in summary.classes represents an attendance unit (already grouped if multi-period)
        for (const cls of summary.classes) {
          // If already cancelled or already marked, skip reminder
          if (cls.status === 'cancelled') {
            continue;
          }

          // Determine start time for period using timingEngine
          const times = resolveClassTimes(cls, dayTiming);
          // If timing is unconfigured, DO NOT guess! Skip next-class reminder cleanly.
          if (!times.isConfigured || !times.startTime) {
            continue;
          }

          const timeStr = times.startTime;
          const [pHour, pMin] = timeStr.split(':').map(Number);
          if (isNaN(pHour) || isNaN(pMin)) {
            continue;
          }

          const classStart = new Date(targetDate);
          classStart.setHours(pHour, pMin, 0, 0);

          const remindAt = new Date(classStart.getTime() - leadMs);

          // Only schedule if reminder is in the future
          if (remindAt.getTime() > now.getTime()) {
            const notifId = 20000 + dayOffset * 500 + cls.periodNumber * 10;
            const periodLabel = cls.periodLabel || `Period ${cls.periodNumber}`;
            const timeDisplay = formatTimeDisplay(timeStr);

            notificationsToSchedule.push({
              id: notifId,
              title: `Upcoming: ${cls.subject.name}`,
              body: `${periodLabel} starts at ${timeDisplay} (${settings.nextClassLeadMinutes}m reminder)`,
              schedule: { at: remindAt, allowWhileIdle: true },
              channelId: 'attnd_classes',
            });
          }
        }
      }
    }

    // 3. LOW ATTENDANCE WARNING (Instant notification if below target)
    if (settings.lowAttendanceWarningEnabled) {
      const { subjectStats, overall: overallStats } = calculateAttendanceMetrics(
        context.subjects,
        context.attendanceRecords,
        context.semesterSettings.defaultTarget || 85,
        context.semesterSettings.treatLabAsSingleUnit || false
      );

      // Check if overall attendance is critical or warning
      const todayDateKey = todayStr;
      const lastOverallAlertKey = `attnd_warn_overall_${todayDateKey}`;

      if (overallStats.conducted > 0 && overallStats.percentage < overallStats.target) {
        if (!localStorage.getItem(lastOverallAlertKey)) {
          notificationsToSchedule.push({
            id: 30000,
            title: 'Low Overall Attendance Warning',
            body: `Overall attendance is ${overallStats.percentage.toFixed(1)}%, below target ${overallStats.target}%.`,
            schedule: { at: new Date(Date.now() + 2000), allowWhileIdle: true },
            channelId: 'attnd_alerts',
          });
          localStorage.setItem(lastOverallAlertKey, 'sent');
        }
      }

      // Check individual subjects below target
      let subIdx = 1;
      for (const stat of subjectStats) {
        if (stat.conducted > 0 && stat.percentage < stat.target) {
          const subKey = `attnd_warn_sub_${stat.subject.id}_${todayDateKey}`;
          if (!localStorage.getItem(subKey)) {
            notificationsToSchedule.push({
              id: 30000 + subIdx,
              title: `Low Attendance: ${stat.subject.name}`,
              body: `${stat.subject.name} is at ${stat.percentage.toFixed(1)}% (Target: ${stat.target}%). Needs ${stat.needToAttend} classes to recover.`,
              schedule: { at: new Date(Date.now() + 3000 + subIdx * 1000), allowWhileIdle: true },
              channelId: 'attnd_alerts',
            });
            localStorage.setItem(subKey, 'sent');
          }
        }
        subIdx++;
      }
    }

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule,
      });
    }
  } catch (err) {
    console.error('Error scheduling local notifications:', err);
  }
}
