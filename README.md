# 📱 Attnd

> Smart, offline student attendance tracker and class schedule for Android.

[![Download APK](https://img.shields.io/badge/Download_APK-v1.0.0-FFD700?style=for-the-badge&logo=android&logoColor=black&labelColor=1a1a1a)](https://github.com/bkeshava636-dot/attnd/releases/download/v1.0.0/Attnd-release.apk)
[![Release](https://img.shields.io/badge/Release-v1.0.0-blue?style=for-the-badge&logo=github)](https://github.com/bkeshava636-dot/attnd/releases/latest)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20PWA-2ea44f?style=for-the-badge)](https://github.com/bkeshava636-dot/attnd)
[![License](https://img.shields.io/badge/License-MIT-purple?style=for-the-badge)](LICENSE)

[👉 **Direct Download: Attnd-release.apk**](https://github.com/bkeshava636-dot/attnd/releases/download/v1.0.0/Attnd-release.apk) *(3.5 MB • Android 8.0+)*

---

## ⚡ Key Features

### 1. 🎯 Accurate Attendance & Predictive Math
- **Target Attendance Tracking**: Default 85% (or custom target) per subject and overall.
- **Bunk Calculator**: Tells you exactly how many upcoming classes you can miss while keeping your attendance above target.
- **Recovery Calculator**: If below target, instantly calculates the minimum consecutive classes you must attend to recover.
- **Attendance Math**:
  $$\text{Attendance \%} = \frac{\text{Present}}{\text{Present} + \text{Absent}} \times 100$$
  Cancelled classes are excluded from the denominator.
- **Dual-Mode Baseline Adjustments**: Adjust initial baseline by count of classes or target percentage.

### 2. ⏰ Flexible Class Timings & Breaks
- Configure period timings (P1, P2, P3...) with start and end times.
- Configure break intervals (Short Break, Lunch Break).
- Live dashboard displaying:
  - Current ongoing class or break.
  - Next upcoming class with live countdown: *"Starts in 10 minutes"*.
  - Day-specific timing overrides and timetable shifts.

### 3. 👥 Class Setup Template Sharing (New!)
- **One-Click Sharing**: Class representatives or students can export the complete semester setup as a template.
- **Customizable Export**: Choose whether to include semester dates, weekly timetable, period timings, Saturday rules, academic events, or holidays.
- **Privacy Guaranteed**: Personal attendance records, baseline numbers, and personal tasks are **never** included in shared templates.
- **Safe Import**: Classmates can import the template to update their timetable and exam schedule without wiping their personal attendance records!

### 4. 📝 Tasks & Academic To-Dos
- Record class announcements, assignments, tests, lab record submissions, and project deadlines.
- Filter by `All | Pending | Completed | Overdue`.
- Priority badges (Low, Medium, High).
- Scheduled local reminders (1 day before, 2 days before, on due date, or custom time).

### 5. 📅 Saturday Rules & Circular Holiday Overrides
- Configure $1^{\text{st}}$ through $5^{\text{th}}$ Saturday as **Holiday** or **Working** (following Monday, Tuesday, etc. timetables).
- Date-specific circular Saturday overrides for special college orders.
- Academic calendar events (Midterms, Final exams, Fest, Sports Day).

### 6. 📱 Android Home-Screen Widget
- Glanceable overall attendance percentage on your home screen.
- Current class and next class with start time.
- Direct quick-action buttons to open and mark attendance.

### 7. 🔒 100% Offline & Private
- Zero cloud database. All data is stored locally on your device via IndexedDB.
- Full JSON backup and restore.
- CSV export for record-keeping.

---

## 📥 How to Install the APK on Android

1. Download [`Attnd-release.apk`](https://github.com/bkeshava636-dot/attnd/releases/download/v1.0.0/Attnd-release.apk) (or click the download button at the top).
2. Once downloaded, tap the notification or open the file from your **Downloads** folder.
3. If prompted by Android, tap **Settings** and toggle **"Allow from this source"**.
4. Tap **Install** and then **Open**.
5. Set up your semester or import a template from your classmate!

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite
- **Icons**: Lucide React
- **Mobile Runtime**: Capacitor 8 (Android)
- **Native Android**: Java (AppWidgetProvider for Home-Screen Widget, NotificationManager for Alarms)
- **Local Storage**: IndexedDB (`idb`)
- **PWA**: Workbox Service Worker for offline web caching

---

## 💻 Building from Source

### Prerequisites
- Node.js (v18+ or v20+)
- Android Studio with Android SDK 34/35 & JDK 17+

### Steps

```bash
# 1. Clone repository
git clone https://github.com/bkeshava636-dot/attnd.git
cd attnd

# 2. Install dependencies
npm install

# 3. Run development web server
npm run dev

# 4. Build web production bundle & copy to Android
npm run build
npx cap copy android

# 5. Build signed Release APK
cd android
./gradlew assembleRelease
```

The compiled release APK will be located at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 📄 License

MIT License. Designed and maintained for students.
