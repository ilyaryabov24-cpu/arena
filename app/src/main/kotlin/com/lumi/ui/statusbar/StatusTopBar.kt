package com.lumi.ui.statusbar

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.BatteryFull
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.model.StatusIconMode
import com.lumi.ui.core.ui.Lumi
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * LUMI's own top area. It draws the clock/date/battery/island information inside the launcher only —
 * it never claims to replace the system status bar of other apps, which Android keeps out of reach.
 */
@Composable
fun StatusTopBar(
    settings: LumiSettings,
    onOpenControl: () -> Unit,
    onOpenNotifications: () -> Unit,
    onClickStudio: () -> Unit,
) {
    val cfg = settings.status
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(10_000)
            now = System.currentTimeMillis()
        }
    }
    val tint = when (cfg.iconMode) {
        StatusIconMode.AUTO -> Lumi.colors.onSurface
        StatusIconMode.LIGHT -> Color.White
        StatusIconMode.DARK -> Color(0xFF10131A)
    }
    val context = LocalContext.current
    var battery by remember { mutableLongStateOf(0L) }
    LaunchedEffect(now) {
        battery = runCatching {
            (context.getSystemService(android.content.Context.BATTERY_SERVICE) as android.os.BatteryManager)
                .getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY).toLong()
        }.getOrDefault(0L)
    }

    Column(
        Modifier
            .fillMaxWidth()
            .statusBarsPadding()
            .padding(horizontal = 20.dp, vertical = 6.dp),
    ) {
        Row(
            Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(
                Modifier
                    .clip(RoundedCornerShape(14.dp))
                    .pointerInput(Unit) { detectTapGestures(onTap = { onOpenControl() }) }
                    .padding(vertical = 2.dp),
            ) {
                if (cfg.showClock) {
                    Text(
                        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(now)),
                        color = tint,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                if (cfg.showDate) {
                    Text(
                        SimpleDateFormat("EEE, d MMM", Locale.getDefault()).format(Date(now)),
                        color = tint.copy(alpha = 0.72f),
                        fontSize = 10.sp,
                        letterSpacing = 0.4.sp,
                    )
                }
            }

            Spacer(Modifier.weight(1f))

            if (cfg.island) {
                LumiIsland(settings = settings, tint = tint, onClick = onClickStudio)
                Spacer(Modifier.weight(1f))
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (cfg.showBattery) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("$battery%", color = tint.copy(alpha = 0.85f), fontSize = 11.sp)
                        Spacer(Modifier.width(4.dp))
                        Icon(
                            Icons.Rounded.BatteryFull,
                            null,
                            tint = tint.copy(alpha = 0.85f),
                            modifier = Modifier.size(15.dp),
                        )
                    }
                }
                Box(
                    Modifier
                        .size(30.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.10f))
                        .pointerInput(Unit) { detectTapGestures(onTap = { onOpenNotifications() }) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Notifications, null, tint = tint.copy(alpha = 0.9f), modifier = Modifier.size(15.dp))
                }
            }
        }
    }
}

/**
 * Decorative "dynamic island" inside LUMI Home: it shows the live clock, rotation between info and
 * a soft breathing highlight. Tap opens Status Bar Studio.
 */
@Composable
private fun LumiIsland(settings: LumiSettings, tint: Color, onClick: () -> Unit) {
    val transition = rememberInfiniteTransition(label = "island")
    val breathe by transition.animateFloat(
        initialValue = 0.35f,
        targetValue = 0.75f,
        animationSpec = infiniteRepeatable(tween(2600), RepeatMode.Reverse),
        label = "breathe",
    )
    var page by remember { mutableLongStateOf(0) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(4200)
            page = (page + 1) % 3
        }
    }
    val contentWidth by animateFloatAsState(if (settings.status.showMusic) 132f else 96f, label = "islandWidth")
    Box(
        Modifier
            .width(contentWidth.dp)
            .height(26.dp)
            .clip(RoundedCornerShape(50))
            .background(Color.Black.copy(alpha = 0.42f))
            .graphicsLayer { }
            .pointerInput(Unit) { detectTapGestures(onTap = { onClick() }) },
        contentAlignment = Alignment.Center,
    ) {
        // breathing accent dot on the left edge
        Box(
            Modifier
                .align(Alignment.CenterStart)
                .padding(start = 8.dp)
                .size(6.dp)
                .clip(CircleShape)
                .background(Lumi.colors.accent.copy(alpha = breathe)),
        )
        AnimatedContent(
            targetState = page,
            transitionSpec = {
                (slideInVertically { it } + fadeIn()) togetherWith (slideOutVertically { -it } + fadeOut())
            },
            label = "islandContent",
        ) { p ->
            val text = when (p) {
                0 -> SimpleDateFormat("HH:mm:ss", Locale.getDefault()).format(Date())
                1 -> settings.let { "${(it.widgets.weatherManualTemp ?: 21)}° · LUMI" }
                else -> "On device"
            }
            Text(text, color = Color.White.copy(alpha = 0.9f), fontSize = 10.sp, letterSpacing = 0.2.sp)
        }
    }
}
