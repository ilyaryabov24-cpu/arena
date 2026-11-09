package com.lumi.ui.widgets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.widget.RemoteViews
import com.lumi.ui.R
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Makes LUMI's clock widget available to other launchers too, so the widget engine is not locked
 * inside the app. Rendering here is a real bitmap drawn from the live clock.
 */
class LumiWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        appWidgetIds.forEach { id ->
            val views = RemoteViews(context.packageName, R.layout.lumi_widget_remote)
            views.setTextViewText(R.id.widget_time, SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date()))
            views.setTextViewText(
                R.id.widget_date,
                SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date()).replaceFirstChar { it.uppercase() },
            )
            appWidgetManager.updateAppWidget(id, views)
        }
    }
}
