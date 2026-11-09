package com.lumi.ui.widgets

import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetHostView
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProviderInfo
import android.content.Context
import android.os.Build
import android.util.Log
import android.view.View
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.data.AppInfo

/**
 * Hosts a genuine third-party Android widget via AppWidgetHost. The widget keeps its own
 * interactivity, updates and resizing — it is not a screenshot.
 */
@Composable
fun SystemWidgetHostView(
    widgetId: Int,
    host: AppWidgetHost,
    spanX: Int,
    spanY: Int,
    modifier: Modifier = Modifier,
    cellWidthDp: Dp = 88.dp,
    cellHeightDp: Dp = 88.dp,
) {
    val context = LocalContext.current
    val manager = remember { AppWidgetManager.getInstance(context) }
    var view by remember(widgetId) { mutableStateOf<AppWidgetHostView?>(null) }
    var info by remember(widgetId) { mutableStateOf<AppWidgetProviderInfo?>(null) }

    LaunchedEffect(widgetId) {
        info = manager.getAppWidgetInfo(widgetId)
        if (view == null) {
            view = runCatching { host.createView(context, widgetId, info) }.getOrNull()
        }
    }

    DisposableEffect(widgetId) {
        onDispose { }
    }

    val widthDp = cellWidthDp * spanX
    val heightDp = cellHeightDp * spanY

    Box(modifier.fillMaxWidth().height(heightDp), contentAlignment = Alignment.Center) {
        view?.let { hostView ->
            AndroidView(
                factory = { ctx ->
                    (hostView.parent as? android.view.ViewGroup)?.removeView(hostView)
                    hostView.layoutParams = android.view.ViewGroup.LayoutParams(
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                        android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    runCatching {
                        host.updateAppWidgetOptions(
                            widgetId,
                            android.os.Bundle().apply {
                                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, (widthDp.value * 2).toInt())
                                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, (heightDp.value * 2).toInt())
                                putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, (widthDp.value * 2).toInt())
                                putInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, (heightDp.value * 2).toInt())
                            },
                        )
                    }
                    hostView
                },
                update = { v ->
                    runCatching {
                        host.updateAppWidgetOptions(
                            widgetId,
                            android.os.Bundle().apply {
                                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, (widthDp.value * 2).toInt())
                                putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, (heightDp.value * 2).toInt())
                            },
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth().height(heightDp),
            )
        }
    }
}

/** Lists the widgets offered by installed packages so LUMI can bind them. */
fun availableSystemWidgets(context: Context, apps: List<AppInfo>): List<Triple<String, AppWidgetProviderInfo, AppInfo?>> {
    val manager = AppWidgetManager.getInstance(context)
    return runCatching {
        manager.installedProviders.mapNotNull { info ->
            val pkg = info.provider.packageName
            Triple(info.label.ifBlank { pkg }, info, apps.firstOrNull { it.packageName == pkg })
        }
    }.getOrDefault(emptyList())
}
