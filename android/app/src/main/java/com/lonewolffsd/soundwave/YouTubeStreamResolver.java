package com.lonewolffsd.soundwave;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;

public class YouTubeStreamResolver {

    private static final String TAG = "SoundwaveYtResolver";
    private static final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();
    private static final OkHttpClient client = new OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(10, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    private static class CacheEntry {
        final String url;
        final long timestamp;
        CacheEntry(String url) {
            this.url = url;
            this.timestamp = System.currentTimeMillis();
        }
        boolean isValid() {
            return System.currentTimeMillis() - timestamp < 1800000; // 30 mins
        }
    }

    public static String resolveAudioStream(String rawVideoId) {
        if (rawVideoId == null || rawVideoId.isEmpty()) return "";

        String videoId = rawVideoId.replace("yt_", "").trim();
        if (videoId.length() != 11) return "";

        CacheEntry entry = cache.get(videoId);
        if (entry != null && entry.isValid()) {
            return entry.url;
        }

        // ── 1. PRIMARY: YouTube Music Android Client (ANDROID_MUSIC) ──
        String streamUrl = tryAndroidMusicClient(videoId);
        if (isValidStream(streamUrl)) {
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 2. SECONDARY: YouTube iOS Client (IOS) ──
        streamUrl = tryIosClient(videoId);
        if (isValidStream(streamUrl)) {
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 3. TERTIARY: Invidious Instances ──
        streamUrl = tryInvidiousMirrors(videoId);
        if (isValidStream(streamUrl)) {
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 4. QUATERNARY: Piped Instances ──
        streamUrl = tryPipedMirrors(videoId);
        if (isValidStream(streamUrl)) {
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 5. QUINARY: Cobalt Stream API ──
        streamUrl = tryCobaltApi(videoId);
        if (isValidStream(streamUrl)) {
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        return "";
    }

    private static boolean isValidStream(String url) {
        return url != null && url.startsWith("http") && url.length() > 20;
    }

    private static String tryAndroidMusicClient(String videoId) {
        try {
            JSONObject clientContext = new JSONObject();
            clientContext.put("clientName", "ANDROID_MUSIC");
            clientContext.put("clientVersion", "6.42.52");
            clientContext.put("androidSdkVersion", 34);
            clientContext.put("hl", "en");
            clientContext.put("gl", "US");

            JSONObject context = new JSONObject();
            context.put("client", clientContext);

            JSONObject bodyJson = new JSONObject();
            bodyJson.put("videoId", videoId);
            bodyJson.put("context", context);

            MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
            RequestBody body = RequestBody.create(bodyJson.toString(), mediaType);

            Request request = new Request.Builder()
                    .url("https://music.youtube.com/youtubei/v1/player?prettyPrint=false")
                    .post(body)
                    .addHeader("User-Agent", "com.google.android.apps.youtube.music/6.42.52 (Linux; U; Android 14; Pixel 7) gzip")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("X-YouTube-Client-Name", "26")
                    .addHeader("X-YouTube-Client-Version", "6.42.52")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String jsonStr = response.body().string();
                    JSONObject data = new JSONObject(jsonStr);
                    return extractBestAudioFormat(data);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Android Music client resolution failed: " + e.getMessage());
        }
        return "";
    }

    private static String tryIosClient(String videoId) {
        try {
            JSONObject clientContext = new JSONObject();
            clientContext.put("clientName", "IOS");
            clientContext.put("clientVersion", "19.09.3");
            clientContext.put("deviceModel", "iPhone16,2");
            clientContext.put("hl", "en");
            clientContext.put("gl", "US");

            JSONObject context = new JSONObject();
            context.put("client", clientContext);

            JSONObject bodyJson = new JSONObject();
            bodyJson.put("videoId", videoId);
            bodyJson.put("context", context);

            MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
            RequestBody body = RequestBody.create(bodyJson.toString(), mediaType);

            Request request = new Request.Builder()
                    .url("https://www.youtube.com/youtubei/v1/player?prettyPrint=false")
                    .post(body)
                    .addHeader("User-Agent", "com.google.ios.youtube/19.09.3 (iPhone16,2; U; CPU iOS 17_4 like Mac OS X; en_US)")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("X-YouTube-Client-Name", "5")
                    .addHeader("X-YouTube-Client-Version", "19.09.3")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String jsonStr = response.body().string();
                    JSONObject data = new JSONObject(jsonStr);
                    return extractBestAudioFormat(data);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "iOS client resolution failed: " + e.getMessage());
        }
        return "";
    }

    private static String extractBestAudioFormat(JSONObject data) {
        try {
            JSONObject streamingData = data.optJSONObject("streamingData");
            if (streamingData == null) return "";

            JSONArray adaptiveFormats = streamingData.optJSONArray("adaptiveFormats");
            if (adaptiveFormats == null || adaptiveFormats.length() == 0) return "";

            String bestUrl = "";
            int maxBitrate = 0;

            for (int i = 0; i < adaptiveFormats.length(); i++) {
                JSONObject format = adaptiveFormats.getJSONObject(i);
                String mimeType = format.optString("mimeType", "");
                if (mimeType.startsWith("audio/")) {
                    String url = format.optString("url", "");
                    int bitrate = format.optInt("bitrate", 0);
                    if (!url.isEmpty() && bitrate > maxBitrate) {
                        maxBitrate = bitrate;
                        bestUrl = url;
                    }
                }
            }
            return bestUrl;
        } catch (Exception e) {
            Log.w(TAG, "Format extraction error: " + e.getMessage());
        }
        return "";
    }

    private static String tryInvidiousMirrors(String videoId) {
        String[] mirrors = {
                "https://inv.nadeko.net",
                "https://invidious.nerdvpn.de",
                "https://invidious.jing.rocks",
                "https://vid.puffyan.us"
        };

        for (String mirror : mirrors) {
            try {
                Request request = new Request.Builder()
                        .url(mirror + "/api/v1/videos/" + videoId + "?fields=adaptiveFormats")
                        .header("User-Agent", "Mozilla/5.0 (Linux; Android 14)")
                        .build();

                try (Response response = client.newCall(request).execute()) {
                    if (response.isSuccessful() && response.body() != null) {
                        JSONObject data = new JSONObject(response.body().string());
                        JSONArray adaptiveFormats = data.optJSONArray("adaptiveFormats");
                        if (adaptiveFormats != null) {
                            String bestUrl = "";
                            int maxBitrate = 0;
                            for (int i = 0; i < adaptiveFormats.length(); i++) {
                                JSONObject format = adaptiveFormats.getJSONObject(i);
                                String type = format.optString("type", "");
                                if (type.startsWith("audio/")) {
                                    String url = format.optString("url", "");
                                    int bitrate = format.optInt("bitrate", 0);
                                    if (!url.isEmpty() && bitrate > maxBitrate) {
                                        maxBitrate = bitrate;
                                        bestUrl = url;
                                    }
                                }
                            }
                            if (!bestUrl.isEmpty()) return bestUrl;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return "";
    }

    private static String tryPipedMirrors(String videoId) {
        String[] mirrors = {
                "https://pipedapi.kavin.rocks",
                "https://pa.il.ax",
                "https://pipedapi.tokhmi.xyz"
        };

        for (String mirror : mirrors) {
            try {
                Request request = new Request.Builder()
                        .url(mirror + "/streams/" + videoId)
                        .header("User-Agent", "Mozilla/5.0 (Linux; Android 14)")
                        .build();

                try (Response response = client.newCall(request).execute()) {
                    if (response.isSuccessful() && response.body() != null) {
                        JSONObject data = new JSONObject(response.body().string());
                        JSONArray audioStreams = data.optJSONArray("audioStreams");
                        if (audioStreams != null && audioStreams.length() > 0) {
                            String bestUrl = "";
                            int maxBitrate = 0;
                            for (int i = 0; i < audioStreams.length(); i++) {
                                JSONObject stream = audioStreams.getJSONObject(i);
                                String url = stream.optString("url", "");
                                int bitrate = stream.optInt("bitrate", 0);
                                if (!url.isEmpty() && bitrate > maxBitrate) {
                                    maxBitrate = bitrate;
                                    bestUrl = url;
                                }
                            }
                            if (!bestUrl.isEmpty()) return bestUrl;
                        }
                    }
                }
            } catch (Exception ignored) {}
        }
        return "";
    }

    private static String tryCobaltApi(String videoId) {
        try {
            JSONObject bodyJson = new JSONObject();
            bodyJson.put("url", "https://www.youtube.com/watch?v=" + videoId);
            bodyJson.put("downloadMode", "audio");
            bodyJson.put("audioFormat", "mp3");

            MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
            RequestBody body = RequestBody.create(bodyJson.toString(), mediaType);

            Request request = new Request.Builder()
                    .url("https://cobalt-api.kwiatekm.tokyo")
                    .post(body)
                    .addHeader("Accept", "application/json")
                    .addHeader("Content-Type", "application/json")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JSONObject data = new JSONObject(response.body().string());
                    return data.optString("url", "");
                }
            }
        } catch (Exception ignored) {}
        return "";
    }
}
