package com.lumi.ui.home

import android.app.Activity
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Animation
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.ui.GlassCard
import com.lumi.ui.core.ui.GhostButton
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.core.ui.LumiBackdrop
import com.lumi.ui.core.ui.PrimaryButton

/**
 * First-run experience. Explains what LUMI really does, then asks Android for the home role through
 * the official flow — no fake "granted" state.
 */
@Composable
fun OnboardingScreen(
    activity: Activity,
    onFinish: () -> Unit,
    onOpenLauncher: () -> Unit,
) {
    var step by remember { mutableIntStateOf(0) }
    val transition = rememberInfiniteTransition(label = "onb")
    val breathe by transition.animateFloat(
        initialValue = 0.92f,
        targetValue = 1.06f,
        animationSpec = infiniteRepeatable(tween(4200, easing = LinearEasing), RepeatMode.Reverse),
        label = "breathe",
    )

    LumiBackdrop(Modifier.fillMaxSize()) {
        Column(
            Modifier
                .fillMaxSize()
                .padding(28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(60.dp))
            Box(
                Modifier
                    .size(132.dp)
                    .scale(breathe),
                contentAlignment = Alignment.Center,
            ) {
                Box(
                    Modifier
                        .size(132.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(Lumi.colors.accent.copy(alpha = 0.55f), Color.Transparent)
                            )
                        )
                )
                Box(
                    Modifier
                        .size(66.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                listOf(Lumi.colors.accent, Lumi.colors.accentSecondary)
                            )
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("L", color = Color.White, fontSize = 30.sp, fontWeight = FontWeight.Light)
                }
            }
            Spacer(Modifier.height(36.dp))
            Text(
                if (step == 0) tr("onb.welcome_title") else tr("onb.home_title"),
                color = Lumi.colors.onSurface,
                fontSize = 27.sp,
                fontWeight = FontWeight.Light,
                textAlign = TextAlign.Center,
                letterSpacing = (-0.6).sp,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                if (step == 0) tr("onb.welcome_body") else tr("onb.home_body"),
                color = Lumi.colors.onSurfaceMuted,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                lineHeight = 21.sp,
            )
            Spacer(Modifier.height(26.dp))
            if (step == 0) {
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FeaturePill(Icons.Rounded.Home, "Real launcher")
                    FeaturePill(Icons.Rounded.Wallpaper, "Wallpapers")
                    FeaturePill(Icons.Rounded.AutoAwesome, "Widgets")
                }
                Spacer(Modifier.height(10.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    FeaturePill(Icons.Rounded.Animation, "Animations")
                    FeaturePill(Icons.Rounded.AutoAwesome, "Themes")
                }
            } else {
                GlassCard(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Text(tr("settings.home_app_desc"), color = Lumi.colors.onSurfaceMuted, fontSize = 12.sp)
                        PrimaryButton(tr("onb.set_home"), onClick = {
                            val intent = android.content.Intent(android.provider.Settings.ACTION_HOME_SETTINGS)
                                .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
                            runCatching { activity.startActivity(intent) }.onFailure {
                                activity.startActivity(
                                    android.content.Intent(android.content.Intent.ACTION_MAIN)
                                        .addCategory(android.content.Intent.CATEGORY_HOME)
                                )
                            }
                        }, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
            Spacer(Modifier.weight(1f))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (step == 1) {
                    GhostButton(
                        tr("onb.skip"),
                        onClick = onFinish,
                        modifier = Modifier.weight(0.6f),
                    )
                }
                PrimaryButton(
                    if (step == 0) tr("onb.next") else tr("onb.start"),
                    onClick = {
                        if (step == 0) step = 1 else onFinish()
                    },
                    modifier = Modifier.weight(1f),
                )
            }
            Spacer(Modifier.height(20.dp))
        }
    }
}

@Composable
private fun FeaturePill(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String) {
    Row(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.White.copy(alpha = 0.09f))
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(icon, null, tint = Lumi.colors.accent, modifier = Modifier.size(13.dp))
        Spacer(Modifier.size(6.dp))
        Text(label, color = Lumi.colors.onSurfaceMuted, fontSize = 10.5.sp)
    }
}
