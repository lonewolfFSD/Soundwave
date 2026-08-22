package com.lonewolffsd.soundwave;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeAudioPlayer")
public class NativeAudioPlayerPlugin extends Plugin {

    private SoundwaveMediaService mediaService;
    private boolean isBound = false;
    private final Handler progressHandler = new Handler(Looper.getMainLooper());
    private Runnable progressRunnable;

    private final ServiceConnection serviceConnection = new ServiceConnection() {
        @Override
        public void onServiceConnected(ComponentName name, IBinder service) {
            SoundwaveMediaService.LocalBinder binder = (SoundwaveMediaService.LocalBinder) service;
            mediaService = binder.getService();
            isBound = true;

            mediaService.setEventListener(new SoundwaveMediaService.PlayerEventListener() {
                @Override
                public void onPlaybackStateChanged(boolean isPlaying, int playbackState) {
                    JSObject data = new JSObject();
                    data.put("isPlaying", isPlaying);
                    data.put("playbackState", playbackState);
                    data.put("currentTime", mediaService != null ? mediaService.getCurrentPosition() / 1000.0 : 0);
                    data.put("duration", mediaService != null ? mediaService.getDuration() / 1000.0 : 0);
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

        @Override
        public void onServiceDisconnected(ComponentName name) {
            mediaService = null;
            isBound = false;
            stopProgressTimer();
        }
    };

    @Override
    public void load() {
        super.load();
        bindMediaService();
    }

    private void bindMediaService() {
        Context context = getContext();
        if (context != null) {
            Intent intent = new Intent(context, SoundwaveMediaService.class);
            context.startService(intent);
            context.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
        }
    }

    private void startProgressTimer() {
        stopProgressTimer();
        progressRunnable = new Runnable() {
            @Override
            public void run() {
                if (mediaService != null && mediaService.isPlaying()) {
                    JSObject data = new JSObject();
                    data.put("currentTime", mediaService.getCurrentPosition() / 1000.0);
                    data.put("duration", mediaService.getDuration() / 1000.0);
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

        if (mediaService != null) {
            mediaService.playTrack(videoId, url, title, artist, coverArt, startPosMs);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } else {
            bindMediaService();
            new Handler(Looper.getMainLooper()).postDelayed(() -> {
                if (mediaService != null) {
                    mediaService.playTrack(videoId, url, title, artist, coverArt, startPosMs);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    call.resolve(ret);
                } else {
                    call.reject("MediaService not ready");
                }
            }, 300);
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        if (mediaService != null) {
            mediaService.pause();
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
        if (mediaService != null) {
            mediaService.resume();
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

        if (mediaService != null) {
            mediaService.seekTo(posMs);
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
        if (mediaService != null && volume != null) {
            mediaService.setVolume(volume.floatValue());
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
        if (mediaService != null) {
            ret.put("isPlaying", mediaService.isPlaying());
            ret.put("currentTime", mediaService.getCurrentPosition() / 1000.0);
            ret.put("duration", mediaService.getDuration() / 1000.0);
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
        if (isBound && getContext() != null) {
            try {
                getContext().unbindService(serviceConnection);
            } catch (Exception ignored) {}
            isBound = false;
        }
        super.handleOnDestroy();
    }
}
