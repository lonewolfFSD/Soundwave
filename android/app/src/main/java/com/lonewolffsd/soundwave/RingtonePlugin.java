package com.lonewolffsd.soundwave;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "Ringtone")
public class RingtonePlugin extends Plugin {

    private static final String TAG = "SoundwaveRingtone";

    @PluginMethod
    public void hasPermission(PluginCall call) {
        JSObject ret = new JSObject();
        boolean canWrite = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            canWrite = Settings.System.canWrite(getContext());
        }
        ret.put("hasPermission", canWrite);
        call.resolve(ret);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void setRingtone(PluginCall call) {
        Context context = getContext();

        // 1. Verify WRITE_SETTINGS permission on Android 6+
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.System.canWrite(context)) {
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context, "Please enable 'Allow modify system settings' to set ringtones", Toast.LENGTH_LONG).show();
            });
            Intent intent = new Intent(Settings.ACTION_MANAGE_WRITE_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
            call.reject("PERMISSION_DENIED", "WRITE_SETTINGS_REQUIRED");
            return;
        }

        String urlStr = call.getString("url");
        String filePath = call.getString("filePath");
        String base64Data = call.getString("base64Data");
        String title = call.getString("title", "Soundwave Ringtone");
        String artist = call.getString("artist", "Soundwave");
        String mimeType = call.getString("mimeType", "audio/mpeg");

        if ((urlStr == null || urlStr.trim().isEmpty()) && (filePath == null || filePath.trim().isEmpty()) && (base64Data == null || base64Data.trim().isEmpty())) {
            call.reject("INVALID_DATA", "Must provide url, filePath, or base64Data");
            return;
        }

        // Run on background worker thread
        new Thread(() -> {
            try {
                InputStream inputStream = null;
                if (filePath != null && !filePath.isEmpty()) {
                    File file = new File(filePath.replace("file://", ""));
                    if (file.exists()) {
                        inputStream = new FileInputStream(file);
                    }
                }

                if (inputStream == null && base64Data != null && !base64Data.isEmpty()) {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] audioBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                    inputStream = new java.io.ByteArrayInputStream(audioBytes);
                }

                if (inputStream == null && urlStr != null && !urlStr.isEmpty()) {
                    URL url = new URL(urlStr);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setInstanceFollowRedirects(true);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("User-Agent", "Soundwave/1.5.0");
                    conn.connect();
                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_TEMP || code == HttpURLConnection.HTTP_MOVED_PERM || code == 307 || code == 308) {
                        String redirectUrl = conn.getHeaderField("Location");
                        if (redirectUrl != null && !redirectUrl.isEmpty()) {
                            conn = (HttpURLConnection) new URL(redirectUrl).openConnection();
                            conn.connect();
                        }
                    }
                    if (conn.getResponseCode() == 200 || conn.getResponseCode() == 206) {
                        inputStream = conn.getInputStream();
                    }
                }

                if (inputStream == null) {
                    call.reject("DOWNLOAD_FAILED", "Failed to retrieve audio stream");
                    return;
                }

                String cleanTitle = title.replaceAll("[^a-zA-Z0-9._ -]", "").trim();
                if (cleanTitle.isEmpty()) cleanTitle = "Soundwave_Ringtone";
                String ext = mimeType.contains("wav") ? ".wav" : ".mp3";
                String fileName = cleanTitle + "_" + (System.currentTimeMillis() % 100000) + ext;

                Uri ringtoneUri = null;
                ContentResolver resolver = context.getContentResolver();

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, fileName);
                    values.put(MediaStore.MediaColumns.TITLE, cleanTitle);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_RINGTONES);
                    values.put(MediaStore.Audio.Media.IS_RINGTONE, true);
                    values.put(MediaStore.Audio.Media.IS_NOTIFICATION, true);
                    values.put(MediaStore.Audio.Media.IS_ALARM, true);
                    values.put(MediaStore.Audio.Media.IS_MUSIC, false);

                    ringtoneUri = resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
                    if (ringtoneUri != null) {
                        try (OutputStream out = resolver.openOutputStream(ringtoneUri)) {
                            byte[] buffer = new byte[8192];
                            int len;
                            while ((len = inputStream.read(buffer)) != -1) {
                                out.write(buffer, 0, len);
                            }
                            out.flush();
                        }
                    }
                } else {
                    File ringtonesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_RINGTONES);
                    if (!ringtonesDir.exists()) {
                        ringtonesDir.mkdirs();
                    }
                    File destFile = new File(ringtonesDir, fileName);
                    try (OutputStream out = new FileOutputStream(destFile)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = inputStream.read(buffer)) != -1) {
                            out.write(buffer, 0, len);
                        }
                        out.flush();
                    }

                    ContentValues values = new ContentValues();
                    values.put(MediaStore.MediaColumns.DATA, destFile.getAbsolutePath());
                    values.put(MediaStore.MediaColumns.TITLE, cleanTitle);
                    values.put(MediaStore.MediaColumns.MIME_TYPE, mimeType);
                    values.put(MediaStore.Audio.Media.IS_RINGTONE, true);
                    values.put(MediaStore.Audio.Media.IS_NOTIFICATION, true);
                    values.put(MediaStore.Audio.Media.IS_ALARM, true);
                    values.put(MediaStore.Audio.Media.IS_MUSIC, false);

                    ringtoneUri = resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, values);
                }

                if (ringtoneUri == null) {
                    call.reject("SAVE_FAILED", "Failed to save ringtone to storage");
                    return;
                }

                // 2. Set as actual default system ringtone via RingtoneManager & Settings fallback
                try {
                    RingtoneManager.setActualDefaultRingtoneUri(context, RingtoneManager.TYPE_RINGTONE, ringtoneUri);
                } catch (Exception rErr) {
                    Log.w(TAG, "RingtoneManager set failed", rErr);
                }

                try {
                    Settings.System.putString(context.getContentResolver(), Settings.System.RINGTONE, ringtoneUri.toString());
                } catch (Exception sErr) {
                    Log.w(TAG, "Settings.System write failed", sErr);
                }

                new Handler(Looper.getMainLooper()).post(() -> {
                    Toast.makeText(context, "🔔 Phone Ringtone set to: " + title, Toast.LENGTH_LONG).show();
                });

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("uri", ringtoneUri.toString());
                ret.put("title", title);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error setting ringtone", e);
                new Handler(Looper.getMainLooper()).post(() -> {
                    Toast.makeText(context, "Failed to set ringtone: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                });
                call.reject("ERROR", e.getMessage(), e);
            }
        }).start();
    }
}
