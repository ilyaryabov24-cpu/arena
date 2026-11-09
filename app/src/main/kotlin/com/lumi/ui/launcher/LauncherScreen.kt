package com.lumi.ui.launcher

import android.app.Activity
import android.graphics.Bitmap
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Apps
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Wallpaper
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.compositeOver
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lumi.ui.controlcenter.ControlCenterPanel
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.i18n.LocalLang
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.model.DrawerAnimType
import com.lumi.ui.core.model.GestureActionType
import com.lumi.ui.core.model.GestureType
import com.lumi.ui.core.model.IconSettings
import com.lumi.ui.core.model.PageTransitionType
import com.lumi.ui.core.model.PerfProfile
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.core.ui.LumiTheme
import com.lumi.ui.notifications.NotificationCenterPanel
import com.lumi.ui.statusbar.StatusTopBar
import com.lumi.ui.wallpapers.WallpaperRenderer
import com.lumi.ui.widgets.LumiWidgetRenderer
import com.lumi.ui.widgets.SystemWidgetHostView
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.min

/**
 * The complete home screen. Everything here is functional: pages page, dock launches apps, folders
 * open, widgets render live, gestures trigger the actions bound in Gesture Studio, and the whole
 * thing reacts to the settings tree in real time.
 */
@Composable
fun LauncherScreen(
    viewModel: LauncherViewModel,
    activity: Activity,
    onOpenStudio: (String) -> Unit,
    onPickWidget: (onPicked: (Int) -> Unit) -> Unit,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val settings by viewModel.settings.collectAsStateWithLifecycle()
    val apps by viewModel.apps.collectAsStateWithLifecycle()
    val items by viewModel.items.collectAsStateWithLifecycle()
    val dock by viewModel.dock.collectAsStateWithLifecycle()
    val folders by viewModel.folders.collectAsStateWithLifecycle()
    val overlay by viewModel.overlay.collectAsStateWithLifecycle()
    val editing by viewModel.editing.collectAsStateWithLifecycle()
    val openFolder by viewModel.openFolder.collectAsStateWithLifecycle()
    val toast by viewModel.toast.collectAsStateWithLifecycle()
    val pagerState = rememberPagerState(pageCount = { settings.desktop.pages.coerceAtLeast(1) })
    val scope = rememberCoroutineScope()
    val page = pagerState.currentPage

    LaunchedEffect(page) { viewModel.setPage(page) }
    LaunchedEffect(apps.size) { viewModel.refreshAll() }

    // Wallpaper bitmap (source image or procedural gradient), rendered once per settings change
    var wallpaper by remember { mutableStateOf<Bitmap?>(null) }
    val density = LocalDensity.current
    val configuration = LocalConfiguration.current
    val screenW = with(density) { configuration.screenWidthDp.dp.roundToPx() }
    val screenH = with(density) { configuration.screenHeightDp.dp.roundToPx() }
    LaunchedEffect(settings.wallpaper.imagePath, settings.wallpaper.filter, app.settings.state.value.accent) {
        val path = settings.wallpaper.imagePath
        wallpaper = if (path != null) {
            WallpaperRenderer.render(context, path, settings.wallpaper.filter, screenW, screenH)
        } else {
            null
        }
    }

    // Tilt / parallax from the accelerometer, only while visible and if allowed
    var tilt by remember { mutableStateOf(Offset.Zero) }
    val perf = app.perf
    val allowParallax = settings.wallpaper.parallaxOnScroll && perf.profile.value != PerfProfile.EFFICIENCY
    DisposableEffect(allowParallax) {
        var listener: android.hardware.SensorEventListener? = null
        var manager: android.hardware.SensorManager? = null
        if (allowParallax) {
            manager = context.getSystemService(android.content.Context.SENSOR_SERVICE) as android.hardware.SensorManager
            val sensor = manager.getDefaultSensor(android.hardware.Sensor.TYPE_ACCELEROMETER)
            if (sensor != null) {
                listener = object : android.hardware.SensorEventListener {
                    override fun onSensorChanged(event: android.hardware.SensorEvent) {
                        val x = (-event.values[0] / 9.81f).coerceIn(-1f, 1f)
                        val y = ((event.values[1] - 9.81f) / 9.81f).coerceIn(-1f, 1f)
                        tilt = Offset(tilt.x + (x - tilt.x) * 0.12f, tilt.y + (y - tilt.y) * 0.12f)
                    }

                    override fun onAccuracyChanged(sensor: android.hardware.Sensor?, accuracy: Int) = Unit
                }
                manager.registerListener(listener, sensor, android.hardware.SensorManager.SENSOR_DELAY_GAME)
            }
        }
        onDispose {
            listener?.let { manager?.unregisterListener(it) }
        }
    }

    // Scale/animation profile
    val anim = settings.animations
    val reducedMotion = anim.respectReducedMotion && isReducedMotion(context)
    val timeScale = if (reducedMotion) 0.01f else anim.globalScale

    val drawerOpen = overlay == LauncherOverlay.DRAWER
    val drawerBlur by animateFloatAsState(
        targetValue = if (drawerOpen && settings.wallpaper.effectDrawerBlur && perf.allowRealtimeBlur) 22f else 0f,
        animationSpec = tween((260 * timeScale).toInt().coerceAtLeast(1)),
        label = "drawerBlur",
    )
    val drawerDim by animateFloatAsState(
        targetValue = if (drawerOpen) 0.34f else 0f,
        animationSpec = tween((240 * timeScale).toInt().coerceAtLeast(1)),
        label = "drawerDim",
    )

    BoxWithConstraints(Modifier.fillMaxSize()) {
        Box(Modifier.fillMaxSize().background(Color(0xFF05060A))) {
            // ---------------- wallpaper ----------------
            if (wallpaper != null) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            scaleX = 1.08f
                            scaleY = 1.08f
                            translationX = (tilt.x * 18f) + (pagerState.currentPage - page) * 0f
                            translationY = tilt.y * 14f
                            alpha = if (drawerBlur > 1f) 0.55f else 1f
                        }
                ) {
                    androidx.compose.foundation.Image(
                        bitmap = wallpaper!!.asImageBitmap(),
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                }
            } else {
                LumiGradientWallpaper(settings.accent.toInt(), tilt)
            }

            // desktop dim + glass layer
            if (settings.wallpaper.effectGlassLayer) {
                Box(
                    Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.White.copy(alpha = settings.wallpaper.glassLayerOpacity * 0.6f),
                                    Color.Black.copy(alpha = settings.wallpaper.glassLayerOpacity * 0.4f),
                                )
                            )
                        )
                )
            }
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = (settings.desktop.wallpaperDim + drawerDim).coerceIn(0f, 0.85f))))
            if (drawerBlur > 0.5f) {
                Box(Modifier.fillMaxSize().blur(drawerBlur.dp))
            }

            // pull-down overlay dim (control center / notifications)
            val sheetDim by animateFloatAsState(
                targetValue = when (overlay) {
                    LauncherOverlay.CONTROL, LauncherOverlay.NOTIFICATIONS -> 0.45f
                    else -> 0f
                },
                animationSpec = tween((220 * timeScale).toInt().coerceAtLeast(1)),
                label = "sheetDim",
            )
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = sheetDim)))

            // ---------------- content ----------------
            Column(Modifier.fillMaxSize()) {
                StatusTopBar(
                    settings = settings,
                    onOpenControl = { viewModel.openOverlay(LauncherOverlay.CONTROL) },
                    onOpenNotifications = { viewModel.openOverlay(LauncherOverlay.NOTIFICATIONS) },
                    onClickStudio = { onOpenStudio("status") },
                )

                Box(Modifier.weight(1f)) {
                    val pageTransitions = settings.animations.pageTransition
                    HorizontalPager(
                        state = pagerState,
                        beyondViewportPageCount = 1,
                        pageSpacing = 0.dp,
                        modifier = Modifier.fillMaxSize(),
                    ) { pageIndex ->
                        val visible = abs(pagerState.currentPage - pageIndex) < 2
                        val offsetFraction = (pagerState.currentPageOffsetFraction + (pageIndex - pagerState.currentPage)).let {
                            if (pageIndex == pagerState.currentPage) pagerState.currentPageOffsetFraction
                            else (pageIndex - pagerState.currentPage).toFloat()
                        }
                        val depthScale = when (pageTransitions) {
                            PageTransitionType.DEPTH -> 1f - 0.10f * min(1f, abs(offsetFraction)) * settings.animations.depthOnPaging * 3f
                            PageTransitionType.ZOOM -> 1f - 0.18f * min(1f, abs(offsetFraction))
                            else -> 1f
                        }
                        val alphaVal = if (pageTransitions == PageTransitionType.FADE) 1f - 0.6f * min(1f, abs(offsetFraction)) else 1f
                        DesktopPage(
                            viewModel = viewModel,
                            settings = settings,
                            pageIndex = pageIndex,
                            items = items.filter { it.page == pageIndex },
                            folders = folders,
                            apps = apps,
                            editing = editing,
                            visible = visible,
                            onOpenWidgetPicker = {
                                viewModel.openOverlay(LauncherOverlay.WIDGET_PICKER)
                            },
                            onPickSystemWidget = {
                                onPickWidget { id -> viewModel.addSystemWidget(id, 4, 2) }
                            },
                            onOpenStudio = onOpenStudio,
                            modifier = Modifier
                                .fillMaxSize()
                                .graphicsLayer {
                                    scaleX = depthScale
                                    scaleY = depthScale
                                    alpha = alphaVal
                                },
                        )
                    }

                    if (settings.desktop.pageIndicator && settings.desktop.pages > 1) {
                        PageIndicator(
                            pages = settings.desktop.pages,
                            current = page,
                            modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = if (settings.dock.enabled) 4.dp else 18.dp),
                        )
                    }
                }

                if (settings.dock.enabled) {
                    DockView(
                        viewModel = viewModel,
                        settings = settings,
                        dock = dock,
                        apps = apps,
                        folders = folders,
                    )
                }
                Spacer(Modifier.height(settings.dock.bottomMarginDp.dp))
            }

            // ---------------- toasts ----------------
            androidx.compose.animation.AnimatedVisibility(
                visible = toast != null,
                enter = fadeIn() + slideInVertically { it / 2 },
                exit = fadeOut() + slideOutVertically { it / 2 },
                modifier = Modifier.align(Alignment.BottomCenter).padding(bottom = 140.dp),
            ) {
                LaunchedEffect(toast) {
                    kotlinx.coroutines.delay(1900)
                    viewModel.consumeToast()
                }
                GlassPanel(
                    shape = RoundedCornerShape(50),
                    opacityPercent = 70,
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp),
                ) {
                    Text(toast ?: "", color = Lumi.colors.onSurface, fontSize = 13.sp)
                }
            }

            // ---------------- overlays ----------------
            androidx.compose.animation.AnimatedVisibility(
                visible = overlay == LauncherOverlay.DRAWER,
                enter = fadeIn(tween((180 * timeScale).toInt().coerceAtLeast(1))),
                exit = fadeOut(tween((160 * timeScale).toInt().coerceAtLeast(1))),
            ) {
                AppDrawerScreen(
                    viewModel = viewModel,
                    settings = settings,
                    apps = apps,
                    folders = folders,
                    onClose = { viewModel.closeOverlay() },
                    onOpenStudio = onOpenStudio,
                )
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = overlay == LauncherOverlay.CONTROL,
                enter = slideInVertically(tween((260 * timeScale).toInt().coerceAtLeast(1))) { -it } + fadeIn(),
                exit = slideOutVertically(tween((200 * timeScale).toInt().coerceAtLeast(1))) { -it } + fadeOut(),
            ) {
                ControlCenterPanel(
                    activity = activity,
                    onClose = { viewModel.closeOverlay() },
                    onOpenStudio = onOpenStudio,
                    onOpenNotifications = { viewModel.openOverlay(LauncherOverlay.NOTIFICATIONS) },
                )
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = overlay == LauncherOverlay.NOTIFICATIONS,
                enter = slideInVertically(tween((260 * timeScale).toInt().coerceAtLeast(1))) { -it } + fadeIn(),
                exit = slideOutVertically(tween((200 * timeScale).toInt().coerceAtLeast(1))) { -it } + fadeOut(),
            ) {
                NotificationCenterPanel(
                    onClose = { viewModel.closeOverlay() },
                    onOpenControl = { viewModel.openOverlay(LauncherOverlay.CONTROL) },
                    onOpenStudio = onOpenStudio,
                )
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = overlay == LauncherOverlay.FOLDER && openFolder != null,
                enter = fadeIn(tween((150 * timeScale).toInt().coerceAtLeast(1))),
                exit = fadeOut(tween((140 * timeScale).toInt().coerceAtLeast(1))),
            ) {
                openFolder?.let { of ->
                    FolderOverlay(
                        folder = of.folder,
                        apps = viewModel.folderApps(of.folder),
                        settings = settings,
                        onClose = { viewModel.closeFolder() },
                        onLaunch = { viewModel.launch(it) },
                        onRename = { newName ->
                            viewModel.renameFolder(of.folder, newName)
                        },
                        onOpenStudio = onOpenStudio,
                    )
                }
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = overlay == LauncherOverlay.SEARCH,
                enter = fadeIn(),
                exit = fadeOut(),
            ) {
                LauncherSearchOverlay(
                    viewModel = viewModel,
                    apps = apps,
                    onClose = { viewModel.closeOverlay() },
                )
            }

            androidx.compose.animation.AnimatedVisibility(
                visible = overlay == LauncherOverlay.WIDGET_PICKER,
                enter = slideInVertically(tween(240)) { it } + fadeIn(),
                exit = slideOutVertically(tween(200)) { it } + fadeOut(),
            ) {
                WidgetPickerSheet(
                    onDismiss = { viewModel.closeOverlay() },
                    onPickSystem = {
                        onPickWidget { id -> viewModel.addSystemWidget(id, 4, 2) }
                        viewModel.closeOverlay()
                    },
                    onOpenStudio = {
                        viewModel.closeOverlay()
                        onOpenStudio("widgets")
                    },
                )
            }
        }
    }
}

@Composable
private fun LumiGradientWallpaper(accentInt: Int, tilt: Offset) {
    val accent = Color(accentInt)
    val second = accent.shiftHue2(48f)
    Box(
        Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF07080C),
                        Color(0xFF0D1220),
                        second.copy(alpha = 0.55f).compositeOver(Color(0xFF0A0C14)),
                    ),
                    start = Offset(0f + tilt.x * 90f, 0f + tilt.y * 90f),
                    end = Offset(1200f, 2200f),
                )
            )
    ) {
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        listOf(accent.copy(alpha = 0.30f), Color.Transparent),
                        center = Offset(780f + tilt.x * 60f, 320f + tilt.y * 60f),
                        radius = 900f,
                    )
                )
        )
        Box(
            Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        listOf(second.copy(alpha = 0.20f), Color.Transparent),
                        center = Offset(160f, 1700f),
                        radius = 1100f,
                    )
                )
        )
    }
}

private fun Color.shiftHue2(deg: Float): Color {
    val hsv = FloatArray(3)
    android.graphics.Color.colorToHSV(
        android.graphics.Color.rgb((red * 255).toInt(), (green * 255).toInt(), (blue * 255).toInt()), hsv,
    )
    hsv[0] = (hsv[0] + deg) % 360f
    return Color(android.graphics.Color.HSVToColor(hsv))
}

@Composable
private fun PageIndicator(pages: Int, current: Int, modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        repeat(pages) { i ->
            val w by animateDpAsState(if (i == current) 18.dp else 6.dp, label = "dot")
            Box(
                Modifier
                    .height(6.dp)
                    .width(w)
                    .clip(CircleShape)
                    .background(
                        if (i == current) Lumi.colors.onSurface.copy(alpha = 0.95f)
                        else Lumi.colors.onSurface.copy(alpha = 0.34f)
                    )
            )
        }
    }
}

@Composable
private fun DesktopPage(
    viewModel: LauncherViewModel,
    settings: com.lumi.ui.core.model.LumiSettings,
    pageIndex: Int,
    items: List<com.lumi.ui.core.data.WorkspaceItem>,
    folders: List<com.lumi.ui.core.data.Folder>,
    apps: List<com.lumi.ui.core.data.AppInfo>,
    editing: Boolean,
    visible: Boolean,
    onOpenWidgetPicker: () -> Unit,
    onPickSystemWidget: () -> Unit,
    onOpenStudio: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val desktop = settings.desktop
    val context = LocalContext.current
    val res = remember { context.resources }
    val iconSettings = settings.icons
    val press = pressEffectFor(settings.animations.pressEffect, settings.animations)
    var dragTarget by remember { mutableStateOf<com.lumi.ui.core.data.WorkspaceItem?>(null) }
    var dragOffset by remember { mutableStateOf(Offset.Zero) }
    val activity = context as? Activity

    BoxWithConstraints(modifier) {
        val widthPx = constraints.maxWidth.toFloat()
        val heightPx = constraints.maxHeight.toFloat()
        val cellW = widthPx / desktop.columns
        val cellH = heightPx / desktop.rows
        val columnMargin = with(LocalDensity.current) { desktop.horizontalMarginDp.dp.toPx() }

        val gestures = settings.gestures
        Box(
            Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures(
                        onDoubleTap = {
                            viewModel.performGesture(GestureType.DOUBLE_TAP, activity)
                        },
                        onLongPress = {
                            viewModel.toggleEditing()
                        },
                    )
                }
                .pointerInput(gestures) {
                    detectSwipeGestures(
                        onSwipeUp = { fingers -> viewModel.performGesture(if (fingers > 1) GestureType.SWIPE_UP_TWO else GestureType.SWIPE_UP, activity) },
                        onSwipeDown = { fingers -> viewModel.performGesture(if (fingers > 1) GestureType.SWIPE_DOWN_TWO else GestureType.SWIPE_DOWN, activity) },
                        onSwipeLeft = { viewModel.performGesture(GestureType.SWIPE_LEFT, activity) },
                        onSwipeRight = { viewModel.performGesture(GestureType.SWIPE_RIGHT, activity) },
                    )
                }
        ) {
            items.forEach { item ->
                val x = columnMargin + item.cellX * ((widthPx - columnMargin * 2) / desktop.columns) + ((widthPx - columnMargin * 2) / desktop.columns) * item.spanX / 2f
                val y = (desktop.topMarginDp.dp.toPx()) + item.cellY * cellH + cellH * item.spanY / 2f
                val isDragging = dragTarget?.id == item.id
                if (!isDragging) {
                    Box(
                        Modifier
                            .offset {
                                IntOffset(
                                    (x - if (item.kind == com.lumi.ui.core.data.ItemKind.APP) (with(LocalDensity.current) { (desktop.iconSizeDp.dp.toPx()) } / 2f) else (with(LocalDensity.current) { (desktop.iconSizeDp.dp.toPx() * item.spanX) } / 2f)).toInt(),
                                    (y - if (item.kind == com.lumi.ui.core.data.ItemKind.APP) (with(LocalDensity.current) { (desktop.iconSizeDp.dp.toPx()) } / 2f) else with(LocalDensity.current) { (desktop.iconSizeDp.dp.toPx() * item.spanY) } / 2f).toInt(),
                                )
                            }
                    ) {
                        DesktopItemView(
                            viewModel = viewModel,
                            item = item,
                            folder = folders.firstOrNull { it.id == item.refId },
                            apps = apps,
                            settings = settings,
                            iconSettings = iconSettings,
                            press = press,
                            editing = editing,
                            cellWidthPx = (widthPx - columnMargin * 2) / desktop.columns,
                            onStartDrag = {
                                dragTarget = item
                                viewModel.toggleEditingOffside()
                            },
                            onDrag = { delta -> dragOffset += delta },
                            onEndDrag = { dropX, dropY ->
                                val localX = dragOffset.x + x
                                val localY = dragOffset.y + y
                                val dropCol = ((localX - columnMargin) / ((widthPx - columnMargin * 2) / desktop.columns)).toInt()
                                val dropRow = (localY / cellH).toInt()
                                val targetCol = dropCol.coerceIn(0, desktop.columns - item.spanX)
                                val targetRow = dropRow.coerceIn(0, desktop.rows - item.spanY)
                                val target = items.firstOrNull {
                                    it.id != item.id &&
                                        dropCol in it.cellX until (it.cellX + it.spanX) &&
                                        dropRow in it.cellY until (it.cellY + it.spanY)
                                }
                                if (target != null && target.kind == com.lumi.ui.core.data.ItemKind.APP && item.kind == com.lumi.ui.core.data.ItemKind.APP) {
                                    viewModel.createFolder(listOf(item.id, target.id), target.id)
                                } else {
                                    viewModel.moveItem(item.id, pageIndex, targetCol, targetRow)
                                }
                                dragTarget = null
                                dragOffset = Offset.Zero
                            },
                            onOpenStudio = onOpenStudio,
                        )
                    }
                }
            }

            if (items.isEmpty() && desktop.pages == 1) {
                EmptyDesktopHint(onOpenStudio)
            }
        }
    }
}

@Composable
private fun EmptyDesktopHint(onOpenStudio: (String) -> Unit) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            tr("desktop.empty"),
            color = Lumi.colors.onSurface.copy(alpha = 0.72f),
            textAlign = TextAlign.Center,
            fontSize = 14.sp,
        )
    }
}

@Composable
private fun DesktopItemView(
    viewModel: LauncherViewModel,
    item: com.lumi.ui.core.data.WorkspaceItem,
    folder: com.lumi.ui.core.data.Folder?,
    apps: List<com.lumi.ui.core.data.AppInfo>,
    settings: com.lumi.ui.core.model.LumiSettings,
    iconSettings: IconSettings,
    press: PressEffect,
    editing: Boolean,
    cellWidthPx: Float,
    onStartDrag: () -> Unit,
    onDrag: (Offset) -> Unit,
    onEndDrag: (x: Float, y: Float) -> Unit,
    onOpenStudio: (String) -> Unit,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    var longPressed by remember { mutableStateOf(false) }
    var dragAccum by remember { mutableStateOf(Offset.Zero) }

    when (item.kind) {
        com.lumi.ui.core.data.ItemKind.APP -> {
            val info = apps.firstOrNull { it.packageName == item.refId }
            LauncherIcon(
                packageName = item.refId,
                label = item.label ?: app.apps.labelOf(item.refId),
                iconDp = settings.desktop.iconSizeDp.dp,
                settings = iconSettings,
                showLabel = settings.desktop.showLabels,
                labelSizeSp = settings.desktop.labelSizeSp,
                pressEffect = press,
                onClick = {
                    if (editing) viewModel.selectItem(item.id) else viewModel.launchPackage(item.refId)
                },
                onLongClick = {
                    viewModel.selectItem(item.id)
                },
                modifier = Modifier
                    .pointerInput(item.id, editing) {
                        awaitPointerEventScope {
                            while (true) {
                                val event = awaitPointerEvent()
                                val change = event.changes.firstOrNull() ?: continue
                                if (editing) {
                                    if (change.pressed) {
                                        dragAccum += change.positionChange()
                                        if (dragAccum.getDistance() > 6f) onDrag(change.positionChange())
                                    } else if (dragAccum.getDistance() > 6f) {
                                        onEndDrag(change.position.x, change.position.y)
                                        dragAccum = Offset.Zero
                                    }
                                }
                            }
                        }
                    },
            )
        }
        com.lumi.ui.core.data.ItemKind.FOLDER -> {
            folder?.let { f ->
                FolderIconView(
                    folder = f,
                    apps = viewModel.folderApps(f),
                    settings = settings,
                    iconSettings = iconSettings,
                    sizeDp = settings.desktop.iconSizeDp.dp,
                    showLabel = settings.desktop.showLabels && settings.folder.showTitles,
                    onClick = { viewModel.openFolder(f) },
                    onLongClick = { viewModel.selectItem(item.id) },
                )
            }
        }
        com.lumi.ui.core.data.ItemKind.WIDGET_LUMI -> {
            val docId = item.refId.toLongOrNull() ?: -1
            var doc by remember(docId) { mutableStateOf<com.lumi.ui.core.model.WidgetDoc?>(null) }
            LaunchedEffect(docId, item.id) {
                doc = app.db.widgetDocs().byId(docId)?.let { com.lumi.ui.core.data.DbConverters.widgetFromJson(it.json) }
            }
            doc?.let { d ->
                val w = (cellWidthPx * item.spanX) - 16.dp.toPx()
                val h = settings.desktop.iconSizeDp.dp.toPx() * item.spanY
                LumiWidgetRenderer(
                    doc = d,
                    modifier = Modifier
                        .width(with(LocalDensity.current) { w.toDp() })
                        .height(with(LocalDensity.current) { h.toDp() })
                        .pointerInput(item.id) {
                            detectTapGestures(
                                onTap = { if (editing) viewModel.selectItem(item.id) else onOpenStudio("widgets") },
                                onLongPress = { viewModel.selectItem(item.id) },
                            )
                        },
                )
            }
        }
        com.lumi.ui.core.data.ItemKind.WIDGET_SYSTEM -> {
            val host = (context as? LauncherActivity)?.widgetHost
            if (host != null) {
                SystemWidgetHostView(
                    widgetId = item.appWidgetId,
                    host = host,
                    spanX = item.spanX,
                    spanY = item.spanY,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }
    }
}

@Composable
private fun AppDrawerScreen(
    viewModel: LauncherViewModel,
    settings: com.lumi.ui.core.model.LumiSettings,
    apps: List<com.lumi.ui.core.data.AppInfo>,
    folders: List<com.lumi.ui.core.data.Folder>,
    onClose: () -> Unit,
    onOpenStudio: (String) -> Unit,
) {
    com.lumi.ui.appdrawer.AppDrawer(
        viewModel = viewModel,
        settings = settings,
        apps = apps,
        onClose = onClose,
        onOpenStudio = onOpenStudio,
    )
}

/** Reads the animation profile into concrete press parameters. */
fun pressEffectFor(type: com.lumi.ui.core.model.PressEffectType, anim: com.lumi.ui.core.model.AnimationSettings): PressEffect =
    when (type) {
        com.lumi.ui.core.model.PressEffectType.BOUNCE -> PressEffect(0.90f, 0.42f, 640f, false)
        com.lumi.ui.core.model.PressEffectType.RIPPLE -> PressEffect(0.97f, 0.7f, 900f, false)
        com.lumi.ui.core.model.PressEffectType.SCALE -> PressEffect(0.93f, 0.8f, 500f, false)
        com.lumi.ui.core.model.PressEffectType.GLOW -> PressEffect(0.95f, 0.6f, 700f, true)
        com.lumi.ui.core.model.PressEffectType.LIQUID -> PressEffect(0.91f, 0.34f, 420f, true)
        com.lumi.ui.core.model.PressEffectType.GLASS_RIPPLE -> PressEffect(0.96f, 0.55f, 780f, true)
        com.lumi.ui.core.model.PressEffectType.ELASTIC -> PressEffect(0.88f, 0.28f, 520f, false)
        com.lumi.ui.core.model.PressEffectType.SPRING -> PressEffect(0.94f, 0.55f, 720f, false)
        com.lumi.ui.core.model.PressEffectType.MAGNETIC -> PressEffect(0.92f, 0.45f, 620f, true)
    }

fun isReducedMotion(context: android.content.Context): Boolean = runCatching {
    android.provider.Settings.Global.getFloat(context.contentResolver, android.provider.Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
}.getOrDefault(false)

/** Multi-finger aware swipe detection used for the desktop gestures. */
suspend fun androidx.compose.ui.input.pointer.PointerInputScope.detectSwipeGestures(
    thresholdPx: Float = 90f,
    onSwipeUp: (fingers: Int) -> Unit,
    onSwipeDown: (fingers: Int) -> Unit,
    onSwipeLeft: () -> Unit,
    onSwipeRight: () -> Unit,
) {
    awaitPointerEventScope {
        while (true) {
            val down = awaitFirstDown(requireUnconsumed = false)
            var pointerCount = 1
            var total = Offset.Zero
            var last = down.position
            var active = true
            while (active) {
                val event = awaitPointerEvent()
                pointerCount = maxOf(pointerCount, event.changes.count { it.pressed })
                val change = event.changes.firstOrNull { it.id == down.id }
                if (change == null) {
                    active = false
                } else {
                    if (change.pressed) {
                        total += change.position - last
                        last = change.position
                    }
                    if (!change.pressed) active = false
                }
            }
            if (total.getDistance() > thresholdPx) {
                if (abs(total.y) > abs(total.x)) {
                    if (total.y < 0) onSwipeUp(pointerCount) else onSwipeDown(pointerCount)
                } else {
                    if (total.x < 0) onSwipeLeft() else onSwipeRight()
                }
            }
        }
    }
}


