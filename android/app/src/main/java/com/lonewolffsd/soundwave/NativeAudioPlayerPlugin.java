package com.lonewolffsd.soundwave;

import android.content.Context;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "NativeAudioPlayer")
public class NativeAudioPlayerPlugin extends Plugin {

    private static final String TAG = "NativeAudioPlayer";
    private ExoPlayer player;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private Runnable progressRunnable;

    @Override
    public void load() {
        super.load();
        mainHandler.post(this::initPlayer);
    }

    private void initPlayer() {
        if (player != null) return;
        Context context = getContext();
        if (context == null) return;

        try {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                    .setUsage(C.USAGE_MEDIA)
                    .build();

            androidx.media3.datasource.DefaultHttpDataSource.Factory httpDataSourceFactory =
                    new androidx.media3.datasource.DefaultHttpDataSource.Factory()
                            .setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36")
                            .setAllowCrossProtocolRedirects(true)
                            .setConnectTimeoutMs(15000)
                            .setReadTimeoutMs(15000);

            androidx.media3.exoplayer.source.DefaultMediaSourceFactory mediaSourceFactory =
                    new androidx.media3.exoplayer.source.DefaultMediaSourceFactory(context)
                            .setDataSourceFactory(httpDataSourceFactory);

            player = new ExoPlayer.Builder(context)
                    .setMediaSourceFactory(mediaSourceFactory)
                    .setAudioAttributes(audioAttributes, true)
                    .setHandleAudioBecomingNoisy(true)
                    .setWakeMode(C.WAKE_MODE_NETWORK)
                    .build();

            player.addListener(new Player.Listener() {
                @Override
                public void onIsPlayingChanged(boolean isPlaying) {
                    JSObject data = new JSObject();
                    data.put("isPlaying", isPlaying);
                    data.put("playbackState", player != null ? player.getPlaybackState() : 0);
                    data.put("currentTime", player != null ? player.getCurrentPosition() / 1000.0 : 0);
                    data.put("duration", player != null && player.getDuration() > 0 ? player.getDuration() / 1000.0 : 0);
                    notifyListeners("onPlaybackStateChange", data);

                    if (isPlaying) {
                        startProgressTimer();
                    } else {
                        stopProgressTimer();
                    }
                }

                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    if (playbackState == Player.STATE_ENDED) {
                        stopProgressTimer();
                        notifyListeners("onTrackEnded", new JSObject());
                    }
                }

                @Override
                public void onPlayerError(androidx.media3.common.PlaybackException error) {
                    Log.e(TAG, "ExoPlayer playback error: " + error.getMessage(), error);
                    JSObject data = new JSObject();
                    data.put("error", error.getMessage());
                    notifyListeners("onError", data);
                }
            });
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize ExoPlayer: " + e.getMessage(), e);
        }
    }

    private void startProgressTimer() {
        stopProgressTimer();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (player != null && player.isPlaying()) {
                    JSObject data = new JSObject();
                    data.put("currentTime", player.getCurrentPosition() / 1000.0);
                    data.put("duration", player.getDuration() > 0 ? player.getDuration() / 1000.0 : 0);
                    notifyListeners("onTimeUpdate", data);
                    mainHandler.postDelayed(this, 500);
                }
            }
        };
        mainHandler.post(progressRunnable);
    }

    private void stopProgressTimer() {
        if (progressRunnable != null) {
            mainHandler.removeCallbacks(progressRunnable);
            progressRunnable = null;
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        String videoId = call.getString("videoId");
        String url = call.getString("url");
        String title = call.getString("title", "Soundwave Track");
        String artist = call.getString("artist", "Soundwave");
        String coverArt = call.getString("coverArt", "");
        Double positionSec = call.getDouble("position", 0.0);
        long startPosMs = positionSec != null ? (long) (positionSec * 1000) : 0;

        if ((url == null || url.isEmpty()) && (videoId == null || videoId.isEmpty())) {
            call.reject("Either videoId or URL is required");
            return;
        }

        initPlayer();

        if (url != null && !url.isEmpty()) {
            mainHandler.post(() -> playStream(url, title, artist, coverArt, startPosMs));
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            return;
        }

        executor.execute(() -> {
            try {
                String streamUrl = YouTubeStreamResolver.resolveAudioStream(videoId, title, artist);
                if (streamUrl != null && !streamUrl.isEmpty()) {
                    mainHandler.post(() -> playStream(streamUrl, title, artist, coverArt, startPosMs));
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } else {
                    call.reject("Failed to resolve audio stream");
                }
            } catch (Exception e) {
                Log.e(TAG, "Resolver error: " + e.getMessage(), e);
                call.reject("Resolver error: " + e.getMessage());
            }
        });
    }

    private void playStream(String url, String title, String artist, String coverArt, long startPosMs) {
        if (player == null) initPlayer();
        if (player == null) return;

        try {
            MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                    .setTitle(title != null ? title : "Soundwave Track")
                    .setArtist(artist != null ? artist : "Soundwave");

            if (coverArt != null && !coverArt.isEmpty() && coverArt.startsWith("http")) {
                metaBuilder.setArtworkUri(Uri.parse(coverArt));
            }

            MediaItem mediaItem = new MediaItem.Builder()
                    .setUri(Uri.parse(url))
                    .setMediaMetadata(metaBuilder.build())
                    .build();

            player.setMediaItem(mediaItem, startPosMs > 0 ? startPosMs : 0);
            player.prepare();
            player.play();
        } catch (Exception e) {
            Log.e(TAG, "Error playing stream: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        mainHandler.post(() -> {
            if (player != null) {
                player.pause();
                stopProgressTimer();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void resume(PluginCall call) {
        mainHandler.post(() -> {
            if (player != null) {
                player.play();
                startProgressTimer();
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Double positionSec = call.getDouble("position", 0.0);
        long posMs = positionSec != null ? (long) (positionSec * 1000) : 0;
        mainHandler.post(() -> {
            if (player != null) {
                player.seekTo(posMs);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volume = call.getDouble("volume", 1.0);
        mainHandler.post(() -> {
            if (player != null && volume != null) {
                player.setVolume(volume.floatValue());
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        });
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        if (player != null) {
            ret.put("isPlaying", player.isPlaying());
            ret.put("currentTime", player.getCurrentPosition() / 1000.0);
            ret.put("duration", player.getDuration() > 0 ? player.getDuration() / 1000.0 : 0);
        } else {
            ret.put("isPlaying", false);
            ret.put("currentTime", 0);
            ret.put("duration", 0);
        }
        call.resolve(ret);
    }

    @Override
    protected void handleOnDestroy() {
        stopProgressTimer();
        if (player != null) {
            player.release();
            player = null;
        }
        super.handleOnDestroy();
    }
}
