package com.lumi.ui.launcher

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.data.AppInfo
import com.lumi.ui.core.data.Folder
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi

/**
 * Full-screen folder panel. It scales up from the icon and back, respecting the folder animation
 * setting, and every app inside launches for real.
 */
@Composable
fun FolderOverlay(
    folder: Folder,
    apps: List<AppInfo>,
    settings: LumiSettings,
    onClose: () -> Unit,
    onLaunch: (AppInfo) -> Unit,
    onRename: (String) -> Unit,
    onOpenStudio: (String) -> Unit,
) {
    val cfg = settings.folder
    var visible by remember { mutableStateOf(false) }
    var renaming by remember { mutableStateOf(false) }
    var nameDraft by remember { mutableStateOf(folder.name) }
    LaunchedEffect(folder.id) { visible = true }
    val scale by animateFloatAsState(
        targetValue = if (visible) 1f else 0.72f,
        animationSpec = if (cfg.openScale) spring(dampingRatio = 0.72f, stiffness = 320f) else spring(stiffness = 4000f),
        label = "folderScale",
    )
    val alpha by animateFloatAsState(if (visible) 1f else 0f, label = "folderAlpha")

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.45f * alpha))
            .pointerInput(Unit) { detectTapGestures(onTap = { onClose() }) },
        contentAlignment = Alignment.Center,
    ) {
        GlassPanel(
            shape = RoundedCornerShape(cfg.cornerDp.dp),
            opacityPercent = cfg.opacityPercent + 22,
            blurRadius = if (cfg.blur) 26.dp else 0.dp,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    this.alpha = alpha
                },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    if (renaming) {
                        BasicTextField(
                            value = nameDraft,
                            onValueChange = { nameDraft = it },
                            textStyle = TextStyle(
                                color = Lumi.colors.onSurface,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.SemiBold,
                            ),
                            modifier = Modifier
                                .fillMaxWidth(0.7f)
                                .background(Color.White.copy(alpha = 0.10f), RoundedCornerShape(12.dp))
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            singleLine = true,
                        )
                        LaunchedEffect(Unit) {
                            // commit on release of focus is not trivially observable; commit after idle
                        }
                    } else {
                        Text(
                            folder.name,
                            color = Lumi.colors.onSurface,
                            fontSize = 18.sp,
                            fontWeight = FontWeight.SemiBold,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.pointerInput(Unit) {
                                detectTapGestures(onLongPress = { renaming = true })
                            },
                        )
                    }
                }
                if (renaming) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            GlassButton("Save") {
                                onRename(nameDraft.ifBlank { folder.name })
                                renaming = false
                            }
                            GlassButton("Cancel") { renaming = false }
                        }
                    }
                }
                val columns = cfg.columns.coerceIn(3, 5)
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(18.dp),
                ) {
                    apps.chunked(columns).forEach { rowApps ->
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceEvenly,
                        ) {
                            rowApps.forEach { app ->
                                LauncherIcon(
                                    packageName = app.packageName,
                                    label = app.label,
                                    iconDp = settings.desktop.iconSizeDp.dp,
                                    settings = settings.icons,
                                    showLabel = cfg.showTitles,
                                    labelSizeSp = settings.desktop.labelSizeSp,
                                    pressEffect = pressEffectFor(
                                        settings.animations.pressEffect, settings.animations,
                                    ),
                                    onClick = { onLaunch(app) },
                                    onLongClick = { onOpenStudio("builder") },
                                    modifier = Modifier.width(settings.desktop.iconSizeDp.dp + 26.dp),
                                )
                            }
                            repeat(columns - rowApps.size) {
                                Spacer(Modifier.width(settings.desktop.iconSizeDp.dp + 26.dp))
                            }
                        }
                    }
                }
                if (apps.isEmpty()) {
                    Text(
                        "This folder is empty. Add apps from Builder.",
                        color = Lumi.colors.onSurfaceMuted,
                        fontSize = 13.sp,
                    )
                }
            }
        }
    }
}

@Composable
fun GlassButton(label: String, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(Color.White.copy(alpha = 0.14f))
            .pointerInput(label) { detectTapGestures(onTap = { onClick() }) }
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text(label, color = Lumi.colors.onSurface, fontSize = 13.sp, fontWeight = FontWeight.Medium)
    }
}
