package com.lumi.ui.core.model

import kotlinx.serialization.Serializable

/* -------------------------------------------------------------------------------------------------
 * Serializable configuration model.
 *
 * Everything the user can change lives here (or in Room for collections). The whole tree is stored
 * as JSON in DataStore, which gives us atomic writes, schema defaults for free and instant
 * export/import of "presets" and whole themes.
 * ---------------------------------------------------------------------------------------------- */

@Serializable
enum class PerfProfile { EFFICIENCY, BALANCED, ULTRA }

@Serializable
enum class IconShapeType { SQUIRCLE, CIRCLE, ROUNDED, HEXAGON, FLOWER, TEARDROP }

@Serializable
enum class IconStyleType { SYSTEM, IOS, COLOROS, HYPEROS, MINIMAL, GLASS, MONOCHROME, GRADIENT, CUSTOM }

@Serializable
enum class PageTransitionType { DEPTH, SLIDE, FADE, ZOOM, CUBE, NONE }

@Serializable
enum class PressEffectType { BOUNCE, RIPPLE, SCALE, GLOW, LIQUID, GLASS_RIPPLE, ELASTIC, SPRING, MAGNETIC }

@Serializable
enum class LaunchAnimType { SCALE_FROM_ICON, FADE_SCALE, SPRING_ZOOM, EXPAND, FADE_THROUGH, MORPH }

@Serializable
enum class DrawerAnimType { SLIDE_UP, FADE, ZOOM, BLUR_EXPAND }

@Serializable
enum class FolderStyleType { STANDARD, GLASS, BLURRED, LARGE }

@Serializable
enum class GestureType {
    SWIPE_UP, SWIPE_DOWN, DOUBLE_TAP, LONG_PRESS, TWO_FINGER_UP, TWO_FINGER_DOWN,
    SWIPE_LEFT, SWIPE_RIGHT, SWIPE_UP_TWO, SWIPE_DOWN_TWO
}

@Serializable
enum class GestureActionType {
    NONE, DRAWER, SEARCH, CONTROL_CENTER, NOTIFICATION_CENTER, WIDGET_STUDIO,
    WALLPAPER_STUDIO, SETTINGS, APP, PAGE_NEXT, PAGE_PREV, FOLDER, LOCK_SCREEN
}

@Serializable
enum class TileType {
    WIFI, BLUETOOTH, MOBILE_DATA, AIRPLANE, FLASHLIGHT, BRIGHTNESS, VOLUME, DND,
    ROTATE, BATTERY_SAVER, MUSIC, TIMER, CALCULATOR, SETTINGS, LUMI, NOTIFICATIONS, WALLPAPER
}

@Serializable
enum class TileSize { SMALL, WIDE, LARGE }

@Serializable
enum class StatusIconMode { AUTO, LIGHT, DARK }

@Serializable
enum class SortMode { NAME, RECENT, FREQUENT }

/* ---------------------------------- desktop / launcher ---------------------------------------- */

@Serializable
data class GridSpec(val columns: Int = 4, val rows: Int = 6) {
    companion object {
        val presets = listOf(
            GridSpec(4, 5), GridSpec(4, 6), GridSpec(5, 6), GridSpec(5, 7), GridSpec(6, 7),
        )

        fun fromKey(key: String): GridSpec = presets.firstOrNull { "${it.columns}x${it.rows}" == key } ?: GridSpec()
    }

    val key: String get() = "${columns}x${rows}"
}

@Serializable
data class DesktopSettings(
    val columns: Int = 4,
    val rows: Int = 6,
    val iconSizeDp: Int = 58,
    val spacingDp: Int = 10,
    val showLabels: Boolean = true,
    val labelSizeSp: Int = 11,
    val horizontalMarginDp: Int = 16,
    val topMarginDp: Int = 10,
    val bottomGapDp: Int = 8,
    val pages: Int = 3,
    val parallax: Boolean = true,
    val wallpaperDim: Float = 0.10f,
    val pageIndicator: Boolean = true,
    val folderLabel: Boolean = true,
    val gridKey: String get() = "${columns}x${rows}",
)

@Serializable
data class DockSettings(
    val enabled: Boolean = true,
    val iconSizeDp: Int = 56,
    val spacingDp: Int = 12,
    val cornerDp: Int = 30,
    val heightDp: Int = 86,
    val opacityPercent: Int = 26,
    val glassTint: Long = 0xFFFFFFFF,
    val blur: Boolean = true,
    val gradient: Boolean = true,
    val shadow: Boolean = true,
    val pressEffect: Boolean = true,
    val float: Boolean = true,
    val transparencyOfIcons: Boolean = false,
    val background: Long = 0x00000000,
    val bottomMarginDp: Int = 8,
    val showLabel: Boolean = false,
)

@Serializable
data class FolderSettings(
    val style: FolderStyleType = FolderStyleType.GLASS,
    val cornerDp: Int = 30,
    val columns: Int = 4,
    val opacityPercent: Int = 32,
    val blur: Boolean = true,
    val openScale: Boolean = true,
    val closeAnimation: Boolean = true,
    val accentTint: Long = 0x00000000,
    val showTitles: Boolean = true,
    val iconPreviewCount: Int = 4,
)

/* ---------------------------------- app drawer ------------------------------------------------ */

@Serializable
data class DrawerSettings(
    val sortMode: SortMode = SortMode.NAME,
    val iconSizeDp: Int = 56,
    val columns: Int = 4,
    val opacityPercent: Int = 55,
    val blur: Boolean = true,
    val anim: DrawerAnimType = DrawerAnimType.BLUR_EXPAND,
    val showSearch: Boolean = true,
    val showFavorites: Boolean = true,
    val showCategories: Boolean = true,
    val background: Long = 0x00000000,
    val cornerDp: Int = 30,
    val labelSizeSp: Int = 11,
)

/* ---------------------------------- animations ------------------------------------------------ */

@Serializable
data class AnimationSettings(
    val profile: String = "hyperos",
    val globalScale: Float = 1f,
    val pageTransition: PageTransitionType = PageTransitionType.DEPTH,
    val pressEffect: PressEffectType = PressEffectType.SPRING,
    val launchAnim: LaunchAnimType = LaunchAnimType.SCALE_FROM_ICON,
    val drawerAnim: DrawerAnimType = DrawerAnimType.BLUR_EXPAND,
    val folderAnim: String = "spring",
    val iconStagger: Boolean = true,
    val iconStaggerMs: Int = 22,
    val depthOnPaging: Float = 0.22f,
    val respectReducedMotion: Boolean = true,
    val bounceStrength: Float = 1f,
    val rippleRadiusDp: Int = 120,
    val glowIntensity: Float = 0.5f,
    val elasticTension: Float = 0.65f,
    val pageSpringStiffness: Float = 320f,
    val pageSpringDamping: Float = 0.86f,
    val appOpenDurationMs: Int = 320,
    val appCloseDurationMs: Int = 240,
    val hapticOnPress: Boolean = true,
    val separateSpeeds: Boolean = false,
    val launchSpeed: Float = 1f,
    val pageSpeed: Float = 1f,
    val pressSpeed: Float = 1f,
)

/* ---------------------------------- icons ----------------------------------------------------- */

@Serializable
data class IconSettings(
    val style: IconStyleType = IconStyleType.SYSTEM,
    val shape: IconShapeType = IconShapeType.SQUIRCLE,
    val scale: Float = 1f,
    val cornerPercent: Int = 22,
    val tintAccent: Boolean = false,
    val monochrome: Boolean = false,
    val grayscale: Boolean = false,
    val shadow: Boolean = true,
    val background: Long = 0x00000000,
    val paddingPercent: Int = 6,
    val activePackPackage: String? = null,
    val labelColor: Long = 0xFFFFFFFF,
    val darken: Float = 0f,
    val saturation: Float = 1f,
)

/* ---------------------------------- wallpaper ------------------------------------------------- */

@Serializable
data class WallpaperFilter(
    val brightness: Float = 0f,
    val contrast: Float = 1f,
    val saturation: Float = 1f,
    val warmth: Float = 0f,
    val blur: Float = 0f,
    val dim: Float = 0f,
    val vignette: Float = 0f,
    val grain: Float = 0f,
    val tintColor: Long = 0x00000000,
    val tintStrength: Float = 0f,
    val scale: Float = 1f,
    val rotation: Float = 0f,
    val offsetX: Float = 0f,
    val offsetY: Float = 0f,
)

@Serializable
data class WallpaperSettings(
    val imagePath: String? = null,
    val lockImagePath: String? = null,
    val filter: WallpaperFilter = WallpaperFilter(),
    val lockFilter: WallpaperFilter = WallpaperFilter(),
    val depthEnabled: Boolean = false,
    val depthStrength: Float = 0.5f,
    val parallaxOnScroll: Boolean = true,
    val effectDrawerBlur: Boolean = true,
    val effectPageDepth: Boolean = true,
    val effectGlassLayer: Boolean = false,
    val effectReactive: Boolean = false,
    val glassLayerOpacity: Float = 0.12f,
    val liveProjectId: Long? = null,
    val useLiveWallpaper: Boolean = false,
)

/* ---------------------------------- widgets --------------------------------------------------- */

@Serializable
data class WidgetSettings(
    val globalOpacityPercent: Int = 40,
    val globalBlur: Int = 26,
    val globalCornerDp: Int = 28,
    val glassTint: Long = 0xFFFFFFFF,
    val borderAlpha: Float = 1f,
    val highlight: Float = 0.6f,
    val shadow: Boolean = true,
    val warmGlass: Boolean = false,
    val updateSeconds: Boolean = true,
    val weatherCity: String = "",
    val weatherLat: Double? = null,
    val weatherLon: Double? = null,
    val weatherManualTemp: Int? = null,
)

/* ---------------------------------- control center -------------------------------------------- */

@Serializable
data class ControlTile(
    val type: TileType,
    val size: TileSize = TileSize.SMALL,
    val enabled: Boolean = true,
    val tint: Long = 0x00000000,
    val customLabel: String? = null,
    val customAppPackage: String? = null,
    val customIcon: String? = null,
)

@Serializable
data class ControlSettings(
    val tiles: List<ControlTile> = defaultTiles(),
    val opacityPercent: Int = 42,
    val cornerDp: Int = 30,
    val blur: Boolean = true,
    val tint: Long = 0x00000000,
    val columns: Int = 2,
    val showGreeting: Boolean = true,
) {
    companion object {
        fun defaultTiles() = listOf(
            ControlTile(TileType.WIFI),
            ControlTile(TileType.BLUETOOTH),
            ControlTile(TileType.FLASHLIGHT),
            ControlTile(TileType.DND),
            ControlTile(TileType.BRIGHTNESS, TileSize.WIDE),
            ControlTile(TileType.VOLUME, TileSize.WIDE),
            ControlTile(TileType.MUSIC, TileSize.LARGE),
            ControlTile(TileType.ROTATE),
            ControlTile(TileType.AIRPLANE),
            ControlTile(TileType.BATTERY_SAVER),
            ControlTile(TileType.TIMER),
            ControlTile(TileType.CALCULATOR),
            ControlTile(TileType.LUMI),
            ControlTile(TileType.SETTINGS),
        )
    }
}

/* ---------------------------------- notifications --------------------------------------------- */

@Serializable
data class NotifSettings(
    val opacityPercent: Int = 48,
    val cornerDp: Int = 26,
    val blur: Boolean = true,
    val tint: Long = 0x00000000,
    val showIcons: Boolean = true,
    val showTime: Boolean = true,
    val group: Boolean = true,
    val dense: Boolean = false,
    val accentTint: Boolean = true,
)

/* ---------------------------------- status / lock --------------------------------------------- */

@Serializable
data class StatusSettings(
    val showClock: Boolean = true,
    val showDate: Boolean = true,
    val showWeather: Boolean = false,
    val showBattery: Boolean = true,
    val showMusic: Boolean = false,
    val showEvents: Boolean = false,
    val iconMode: StatusIconMode = StatusIconMode.AUTO,
    val island: Boolean = true,
    val islandStyle: String = "pill",
    val respectCutout: Boolean = true,
    val clockStyle: String = "ios",
    val topHeightDp: Int = 64,
    val showSystemIcons: Boolean = true,
)

@Serializable
data class LockSettings(
    val clockStyle: String = "big",
    val clockColor: Long = 0xFFFFFFFF,
    val clockGradient: Boolean = false,
    val clockPositionY: Float = 0.22f,
    val clockScale: Float = 1f,
    val showDate: Boolean = true,
    val showWidgets: Boolean = true,
    val showNotificationCount: Boolean = true,
    val blurWallpaper: Boolean = false,
    val dimWallpaper: Float = 0.15f,
)

/* ---------------------------------- gestures -------------------------------------------------- */

@Serializable
data class GestureBinding(
    val action: GestureActionType = GestureActionType.NONE,
    val payload: String? = null,
)

@Serializable
data class GesturesSettings(
    val bindings: Map<String, GestureBinding> = defaultBindings(),
) {
    fun binding(gesture: GestureType): GestureBinding =
        bindings[gesture.name] ?: GestureBinding()

    fun with(gesture: GestureType, binding: GestureBinding): GesturesSettings =
        copy(bindings = bindings + (gesture.name to binding))

    companion object {
        fun defaultBindings(): Map<String, GestureBinding> = mapOf(
            GestureType.SWIPE_UP.name to GestureBinding(GestureActionType.DRAWER),
            GestureType.SWIPE_DOWN.name to GestureBinding(GestureActionType.NOTIFICATION_CENTER),
            GestureType.DOUBLE_TAP.name to GestureBinding(GestureActionType.NONE),
            GestureType.LONG_PRESS.name to GestureBinding(GestureActionType.NONE),
            GestureType.TWO_FINGER_UP.name to GestureBinding(GestureActionType.CONTROL_CENTER),
            GestureType.TWO_FINGER_DOWN.name to GestureBinding(GestureActionType.NOTIFICATION_CENTER),
            GestureType.SWIPE_LEFT.name to GestureBinding(GestureActionType.NONE),
            GestureType.SWIPE_RIGHT.name to GestureBinding(GestureActionType.NONE),
            GestureType.SWIPE_UP_TWO.name to GestureBinding(GestureActionType.NONE),
            GestureType.SWIPE_DOWN_TWO.name to GestureBinding(GestureActionType.NONE),
        )
    }
}

/* ---------------------------------- root settings --------------------------------------------- */

@Serializable
data class LumiSettings(
    val accent: Long = 0xFF7FA9FF,
    val darkTheme: Boolean = true,
    val language: String = "system",
    val performance: PerfProfile = PerfProfile.BALANCED,
    val adaptivePerformance: Boolean = true,
    val fpsCap: Int = 0,
    val onboardingDone: Boolean = false,
    val activeThemeId: Long? = null,
    val activeThemeName: String = "Aurora",
    val desktop: DesktopSettings = DesktopSettings(),
    val dock: DockSettings = DockSettings(),
    val folder: FolderSettings = FolderSettings(),
    val drawer: DrawerSettings = DrawerSettings(),
    val animations: AnimationSettings = AnimationSettings(),
    val icons: IconSettings = IconSettings(),
    val wallpaper: WallpaperSettings = WallpaperSettings(),
    val widgets: WidgetSettings = WidgetSettings(),
    val control: ControlSettings = ControlSettings(),
    val notifications: NotifSettings = NotifSettings(),
    val status: StatusSettings = StatusSettings(),
    val lock: LockSettings = LockSettings(),
    val gestures: GesturesSettings = GesturesSettings(),
    val lastBuilderTab: Int = 0,
    val showSystemPill: Boolean = false,
)

/* ---------------------------------- themes ---------------------------------------------------- */

@Serializable
data class LumiTheme(
    val id: Long = 0,
    val name: String = "Untitled",
    val builtin: Boolean = false,
    val accent: Long = 0xFF7FA9FF,
    val darkTheme: Boolean = true,
    val desktop: DesktopSettings = DesktopSettings(),
    val dock: DockSettings = DockSettings(),
    val folder: FolderSettings = FolderSettings(),
    val drawer: DrawerSettings = DrawerSettings(),
    val animations: AnimationSettings = AnimationSettings(),
    val icons: IconSettings = IconSettings(),
    val wallpaper: WallpaperFilter = WallpaperFilter(),
    val wallpaperGradient: List<Long> = emptyList(),
    val widgets: WidgetSettings = WidgetSettings(),
    val control: ControlSettings = ControlSettings(),
    val notifications: NotifSettings = NotifSettings(),
    val status: StatusSettings = StatusSettings(),
    val lock: LockSettings = LockSettings(),
    val createdAt: Long = System.currentTimeMillis(),
)

/* ---------------------------------- custom widget document ------------------------------------ */

@Serializable
enum class WidgetElementType { TEXT, CLOCK, DATE, BATTERY, WEATHER, SHAPE, IMAGE, ICON, PROGRESS, MUSIC, CALENDAR, CUSTOM_TEXT, GRADIENT }

@Serializable
enum class ClipboardAlign { START, CENTER, END }

@Serializable
data class WidgetElement(
    val id: String = java.util.UUID.randomUUID().toString(),
    val type: WidgetElementType = WidgetElementType.TEXT,
    val x: Float = 0.5f,
    val y: Float = 0.5f,
    val width: Float = 0.8f,
    val height: Float = 0.3f,
    val scale: Float = 1f,
    val rotation: Float = 0f,
    val opacity: Float = 1f,
    val color: Long = 0xFFFFFFFF,
    val colorSecondary: Long = 0x00000000,
    val gradient: Boolean = false,
    val fontSizeSp: Float = 28f,
    val fontWeight: Int = 500,
    val letterSpacing: Float = 0f,
    val align: ClipboardAlign = ClipboardAlign.CENTER,
    val text: String = "",
    val format: String = "",
    val cornerDp: Float = 16f,
    val blur: Float = 0f,
    val shadow: Boolean = false,
    val glow: Float = 0f,
    val borderWidth: Float = 1f,
    val borderColor: Long = 0x33FFFFFF,
    val fill: Boolean = true,
    val visible: Boolean = true,
    val imagePath: String? = null,
    val shapeKind: String = "rounded",
    val animated: Boolean = false,
    val animation: String = "pulse",
)

@Serializable
data class WidgetStyle(
    val cornerDp: Float = 28f,
    val opacityPercent: Int = 40,
    val blur: Float = 26f,
    val tint: Long = 0xFFFFFFFF,
    val borderAlpha: Float = 1f,
    val highlight: Float = 0.6f,
    val shadow: Boolean = true,
    val glow: Float = 0f,
    val paddingDp: Float = 16f,
    val gradientAngle: Float = 135f,
    val gradientSecondary: Long = 0x00000000,
    val warm: Boolean = false,
)

@Serializable
data class WidgetDoc(
    val id: Long = 0,
    val name: String = "My widget",
    val template: String = "clock",
    val widthCells: Int = 4,
    val heightCells: Int = 2,
    val style: WidgetStyle = WidgetStyle(),
    val elements: List<WidgetElement> = emptyList(),
    val blurBackground: Boolean = true,
    val builtinTemplate: String? = null,
)

/* ---------------------------------- live wallpaper document ----------------------------------- */

@Serializable
enum class LiveLayerType {
    PARTICLE_FIELD, STARS, SMOKE, WAVE, AURORA, RING, NEON, LIQUID, ORB, GRID, GEOMETRY,
    TEXT, IMAGE, GRADIENT, BLUR, TEXTURE, RECT, CIRCLE, LINE, TRIANGLE,
}

@Serializable
enum class EasingType { LINEAR, EASE_IN, EASE_OUT, EASE_IN_OUT, SMOOTH, SPRING, CUSTOM }

@Serializable
enum class LiveProperty { X, Y, SCALE, ROTATION, OPACITY, COLOR, SIZE, BLUR, GLOW, PARALLAX }

@Serializable
data class Keyframe(
    val time: Float = 0f,
    val value: Float = 0f,
    val easing: EasingType = EasingType.EASE_IN_OUT,
)

@Serializable
data class PropertyTrack(
    val property: LiveProperty = LiveProperty.X,
    val keyframes: List<Keyframe> = emptyList(),
)

@Serializable
data class LiveLayer(
    val id: String = java.util.UUID.randomUUID().toString(),
    val type: LiveLayerType = LiveLayerType.PARTICLE_FIELD,
    val name: String = "Layer",
    val x: Float = 0.5f,
    val y: Float = 0.5f,
    val scale: Float = 1f,
    val rotation: Float = 0f,
    val opacity: Float = 1f,
    val color: Long = 0xFF7FA9FF,
    val colorSecondary: Long = 0xFFC0A6FF,
    val count: Int = 90,
    val speed: Float = 1f,
    val size: Float = 1f,
    val spread: Float = 1f,
    val blurRadius: Float = 0f,
    val glow: Float = 0.5f,
    val parallax: Float = 0.4f,
    val text: String = "",
    val imagePath: String? = null,
    val visible: Boolean = true,
    val tracks: List<PropertyTrack> = emptyList(),
)

@Serializable
enum class TouchReactionType { NONE, RIPPLE, REPEL, GLOW_BURST, LIQUID, VORTEX, PARTICLES, HUE_SHIFT }

@Serializable
data class TouchReaction(
    val enabled: Boolean = true,
    val type: TouchReactionType = TouchReactionType.RIPPLE,
    val strength: Float = 0.7f,
    val decay: Float = 0.88f,
    val radius: Float = 0.35f,
    val palette: List<Long> = listOf(0xFF7FA9FF, 0xFFC0A6FF, 0xFF79E8C6),
)

@Serializable
data class SensorSettings(
    val enabled: Boolean = true,
    val parallax: Float = 0.6f,
    val tilt: Float = 0.35f,
    val lightReaction: Boolean = true,
    val depth: Float = 0.5f,
)

@Serializable
data class LiveDoc(
    val id: Long = 0,
    val name: String = "Untitled",
    val backgroundTop: Long = 0xFF0A0D16,
    val backgroundBottom: Long = 0xFF05060A,
    val durationMs: Int = 12000,
    val fps: Int = 60,
    val layers: List<LiveLayer> = emptyList(),
    val touch: TouchReaction = TouchReaction(),
    val sensors: SensorSettings = SensorSettings(),
    val dim: Float = 0f,
    val updatedAt: Long = System.currentTimeMillis(),
)

/* ---------------------------------- helpers --------------------------------------------------- */

fun IntRange.toFloatList(): List<Float> = map { it.toFloat() }
