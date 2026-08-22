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
            .connectTimeout(6, TimeUnit.SECONDS)
            .readTimeout(8, TimeUnit.SECONDS)
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
        return resolveAudioStream(rawVideoId, "", "");
    }

    public static String resolveAudioStream(String rawVideoId, String title, String artist) {
        if (rawVideoId == null) rawVideoId = "";

        String videoId = rawVideoId.replace("yt_", "").trim();
        if (videoId.length() != 11) {
            String searchQuery = (title != null && !title.isEmpty()) ? (title + " " + (artist != null ? artist : "")) : rawVideoId;
            videoId = searchVideoId(searchQuery);
            if (videoId == null || videoId.length() != 11) {
                return "";
            }
        }

        CacheEntry entry = cache.get(videoId);
        if (entry != null && entry.isValid()) {
            return entry.url;
        }

        // ── 1. PRIMARY: ANDROID_VR (JS-less, PoToken-less unencrypted stream URLs) ──
        String streamUrl = tryAndroidVrClient(videoId);
        if (isValidStream(streamUrl)) {
            Log.d(TAG, "Resolved via ANDROID_VR: " + videoId);
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 2. SECONDARY: TVHTML5_SIMPLY_EMBEDDED_PLAYER ──
        streamUrl = tryTvEmbeddedClient(videoId);
        if (isValidStream(streamUrl)) {
            Log.d(TAG, "Resolved via TVHTML5: " + videoId);
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 3. TERTIARY: ANDROID_MUSIC client ──
        streamUrl = tryAndroidMusicClient(videoId);
        if (isValidStream(streamUrl)) {
            Log.d(TAG, "Resolved via ANDROID_MUSIC: " + videoId);
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 4. QUATERNARY: Invidious Instances ──
        streamUrl = tryInvidiousMirrors(videoId);
        if (isValidStream(streamUrl)) {
            Log.d(TAG, "Resolved via Invidious: " + videoId);
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 5. QUINARY: Piped Instances ──
        streamUrl = tryPipedMirrors(videoId);
        if (isValidStream(streamUrl)) {
            Log.d(TAG, "Resolved via Piped: " + videoId);
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        // ── 6. SENARY: Cobalt API ──
        streamUrl = tryCobaltApi(videoId);
        if (isValidStream(streamUrl)) {
            Log.d(TAG, "Resolved via Cobalt: " + videoId);
            cache.put(videoId, new CacheEntry(streamUrl));
            return streamUrl;
        }

        Log.w(TAG, "All stream resolution strategies failed for: " + videoId);
        return "";
    }

    private static boolean isValidStream(String url) {
        return url != null && url.startsWith("http") && url.length() > 25;
    }

    private static String tryAndroidVrClient(String videoId) {
        try {
            JSONObject clientContext = new JSONObject();
            clientContext.put("clientName", "ANDROID_VR");
            clientContext.put("clientVersion", "1.65.10");
            clientContext.put("androidSdkVersion", 32);
            clientContext.put("userAgent", "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip");
            clientContext.put("hl", "en");
            clientContext.put("gl", "US");

            JSONObject device = new JSONObject();
            device.put("deviceMake", "Oculus");
            device.put("deviceModel", "Quest 3");

            JSONObject context = new JSONObject();
            context.put("client", clientContext);
            context.put("device", device);

            JSONObject bodyJson = new JSONObject();
            bodyJson.put("videoId", videoId);
            bodyJson.put("context", context);

            MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
            RequestBody body = RequestBody.create(bodyJson.toString(), mediaType);

            Request request = new Request.Builder()
                    .url("https://www.youtube.com/youtubei/v1/player?prettyPrint=false")
                    .post(body)
                    .addHeader("User-Agent", "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("X-YouTube-Client-Name", "28")
                    .addHeader("X-YouTube-Client-Version", "1.65.10")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String jsonStr = response.body().string();
                    JSONObject data = new JSONObject(jsonStr);
                    return extractBestAudioFormat(data);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "ANDROID_VR resolution error: " + e.getMessage());
        }
        return "";
    }

    private static String tryTvEmbeddedClient(String videoId) {
        try {
            JSONObject clientContext = new JSONObject();
            clientContext.put("clientName", "TVHTML5_SIMPLY_EMBEDDED_PLAYER");
            clientContext.put("clientVersion", "2.0");
            clientContext.put("clientScreen", "WATCH");
            clientContext.put("hl", "en");

            JSONObject thirdParty = new JSONObject();
            thirdParty.put("embedUrl", "https://www.youtube.com/");

            JSONObject context = new JSONObject();
            context.put("client", clientContext);
            context.put("thirdParty", thirdParty);

            JSONObject bodyJson = new JSONObject();
            bodyJson.put("videoId", videoId);
            bodyJson.put("context", context);
            bodyJson.put("racyCheckOk", true);
            bodyJson.put("contentCheckOk", true);

            MediaType mediaType = MediaType.parse("application/json; charset=utf-8");
            RequestBody body = RequestBody.create(bodyJson.toString(), mediaType);

            Request request = new Request.Builder()
                    .url("https://www.youtube.com/youtubei/v1/player?prettyPrint=false")
                    .post(body)
                    .addHeader("User-Agent", "Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1")
                    .addHeader("Content-Type", "application/json")
                    .addHeader("X-YouTube-Client-Name", "85")
                    .addHeader("X-YouTube-Client-Version", "2.0")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    String jsonStr = response.body().string();
                    JSONObject data = new JSONObject(jsonStr);
                    return extractBestAudioFormat(data);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "TVHTML5 resolution error: " + e.getMessage());
        }
        return "";
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
            Log.w(TAG, "Android Music client resolution error: " + e.getMessage());
        }
        return "";
    }

    private static String extractBestAudioFormat(JSONObject data) {
        try {
            JSONObject streamingData = data.optJSONObject("streamingData");
            if (streamingData == null) return "";

            JSONArray adaptiveFormats = streamingData.optJSONArray("adaptiveFormats");
            if (adaptiveFormats == null || adaptiveFormats.length() == 0) {
                JSONArray formats = streamingData.optJSONArray("formats");
                if (formats != null && formats.length() > 0) {
                    adaptiveFormats = formats;
                } else {
                    return "";
                }
            }

            String bestUrl = "";
            int maxBitrate = 0;

            for (int i = 0; i < adaptiveFormats.length(); i++) {
                JSONObject format = adaptiveFormats.getJSONObject(i);
                String mimeType = format.optString("mimeType", "");
                String url = format.optString("url", "");

                if (url.isEmpty()) {
                    String cipher = format.optString("signatureCipher", format.optString("cipher", ""));
                    if (!cipher.isEmpty()) {
                        for (String part : cipher.split("&")) {
                            if (part.startsWith("url=")) {
                                try {
                                    url = java.net.URLDecoder.decode(part.substring(4), "UTF-8");
                                } catch (Exception ignored) {}
                                break;
                            }
                        }
                    }
                }

                int bitrate = format.optInt("bitrate", 0);

                if (!url.isEmpty() && (mimeType.startsWith("audio/") || mimeType.contains("audio"))) {
                    if (bitrate > maxBitrate) {
                        maxBitrate = bitrate;
                        bestUrl = url;
                    }
                }
            }

            // If no audio-only format had direct URL, check any format with direct URL
            if (bestUrl.isEmpty()) {
                for (int i = 0; i < adaptiveFormats.length(); i++) {
                    JSONObject format = adaptiveFormats.getJSONObject(i);
                    String url = format.optString("url", "");
                    if (url.isEmpty()) {
                        String cipher = format.optString("signatureCipher", format.optString("cipher", ""));
                        if (!cipher.isEmpty()) {
                            for (String part : cipher.split("&")) {
                                if (part.startsWith("url=")) {
                                    try {
                                        url = java.net.URLDecoder.decode(part.substring(4), "UTF-8");
                                    } catch (Exception ignored) {}
                                    break;
                                }
                            }
                        }
                    }
                    if (!url.isEmpty()) {
                        bestUrl = url;
                        break;
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
                                String url = format.optString("url", "");
                                int bitrate = format.optInt("bitrate", 0);
                                if (!url.isEmpty() && (type.startsWith("audio/") || type.contains("audio"))) {
                                    if (bitrate > maxBitrate) {
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

    public static String searchVideoId(String query) {
        if (query == null || query.isEmpty()) return "";
        try {
            String url = "https://pa.il.ax/search?q=" + java.net.URLEncoder.encode(query, "UTF-8") + "&filter=music_songs";
            Request request = new Request.Builder()
                    .url(url)
                    .header("User-Agent", "Mozilla/5.0 (Linux; Android 14)")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JSONObject data = new JSONObject(response.body().string());
                    JSONArray items = data.optJSONArray("items");
                    if (items != null && items.length() > 0) {
                        for (int i = 0; i < items.length(); i++) {
                            JSONObject item = items.getJSONObject(i);
                            String itemUrl = item.optString("url", "");
                            if (itemUrl.contains("v=")) {
                                return itemUrl.substring(itemUrl.indexOf("v=") + 2).split("&")[0];
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {}

        try {
            String url = "https://inv.nadeko.net/api/v1/search?q=" + java.net.URLEncoder.encode(query, "UTF-8") + "&type=video";
            Request request = new Request.Builder()
                    .url(url)
                    .header("User-Agent", "Mozilla/5.0 (Linux; Android 14)")
                    .build();

            try (Response response = client.newCall(request).execute()) {
                if (response.isSuccessful() && response.body() != null) {
                    JSONArray items = new JSONArray(response.body().string());
                    if (items.length() > 0) {
                        return items.getJSONObject(0).optString("videoId", "");
                    }
                }
            }
        } catch (Exception ignored) {}

        return "";
    }
}
