package com.lumi.ui.home

import android.app.Activity
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.lumi.ui.settings.SettingsScreen

/** Maps a route name to its studio screen. */
@Composable
fun StudioRouter(route: String, activity: Activity, onOpenLauncher: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        SettingsScreen(activity = activity, onOpenLauncher = onOpenLauncher)
    }
}
