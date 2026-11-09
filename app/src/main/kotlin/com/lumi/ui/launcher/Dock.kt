package com.lumi.ui.launcher

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.data.AppInfo
import com.lumi.ui.core.data.Folder
import com.lumi.ui.core.data.WorkspaceItem
import com.lumi.ui.core.model.DockSettings
import com.lumi.ui.core.model.IconSettings
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi
import kotlinx.coroutines.delay

/**
 * Floating glass dock. Every parameter of [DockSettings] is honoured: height, icon size, spacing,
 * corner radius, opacity, blur, gradient, shadow, press effect and the entrance animation.
 */
@Composable
fun DockView(
    viewModel: LauncherViewModel,
    settings: LumiSettings,
    dock: List<com.lumi.ui.core.data.DockSlot>,
    apps: List<AppInfo>,
    folders: List<Folder>,
) {
    val cfg = settings.dock
    val press = pressEffectFor(settings.animations.pressEffect, settings.animations)
    var appeared by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        delay(120)
        appeared = true
    }
    val enter by animateFloatAsState(
        targetValue = if (appeared) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = 260f),
        label = "dockEnter",
    )
    val bottomPad = 10.dp

    Box(
        Modifier
            .fillMaxWidth()
            .padding(horizontal = if (cfg.float) 18.dp else 0.dp, vertical = bottomPad)
            .graphicsLayer {
                translationY = (1f - enter) * 120f
                alpha = enter
                scaleX = 0.94f + enter * 0.06f
                scaleY = 0.94f + enter * 0.06f
            },
    ) {
        GlassPanel(
            shape = RoundedCornerShape(cfg.cornerDp.dp),
            opacityPercent = cfg.opacityPercent,
            blurRadius = if (cfg.blur) 20.dp else 0.dp,
            tint = Color(cfg.glassTint.toInt()),
            gradient = cfg.gradient,
            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 8.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(cfg.heightDp.dp)
                .then(
                    if (cfg.shadow) Modifier.shadow(
                        elevation = 24.dp,
                        shape = RoundedCornerShape(cfg.cornerDp.dp),
                        ambientColor = Color.Black.copy(alpha = 0.5f),
                        spotColor = Color.Black.copy(alpha = 0.6f),
                    ) else Modifier
                ),
        ) {
            Row(
                Modifier.fillMaxWidth().height(cfg.heightDp.dp - 16.dp),
                horizontalArrangement = Arrangement.spacedBy(cfg.spacingDp.dp, Alignment.CenterHorizontally),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                val slots = (0 until 4).map { idx -> dock.firstOrNull { it.slot == idx } }
                slots.forEach { slot ->
                    if (slot == null) {
                        Box(Modifier.size(cfg.iconSizeDp.dp))
                    } else {
                        val folder = folders.firstOrNull { it.id == slot.refId }
                        if (slot.kind == com.lumi.ui.core.data.ItemKind.FOLDER && folder != null) {
                            FolderIconView(
                                folder = folder,
                                apps = viewModel.folderApps(folder),
                                settings = settings,
                                iconSettings = settings.icons,
                                sizeDp = cfg.iconSizeDp.dp,
                                showLabel = false,
                                onClick = { viewModel.openFolder(folder) },
                                onLongClick = { },
                            )
                        } else {
                            DockIcon(
                                pkg = slot.refId,
                                label = viewModel.let { apps.firstOrNull { a -> a.packageName == slot.refId }?.label ?: slot.refId },
                                cfg = cfg,
                                iconSettings = settings.icons,
                                press = press,
                                showLabel = cfg.showLabel,
                                onClick = { viewModel.launchPackage(slot.refId) },
                                onLongPress = { viewModel.showToast("Hold an app and drag it to the dock in Builder") },
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DockIcon(
    pkg: String,
    label: String,
    cfg: DockSettings,
    iconSettings: IconSettings,
    press: PressEffect,
    showLabel: Boolean,
    onClick: () -> Unit,
    onLongPress: () -> Unit,
) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        LauncherIcon(
            packageName = pkg,
            label = label,
            iconDp = cfg.iconSizeDp.dp,
            settings = iconSettings,
            showLabel = false,
            pressEffect = press,
            onClick = onClick,
            onLongClick = onLongPress,
        )
        if (showLabel) {
            Text(
                label,
                color = Lumi.colors.onSurface.copy(alpha = 0.9f),
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(cfg.iconSizeDp.dp + 12.dp),
            )
        }
    }
}

/**
 * Folder icon: a glass tile that previews the first four apps of the folder, with the configured
 * style (standard / glass / blurred / large) and the open/close scale animation.
 */
@Composable
fun FolderIconView(
    folder: Folder,
    apps: List<AppInfo>,
    settings: LumiSettings,
    iconSettings: IconSettings,
    sizeDp: androidx.compose.ui.unit.Dp,
    showLabel: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
) {
    val cfg = settings.folder
    val preview = apps.take(cfg.iconPreviewCount.coerceAtLeast(1))
    val tintColor = when (cfg.style) {
        com.lumi.ui.core.model.FolderStyleType.STANDARD -> Color.White.copy(alpha = 0.12f)
        com.lumi.ui.core.model.FolderStyleType.GLASS -> Color.White.copy(alpha = 0.16f)
        com.lumi.ui.core.model.FolderStyleType.BLURRED -> Color.White.copy(alpha = 0.10f)
        com.lumi.ui.core.model.FolderStyleType.LARGE -> Color.White.copy(alpha = 0.14f)
    }
    val innerIcon = when (cfg.style) {
        com.lumi.ui.core.model.FolderStyleType.LARGE -> sizeDp * 0.40f
        else -> sizeDp * 0.36f
    }
    var pressed by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.93f else 1f,
        animationSpec = spring(dampingRatio = 0.5f, stiffness = 700f),
        label = "folderPress",
    )
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Box(
            Modifier
                .size(sizeDp)
                .graphicsLayer { scaleX = scale; scaleY = scale }
                .clip(RoundedCornerShape(cfg.cornerDp.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(tintColor, tintColor.copy(alpha = tintColor.alpha * 0.6f))
                    )
                )
                .pointerInput(folder.id) {
                    detectTapGestures(
                        onPress = {
                            pressed = true
                            tryAwaitRelease()
                            pressed = false
                        },
                        onTap = onClick,
                        onLongPress = onLongClick,
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            val cols = if (preview.size <= 1) 1 else 2
            Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                preview.chunked(cols).forEach { rowApps ->
                    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        rowApps.forEach { a ->
                            AppIcon(
                                packageName = a.packageName,
                                size = innerIcon,
                                settings = iconSettings,
                            )
                        }
                    }
                }
            }
        }
        if (showLabel) {
            Spacer(Modifier.height(5.dp))
            Text(
                folder.name,
                color = Lumi.colors.onSurface,
                fontSize = settings.desktop.labelSizeSp.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
                modifier = Modifier.width(sizeDp + 20.dp),
            )
        }
    }
}
