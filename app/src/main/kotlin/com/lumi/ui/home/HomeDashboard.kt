package com.lumi.ui.home

import android.app.Activity
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Animation
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Brush
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Gesture
import androidx.compose.material.icons.rounded.GridView
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Lock
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Palette
import androidx.compose.material.icons.rounded.PlayCircle
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Straighten
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material.icons.rounded.Widgets
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush as GradientBrush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.ui.GlassCard
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.core.ui.PrimaryButton
import com.lumi.ui.core.ui.GhostButton
import com.lumi.ui.core.ui.SectionHeader
import com.lumi.ui.launcher.LauncherActivity
import java.util.Calendar

/**
 * The dashboard: a live, interactive phone mock-up of the current configuration plus fast access to
 * every studio. Nothing here is a static screenshot — the preview renders the real settings tree.
 */
@Composable
fun HomeDashboard(
    activity: Activity,
    onOpenLauncher: () -> Unit,
    onRequestDefaultHome: () -> Unit,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val settings by collectAsStateWithLifecycle(app.settings.state)
    val apps by collectAsStateWithLifecycle(app.apps.apps)
    val nav = LocalShellRoutes.current
    var isDefault by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        isDefault = runCatching {
            val intent = android.content.Intent(android.content.Intent.ACTION_MAIN)
                .addCategory(android.content.Intent.CATEGORY_HOME)
            context.packageManager.resolveActivity(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
                ?.activityInfo?.packageName == context.packageName
        }.getOrDefault(false)
    }

    val scroll = rememberScrollState()
    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(scroll)
            .padding(horizontal = 18.dp),
    ) {
        Spacer(Modifier.height(10.dp))
        Header(settings = settings, isDefault = isDefault, activity = activity)
        Spacer(Modifier.height(16.dp))

        // Live preview
        Row(Modifier.fillMaxWidth()) {
            Column(Modifier.weight(1.05f)) {
                Box(
                    Modifier
                        .fillMaxWidth()
                        .height(430.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    var mode by remember { mutableStateOf(PreviewMode.HOME) }
                    PhonePreview(
                        settings = settings,
                        apps = apps,
                        mode = mode,
                        onTapApp = { appInfo -> app.apps.launch(appInfo) },
                        modifier = Modifier.fillMaxSize(),
                    )
                    // mode switch
                    Column(
                        Modifier.align(Alignment.BottomCenter).padding(bottom = 6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            PreviewMode.values().forEach { m ->
                                Box(
                                    Modifier
                                        .size(width = if (m == mode) 22.dp else 7.dp, height = 7.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (m == mode) Lumi.colors.accent else Color.White.copy(alpha = 0.35f)
                                        )
                                        .clickable { mode = m }
                                )
                            }
                        }
                    }
                }
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(0.95f), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                StatCard(tr("home.metric.widgets"), "${settings.widgetTileCount()}", Icons.Rounded.Widgets)
                StatCard(tr("home.metric.pages"), "${settings.desktop.pages}", Icons.Rounded.GridView)
                StatCard(tr("home.metric.apps"), "${apps.size}", Icons.Rounded.AutoAwesome)
                StatCard(tr("home.metric.profile"), settings.performance.label(), Icons.Rounded.Tune)
            }
        }

        Spacer(Modifier.height(16.dp))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            PrimaryButton(
                tr("action.open_launcher"),
                onClick = onOpenLauncher,
                modifier = Modifier.weight(1f),
            )
            GhostButton(
                if (isDefault) tr("home.launcher_status") else tr("action.set_default"),
                onClick = onRequestDefaultHome,
                modifier = Modifier.weight(0.9f),
            )
        }
        Spacer(Modifier.height(6.dp))
        Text(
            if (isDefault) "LUMI Home is your default launcher." else tr("home.launcher_status_no"),
            color = if (isDefault) Lumi.colors.success else Lumi.colors.onSurfaceMuted,
            fontSize = 11.sp,
            modifier = Modifier.padding(start = 4.dp),
        )

        Spacer(Modifier.height(20.dp))
        SectionHeader(tr("section.personalization"), tr("home.live_preview"))
        // quick access tiles
        val entries = listOf(
            QuickEntry(tr("section.themes"), Icons.Rounded.Palette, "themes") { nav.open("themes") },
            QuickEntry(tr("section.wallpapers"), Icons.Rounded.Wallpaper, "wallpapers") { nav.open("wallpapers") },
            QuickEntry(tr("section.widgets"), Icons.Rounded.Widgets, "widgets") { nav.open("widgets") },
            QuickEntry(tr("section.animations"), Icons.Rounded.Animation, "animations") { nav.open("animations") },
            QuickEntry(tr("section.icons"), Icons.Rounded.AutoAwesome, "icons") { nav.open("icons") },
            QuickEntry(tr("section.panels"), Icons.Rounded.Tune, "control") { nav.open("control") },
            QuickEntry(tr("section.gestures"), Icons.Rounded.Gesture, "gestures") { nav.open("gestures") },
            QuickEntry(tr("section.lockscreen"), Icons.Rounded.Lock, "lock") { nav.open("lock") },
            QuickEntry(tr("section.statusbar"), Icons.Rounded.Straighten, "status") { nav.open("status") },
            QuickEntry(tr("section.notifications"), Icons.Rounded.Notifications, "notifications") { nav.open("notifications") },
            QuickEntry(tr("section.live_studio"), Icons.Rounded.PlayCircle, "live") { nav.open("live") },
            QuickEntry(tr("section.settings"), Icons.Rounded.Settings, "settings") { nav.open("settings") },
        )
        Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            entries.chunked(3).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { entry ->
                        QuickTile(entry, Modifier.weight(1f))
                    }
                    repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

private data class QuickEntry(
    val label: String,
    val icon: ImageVector,
    val route: String,
    val onClick: () -> Unit,
)

@Composable
private fun Header(settings: LumiSettings, isDefault: Boolean, activity: Activity) {
    val hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY)
    val greeting = when (hour) {
        in 5..11 -> tr("home.greeting.morning")
        in 12..17 -> tr("home.greeting.day")
        in 18..22 -> tr("home.greeting.evening")
        else -> tr("home.greeting.night")
    }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(
                "LUMI UI",
                color = Lumi.colors.onSurface,
                fontSize = 30.sp,
                fontWeight = FontWeight.Light,
                letterSpacing = (-1).sp,
            )
            Spacer(Modifier.height(2.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(if (isDefault) Lumi.colors.success else Lumi.colors.warning)
                )
                Spacer(Modifier.width(6.dp))
                Text(
                    "$greeting · ${settings.activeThemeName}",
                    color = Lumi.colors.onSurfaceMuted,
                    fontSize = 12.sp,
                )
            }
        }
        Box(
            Modifier
                .size(44.dp)
                .clip(CircleShape)
                .background(
                    GradientBrush.linearGradient(
                        listOf(Lumi.colors.accent.copy(alpha = 0.5f), Lumi.colors.accentSecondary.copy(alpha = 0.3f))
                    )
                ),
            contentAlignment = Alignment.Center,
        ) {
            Text("L", color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, icon: ImageVector) {
    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Lumi.colors.accent, modifier = Modifier.size(16.dp))
            Spacer(Modifier.width(8.dp))
            Column {
                Text(value, color = Lumi.colors.onSurface, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                Text(label, color = Lumi.colors.onSurfaceMuted, fontSize = 9.5.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun QuickTile(entry: QuickEntry, modifier: Modifier = Modifier) {
    GlassCard(
        modifier = modifier.clickable { entry.onClick() },
        shape = RoundedCornerShape(20.dp),
        contentPadding = PaddingValues(12.dp),
    ) {
        Column {
            Box(
                Modifier
                    .size(32.dp)
                    .clip(RoundedCornerShape(11.dp))
                    .background(
                        GradientBrush.linearGradient(
                            listOf(Lumi.colors.accent.copy(alpha = 0.34f), Lumi.colors.accentSecondary.copy(alpha = 0.16f))
                        )
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Icon(entry.icon, null, tint = Lumi.colors.onSurface, modifier = Modifier.size(17.dp))
            }
            Spacer(Modifier.height(8.dp))
            Text(
                entry.label,
                color = Lumi.colors.onSurface,
                fontSize = 11.sp,
                lineHeight = 13.sp,
                fontWeight = FontWeight.Medium,
            )
        }
    }
}

private fun LumiSettings.widgetTileCount(): Int = 1

private fun com.lumi.ui.core.model.PerfProfile.label(): String = when (this) {
    com.lumi.ui.core.model.PerfProfile.EFFICIENCY -> "Eco"
    com.lumi.ui.core.model.PerfProfile.BALANCED -> "Balanced"
    com.lumi.ui.core.model.PerfProfile.ULTRA -> "Ultra"
}
