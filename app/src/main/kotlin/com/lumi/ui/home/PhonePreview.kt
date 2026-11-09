package com.lumi.ui.home

import android.graphics.Bitmap
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.Text
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.data.AppInfo
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.model.WidgetElementType
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.launcher.AppIcon
import com.lumi.ui.widgets.LumiWidgetRenderer
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * A realistic, interactive phone mock-up. It renders the *actual* desktop configuration — the same
 * grid, dock, wallpaper and widgets the launcher uses — so what you see here is what you get.
 * Tapping the dock tabs switches the preview between home / drawer / lock representations.
 */
enum class PreviewMode { HOME, DRAWER, LOCK, CONTROL }

@Composable
fun PhonePreview(
    settings: LumiSettings,
    apps: List<AppInfo>,
    modifier: Modifier = Modifier,
    interactive: Boolean = true,
    mode: PreviewMode = PreviewMode.HOME,
    onModeChange: ((PreviewMode) -> Unit)? = null,
    onTapApp: ((AppInfo) -> Unit)? = null,
    frameScale: Float = 1f,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(15_000)
            now = System.currentTimeMillis()
        }
    }
    var wallpaper by remember { mutableStateOf<Bitmap?>(null) }
    LaunchedEffect(settings.wallpaper.imagePath, settings.wallpaper.filter) {
        val path = settings.wallpaper.imagePath
        wallpaper = if (path != null) {
            com.lumi.ui.wallpapers.WallpaperRenderer.render(context, path, settings.wallpaper.filter, 720, 1500)
        } else null
    }

    Box(modifier) {
        // device frame
        Box(
            Modifier
                .fillMaxSize()
                .drawWithContent {
                    drawContent()
                }
                .clip(RoundedCornerShape(46.dp * frameScale))
                .background(Color(0xFF0A0B10))
                .border(
                    width = 7.dp * frameScale,
                    brush = Brush.linearGradient(
                        listOf(Color(0xFF3A3E48), Color(0xFF16181E), Color(0xFF2B2F38))
                    ),
                    shape = RoundedCornerShape(46.dp * frameScale),
                )
        ) {
            Box(Modifier.fillMaxSize().padding(4.dp)) {
                Column(
                    Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(38.dp * frameScale))
                        .background(Brush.verticalGradient(listOf(Color(0xFF08090D), Color(0xFF0B0E15))))
                ) {
                    // wallpaper
                    Box(Modifier.fillMaxSize()) {
                        if (wallpaper != null) {
                            androidx.compose.foundation.Image(
                                bitmap = wallpaper!!.asImageBitmap(),
                                contentDescription = null,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize(),
                            )
                        } else {
                            GradientBackdrop(settings.accent.toInt())
                        }
                        Box(
                            Modifier
                                .fillMaxSize()
                                .background(Color.Black.copy(alpha = settings.desktop.wallpaperDim * 0.8f))
                        )
                        when (mode) {
                            PreviewMode.HOME -> HomePreviewContent(settings, apps, now, onTapApp)
                            PreviewMode.DRAWER -> DrawerPreviewContent(settings, apps, onTapApp)
                            PreviewMode.LOCK -> LockPreviewContent(settings, now)
                            PreviewMode.CONTROL -> ControlPreviewContent(settings)
                        }
                        // notch
                        Box(
                            Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 8.dp * frameScale)
                                .width(72.dp * frameScale)
                                .height(18.dp * frameScale)
                                .clip(CircleShape)
                                .background(Color.Black.copy(alpha = 0.85f)),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GradientBackdrop(accentInt: Int) {
    val accent = Color(accentInt)
    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(Color(0xFF07080C), Color(0xFF0D1220), accent.copy(alpha = 0.45f)),
                )
            )
    ) {
        Box(
            Modifier.fillMaxSize().background(
                Brush.radialGradient(
                    listOf(accent.copy(alpha = 0.32f), Color.Transparent),
                    center = Offset(240f, 160f), radius = 380f,
                )
            )
        )
    }
}

@Composable
private fun HomePreviewContent(
    settings: LumiSettings,
    apps: List<AppInfo>,
    now: Long,
    onTapApp: ((AppInfo) -> Unit)?,
) {
    val desktop = settings.desktop
    val shown = apps.take(desktop.columns * 3)
    val dockApps = apps.drop(4).take(4)
    Column(Modifier.fillMaxSize().padding(horizontal = 8.dp)) {
        Spacer(Modifier.height(34.dp))
        StatusMini(settings, now)
        Spacer(Modifier.height(10.dp))
        // optional top widget
        val topWidget = remember { WidgetSampleCache.topWidget() }
        LumiWidgetRenderer(
            doc = topWidget,
            modifier = Modifier.fillMaxWidth().height(74.dp),
        )
        Spacer(Modifier.height(10.dp))
        Column(
            Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy((desktop.spacingDp * 0.5f).dp),
        ) {
            shown.chunked(desktop.columns).forEach { rowApps ->
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly,
                ) {
                    rowApps.forEach { a ->
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = if (onTapApp != null) {
                                Modifier.pointerInput(a.packageName) {
                                    detectTapGestures(onTap = { onTapApp(a) })
                                }
                            } else Modifier,
                        ) {
                            AppIcon(a.packageName, (desktop.iconSizeDp * 0.62f).dp, settings.icons)
                            if (desktop.showLabels) {
                                Text(
                                    a.label,
                                    color = Color.White.copy(alpha = 0.92f),
                                    fontSize = 6.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.width(42.dp),
                                )
                            }
                        }
                    }
                    repeat(desktop.columns - rowApps.size) { Spacer(Modifier.width(42.dp)) }
                }
            }
        }
        Spacer(Modifier.weight(1f))
        // dock
        if (settings.dock.enabled) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp)
                    .height((settings.dock.heightDp * 0.46f).dp)
                    .clip(RoundedCornerShape((settings.dock.cornerDp * 0.48f).dp))
                    .background(
                        Brush.verticalGradient(
                            listOf(
                                Color.White.copy(alpha = settings.dock.opacityPercent / 100f * 0.7f),
                                Color.White.copy(alpha = settings.dock.opacityPercent / 100f * 0.35f),
                            )
                        )
                    )
                    .border(0.5.dp, Color.White.copy(alpha = 0.22f), RoundedCornerShape((settings.dock.cornerDp * 0.48f).dp)),
                contentAlignment = Alignment.Center,
            ) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    dockApps.forEach { a ->
                        AppIcon(a.packageName, (settings.dock.iconSizeDp * 0.44f).dp, settings.icons)
                    }
                }
            }
            Spacer(Modifier.height(8.dp))
        }
        // page dots
        Row(
            Modifier.fillMaxWidth().padding(bottom = 6.dp),
            horizontalArrangement = Arrangement.Center,
        ) {
            repeat(desktop.pages.coerceAtMost(4)) { i ->
                Box(
                    Modifier
                        .padding(horizontal = 2.dp)
                        .size(if (i == 0) 4.dp else 3.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = if (i == 0) 0.85f else 0.4f))
                )
            }
        }
    }
}

@Composable
private fun DrawerPreviewContent(settings: LumiSettings, apps: List<AppInfo>, onTapApp: ((AppInfo) -> Unit)?) {
    val shown = apps.take(12)
    Column(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.45f))
            .padding(horizontal = 12.dp),
    ) {
        Spacer(Modifier.height(36.dp))
        Text(
            "All apps",
            color = Color.White,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.height(8.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(22.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White.copy(alpha = 0.12f)),
            contentAlignment = Alignment.CenterStart,
        ) {
            Text("Search", color = Color.White.copy(alpha = 0.5f), fontSize = 7.sp, modifier = Modifier.padding(start = 8.dp))
        }
        Spacer(Modifier.height(10.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            shown.chunked(settings.drawer.columns.coerceIn(3, 5)).forEach { row ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    row.forEach { a ->
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = if (onTapApp != null) {
                                Modifier.pointerInput(a.packageName) { detectTapGestures { onTapApp(a) } }
                            } else Modifier,
                        ) {
                            AppIcon(a.packageName, (settings.drawer.iconSizeDp * 0.55f).dp, settings.icons)
                            Text(
                                a.label,
                                color = Color.White.copy(alpha = 0.85f),
                                fontSize = 5.5.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.width(38.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LockPreviewContent(settings: LumiSettings, now: Long) {
    val lock = settings.lock
    Column(
        Modifier.fillMaxSize().padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(40.dp))
        Text(
            SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date(now)),
            color = Color.White.copy(alpha = 0.8f),
            fontSize = 9.sp,
        )
        Spacer(Modifier.height(4.dp))
        Text(
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(now)),
            color = Color(lock.clockColor.toInt()),
            fontSize = (if (lock.clockStyle == "big") 58 else 40).sp,
            fontWeight = if (lock.clockStyle == "minimal") FontWeight.Thin else FontWeight.Light,
            letterSpacing = (-2).sp,
        )
        Spacer(Modifier.weight(1f))
        Box(
            Modifier
                .fillMaxWidth()
                .padding(bottom = 26.dp)
                .height(24.dp)
                .clip(RoundedCornerShape(50))
                .background(Color.White.copy(alpha = 0.18f)),
            contentAlignment = Alignment.Center,
        ) {
            Text("Swipe up to unlock", color = Color.White.copy(alpha = 0.6f), fontSize = 6.5.sp)
        }
    }
}

@Composable
private fun ControlPreviewContent(settings: LumiSettings) {
    Column(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.35f))
            .padding(horizontal = 10.dp),
    ) {
        Spacer(Modifier.height(36.dp))
        Text("Control Center", color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.SemiBold)
        Spacer(Modifier.height(8.dp))
        settings.control.tiles.take(6).chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                row.forEach { tile ->
                    Box(
                        Modifier
                            .weight(1f)
                            .height(34.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color.White.copy(alpha = 0.14f))
                            .padding(6.dp),
                        contentAlignment = Alignment.BottomStart,
                    ) {
                        Text(
                            tile.type.name.lowercase().replace('_', ' '),
                            color = Color.White.copy(alpha = 0.85f),
                            fontSize = 6.sp,
                            maxLines = 1,
                        )
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
            Spacer(Modifier.height(6.dp))
        }
    }
}

@Composable
private fun StatusMini(settings: LumiSettings, now: Long) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(now)),
            color = Color.White.copy(alpha = 0.92f),
            fontSize = 7.sp,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(Modifier.weight(1f))
        if (settings.status.island) {
            Box(
                Modifier
                    .width(30.dp)
                    .height(9.dp)
                    .clip(CircleShape)
                    .background(Color.Black.copy(alpha = 0.5f))
            )
            Spacer(Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
            repeat(3) {
                Box(
                    Modifier
                        .size(3.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.7f))
                )
            }
        }
    }
}

/** Builds a compact widget for the preview header without touching the database. */
object WidgetSampleCache {
    private var cached: com.lumi.ui.core.model.WidgetDoc? = null

    fun topWidget(): com.lumi.ui.core.model.WidgetDoc =
        cached ?: com.lumi.ui.widgets.WidgetTemplates.byKey("large_combo")!!.build().also { cached = it }
}
