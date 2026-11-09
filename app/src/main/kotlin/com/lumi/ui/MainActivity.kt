package com.lumi.ui

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.Color
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.i18n.LumiLang
import com.lumi.ui.core.i18n.LocalLang
import com.lumi.ui.core.ui.LumiTheme
import androidx.compose.runtime.CompositionLocalProvider
import com.lumi.ui.home.LumiShell

/**
 * Entry point of the LUMI studio. One activity hosts the whole configuration experience with a
 * stable navigation model so every screen keeps its scroll position and editing state.
 */
class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = LumiApp.of(this)
        applyStatusBarIcons(app)

        val startRoute = intent.getStringExtra(EXTRA_ROUTE)

        setContent {
            val settings by app.settings.state.collectAsState()
            val lang = runCatching { LumiLang.valueOf(settings.language.uppercase()) }.getOrDefault(LumiLang.SYSTEM)
            LumiTheme(
                accent = Color(settings.accent.toInt()),
                dark = settings.darkTheme,
            ) {
                CompositionLocalProvider(LocalLang provides lang) {
                    LumiShell(
                        activity = this,
                        startRoute = startRoute,
                        onOpenLauncher = { openLauncher() },
                        onRequestDefaultHome = { requestDefaultHome() },
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // The tile and gesture shortcuts pass a route; the shell observes this through the intent.
        setIntent(intent)
    }

    private fun applyStatusBarIcons(app: LumiApp) {
        val dark = app.settings.state.value.darkTheme
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.setSystemBarsAppearance(
                if (dark) 0 else android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
            )
        }
    }

    fun openLauncher() {
        val intent = Intent(this, com.lumi.ui.launcher.LauncherActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        startActivity(intent)
    }

    fun requestDefaultHome() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val intent = Intent(Settings.ACTION_HOME_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            runCatching { startActivity(intent) }.onFailure {
                startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
            }
        } else {
            startActivity(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME))
        }
    }

    /** Opens the system live wallpaper preview for LUMI's own WallpaperService. */
    fun previewLiveWallpaper() {
        val intent = Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER).apply {
            putExtra(
                android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                android.content.ComponentName(this@MainActivity, com.lumi.ui.livewallpaper.LumiWallpaperService::class.java),
            )
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        runCatching { startActivity(intent) }.onFailure {
            runCatching {
                startActivity(
                    Intent(android.app.WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)
                        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                )
            }
        }
    }

    companion object {
        const val EXTRA_ROUTE = "route"
    }
}
