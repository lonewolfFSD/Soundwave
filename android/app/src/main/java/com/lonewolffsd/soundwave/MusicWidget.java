package com.lonewolffsd.soundwave;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class MusicWidget extends AppWidgetProvider {

    public static final String ACTION_WIDGET_PLAY_PAUSE = "com.lonewolffsd.soundwave.ACTION_WIDGET_PLAY_PAUSE";
    public static final String ACTION_WIDGET_NEXT = "com.lonewolffsd.soundwave.ACTION_WIDGET_NEXT";
    public static final String ACTION_WIDGET_PREV = "com.lonewolffsd.soundwave.ACTION_WIDGET_PREV";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.music_widget);

        // Intent to open App when clicking the widget art/text
        Intent intent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_album_art, pendingIntent);
        views.setOnClickPendingIntent(R.id.widget_title, pendingIntent);

        // Control Intents
        views.setOnClickPendingIntent(R.id.widget_play_pause, getPendingSelfIntent(context, ACTION_WIDGET_PLAY_PAUSE));
        views.setOnClickPendingIntent(R.id.widget_next, getPendingSelfIntent(context, ACTION_WIDGET_NEXT));
        views.setOnClickPendingIntent(R.id.widget_prev, getPendingSelfIntent(context, ACTION_WIDGET_PREV));

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static PendingIntent getPendingSelfIntent(Context context, String action) {
        Intent intent = new Intent(context, MusicWidget.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, 0, intent, PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);

        String action = intent.getAction();
        if (action == null) return;

        // Map widget actions to Capacitor bridge events
        String capacitorEvent = "";
        switch (action) {
            case ACTION_WIDGET_PLAY_PAUSE:
                capacitorEvent = "onWidgetPlayPause";
                break;
            case ACTION_WIDGET_NEXT:
                capacitorEvent = "onWidgetNext";
                break;
            case ACTION_WIDGET_PREV:
                capacitorEvent = "onWidgetPrev";
                break;
        }

        if (!capacitorEvent.isEmpty()) {
            // This is complex because we need the bridge instance. 
            // For now, we will broadcast to the system, and MainActivity will catch it if alive.
            Intent bridgeIntent = new Intent("com.lonewolffsd.soundwave.WIDGET_CONTROL");
            bridgeIntent.putExtra("action", capacitorEvent);
            context.sendBroadcast(bridgeIntent);
        }
    }
}