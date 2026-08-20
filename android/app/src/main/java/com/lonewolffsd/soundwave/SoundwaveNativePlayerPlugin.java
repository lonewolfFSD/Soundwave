package com.lonewolffsd.soundwave;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SoundwaveNativePlayer")
public class SoundwaveNativePlayerPlugin extends Plugin implements SoundwaveAudioService.PlaybackEventListener {

    @Override
    public void load() {
        super.load();
        startAndBindService();
        SoundwaveAudioService.setEventListener(this);
    }

    private void startAndBindService() {
        Context context = getContext();
        if (context != null) {
            Intent serviceIntent = new Intent(context, SoundwaveAudioService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }

    @PluginMethod
    public void play(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Audio URL is required");
            return;
        }

        String title = call.getString("title", "Unknown Title");
        String artist = call.getString("artist", "Unknown Artist");
        String album = call.getString("album", "");
        String artwork = call.getString("artwork", "");
        double positionSec = call.getDouble("position", 0.0);
        long startPosMs = Math.round(positionSec * 1000.0);

        startAndBindService();

        SoundwaveAudioService service = SoundwaveAudioService.getInstance();
        if (service != null) {
            service.play(url, title, artist, album, artwork, startPosMs);
            call.resolve();
        } else {
            // Give service a split-second to spin up if starting from cold
            getActivity().runOnUiThread(() -> {
                SoundwaveAudioService retryService = SoundwaveAudioService.getInstance();
                if (retryService != null) {
                    retryService.play(url, title, artist, album, artwork, startPosMs);
                    call.resolve();
                } else {
                    call.reject("Audio Service not ready yet");
                }
            });
        }
    }

    @PluginMethod
    public void pause(PluginCall call) {
        SoundwaveAudioService service = SoundwaveAudioService.getInstance();
        if (service != null) {
            service.pause();
        }
        call.resolve();
    }

    @PluginMethod
    public void resume(PluginCall call) {
        SoundwaveAudioService service = SoundwaveAudioService.getInstance();
        if (service != null) {
            service.resume();
        }
        call.resolve();
    }

    @PluginMethod
    public void seek(PluginCall call) {
        double positionSec = call.getDouble("position", 0.0);
        long positionMs = Math.round(positionSec * 1000.0);
        SoundwaveAudioService service = SoundwaveAudioService.getInstance();
        if (service != null) {
            service.seekTo(positionMs);
        }
        call.resolve();
    }

    @PluginMethod
    public void setVolume(PluginCall call) {
        float volume = call.getFloat("volume", 1.0f);
        SoundwaveAudioService service = SoundwaveAudioService.getInstance();
        if (service != null) {
            service.setVolume(volume);
        }
        call.resolve();
    }

    @PluginMethod
    public void getState(PluginCall call) {
        SoundwaveAudioService service = SoundwaveAudioService.getInstance();
        JSObject ret = new JSObject();
        if (service != null) {
            ret.put("isPlaying", service.isPlaying());
            ret.put("position", (double) service.getCurrentPosition() / 1000.0);
            ret.put("duration", (double) service.getDuration() / 1000.0);
        } else {
            ret.put("isPlaying", false);
            ret.put("position", 0);
            ret.put("duration", 0);
        }
        call.resolve(ret);
    }

    // --- SoundwaveAudioService.PlaybackEventListener Callbacks ---

    @Override
    public void onPlaybackStateChanged(boolean isPlaying) {
        JSObject data = new JSObject();
        data.put("isPlaying", isPlaying);
        notifyListeners("onPlaybackStateChange", data);
    }

    @Override
    public void onPositionDiscontinuity(long positionMs, long durationMs) {
        JSObject data = new JSObject();
        data.put("position", (double) positionMs / 1000.0);
        data.put("duration", (double) durationMs / 1000.0);
        notifyListeners("onPositionUpdate", data);
    }

    @Override
    public void onTrackEnded() {
        JSObject data = new JSObject();
        notifyListeners("onTrackEnd", data);
    }

    @Override
    public void onError(String message) {
        JSObject data = new JSObject();
        data.put("error", message);
        notifyListeners("onPlaybackError", data);
    }
}
