package com.lonewolffsd.soundwave;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Binder;
import android.os.IBinder;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

@UnstableApi
public class SoundwaveMediaService extends MediaSessionService {

    public interface PlayerEventListener {
        void onPlaybackStateChanged(boolean isPlaying, int playbackState);
        void onPositionDiscontinuity(long currentPositionMs, long durationMs);
        void onTrackEnded();
        void onError(String message);
    }

    private final IBinder binder = new LocalBinder();
    private ExoPlayer player;
    private MediaSession mediaSession;
    private PlayerEventListener eventListener;

    public class LocalBinder extends Binder {
        public SoundwaveMediaService getService() {
            return SoundwaveMediaService.this;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();

        // 1. Initialize ExoPlayer with AudioAttributes for Music & Automatic Audio Focus
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .setUsage(C.USAGE_MEDIA)
                .build();

        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, true)
                .setHandleAudioBecomingNoisy(true)
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build();

        // 2. Set Up MediaSession with PendingIntent back to MainActivity
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(pendingIntent)
                .build();

        // 3. Player Listener
        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (eventListener != null) {
                    eventListener.onPlaybackStateChanged(isPlaying, player.getPlaybackState());
                }
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (eventListener != null) {
                    eventListener.onPlaybackStateChanged(player.isPlaying(), playbackState);
                    if (playbackState == Player.STATE_ENDED) {
                        eventListener.onTrackEnded();
                    }
                }
            }

            @Override
            public void onPositionDiscontinuity(
                    Player.PositionInfo oldPosition,
                    Player.PositionInfo newPosition,
                    int reason
            ) {
                if (eventListener != null) {
                    eventListener.onPositionDiscontinuity(player.getCurrentPosition(), player.getDuration());
                }
            }
        });
    }

    public void setEventListener(PlayerEventListener listener) {
        this.eventListener = listener;
    }

    private final java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newSingleThreadExecutor();

    public void playTrack(String videoId, String url, String title, String artist, String coverArt, long startPosMs) {
        if (url != null && !url.isEmpty()) {
            playMedia(url, title, artist, coverArt, startPosMs);
            return;
        }

        if (videoId != null && !videoId.isEmpty()) {
            executor.execute(() -> {
                String streamUrl = YouTubeStreamResolver.resolveAudioStream(videoId);
                if (streamUrl != null && !streamUrl.isEmpty()) {
                    new android.os.Handler(android.os.Looper.getMainLooper()).post(() -> {
                        playMedia(streamUrl, title, artist, coverArt, startPosMs);
                    });
                } else {
                    if (eventListener != null) {
                        eventListener.onError("Failed to resolve audio stream for: " + videoId);
                    }
                }
            });
        }
    }

    public void playMedia(String url, String title, String artist, String coverArt, long startPosMs) {
        if (player == null || url == null || url.isEmpty()) return;

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
    }

    public void pause() {
        if (player != null) {
            player.pause();
        }
    }

    public void resume() {
        if (player != null) {
            player.play();
        }
    }

    public void seekTo(long positionMs) {
        if (player != null) {
            player.seekTo(positionMs);
        }
    }

    public void setVolume(float volume) {
        if (player != null) {
            player.setVolume(Math.max(0.0f, Math.min(1.0f, volume)));
        }
    }

    public long getCurrentPosition() {
        return player != null ? player.getCurrentPosition() : 0;
    }

    public long getDuration() {
        return player != null && player.getDuration() > 0 ? player.getDuration() : 0;
    }

    public boolean isPlaying() {
        return player != null && player.isPlaying();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        super.onBind(intent);
        return binder;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.release();
            mediaSession = null;
        }
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }
}
