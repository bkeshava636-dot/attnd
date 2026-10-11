package com.attnd.attendance.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

import com.attnd.attendance.MainActivity;
import com.attnd.attendance.R;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Locale;

public class AttndWidgetProvider extends AppWidgetProvider {

    public static final String PREFS_NAME = "attnd_widget_prefs";
    public static final String KEY_SNAPSHOT = "widget_snapshot";

    public static final String ACTION_MARK_PRESENT = "com.attnd.attendance.ACTION_MARK_PRESENT";
    public static final String ACTION_MARK_ABSENT = "com.attnd.attendance.ACTION_MARK_ABSENT";
    public static final String ACTION_MARK_CANCEL = "com.attnd.attendance.ACTION_MARK_CANCEL";
    public static final String ACTION_MARK_UNDO = "com.attnd.attendance.ACTION_MARK_UNDO";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onAppWidgetOptionsChanged(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Bundle newOptions) {
        updateWidget(context, appWidgetManager, appWidgetId);
        super.onAppWidgetOptionsChanged(context, appWidgetManager, appWidgetId, newOptions);
    }

    public static void triggerUpdate(Context context) {
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName componentName = new ComponentName(context, AttndWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(componentName);
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        Bundle options = appWidgetManager.getAppWidgetOptions(appWidgetId);
        int minWidth = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 110) : 110;
        int minHeight = options != null ? options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, 110) : 110;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String snapshotJson = prefs.getString(KEY_SNAPSHOT, null);

        RemoteViews views;
        if (minWidth >= 260 && minHeight >= 180) {
            views = buildLargeWidget(context, snapshotJson, appWidgetId);
        } else if (minWidth >= 160) {
            views = buildMediumWidget(context, snapshotJson, appWidgetId);
        } else {
            views = buildSmallWidget(context, snapshotJson, appWidgetId);
        }

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent createAppOpenIntent(Context context, int appWidgetId) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getActivity(context, appWidgetId, intent, flags);
    }

    private static PendingIntent createActionIntent(Context context, String action, JSONObject cls, int requestCode) {
        Intent intent = new Intent(context, AttndWidgetActionReceiver.class);
        intent.setAction(action);
        if (cls != null) {
            intent.putExtra("slotKey", cls.optString("slotKey"));
            intent.putExtra("date", cls.optString("date"));
            intent.putExtra("periodNumber", cls.optInt("periodNumber", 1));
            intent.putExtra("subjectId", cls.optString("subjectId"));
            intent.putExtra("subjectName", cls.optString("subjectName"));
            intent.putExtra("unitGroupId", cls.optString("unitGroupId"));
            intent.putExtra("unitSize", cls.optInt("unitSize", 1));
        }
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }
        return PendingIntent.getBroadcast(context, requestCode, intent, flags);
    }

    private static RemoteViews buildSmallWidget(Context context, String snapshotJson, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_small);
        PendingIntent openApp = createAppOpenIntent(context, appWidgetId);
        views.setOnClickPendingIntent(R.id.widget_small_root, openApp);

        if (snapshotJson == null) {
            views.setTextViewText(R.id.widget_small_percentage, "--%");
            views.setTextViewText(R.id.widget_small_class_label, "Open app to sync");
            views.setTextViewText(R.id.widget_small_class_time, "Tap to start");
            return views;
        }

        try {
            JSONObject snapshot = new JSONObject(snapshotJson);
            double pct = snapshot.optDouble("overallPercentage", 100.0);
            double target = snapshot.optDouble("overallTarget", 85.0);
            views.setTextViewText(R.id.widget_small_percentage, String.format(Locale.US, "%.1f%%", pct));
            views.setTextViewText(R.id.widget_small_stats_sub, String.format(Locale.US, "Target: %.0f%%", target));

            if (pct >= target) {
                views.setTextViewText(R.id.widget_small_status_badge, "SAFE");
                views.setTextColor(R.id.widget_small_status_badge, context.getColor(R.color.widget_emerald));
            } else {
                views.setTextViewText(R.id.widget_small_status_badge, "WARNING");
                views.setTextColor(R.id.widget_small_status_badge, context.getColor(R.color.widget_rose));
            }

            JSONArray classes = snapshot.optJSONArray("classes");
            if (classes != null && classes.length() > 0) {
                String activeSlotKey = snapshot.optString("activeSlotKey", "");
                JSONObject targetClass = null;
                if (!activeSlotKey.isEmpty()) {
                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        if (activeSlotKey.equals(c.optString("slotKey", ""))) {
                            targetClass = c;
                            break;
                        }
                    }
                }
                if (targetClass == null) {
                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        if ("unmarked".equalsIgnoreCase(c.optString("status", "unmarked"))) {
                            targetClass = c;
                            break;
                        }
                    }
                }
                if (targetClass == null) {
                    views.setTextViewText(R.id.widget_small_class_label, "All Done!");
                    views.setTextViewText(R.id.widget_small_class_time, classes.length() + " classes marked");
                } else {
                    String subName = targetClass.optString("subjectName", "Class");
                    String pLabel = targetClass.optString("periodLabel", "P" + targetClass.optInt("periodNumber", 1));
                    String time = targetClass.optString("startTime", "");
                    String timelineBadge = snapshot.optString("timelineBadge", "");
                    views.setTextViewText(R.id.widget_small_class_label, subName + " (" + pLabel + ")");
                    String timeDisplay = time.isEmpty() ? "Scheduled" : time;
                    if (!timelineBadge.isEmpty()) {
                        timeDisplay = timelineBadge + " · " + timeDisplay;
                    }
                    views.setTextViewText(R.id.widget_small_class_time, timeDisplay);
                }
            } else {
                String reason = snapshot.optString("todayStatusReason", "No Classes Today");
                views.setTextViewText(R.id.widget_small_class_label, reason);
                views.setTextViewText(R.id.widget_small_class_time, "Day Off");
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_small_percentage, "--%");
            views.setTextViewText(R.id.widget_small_class_label, "Tap to open");
        }
        return views;
    }

    private static RemoteViews buildMediumWidget(Context context, String snapshotJson, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_medium);
        PendingIntent openApp = createAppOpenIntent(context, appWidgetId);
        views.setOnClickPendingIntent(R.id.widget_medium_stats_panel, openApp);

        if (snapshotJson == null) {
            views.setTextViewText(R.id.widget_med_percentage, "--%");
            views.setTextViewText(R.id.widget_med_subject_name, "Open App to Sync");
            views.setTextViewText(R.id.widget_med_time_info, "Tap to start");
            views.setViewVisibility(R.id.widget_med_action_bar_unmarked, View.GONE);
            views.setViewVisibility(R.id.widget_med_action_bar_marked, View.GONE);
            return views;
        }

        try {
            JSONObject snapshot = new JSONObject(snapshotJson);
            double pct = snapshot.optDouble("overallPercentage", 100.0);
            int present = snapshot.optInt("overallPresent", 0);
            int conducted = snapshot.optInt("overallConduct", 0);
            double target = snapshot.optDouble("overallTarget", 85.0);

            views.setTextViewText(R.id.widget_med_percentage, String.format(Locale.US, "%.1f%%", pct));
            views.setTextViewText(R.id.widget_med_ratio, present + " / " + conducted + " classes");
            views.setTextViewText(R.id.widget_med_target, String.format(Locale.US, "Target: %.0f%%", target));

            if (pct >= target) {
                views.setTextViewText(R.id.widget_med_status_badge, "SAFE");
                views.setTextColor(R.id.widget_med_status_badge, context.getColor(R.color.widget_emerald));
            } else {
                views.setTextViewText(R.id.widget_med_status_badge, "WARNING");
                views.setTextColor(R.id.widget_med_status_badge, context.getColor(R.color.widget_rose));
            }

            JSONArray classes = snapshot.optJSONArray("classes");
            if (classes != null && classes.length() > 0) {
                String activeSlotKey = snapshot.optString("activeSlotKey", "");
                JSONObject activeClass = null;
                if (!activeSlotKey.isEmpty()) {
                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        if (activeSlotKey.equals(c.optString("slotKey", ""))) {
                            activeClass = c;
                            break;
                        }
                    }
                }
                if (activeClass == null) {
                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        if ("unmarked".equalsIgnoreCase(c.optString("status", "unmarked"))) {
                            activeClass = c;
                            break;
                        }
                    }
                }
                if (activeClass == null) {
                    activeClass = classes.getJSONObject(classes.length() - 1);
                }

                String subName = activeClass.optString("subjectName", "Class");
                String pLabel = activeClass.optString("periodLabel", "P" + activeClass.optInt("periodNumber", 1));
                String startTime = activeClass.optString("startTime", "");
                String endTime = activeClass.optString("endTime", "");
                String status = activeClass.optString("status", "unmarked");
                String timelineBadge = snapshot.optString("timelineBadge", "");

                views.setTextViewText(R.id.widget_med_subject_name, subName);
                views.setTextViewText(R.id.widget_med_period_label, pLabel);

                String timeRange = startTime.isEmpty() ? "Scheduled" : (endTime.isEmpty() ? startTime : startTime + " – " + endTime);
                String timeDisplay = timelineBadge.isEmpty() ? timeRange : timelineBadge + " · " + timeRange;
                views.setTextViewText(R.id.widget_med_time_info, timeDisplay);

                if ("unmarked".equalsIgnoreCase(status)) {
                    views.setViewVisibility(R.id.widget_med_action_bar_unmarked, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_med_action_bar_marked, View.GONE);

                    views.setOnClickPendingIntent(R.id.widget_btn_p,
                            createActionIntent(context, ACTION_MARK_PRESENT, activeClass, appWidgetId * 10 + 1));
                    views.setOnClickPendingIntent(R.id.widget_btn_a,
                            createActionIntent(context, ACTION_MARK_ABSENT, activeClass, appWidgetId * 10 + 2));
                    views.setOnClickPendingIntent(R.id.widget_btn_c,
                            createActionIntent(context, ACTION_MARK_CANCEL, activeClass, appWidgetId * 10 + 3));
                } else {
                    views.setViewVisibility(R.id.widget_med_action_bar_unmarked, View.GONE);
                    views.setViewVisibility(R.id.widget_med_action_bar_marked, View.VISIBLE);

                    String statusText = "MARKED " + status.toUpperCase();
                    views.setTextViewText(R.id.widget_med_marked_status_text, statusText);
                    if ("present".equalsIgnoreCase(status)) {
                        views.setTextColor(R.id.widget_med_marked_status_text, context.getColor(R.color.widget_emerald));
                    } else if ("absent".equalsIgnoreCase(status)) {
                        views.setTextColor(R.id.widget_med_marked_status_text, context.getColor(R.color.widget_rose));
                    } else {
                        views.setTextColor(R.id.widget_med_marked_status_text, context.getColor(R.color.widget_slate));
                    }

                    views.setOnClickPendingIntent(R.id.widget_btn_undo,
                            createActionIntent(context, ACTION_MARK_UNDO, activeClass, appWidgetId * 10 + 4));
                }
            } else {
                String reason = snapshot.optString("todayStatusReason", "No Classes Today");
                views.setTextViewText(R.id.widget_med_subject_name, reason);
                views.setTextViewText(R.id.widget_med_period_label, "");
                views.setTextViewText(R.id.widget_med_time_info, "Enjoy your day");
                views.setViewVisibility(R.id.widget_med_action_bar_unmarked, View.GONE);
                views.setViewVisibility(R.id.widget_med_action_bar_marked, View.GONE);
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_med_subject_name, "Tap to open");
        }

        return views;
    }

    private static RemoteViews buildLargeWidget(Context context, String snapshotJson, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_large);
        PendingIntent openApp = createAppOpenIntent(context, appWidgetId);
        views.setOnClickPendingIntent(R.id.widget_large_header, openApp);
        views.setOnClickPendingIntent(R.id.widget_large_footer, openApp);

        if (snapshotJson == null) {
            views.setTextViewText(R.id.widget_large_percentage, "--%");
            views.setTextViewText(R.id.widget_large_active_subject, "Open App to Sync");
            views.setTextViewText(R.id.widget_large_active_time, "Tap to start");
            views.setViewVisibility(R.id.widget_large_actions_unmarked, View.GONE);
            views.setViewVisibility(R.id.widget_large_actions_marked, View.GONE);
            return views;
        }

        try {
            JSONObject snapshot = new JSONObject(snapshotJson);
            double pct = snapshot.optDouble("overallPercentage", 100.0);
            int present = snapshot.optInt("overallPresent", 0);
            int conducted = snapshot.optInt("overallConduct", 0);
            String dateReason = snapshot.optString("todayStatusReason", "Today");

            views.setTextViewText(R.id.widget_large_percentage, String.format(Locale.US, "%.1f%%", pct));
            views.setTextViewText(R.id.widget_large_ratio, "(" + present + "/" + conducted + ")");
            views.setTextViewText(R.id.widget_large_date_reason, dateReason);

            JSONArray classes = snapshot.optJSONArray("classes");
            if (classes != null && classes.length() > 0) {
                String activeSlotKey = snapshot.optString("activeSlotKey", "");
                int activeIndex = -1;
                JSONObject activeClass = null;
                if (!activeSlotKey.isEmpty()) {
                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        if (activeSlotKey.equals(c.optString("slotKey", ""))) {
                            activeClass = c;
                            activeIndex = i;
                            break;
                        }
                    }
                }
                if (activeClass == null) {
                    for (int i = 0; i < classes.length(); i++) {
                        if ("unmarked".equalsIgnoreCase(classes.getJSONObject(i).optString("status", "unmarked"))) {
                            activeClass = classes.getJSONObject(i);
                            activeIndex = i;
                            break;
                        }
                    }
                }
                if (activeClass == null) {
                    activeIndex = classes.length() - 1;
                    activeClass = classes.getJSONObject(activeIndex);
                }
                String subName = activeClass.optString("subjectName", "Class");
                String pLabel = activeClass.optString("periodLabel", "P" + activeClass.optInt("periodNumber", 1));
                String startTime = activeClass.optString("startTime", "");
                String endTime = activeClass.optString("endTime", "");
                String status = activeClass.optString("status", "unmarked");
                String timelineBadge = snapshot.optString("timelineBadge", "");

                views.setTextViewText(R.id.widget_large_active_subject, subName);
                views.setTextViewText(R.id.widget_large_active_period, pLabel);

                String timeRange = startTime.isEmpty() ? "Scheduled Class" : (endTime.isEmpty() ? startTime : startTime + " – " + endTime);
                String timeDisplay = timelineBadge.isEmpty() ? timeRange : timelineBadge + " · " + timeRange;
                views.setTextViewText(R.id.widget_large_active_time, timeDisplay);

                if ("unmarked".equalsIgnoreCase(status)) {
                    views.setViewVisibility(R.id.widget_large_actions_unmarked, View.VISIBLE);
                    views.setViewVisibility(R.id.widget_large_actions_marked, View.GONE);

                    views.setOnClickPendingIntent(R.id.widget_large_btn_p,
                            createActionIntent(context, ACTION_MARK_PRESENT, activeClass, appWidgetId * 100 + 1));
                    views.setOnClickPendingIntent(R.id.widget_large_btn_a,
                            createActionIntent(context, ACTION_MARK_ABSENT, activeClass, appWidgetId * 100 + 2));
                    views.setOnClickPendingIntent(R.id.widget_large_btn_c,
                            createActionIntent(context, ACTION_MARK_CANCEL, activeClass, appWidgetId * 100 + 3));
                } else {
                    views.setViewVisibility(R.id.widget_large_actions_unmarked, View.GONE);
                    views.setViewVisibility(R.id.widget_large_actions_marked, View.VISIBLE);

                    views.setTextViewText(R.id.widget_large_marked_text, "MARKED " + status.toUpperCase());
                    if ("present".equalsIgnoreCase(status)) {
                        views.setTextColor(R.id.widget_large_marked_text, context.getColor(R.color.widget_emerald));
                    } else if ("absent".equalsIgnoreCase(status)) {
                        views.setTextColor(R.id.widget_large_marked_text, context.getColor(R.color.widget_rose));
                    } else {
                        views.setTextColor(R.id.widget_large_marked_text, context.getColor(R.color.widget_slate));
                    }

                    views.setOnClickPendingIntent(R.id.widget_large_btn_undo,
                            createActionIntent(context, ACTION_MARK_UNDO, activeClass, appWidgetId * 100 + 4));
                }

                // Populate other slots
                int[] slotLayouts = {R.id.widget_large_slot1, R.id.widget_large_slot2, R.id.widget_large_slot3};
                int[] slotPeriods = {R.id.widget_large_slot1_period, R.id.widget_large_slot2_period, R.id.widget_large_slot3_period};
                int[] slotNames = {R.id.widget_large_slot1_name, R.id.widget_large_slot2_name, R.id.widget_large_slot3_name};
                int[] slotStatuses = {R.id.widget_large_slot1_status, R.id.widget_large_slot2_status, R.id.widget_large_slot3_status};

                int slotIdx = 0;
                for (int i = 0; i < classes.length() && slotIdx < 3; i++) {
                    if (i == activeIndex) continue;
                    JSONObject c = classes.getJSONObject(i);
                    views.setViewVisibility(slotLayouts[slotIdx], View.VISIBLE);
                    views.setTextViewText(slotPeriods[slotIdx], c.optString("periodLabel", "P" + c.optInt("periodNumber", 1)));
                    views.setTextViewText(slotNames[slotIdx], c.optString("subjectName", "Class"));
                    String st = c.optString("status", "unmarked");
                    views.setTextViewText(slotStatuses[slotIdx], st.toUpperCase());
                    if ("present".equalsIgnoreCase(st)) {
                        views.setTextColor(slotStatuses[slotIdx], context.getColor(R.color.widget_emerald));
                    } else if ("absent".equalsIgnoreCase(st)) {
                        views.setTextColor(slotStatuses[slotIdx], context.getColor(R.color.widget_rose));
                    } else {
                        views.setTextColor(slotStatuses[slotIdx], context.getColor(R.color.widget_text_muted));
                    }
                    slotIdx++;
                }

                for (; slotIdx < 3; slotIdx++) {
                    views.setViewVisibility(slotLayouts[slotIdx], View.GONE);
                }
            } else {
                views.setTextViewText(R.id.widget_large_active_subject, "No Classes Today");
                views.setTextViewText(R.id.widget_large_active_period, "");
                views.setTextViewText(R.id.widget_large_active_time, "Enjoy your day");
                views.setViewVisibility(R.id.widget_large_actions_unmarked, View.GONE);
                views.setViewVisibility(R.id.widget_large_actions_marked, View.GONE);
                views.setViewVisibility(R.id.widget_large_slot1, View.GONE);
                views.setViewVisibility(R.id.widget_large_slot2, View.GONE);
                views.setViewVisibility(R.id.widget_large_slot3, View.GONE);
            }
        } catch (Exception e) {
            views.setTextViewText(R.id.widget_large_active_subject, "Tap to open");
        }

        return views;
    }
}
