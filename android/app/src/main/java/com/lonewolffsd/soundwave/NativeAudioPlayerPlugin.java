package com.lonewolffsd.soundwave;

import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAudioPlayer")
public class NativeAudioPlayerPlugin extends Plugin {

    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private Runnable progressRunnable;

    @Override
    public void load() {
        super.load();
        ensureServiceStarted();
    }

    private void ensureServiceStarted() {
        Context context = getContext();
        if (context != null && SoundwaveMediaService.getInstance() == null) {
            try {
                Intent intent = new Intent(context, SoundwaveMediaService.class);
                context.startService(intent);
            } catch (Exception ignored) {}
        }
        setupServiceListener();
    }

    private void setupServiceListener() {
        SoundwaveMediaService service = SoundwaveMediaService.getInstance();
        if (service != null) {
            service.setEventListener(new SoundwaveMediaService.PlayerEventListener() {
                @Override
                public void onPlaybackStateChanged(boolean isPlaying, int playbackState) {
                    JSObject data = new JSObject();
                    data.put("isPlaying", isPlaying);
                    data.put("playbackState", playbackState);
                    data.put("currentTime", service.getCurrentPosition() / 1000.0);
                    data.put("duration", service.getDuration() / 1000.0);
                    notifyListeners("onPlaybackStateChange", data);

                    if (isPlaying) {
                        startProgressTimer();
                    } else {
                        stopProgressTimer();
                    }
                }

                @Override
                public void onPositionDiscontinuity(long currentPositionMs, long durationMs) {
                    JSObject data = new JSObject();
                    data.put("currentTime", currentPositionMs / 1000.0);
                    data.put("duration", durationMs / 1000.0);
                    notifyListeners("onTimeUpdate", data);
                }

                @Override
                public void onTrackEnded() {
                    stopProgressTimer();
                    JSObject data = new JSObject();
                    notifyListeners("onTrackEnded", data);
                }

                @Override
                public void onError(String message) {
                    JSObject data = new JSObject();
                    data.put("error", message);
                    notifyListeners("onError", data);
                }
            });
        }
    }

    private void startProgressTimer() {
        stopProgressTimer();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                SoundwaveMediaService service = SoundwaveMediaService.getInstance();
                if (service != null && service.isPlaying()) {
                    JSObject data = new JSObject();
                    data.put("currentTime", service.getCurrentPosition() / 1000.0);
                    data.put("duration", service.getDuration() / 1000.0);
                    notifyListeners("onTimeUpdate", data);
                    progressHandler.postDelayed(this, 500);
                }
            }
        };
        progressHandler.post(progressRunnable);
    }

    private void stopProgressTimer() {
        if (progressRunnable != null) {
            progressHandler.removeCallbacks(progressRunnable);
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

        Context context = getContext();
        if (SoundwaveMediaService.getInstance() == null && context != null) {
            try {
                Intent intent = new Intent(context, SoundwaveMediaService.class);
                context.startService(intent);
            } catch (Exception ignored) {}
        }

        new Handler(Looper.getMainLooper()).postDelayed(() -> {
            SoundwaveMediaService service = SoundwaveMediaService.getInstance();
            if (service != null) {
                setupServiceListener();
                service.playTrack(videoId, url, title, artist, coverArt, startPosMs);
                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } else {
                call.reject("MediaService initializing, please retry");
            }
        }, 150);
    }

    @PluginMethod
    public void pause(PluginCall call) {
        SoundwaveMediaService service = SoundwaveMediaService.getInstance();
        if (service != null) {
            service.pause();
            stopProgressTimer();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("MediaService not available");
        }
    }

    @PluginMethod
    public void resume(PluginCall call) {
        SoundwaveMediaService service = SoundwaveMediaService.getInstance();
        if (service != null) {
            service.resume();
            startProgressTimer();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("MediaService not available");
        }
    }

    @PluginMethod
    public void seekTo(PluginCall call) {
        Double positionSec = call.getDouble("position", 0.0);
        long posMs = positionSec != null ? (long) (positionSec * 1000) : 0;

        SoundwaveMediaService service = SoundwaveMediaService.getInstance();
        if (service != null) {
            service.seekTo(posMs);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("MediaService not available");
        }
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        Double volume = call.getDouble("volume", 1.0);
        SoundwaveMediaService service = SoundwaveMediaService.getInstance();
        if (service != null && volume != null) {
            service.setVolume(volume.floatValue());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            call.reject("MediaService not available");
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        SoundwaveMediaService service = SoundwaveMediaService.getInstance();
        if (service != null) {
            ret.put("isPlaying", service.isPlaying());
            ret.put("currentTime", service.getCurrentPosition() / 1000.0);
            ret.put("duration", service.getDuration() / 1000.0);
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
        super.handleOnDestroy();
    }
}
