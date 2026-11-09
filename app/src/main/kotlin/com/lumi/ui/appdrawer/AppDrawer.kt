package com.lumi.ui.appdrawer

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.data.AppInfo
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.model.SortMode
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.launcher.AppIcon
import com.lumi.ui.launcher.LauncherIcon
import com.lumi.ui.launcher.LauncherViewModel
import com.lumi.ui.launcher.pressEffectFor

/**
 * App drawer built on a real PackageManager query: search, three sort modes, categories derived from
 * the packages actually installed, hidden apps managed from here, and configurable grid/blur.
 */
@Composable
fun AppDrawer(
    viewModel: LauncherViewModel,
    settings: LumiSettings,
    apps: List<AppInfo>,
    onClose: () -> Unit,
    onOpenStudio: (String) -> Unit,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val cfg = settings.drawer
    var query by remember { mutableStateOf("") }
    var showHidden by remember { mutableStateOf(false) }
    val hidden = remember { app.workspace.let { runCatching { viewModel.hiddenPackages() }.getOrDefault(emptySet()) } }
    var hiddenSet by remember { mutableStateOf(hidden) }
    val listState = rememberLazyListState()

    var appeared by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        kotlinx.coroutines.delay(40)
        appeared = true
    }
    val enter by animateFloatAsState(
        targetValue = if (appeared) 1f else 0f,
        animationSpec = spring(dampingRatio = 0.8f, stiffness = 260f),
        label = "drawerEnter",
    )

    val visibleApps = apps
        .filter { if (showHidden) it.packageName in hiddenSet else it.packageName !in hiddenSet }
        .filter {
            query.isBlank() ||
                it.label.contains(query, true) ||
                it.packageName.contains(query, true)
        }
        .let { list ->
            when (cfg.sortMode) {
                SortMode.NAME -> list.sortedBy { it.label.lowercase() }
                SortMode.RECENT -> list.sortedByDescending { it.firstInstallTime }
                SortMode.FREQUENT -> list.sortedByDescending { viewModel.stats[it.packageName]?.launchCount ?: 0 }
            }
        }

    val favorites = visibleApps
        .sortedByDescending { viewModel.stats[it.packageName]?.launchCount ?: 0 }
        .filter { (viewModel.stats[it.packageName]?.launchCount ?: 0) > 2 }
        .take(4)

    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = (cfg.opacityPercent / 100f) * 0.5f)),
    ) {
        Column(
            Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .graphicsLayer {
                    translationY = (1f - enter) * 90f
                    alpha = enter
                }
                .padding(horizontal = 16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp)) {
                Text(
                    tr("drawer.title"),
                    color = Lumi.colors.onSurface,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    "${visibleApps.size} ${tr("drawer.apps_count")}",
                    color = Lumi.colors.onSurfaceMuted,
                    fontSize = 12.sp,
                    modifier = Modifier.padding(end = 12.dp),
                )
                Icon(
                    Icons.Rounded.Close,
                    null,
                    tint = Lumi.colors.onSurface,
                    modifier = Modifier
                        .size(34.dp)
                        .clip(RoundedCornerShape(50))
                        .clickable { onClose() }
                        .padding(6.dp),
                )
            }

            if (cfg.showSearch) {
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(Color.White.copy(alpha = 0.10f))
                        .padding(horizontal = 14.dp, vertical = 11.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Search, null, tint = Lumi.colors.onSurfaceMuted, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(10.dp))
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        textStyle = TextStyle(color = Lumi.colors.onSurface, fontSize = 15.sp),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        decorationBox = { inner ->
                            if (query.isEmpty()) {
                                Text(tr("drawer.search_hint"), color = Lumi.colors.onSurfaceMuted, fontSize = 15.sp)
                            }
                            inner()
                        },
                    )
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(vertical = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                SortChip(tr("drawer.sort.name"), cfg.sortMode == SortMode.NAME) {
                    viewModel.setDrawerSort(SortMode.NAME)
                }
                SortChip(tr("drawer.sort.recent"), cfg.sortMode == SortMode.RECENT) {
                    viewModel.setDrawerSort(SortMode.RECENT)
                }
                SortChip(tr("drawer.sort.frequent"), cfg.sortMode == SortMode.FREQUENT) {
                    viewModel.setDrawerSort(SortMode.FREQUENT)
                }
                SortChip(if (showHidden) tr("drawer.hidden") else "Hidden", showHidden) {
                    showHidden = !showHidden
                }
            }

            if (cfg.showFavorites && favorites.isNotEmpty() && query.isBlank() && !showHidden) {
                Text(
                    tr("drawer.favorites"),
                    color = Lumi.colors.onSurfaceMuted,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
                Row(
                    Modifier.fillMaxWidth().padding(bottom = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    favorites.forEach { fav ->
                        LauncherIcon(
                            packageName = fav.packageName,
                            label = fav.label,
                            iconDp = cfg.iconSizeDp.dp,
                            settings = settings.icons,
                            showLabel = true,
                            labelSizeSp = cfg.labelSizeSp,
                            pressEffect = pressEffectFor(settings.animations.pressEffect, settings.animations),
                            onClick = { viewModel.launch(fav) },
                            onLongClick = { viewModel.showToast("Long press in the grid to hide") },
                            modifier = Modifier.width(cfg.iconSizeDp.dp + 22.dp),
                        )
                    }
                }
            }

            if (visibleApps.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(tr("drawer.no_results"), color = Lumi.colors.onSurfaceMuted, fontSize = 14.sp)
                }
            } else {
                val columns = cfg.columns.coerceIn(3, 6)
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 40.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp),
                ) {
                    items(visibleApps.chunked(columns), key = { it.first().packageName }) { rowApps ->
                        Row(
                            Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                        ) {
                            rowApps.forEach { a ->
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    modifier = Modifier
                                        .width((360f / columns).dp.coerceAtMost(100.dp))
                                        .pointerInput(a.packageName) {
                                            detectTapGestures(
                                                onTap = { viewModel.launch(a) },
                                                onLongPress = {
                                                    viewModel.toggleHidden(a.packageName, hiddenSet)
                                                    hiddenSet = if (a.packageName in hiddenSet) hiddenSet - a.packageName else hiddenSet + a.packageName
                                                    viewModel.showToast(
                                                        if (a.packageName in hiddenSet) "${a.label} hidden" else "${a.label} restored"
                                                    )
                                                },
                                            )
                                        },
                                ) {
                                    AppIcon(a.packageName, cfg.iconSizeDp.dp, settings.icons)
                                    Spacer(Modifier.height(6.dp))
                                    Text(
                                        a.label,
                                        color = Lumi.colors.onSurface.copy(alpha = 0.9f),
                                        fontSize = cfg.labelSizeSp.sp,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis,
                                        textAlign = TextAlign.Center,
                                        modifier = Modifier.width((360f / columns).dp.coerceAtMost(100.dp)),
                                    )
                                }
                            }
                            repeat(columns - rowApps.size) {
                                Spacer(Modifier.width((360f / columns).dp.coerceAtMost(100.dp)))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SortChip(label: String, active: Boolean, onClick: () -> Unit) {
    Box(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(
                if (active) Lumi.colors.accent.copy(alpha = 0.28f) else Color.White.copy(alpha = 0.08f)
            )
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            color = if (active) Lumi.colors.onSurface else Lumi.colors.onSurfaceMuted,
            fontSize = 12.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}
