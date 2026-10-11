package com.attnd.attendance.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

public class AttndWidgetActionReceiver extends BroadcastReceiver {

    public static final String KEY_PENDING_QUEUE = "widget_pending_queue";
    private static final Map<String, Long> lastActionTimestamps = new HashMap<>();

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        String newStatus;
        if (AttndWidgetProvider.ACTION_MARK_PRESENT.equals(action)) {
            newStatus = "present";
        } else if (AttndWidgetProvider.ACTION_MARK_ABSENT.equals(action)) {
            newStatus = "absent";
        } else if (AttndWidgetProvider.ACTION_MARK_CANCEL.equals(action)) {
            newStatus = "cancelled";
        } else if (AttndWidgetProvider.ACTION_MARK_UNDO.equals(action)) {
            newStatus = "unmarked";
        } else {
            return;
        }

        String slotKey = intent.getStringExtra("slotKey");
        String date = intent.getStringExtra("date");
        int periodNumber = intent.getIntExtra("periodNumber", 1);
        String subjectId = intent.getStringExtra("subjectId");
        String unitGroupId = intent.getStringExtra("unitGroupId");
        int unitSize = intent.getIntExtra("unitSize", 1);

        if (slotKey == null && date == null) return;

        // Duplicate / Debounce protection (500ms per slot)
        String dedupeKey = slotKey != null ? slotKey : (date + "_" + periodNumber);
        long now = System.currentTimeMillis();
        Long lastTime = lastActionTimestamps.get(dedupeKey);
        if (lastTime != null && (now - lastTime) < 500) {
            return;
        }
        lastActionTimestamps.put(dedupeKey, now);

        SharedPreferences prefs = context.getSharedPreferences(AttndWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
        String snapshotJson = prefs.getString(AttndWidgetProvider.KEY_SNAPSHOT, null);

        if (snapshotJson != null) {
            try {
                JSONObject snapshot = new JSONObject(snapshotJson);
                JSONArray classes = snapshot.optJSONArray("classes");
                if (classes != null) {
                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        boolean matches = false;
                        if (slotKey != null && slotKey.equals(c.optString("slotKey"))) {
                            matches = true;
                        } else if (periodNumber == c.optInt("periodNumber") &&
                                (subjectId == null || subjectId.equals(c.optString("subjectId")))) {
                            matches = true;
                        }

                        if (matches) {
                            c.put("status", newStatus);
                            break;
                        }
                    }

                    // Recompute stats using deterministic baseline + today's classes
                    int baselinePresent = snapshot.optInt("baselinePresent", 0);
                    int baselineAbsent = snapshot.optInt("baselineAbsent", 0);
                    int baselineCancelled = snapshot.optInt("baselineCancelled", 0);

                    int todayPresent = 0;
                    int todayAbsent = 0;
                    int todayCancelled = 0;

                    for (int i = 0; i < classes.length(); i++) {
                        JSONObject c = classes.getJSONObject(i);
                        String st = c.optString("status", "unmarked");
                        if ("present".equalsIgnoreCase(st)) {
                            todayPresent++;
                        } else if ("absent".equalsIgnoreCase(st)) {
                            todayAbsent++;
                        } else if ("cancelled".equalsIgnoreCase(st)) {
                            todayCancelled++;
                        }
                    }

                    int totalPresent = baselinePresent + todayPresent;
                    int totalAbsent = baselineAbsent + todayAbsent;
                    int totalConducted = totalPresent + totalAbsent;
                    int totalCancelled = baselineCancelled + todayCancelled;

                    double newPct = totalConducted > 0 ? ((double) totalPresent / totalConducted) * 100.0 : 100.0;

                    snapshot.put("overallPresent", totalPresent);
                    snapshot.put("overallAbsent", totalAbsent);
                    snapshot.put("overallConduct", totalConducted);
                    snapshot.put("overallCancelled", totalCancelled);
                    snapshot.put("overallPercentage", newPct);

                    prefs.edit().putString(AttndWidgetProvider.KEY_SNAPSHOT, snapshot.toString()).apply();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        // Record pending action into the queue for sync when app resumes
        try {
            String queueJson = prefs.getString(KEY_PENDING_QUEUE, "[]");
            JSONArray queue = new JSONArray(queueJson);

            JSONObject actionItem = new JSONObject();
            actionItem.put("id", "act_" + now);
            actionItem.put("slotKey", slotKey);
            actionItem.put("date", date);
            actionItem.put("periodNumber", periodNumber);
            actionItem.put("subjectId", subjectId);
            actionItem.put("unitGroupId", unitGroupId);
            actionItem.put("unitSize", unitSize);
            actionItem.put("status", newStatus);
            actionItem.put("timestamp", now);

            queue.put(actionItem);
            prefs.edit().putString(KEY_PENDING_QUEUE, queue.toString()).apply();
        } catch (Exception e) {
            e.printStackTrace();
        }

        // Trigger immediate widget RemoteViews redraw
        AttndWidgetProvider.triggerUpdate(context);
    }
}
