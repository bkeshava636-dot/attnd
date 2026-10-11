package com.attnd.attendance.bridge;

import android.content.Context;
import android.content.SharedPreferences;

import com.attnd.attendance.widget.AttndWidgetActionReceiver;
import com.attnd.attendance.widget.AttndWidgetProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "AttndNativeBridge")
public class AttndNativeBridgePlugin extends Plugin {

    @PluginMethod
    public void syncWidgetData(PluginCall call) {
        JSObject data = call.getData();
        if (data == null) {
            call.reject("Data is null");
            return;
        }

        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(AttndWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(AttndWidgetProvider.KEY_SNAPSHOT, data.toString()).apply();

            // Trigger widget redraw
            AttndWidgetProvider.triggerUpdate(context);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to sync widget data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getPendingWidgetActions(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(AttndWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            String queueJson = prefs.getString(AttndWidgetActionReceiver.KEY_PENDING_QUEUE, "[]");
            JSONArray queue = new JSONArray(queueJson);

            JSObject result = new JSObject();
            JSArray actions = new JSArray();
            for (int i = 0; i < queue.length(); i++) {
                JSONObject obj = queue.getJSONObject(i);
                JSObject action = new JSObject();
                action.put("id", obj.optString("id"));
                action.put("slotKey", obj.optString("slotKey"));
                action.put("date", obj.optString("date"));
                action.put("periodNumber", obj.optInt("periodNumber"));
                action.put("subjectId", obj.optString("subjectId"));
                action.put("unitGroupId", obj.optString("unitGroupId"));
                action.put("unitSize", obj.optInt("unitSize", 1));
                action.put("status", obj.optString("status"));
                action.put("timestamp", obj.optLong("timestamp"));
                actions.put(action);
            }
            result.put("actions", actions);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to read pending widget actions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearPendingWidgetActions(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(AttndWidgetProvider.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(AttndWidgetActionReceiver.KEY_PENDING_QUEUE, "[]").apply();
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to clear pending actions: " + e.getMessage());
        }
    }
}
