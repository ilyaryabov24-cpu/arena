package com.lumi.ui.launcher

import android.app.ActivityOptions
import android.app.WallpaperManager
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.lumi.ui.MainActivity
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.model.PerfProfile
import com.lumi.ui.core.ui.LumiTheme
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * The real home screen. Declared with the HOME intent filter in the manifest, so Android can pick it
 * as the default launcher. It renders the whole desktop, dock, drawer, control panel and its own
 * notification centre.
 */
class LauncherActivity : ComponentActivity() {

    private lateinit var app: LumiApp
    lateinit var viewModel: LauncherViewModel
        private set

    var widgetHost: AppWidgetHost? = null
        private set

    var requestAppWidgetId = 0
        private set

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        app = LumiApp.of(this)
        viewModel = ViewModelProvider(this, LauncherViewModel.factory(app))[LauncherViewModel::class.java]

        widgetHost = AppWidgetHost(this, WIDGET_HOST_ID).also { it.startListening() }

        // Keep the launcher alive and reactive to package changes
        lifecycleScope.launch {
            app.apps.refresh()
        }

        setContent {
            val settings by viewModel.settings.collectAsState()
            LumiTheme(
                accent = androidx.compose.ui.graphics.Color(settings.accent.toInt()),
                dark = settings.darkTheme,
            ) {
                LauncherScreen(
                    viewModel = viewModel,
                    activity = this@LauncherActivity,
                    onOpenStudio = { route -> openStudio(route) },
                    onPickWidget = { onPicked -> pickSystemWidget(onPicked) },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // A tap on the launcher's own icon should never spawn a second home screen.
        viewModel.closeOverlay()
    }

    override fun onStart() {
        super.onStart()
        widgetHost?.startListening()
    }

    override fun onStop() {
        super.onStop()
        widgetHost?.stopListening()
    }

    override fun onDestroy() {
        widgetHost?.stopListening()
        super.onDestroy()
    }

    private fun openStudio(route: String) {
        val intent = Intent(this, MainActivity::class.java).putExtra(MainActivity.EXTRA_ROUTE, route)
        startActivity(intent)
    }

    fun pickSystemWidget(onPicked: (Int) -> Unit) {
        val host = widgetHost ?: return
        val id = host.allocateAppWidgetId()
        requestAppWidgetId = id
        pendingWidgetCallback = onPicked
        val manager = AppWidgetManager.getInstance(this)
        val intent = Intent(AppWidgetManager.ACTION_APPWIDGET_PICK).apply {
            putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            putExtra("appWidgetIds", IntArray(0))
            setPackage("com.android.settings")
        }
        try {
            startActivityForResult(intent, REQ_PICK_WIDGET)
        } catch (e: ActivityNotFoundException) {
            val fallback = Intent(AppWidgetManager.ACTION_APPWIDGET_PICK).apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            }
            try {
                startActivityForResult(fallback, REQ_PICK_WIDGET)
            } catch (t: Throwable) {
                val bindIntent = Intent(AppWidgetManager.ACTION_APPWIDGET_BIND).apply {
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
                }
                try {
                    startActivityForResult(bindIntent, REQ_BIND_WIDGET)
                } catch (ignored: Throwable) {
                    viewModel.showToast("This device does not expose the widget picker")
                    host.deleteAppWidgetId(id)
                }
            }
        }
    }

    private var pendingWidgetCallback: ((Int) -> Unit)? = null

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQ_PICK_WIDGET || requestCode == REQ_BIND_WIDGET) {
            val id = data?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, requestAppWidgetId) ?: requestAppWidgetId
            if (resultCode == RESULT_OK) {
                val bound = data?.getBooleanExtra(AppWidgetManager.EXTRA_APPWIDGET_BIND, false) == true
                if (bound || requestCode == REQ_PICK_WIDGET) {
                    pendingWidgetCallback?.invoke(id)
                } else {
                    widgetHost?.deleteAppWidgetId(id)
                }
            } else {
                widgetHost?.deleteAppWidgetId(id)
            }
            pendingWidgetCallback = null
        }
    }

    companion object {
        private const val WIDGET_HOST_ID = 0x1A2B
        private const val REQ_PICK_WIDGET = 0x301
        private const val REQ_BIND_WIDGET = 0x302
    }
}
