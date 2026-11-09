package com.lumi.ui.controlcenter

import android.app.Activity
import android.content.Intent
import android.media.AudioManager
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AirplanemodeActive
import androidx.compose.material.icons.rounded.BatterySaver
import androidx.compose.material.icons.rounded.Bluetooth
import androidx.compose.material.icons.rounded.Brightness6
import androidx.compose.material.icons.rounded.Calculate
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DoNotDisturbOn
import androidx.compose.material.icons.rounded.FlashlightOff
import androidx.compose.material.icons.rounded.FlashlightOn
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Rotate90DegreesCcw
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material.icons.rounded.VolumeUp
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material.icons.rounded.Wifi
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.InlineCalculator
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.model.ControlTile
import com.lumi.ui.core.model.TileSize
import com.lumi.ui.core.model.TileType
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.GlassSurface
import com.lumi.ui.core.ui.Lumi
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * LUMI Control Center. Real toggles where Android allows it (torch, volume, media, timer), and a
 * clearly labelled trip to the system panel where it does not (Wi-Fi, Bluetooth, airplane...).
 */
@Composable
fun ControlCenterPanel(
    activity: Activity,
    onClose: () -> Unit,
    onOpenStudio: (String) -> Unit,
    onOpenNotifications: () -> Unit,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val cfg = app.settings.state.value.control
    var torchOn by remember { mutableStateOf(false) }
    var volume by remember { mutableIntStateOf(Tiles.volumePercent(context)) }
    var brightness by remember { mutableIntStateOf(Tiles.brightness(context)) }
    var timerRunning by remember { mutableStateOf(false) }
    var timerMs by remember { mutableLongStateOf(0L) }
    var showCalc by remember { mutableStateOf(false) }

    LaunchedEffect(timerRunning) {
        while (timerRunning && timerMs > 0) {
            delay(1000)
            timerMs -= 1000
        }
        if (timerMs <= 0) timerRunning = false
    }

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.35f))
            .pointerInput(Unit) { detectTapGestures(onTap = { onClose() }) },
    ) {
        GlassPanel(
            shape = RoundedCornerShape(bottomStart = cfg.cornerDp.dp, bottomEnd = cfg.cornerDp.dp),
            opacityPercent = cfg.opacityPercent,
            blurRadius = 26.dp,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .pointerInput(Unit) { detectTapGestures(onTap = { }) }
                .verticalScroll(rememberScrollState()),
        ) {
            Column(Modifier.statusBarsPadding(), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            if (cfg.showGreeting) "LUMI Control Center" else tr("cc.title"),
                            color = Lumi.colors.onSurface,
                            fontSize = 20.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            SimpleDateFormat("EEEE, d MMMM", Locale.getDefault()).format(Date()),
                            color = Lumi.colors.onSurfaceMuted,
                            fontSize = 12.sp,
                        )
                    }
                    RoundIcon(Icons.Rounded.Notifications) { onOpenNotifications() }
                    Spacer(Modifier.width(8.dp))
                    RoundIcon(Icons.Rounded.Settings) { onOpenStudio("settings") }
                    Spacer(Modifier.width(8.dp))
                    RoundIcon(Icons.Rounded.Close) { onClose() }
                }

                cfg.tiles.forEach { tile ->
                    ControlTileView(
                        tile = tile,
                        torchOn = torchOn,
                        volume = volume,
                        brightness = brightness,
                        timerMs = timerMs,
                        onTorch = {
                            val ok = Tiles.setTorch(context, !torchOn)
                            if (ok) torchOn = !torchOn else onOpenStudio("settings")
                        },
                        onVolume = {
                            volume = it
                            Tiles.setVolume(context, it)
                        },
                        onBrightness = {
                            brightness = it
                            if (!SettingsAccess.canWriteSettings(context)) {
                                SettingsAccess.openWriteSettings(context)
                            } else {
                                runCatching {
                                    android.provider.Settings.System.putInt(
                                        context.contentResolver,
                                        android.provider.Settings.System.SCREEN_BRIGHTNESS,
                                        (it * 255 / 100).coerceIn(1, 255),
                                    )
                                }.onFailure { SettingsAccess.openWriteSettings(context) }
                            }
                        },
                        onTimer = {
                            if (timerRunning || timerMs > 0) {
                                timerRunning = false
                                timerMs = 0
                            } else {
                                timerMs = 5 * 60 * 1000
                                timerRunning = true
                            }
                        },
                        onCalculator = { showCalc = true },
                        onStudio = onOpenStudio,
                        onSystem = { type -> Tiles.openSystemPanel(context, type) },
                    )
                }

                if (showCalc) {
                    GlassSurface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), alpha = 0.08f) {
                        Column(Modifier.padding(12.dp)) {
                            InlineCalculator()
                            Spacer(Modifier.height(8.dp))
                            Text(
                                tr("action.close"),
                                color = Lumi.colors.accent,
                                fontSize = 12.sp,
                                modifier = Modifier.clickable { showCalc = false },
                            )
                        }
                    }
                }

                Text(
                    tr("cc.opens_settings"),
                    color = Lumi.colors.onSurfaceMuted,
                    fontSize = 10.5.sp,
                )
                Spacer(Modifier.height(12.dp))
            }
        }
    }
}

@Composable
private fun RoundIcon(icon: ImageVector, onClick: () -> Unit) {
    Box(
        Modifier
            .size(32.dp)
            .clip(CircleShape)
            .background(Color.White.copy(alpha = 0.12f))
            .clickable { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, null, tint = Lumi.colors.onSurface.copy(alpha = 0.9f), modifier = Modifier.size(17.dp))
    }
}

@Composable
private fun ControlTileView(
    tile: ControlTile,
    torchOn: Boolean,
    volume: Int,
    brightness: Int,
    timerMs: Long,
    onTorch: () -> Unit,
    onVolume: (Int) -> Unit,
    onBrightness: (Int) -> Unit,
    onTimer: () -> Unit,
    onCalculator: () -> Unit,
    onStudio: (String) -> Unit,
    onSystem: (TileType) -> Unit,
) {
    val context = LocalContext.current
    val accent = Lumi.colors.accent
    val width = Modifier.fillMaxWidth()
    when (tile.size) {
        TileSize.WIDE -> WideTile(
            label = labelOf(tile.type),
            icon = iconOf(tile.type),
            progress = when (tile.type) {
                TileType.BRIGHTNESS -> brightness / 100f
                TileType.VOLUME -> volume / 100f
                else -> 0.5f
            },
            onProgress = { v ->
                when (tile.type) {
                    TileType.BRIGHTNESS -> onBrightness((v * 100).toInt())
                    TileType.VOLUME -> onVolume((v * 100).toInt())
                    else -> Unit
                }
            },
        )
        TileSize.LARGE -> GlassSurface(width, shape = RoundedCornerShape(24.dp), alpha = 0.10f) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(46.dp).clip(RoundedCornerShape(14.dp))
                        .background(Brush.linearGradient(listOf(accent.copy(alpha = 0.5f), accent.copy(alpha = 0.2f)))),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(iconOf(tile.type), null, tint = Color.White, modifier = Modifier.size(22.dp))
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(labelOf(tile.type), color = Lumi.colors.onSurface, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                    Text("Media controls mirror the system volume", color = Lumi.colors.onSurfaceMuted, fontSize = 11.sp)
                }
                Icon(
                    Icons.Rounded.VolumeUp, null, tint = Lumi.colors.onSurface.copy(alpha = 0.8f),
                    modifier = Modifier.clickable {
                        val am = context.getSystemService(android.content.Context.AUDIO_SERVICE) as AudioManager
                        runCatching { am.dispatchMediaKeyEvent(android.view.KeyEvent(android.view.KeyEvent.ACTION_DOWN, android.view.KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)) }
                    }.size(22.dp),
                )
            }
        }
        TileSize.SMALL -> {
            val active = when (tile.type) {
                TileType.FLASHLIGHT -> torchOn
                TileType.WIFI -> Tiles.isWifiEnabled(context)
                TileType.BLUETOOTH -> Tiles.isBluetoothEnabled(context)
                TileType.AIRPLANE -> Tiles.isAirplaneOn(context)
                TileType.DND -> Tiles.isDndOn(context)
                TileType.BATTERY_SAVER -> Tiles.isPowerSaverOn(context)
                TileType.ROTATE -> !Tiles.isRotationLocked(context)
                TileType.TIMER -> timerMs > 0
                else -> false
            }
            GlassSurface(
                Modifier.fillMaxWidth().height(78.dp),
                shape = RoundedCornerShape(22.dp),
                alpha = if (active) 0.0f else 0.09f,
            ) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(
                            if (active) Brush.linearGradient(listOf(accent.copy(alpha = 0.75f), accent.copy(alpha = 0.45f)))
                            else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent))
                        )
                        .clickable {
                            when (tile.type) {
                                TileType.FLASHLIGHT -> onTorch()
                                TileType.TIMER -> onTimer()
                                TileType.CALCULATOR -> onCalculator()
                                TileType.LUMI -> onStudio("builder")
                                TileType.WALLPAPER -> onStudio("wallpapers")
                                TileType.MUSIC -> onStudio("control")
                                else -> onSystem(tile.type)
                            }
                        },
                ) {
                    Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Icon(
                            iconOf(tile.type), null,
                            tint = if (active) Color.White else Lumi.colors.onSurface.copy(alpha = 0.9f),
                            modifier = Modifier.size(20.dp),
                        )
                        Spacer(Modifier.weight(1f))
                        Text(
                            when (tile.type) {
                                TileType.TIMER -> if (timerMs > 0) Tiles.formatTime(timerMs) else labelOf(tile.type)
                                else -> labelOf(tile.type)
                            },
                            color = if (active) Color.White else Lumi.colors.onSurface,
                            fontSize = 11.5.sp,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun WideTile(label: String, icon: ImageVector, progress: Float, onProgress: (Float) -> Unit) {
    GlassSurface(Modifier.fillMaxWidth().height(62.dp), shape = RoundedCornerShape(20.dp), alpha = 0.09f) {
        Row(Modifier.fillMaxSize().padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, tint = Lumi.colors.onSurface.copy(alpha = 0.9f), modifier = Modifier.size(19.dp))
            Spacer(Modifier.width(12.dp))
            Box(
                Modifier
                    .weight(1f)
                    .height(26.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.10f))
                    .pointerInput(Unit) {
                        detectTapGestures(
                            onPress = { offset ->
                                onProgress((offset.x / size.width).coerceIn(0f, 1f))
                                tryAwaitRelease()
                            },
                        )
                    },
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(progress.coerceIn(0.02f, 1f))
                        .height(26.dp)
                        .clip(RoundedCornerShape(50))
                        .background(Brush.horizontalGradient(listOf(Lumi.colors.accent.copy(alpha = 0.9f), Lumi.colors.accentSecondary.copy(alpha = 0.7f))))
                )
            }
            Spacer(Modifier.width(12.dp))
            Text(label, color = Lumi.colors.onSurfaceMuted, fontSize = 10.sp)
        }
    }
}

private fun labelOf(type: TileType): String = when (type) {
    TileType.WIFI -> "Wi-Fi"
    TileType.BLUETOOTH -> "Bluetooth"
    TileType.MOBILE_DATA -> "Mobile data"
    TileType.AIRPLANE -> "Airplane"
    TileType.FLASHLIGHT -> "Flashlight"
    TileType.BRIGHTNESS -> "Brightness"
    TileType.VOLUME -> "Volume"
    TileType.DND -> "Do not disturb"
    TileType.ROTATE -> "Auto-rotate"
    TileType.BATTERY_SAVER -> "Battery saver"
    TileType.MUSIC -> "Music"
    TileType.TIMER -> "Timer"
    TileType.CALCULATOR -> "Calculator"
    TileType.SETTINGS -> "Settings"
    TileType.LUMI -> "LUMI studio"
    TileType.NOTIFICATIONS -> "Notifications"
    TileType.WALLPAPER -> "Wallpaper"
}

private fun iconOf(type: TileType): ImageVector = when (type) {
    TileType.WIFI -> Icons.Rounded.Wifi
    TileType.BLUETOOTH -> Icons.Rounded.Bluetooth
    TileType.MOBILE_DATA -> Icons.Rounded.Wifi
    TileType.AIRPLANE -> Icons.Rounded.AirplanemodeActive
    TileType.FLASHLIGHT -> Icons.Rounded.FlashlightOn
    TileType.BRIGHTNESS -> Icons.Rounded.Brightness6
    TileType.VOLUME -> Icons.Rounded.VolumeUp
    TileType.DND -> Icons.Rounded.DoNotDisturbOn
    TileType.ROTATE -> Icons.Rounded.Rotate90DegreesCcw
    TileType.BATTERY_SAVER -> Icons.Rounded.BatterySaver
    TileType.MUSIC -> Icons.Rounded.VolumeUp
    TileType.TIMER -> Icons.Rounded.Timer
    TileType.CALCULATOR -> Icons.Rounded.Calculate
    TileType.SETTINGS -> Icons.Rounded.Settings
    TileType.LUMI -> Icons.Rounded.Settings
    TileType.NOTIFICATIONS -> Icons.Rounded.Notifications
    TileType.WALLPAPER -> Icons.Rounded.Wallpaper
}

object SettingsAccess {
    fun canWriteSettings(context: android.content.Context): Boolean =
        android.provider.Settings.System.canWrite(context)

    fun openWriteSettings(context: android.content.Context) {
        val intent = Intent(android.provider.Settings.ACTION_MANAGE_WRITE_SETTINGS)
            .setData(android.net.Uri.parse("package:${context.packageName}"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }
    }
}
