package com.lonewolffsd.soundwave;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import androidx.annotation.Nullable;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

public class SoundwaveAudioService extends MediaSessionService {

    public interface PlaybackEventListener {
        void onPlaybackStateChanged(boolean isPlaying);
        void onPositionDiscontinuity(long positionMs, long durationMs);
        void onTrackEnded();
        void onError(String message);
    }

    private static SoundwaveAudioService instance;
    private static PlaybackEventListener eventListener;

    private ExoPlayer player;
    private MediaSession mediaSession;

    public static SoundwaveAudioService getInstance() {
        return instance;
    }

    public static void setEventListener(PlaybackEventListener listener) {
        eventListener = listener;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;

        // Configure audio attributes for music playback & auto audio-focus handling
        AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
                .setUsage(C.USAGE_MEDIA)
                .build();

        player = new ExoPlayer.Builder(this)
                .setAudioAttributes(audioAttributes, /* handleAudioFocus= */ true)
                .setHandleAudioBecomingNoisy(true)
                .setWakeMode(C.WAKE_MODE_NETWORK)
                .build();

        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (eventListener != null) {
                    eventListener.onPlaybackStateChanged(isPlaying);
                }
            }

            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (playbackState == Player.STATE_ENDED) {
                    if (eventListener != null) {
                        eventListener.onTrackEnded();
                    }
                }
            }
        });

        // Intent to open MainActivity when the notification is tapped
        Intent sessionActivityIntent = new Intent(this, MainActivity.class);
        PendingIntent sessionActivityPendingIntent = PendingIntent.getActivity(
                this,
                0,
                sessionActivityIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        mediaSession = new MediaSession.Builder(this, player)
                .setSessionActivity(sessionActivityPendingIntent)
                .build();
    }

    @Nullable
    @Override
    public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo) {
        return mediaSession;
    }

    // --- Playback Control Methods for Native Plugin ---

    public void play(String url, String title, String artist, String album, String artworkUrl, long startPositionMs) {
        if (player == null) return;

        MediaMetadata.Builder metaBuilder = new MediaMetadata.Builder()
                .setTitle(title != null ? title : "Unknown Title")
                .setArtist(artist != null ? artist : "Unknown Artist")
                .setAlbumTitle(album != null ? album : "");

        if (artworkUrl != null && !artworkUrl.isEmpty()) {
            metaBuilder.setArtworkUri(Uri.parse(artworkUrl));
        }

        MediaItem mediaItem = new MediaItem.Builder()
                .setUri(Uri.parse(url))
                .setMediaMetadata(metaBuilder.build())
                .build();

        player.setMediaItem(mediaItem);
        player.prepare();
        if (startPositionMs > 0) {
            player.seekTo(startPositionMs);
        }
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
            player.setVolume(Math.max(0f, Math.min(1f, volume)));
        }
    }

    public boolean isPlaying() {
        return player != null && player.isPlaying();
    }

    public long getCurrentPosition() {
        return player != null ? player.getCurrentPosition() : 0;
    }

    public long getDuration() {
        return player != null ? player.getDuration() : 0;
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
        instance = null;
        super.onDestroy();
    }
}
