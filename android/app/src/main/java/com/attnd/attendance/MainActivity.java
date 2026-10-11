package com.attnd.attendance;

import android.os.Bundle;
import com.attnd.attendance.bridge.AttndNativeBridgePlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AttndNativeBridgePlugin.class);
        super.onCreate(savedInstanceState);
    }
}

