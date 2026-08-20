package com.lonewolffsd.soundwave;

import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.CookieManager;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.IntentFilter;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.widget.RemoteViews;
import android.widget.Toast;
import android.content.SharedPreferences;
import android.app.DownloadManager;
import android.os.Environment;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.BridgeActivity;

import android.Manifest;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {

    private AudioManager audioManager;
    private AudioManager.OnAudioFocusChangeListener focusChangeListener;
    private AudioFocusRequest audioFocusRequest;
    private BroadcastReceiver widgetReceiver;
    private BroadcastReceiver audioReceiver;
    private BroadcastReceiver settingsReceiver;
    private SensorManager sensorManager;
    private Sensor accelerometer;
    private float acceleration = 0.00f;
    private float currentAcceleration = SensorManager.GRAVITY_EARTH;
    private float lastAcceleration = SensorManager.GRAVITY_EARTH;
    private static final int SHAKE_THRESHOLD = 13;
    private int shakeCount = 0;
    private long shakeTimestamp = 0;
    private static final int MIN_SHAKE_COUNT = 5;
    private static final int SHAKE_WINDOW_MS = 1000;
    private long lastShakeTime = 0;
    private long lastBackPressTime = 0;
    private static final int BACK_PRESS_INTERVAL = 2000;

    // Feature Toggles
    private boolean isShakeEnabled = false;
    private boolean isHapticEnabled = false;
    private boolean isShuffleToastEnabled = false;
    private BroadcastReceiver downloadReceiver;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(com.capgo.mediasession.MediaSessionPlugin.class);
        registerPlugin(git.shin.plugins.pip.PiPPlugin.class);

        setTheme(R.style.AppTheme_NoActionBar);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (lastBackPressTime + BACK_PRESS_INTERVAL > System.currentTimeMillis()) {
                    moveTaskToBack(true);
                } else {
                    Toast.makeText(getBaseContext(), "Press back again to exit", Toast.LENGTH_SHORT).show();
                    lastBackPressTime = System.currentTimeMillis();
                }
            }
        });

        createNotificationChannel();
        setupAudioFocus();
        setupWidgetReceiver();
        setupAudioReceiver();
        setupShakeDetection();
        setupSettingsReceiver();
        setupDownloadReceiver();
        checkAndRequestPermissions();

        // Keep screen on
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Fullscreen + notch support
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            Window window = getWindow();
            window.getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false);
            }
        }

        setFullScreen();
        setupEdgeToEdge();
        requestIgnoreBatteryOptimizations();

        // 🔥 WEBVIEW SETUP
        WebView webView = this.bridge.getWebView();
        webView.setLayerType(android.view.View.LAYER_TYPE_NONE, null);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED);

        WebSettings webSettings = webView.getSettings();
        webSettings.setMediaPlaybackRequiresUserGesture(false);
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);

        // Disable long press
        webView.setOnLongClickListener(v -> true);
        webView.setLongClickable(false);

        // --- JAVASCRIPT INTERFACE (Cleaned - only necessary parts) ---
        webView.addJavascriptInterface(new Object() {
            @android.webkit.JavascriptInterface
            public void updateSettings(boolean shake, boolean haptic, boolean toast) {
                isShakeEnabled = shake;
                isHapticEnabled = haptic;
                isShuffleToastEnabled = toast;

                SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                editor.putString("_cap_sw_shake_shuffle", String.valueOf(shake));
                editor.putString("_cap_sw_haptics", String.valueOf(haptic));
                editor.apply();
            }

            @android.webkit.JavascriptInterface
            public void requestIgnoreBatteryOptimizations() {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Intent intent = new Intent();
                    String packageName = getPackageName();
                    PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
                    if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                        intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + packageName));
                        startActivity(intent);
                    }
                }
            }

            @android.webkit.JavascriptInterface
            public void downloadNative(String url, String title) {
                runOnUiThread(() -> {
                    try {
                        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                                    != PackageManager.PERMISSION_GRANTED) {
                                ActivityCompat.requestPermissions(MainActivity.this,
                                        new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 103);
                                Toast.makeText(MainActivity.this, "Storage permission required.", Toast.LENGTH_LONG).show();
                                return;
                            }
                        }

                        DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                        request.setMimeType("audio/mpeg");
                        request.setTitle(title + ".mp3");
                        request.setDescription("Downloading " + title);
                        request.allowScanningByMediaScanner();
                        request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);

                        String safeTitle = title.replaceAll("[^a-zA-Z0-9.-]", "_") + ".mp3";
                        request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, safeTitle);

                        DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                        if (dm != null) {
                            dm.enqueue(request);
                            Toast.makeText(MainActivity.this, "Downloading " + title + "...", Toast.LENGTH_SHORT).show();
                        }
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "Download error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                });
            }

            @android.webkit.JavascriptInterface
            public void switchIcon(String aliasName) {

                PackageManager pm = getPackageManager();

                String defaultAlias =
                        "com.lonewolffsd.soundwave.MainActivityDefault";

                String galacticAlias =
                        "com.lonewolffsd.soundwave.MainActivityGalactic";

                String aroraAlias =
                        "com.lonewolffsd.soundwave.MainActivityArora";

                String vortexAlias =
                        "com.lonewolffsd.soundwave.MainActivityVortex";

                String voltAlias =
                        "com.lonewolffsd.soundwave.MainActivityVolt";

                String nebulaAlias =
                        "com.lonewolffsd.soundwave.MainActivityNebula";

                String prismAlias =
                        "com.lonewolffsd.soundwave.MainActivityPrism";

                // disable both first
                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, defaultAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, galacticAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, aroraAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, vortexAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, voltAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, nebulaAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, prismAlias),
                        PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                        PackageManager.DONT_KILL_APP
                );

                // enable chosen icon
                pm.setComponentEnabledSetting(
                        new ComponentName(MainActivity.this, aliasName),
                        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
                        PackageManager.DONT_KILL_APP
                );

                runOnUiThread(() ->
                        Toast.makeText(
                                MainActivity.this,
                                "App icon changed",
                                Toast.LENGTH_SHORT
                        ).show()
                );
            }
        }, "AndroidSettings");

        // WebView Settings
        WebSettings settings = webView.getSettings();
        String chromeAgent = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36";
        settings.setUserAgentString(chromeAgent);
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }

        // Download Listener
        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                // Same as before...
                if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
                    if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                            != PackageManager.PERMISSION_GRANTED) {
                        ActivityCompat.requestPermissions(MainActivity.this,
                                new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 103);
                        return;
                    }
                }

                DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                request.setMimeType(mimetype);
                String cookies = CookieManager.getInstance().getCookie(url);
                request.addRequestHeader("cookie", cookies);
                request.addRequestHeader("User-Agent", userAgent);
                request.setDescription("Downloading file...");
                request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimetype));
                request.allowScanningByMediaScanner();
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                        URLUtil.guessFileName(url, contentDisposition, mimetype));

                DownloadManager dm = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                if (dm != null) dm.enqueue(request);
            }
        });
    }

    private void checkAndRequestPermissions() {
        List<String> permissions = new ArrayList<>();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.POST_NOTIFICATIONS);
            }
        }
        if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.P) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE)
                    != PackageManager.PERMISSION_GRANTED) {
                permissions.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                != PackageManager.PERMISSION_GRANTED) {
            permissions.add(Manifest.permission.RECORD_AUDIO);
        }

        if (!permissions.isEmpty()) {
            ActivityCompat.requestPermissions(this, permissions.toArray(new String[0]), 100);
        }
    }


    private void setupDownloadReceiver() {
        downloadReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (DownloadManager.ACTION_DOWNLOAD_COMPLETE.equals(intent.getAction())) {
                    Toast.makeText(context, "Downloaded!", Toast.LENGTH_SHORT).show();
                }
            }
        };
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(downloadReceiver, new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE));
        }
    }

    private void setupEdgeToEdge() {
        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }
    }

    private void setupShakeDetection() {
        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER);
        }
    }

    private void setupSettingsReceiver() {
        SharedPreferences prefs = getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        isShakeEnabled = getBooleanPref(prefs, "sw_shake_shuffle", true);
        isHapticEnabled = getBooleanPref(prefs, "sw_haptics", true);
        isShuffleToastEnabled = true;

        settingsReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.lonewolffsd.soundwave.SETTINGS_UPDATE".equals(intent.getAction())) {
                    if (intent.hasExtra("sw_shake_shuffle") || intent.hasExtra("shakeEnabled")) {
                        isShakeEnabled = getBooleanExtraRobust(intent, intent.hasExtra("sw_shake_shuffle") ? "sw_shake_shuffle" : "shakeEnabled", true);
                    }
                    if (intent.hasExtra("sw_haptics") || intent.hasExtra("hapticsEnabled")) {
                        isHapticEnabled = getBooleanExtraRobust(intent, intent.hasExtra("sw_haptics") ? "sw_haptics" : "hapticsEnabled", true);
                    }
                }
            }
        };
        IntentFilter filter = new IntentFilter("com.lonewolffsd.soundwave.SETTINGS_UPDATE");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(settingsReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(settingsReceiver, filter);
        }
    }

    // Keep all the helper methods (getBooleanPref, sensor, haptic, etc.)
    private boolean getBooleanExtraRobust(Intent intent, String key, boolean defaultValue) {
        if (intent.getExtras() == null) return defaultValue;
        Object extra = intent.getExtras().get(key);
        if (extra == null) return defaultValue;
        if (extra instanceof Boolean) return (Boolean) extra;
        if (extra instanceof String) {
            String s = (String) extra;
            return s.equalsIgnoreCase("true") || s.equals("1");
        }
        if (extra instanceof Integer) return (Integer) extra == 1;
        return intent.getBooleanExtra(key, defaultValue);
    }

    private boolean getBooleanPref(SharedPreferences prefs, String key, boolean defaultValue) {
        boolean result = getBooleanPrefInternal(prefs, key, defaultValue);
        if (!prefs.contains(key)) {
            result = getBooleanPrefInternal(prefs, "_cap_" + key, result);
        }
        return result;
    }

    private boolean getBooleanPrefInternal(SharedPreferences prefs, String key, boolean defaultValue) {
        if (!prefs.contains(key)) return defaultValue;
        try {
            Object value = prefs.getAll().get(key);
            if (value instanceof Boolean) return (Boolean) value;
            if (value instanceof String) {
                String s = (String) value;
                return s.equalsIgnoreCase("true") || s.equals("1");
            }
            if (value instanceof Integer) return (Integer) value == 1;
            return prefs.getBoolean(key, defaultValue);
        } catch (Exception e) {
            return defaultValue;
        }
    }

    private final SensorEventListener sensorListener = new SensorEventListener() {
        @Override
        public void onSensorChanged(SensorEvent event) {
            float x = event.values[0], y = event.values[1], z = event.values[2];
            lastAcceleration = currentAcceleration;
            currentAcceleration = (float) Math.sqrt((x * x + y * y + z * z));
            float delta = currentAcceleration - lastAcceleration;
            acceleration = acceleration * 0.9f + delta;

            if (acceleration > SHAKE_THRESHOLD) {
                long now = System.currentTimeMillis();
                if (shakeTimestamp == 0) shakeTimestamp = now;

                if (now - shakeTimestamp < SHAKE_WINDOW_MS) {
                    shakeCount++;
                    if (shakeCount >= MIN_SHAKE_COUNT) {
                        triggerShuffle();
                        shakeCount = 0;
                        shakeTimestamp = 0;
                    }
                } else {
                    shakeTimestamp = now;
                    shakeCount = 1;
                }
            }
        }
        @Override
        public void onAccuracyChanged(Sensor sensor, int accuracy) {}
    };

    private void triggerShuffle() {
        long now = System.currentTimeMillis();
        if (now - lastShakeTime < 1000) return;
        lastShakeTime = now;

        runOnUiThread(() -> {
            if (isShakeEnabled) {
                if (isHapticEnabled) triggerHapticFeedback();
                if (isShuffleToastEnabled) Toast.makeText(MainActivity.this, "Shuffling Song", Toast.LENGTH_SHORT).show();
                if (getBridge() != null) getBridge().triggerWindowJSEvent("onShakeShuffle", "{}");
            }
        });
    }

    private void triggerHapticFeedback() {
        Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                v.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                v.vibrate(50);
            }
        }
    }

    private void setupAudioReceiver() { /* unchanged */
        audioReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if (AudioManager.ACTION_AUDIO_BECOMING_NOISY.equals(intent.getAction())) {
                    if (getBridge() != null) getBridge().triggerWindowJSEvent("onAudioPauseRequired", "{}");
                } else if (Intent.ACTION_HEADSET_PLUG.equals(intent.getAction())) {
                    if (intent.getIntExtra("state", -1) == 1 && getBridge() != null) {
                        getBridge().triggerWindowJSEvent("onAudioResumeSuggested", "{}");
                    }
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
        filter.addAction(Intent.ACTION_HEADSET_PLUG);
        registerReceiver(audioReceiver, filter);
    }

    private void setFullScreen() { /* unchanged */
        Window window = getWindow();
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.show(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
            window.setStatusBarColor(android.graphics.Color.TRANSPARENT);
            window.setNavigationBarColor(android.graphics.Color.TRANSPARENT);
        }
    }

    private void createNotificationChannel() { /* unchanged */
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("playback", "Music Playback", NotificationManager.IMPORTANCE_LOW);
            channel.setDescription("Media controls for background audio");
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void setupAudioFocus() { /* unchanged */
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        focusChangeListener = focusChange -> {
            String type = switch (focusChange) {
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> "duck";
                case AudioManager.AUDIOFOCUS_GAIN -> "restore";
                case AudioManager.AUDIOFOCUS_LOSS -> "pause";
                default -> null;
            };
            if (type == null) return;
            final String finalType = type;
            runOnUiThread(() -> {
                if (getBridge() != null) getBridge().triggerWindowJSEvent("onAudioFocusChange", "{ \"type\": \"" + finalType + "\" }");
            });
        };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build())
                    .setAcceptsDelayedFocusGain(true)
                    .setWillPauseWhenDucked(false)
                    .setOnAudioFocusChangeListener(focusChangeListener)
                    .build();
        }
    }

    private void setupWidgetReceiver() { /* unchanged */
        // ... (your original widget code)
        widgetReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                if ("com.lonewolffsd.soundwave.WIDGET_CONTROL".equals(intent.getAction())) {
                    String action = intent.getStringExtra("action");
                    if (action != null && getBridge() != null) {
                        getBridge().triggerWindowJSEvent(action, "{}");
                    }
                } else if ("com.lonewolffsd.soundwave.UPDATE_WIDGET_UI".equals(intent.getAction())) {
                    updateWidgetUI(intent);
                }
            }
        };
        IntentFilter filter = new IntentFilter();
        filter.addAction("com.lonewolffsd.soundwave.WIDGET_CONTROL");
        filter.addAction("com.lonewolffsd.soundwave.UPDATE_WIDGET_UI");
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(widgetReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
            registerReceiver(widgetReceiver, filter);
        }
    }

    private void updateWidgetUI(Intent intent) { /* unchanged */
        // your original code
        String title = intent.getStringExtra("title");
        String artist = intent.getStringExtra("artist");
        boolean isPlaying = intent.getBooleanExtra("isPlaying", false);

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(this);
        ComponentName musicWidget = new ComponentName(this, MusicWidget.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(musicWidget);

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(getPackageName(), R.layout.music_widget);
            if (title != null) views.setTextViewText(R.id.widget_title, title);
            if (artist != null) views.setTextViewText(R.id.widget_artist, artist);
            views.setImageViewResource(R.id.widget_play_pause, isPlaying ? R.drawable.ic_baseline_pause_24 : R.drawable.ic_baseline_play_arrow_24);
            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        if (sensorManager != null) sensorManager.unregisterListener(sensorListener);
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onStop() {
        super.onStop();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().resumeTimers();
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        if (sensorManager != null && accelerometer != null) {
            sensorManager.registerListener(sensorListener, accelerometer, SensorManager.SENSOR_DELAY_UI);
        }
        handleShortcutIntent(getIntent());

        if (audioManager != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioManager.requestAudioFocus(audioFocusRequest);
            } else {
                audioManager.requestAudioFocus(focusChangeListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN);
            }
        }
    }

    @Override
    public void onDestroy() {
        // If we are destroying because of a finish(), let it go.
        // But we want to avoid destruction on swipe if possible.
        super.onDestroy();
        if (widgetReceiver != null) unregisterReceiver(widgetReceiver);
        if (audioReceiver != null) unregisterReceiver(audioReceiver);
        if (settingsReceiver != null) unregisterReceiver(settingsReceiver);
        if (downloadReceiver != null) unregisterReceiver(downloadReceiver);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleShortcutIntent(intent);
    }

    private void handleShortcutIntent(Intent intent) {
        if (intent != null && intent.getData() != null) {
            String path = intent.getData().getLastPathSegment();
            if (path != null && getBridge() != null) {
                runOnUiThread(() -> getBridge().triggerWindowJSEvent("onAppShortcut", "{ \"path\": \"" + path + "\" }"));
            }
        }
    }

    private void requestIgnoreBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
            if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
                // Toast.makeText(this, "Please disable battery optimization for uninterrupted playback", Toast.LENGTH_LONG).show();
            }
        }
    }
}
