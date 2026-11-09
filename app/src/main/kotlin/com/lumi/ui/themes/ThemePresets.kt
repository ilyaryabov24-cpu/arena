package com.lumi.ui.themes

import com.lumi.ui.core.model.AnimationSettings
import com.lumi.ui.core.model.ControlSettings
import com.lumi.ui.core.model.DesktopSettings
import com.lumi.ui.core.model.DockSettings
import com.lumi.ui.core.model.DrawerAnimType
import com.lumi.ui.core.model.DrawerSettings
import com.lumi.ui.core.model.FolderSettings
import com.lumi.ui.core.model.FolderStyleType
import com.lumi.ui.core.model.IconSettings
import com.lumi.ui.core.model.IconShapeType
import com.lumi.ui.core.model.IconStyleType
import com.lumi.ui.core.model.LaunchAnimType
import com.lumi.ui.core.model.LockSettings
import com.lumi.ui.core.model.LumiTheme
import com.lumi.ui.core.model.NotifSettings
import com.lumi.ui.core.model.PageTransitionType
import com.lumi.ui.core.model.PressEffectType
import com.lumi.ui.core.model.SortMode
import com.lumi.ui.core.model.StatusIconMode
import com.lumi.ui.core.model.StatusSettings
import com.lumi.ui.core.model.WallpaperFilter
import com.lumi.ui.core.model.WidgetSettings

/**
 * Nine preset themes. Each one is a complete, coherent bundle of settings — grid, dock, folders,
 * drawer, animations, icons, wallpaper grade, widget glass, panels and lock screen — so applying a
 * theme visibly changes the launcher, not just a label.
 */
object ThemePresets {

    val all: List<LumiTheme> get() = listOf(
        iosGlass(), hyperOsVision(), colorOsModern(), pureMinimal(), darkGlass(),
        aurora(), liquid(), cleanWhite(), blackTitanium(),
    )

    private fun iosGlass() = LumiTheme(
        id = 0,
        name = "iOS Glass",
        builtin = true,
        accent = 0xFFEAF2FF,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 4, rows = 6, iconSizeDp = 60, spacingDp = 12, showLabels = true,
            labelSizeSp = 11, horizontalMarginDp = 18, topMarginDp = 14, wallpaperDim = 0.06f,
            pages = 2,
        ),
        dock = DockSettings(
            iconSizeDp = 58, spacingDp = 14, cornerDp = 32, heightDp = 92, opacityPercent = 22,
            blur = true, gradient = true, shadow = true, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.GLASS, cornerDp = 34, columns = 4, opacityPercent = 28,
            blur = true,
        ),
        drawer = DrawerSettings(
            sortMode = SortMode.NAME, iconSizeDp = 58, columns = 4, opacityPercent = 50,
            blur = true, anim = DrawerAnimType.BLUR_EXPAND, cornerDp = 30,
        ),
        animations = AnimationSettings(
            profile = "ios", globalScale = 1.05f, pageTransition = PageTransitionType.SLIDE,
            pressEffect = PressEffectType.SCALE, launchAnim = LaunchAnimType.SCALE_FROM_ICON,
            drawerAnim = DrawerAnimType.BLUR_EXPAND, depthOnPaging = 0.12f,
            pageSpringStiffness = 300f, pageSpringDamping = 0.9f, glowIntensity = 0.3f,
        ),
        icons = IconSettings(
            style = IconStyleType.IOS, shape = IconShapeType.SQUIRCLE, scale = 1f, cornerPercent = 22,
            shadow = true, paddingPercent = 6,
        ),
        wallpaper = WallpaperFilter(brightness = 0.02f, contrast = 1.02f, saturation = 0.95f, dim = 0.05f),
        widgets = WidgetSettings(globalOpacityPercent = 12, globalBlur = 28, globalCornerDp = 32, highlight = 0.9f),
        control = ControlSettings(opacityPercent = 34, cornerDp = 34, blur = true),
        notifications = NotifSettings(opacityPercent = 40, cornerDp = 28, blur = true),
        status = StatusSettings(island = true, clockStyle = "ios", iconMode = StatusIconMode.LIGHT),
        lock = LockSettings(clockStyle = "big", clockColor = 0xFFFFFFFF, clockScale = 1.1f),
    )

    private fun hyperOsVision() = LumiTheme(
        name = "HyperOS Vision",
        builtin = true,
        accent = 0xFFC0A6FF,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 5, rows = 6, iconSizeDp = 54, spacingDp = 8, showLabels = true,
            labelSizeSp = 10, horizontalMarginDp = 12, topMarginDp = 12, wallpaperDim = 0.12f,
            pages = 3,
        ),
        dock = DockSettings(
            iconSizeDp = 52, spacingDp = 12, cornerDp = 26, heightDp = 80, opacityPercent = 20,
            blur = true, gradient = true, shadow = false, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.BLURRED, cornerDp = 28, columns = 4, opacityPercent = 24,
            blur = true, iconPreviewCount = 4,
        ),
        drawer = DrawerSettings(
            sortMode = SortMode.NAME, iconSizeDp = 54, columns = 5, opacityPercent = 45,
            blur = true, anim = DrawerAnimType.ZOOM,
        ),
        animations = AnimationSettings(
            profile = "hyperos", globalScale = 1.1f, pageTransition = PageTransitionType.DEPTH,
            pressEffect = PressEffectType.LIQUID, launchAnim = LaunchAnimType.MORPH,
            drawerAnim = DrawerAnimType.ZOOM, depthOnPaging = 0.3f, iconStaggerMs = 18,
            glowIntensity = 0.7f, elasticTension = 0.6f,
        ),
        icons = IconSettings(
            style = IconStyleType.HYPEROS, shape = IconShapeType.SQUIRCLE, scale = 1.02f,
            cornerPercent = 26, shadow = true,
        ),
        wallpaper = WallpaperFilter(brightness = 0f, contrast = 1.05f, saturation = 1.08f, dim = 0.1f, vignette = 0.12f),
        widgets = WidgetSettings(globalOpacityPercent = 18, globalBlur = 30, globalCornerDp = 30, warmGlass = false),
        control = ControlSettings(opacityPercent = 38, cornerDp = 30, blur = true),
        notifications = NotifSettings(opacityPercent = 44, cornerDp = 24, blur = true),
        status = StatusSettings(island = true, clockStyle = "dynamic", iconMode = StatusIconMode.AUTO),
        lock = LockSettings(clockStyle = "gradient", clockGradient = true, clockScale = 1.15f),
    )

    private fun colorOsModern() = LumiTheme(
        name = "ColorOS Modern",
        builtin = true,
        accent = 0xFF79E8C6,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 4, rows = 6, iconSizeDp = 58, spacingDp = 11, showLabels = true,
            labelSizeSp = 11, horizontalMarginDp = 16, wallpaperDim = 0.14f, pages = 3,
        ),
        dock = DockSettings(
            iconSizeDp = 56, spacingDp = 13, cornerDp = 28, heightDp = 86, opacityPercent = 30,
            blur = true, gradient = true, shadow = true, float = false,
        ),
        folder = FolderSettings(
            style = FolderStyleType.LARGE, cornerDp = 26, columns = 4, opacityPercent = 34,
            blur = true, showTitles = true,
        ),
        drawer = DrawerSettings(
            sortMode = SortMode.FREQUENT, iconSizeDp = 56, columns = 4, opacityPercent = 48,
            blur = true, anim = DrawerAnimType.SLIDE_UP,
        ),
        animations = AnimationSettings(
            profile = "coloros", globalScale = 1f, pageTransition = PageTransitionType.ZOOM,
            pressEffect = PressEffectType.GLOW, launchAnim = LaunchAnimType.SPRING_ZOOM,
            drawerAnim = DrawerAnimType.SLIDE_UP, depthOnPaging = 0.2f, glowIntensity = 0.9f,
        ),
        icons = IconSettings(
            style = IconStyleType.COLOROS, shape = IconShapeType.ROUNDED, scale = 0.98f, cornerPercent = 24,
        ),
        wallpaper = WallpaperFilter(brightness = 0.01f, contrast = 1.03f, saturation = 1.12f, dim = 0.12f, vignette = 0.18f),
        widgets = WidgetSettings(globalOpacityPercent = 26, globalBlur = 22, globalCornerDp = 26),
        control = ControlSettings(opacityPercent = 40, cornerDp = 28, blur = true),
        notifications = NotifSettings(opacityPercent = 48, cornerDp = 22, blur = true),
        status = StatusSettings(island = false, clockStyle = "bold", iconMode = StatusIconMode.LIGHT),
        lock = LockSettings(clockStyle = "big", clockScale = 1.05f),
    )

    private fun pureMinimal() = LumiTheme(
        name = "Pure Minimal",
        builtin = true,
        accent = 0xFFE8E8EA,
        darkTheme = false,
        desktop = DesktopSettings(
            columns = 4, rows = 5, iconSizeDp = 56, spacingDp = 14, showLabels = true,
            labelSizeSp = 10, horizontalMarginDp = 22, wallpaperDim = 0.02f, pages = 2,
        ),
        dock = DockSettings(
            iconSizeDp = 54, spacingDp = 16, cornerDp = 20, heightDp = 78, opacityPercent = 46,
            blur = false, gradient = false, shadow = false, float = false,
        ),
        folder = FolderSettings(
            style = FolderStyleType.STANDARD, cornerDp = 20, columns = 4, opacityPercent = 40,
            blur = false,
        ),
        drawer = DrawerSettings(
            sortMode = SortMode.NAME, iconSizeDp = 54, columns = 4, opacityPercent = 70,
            blur = false, anim = DrawerAnimType.FADE,
        ),
        animations = AnimationSettings(
            profile = "minimal", globalScale = 0.85f, pageTransition = PageTransitionType.FADE,
            pressEffect = PressEffectType.SCALE, launchAnim = LaunchAnimType.FADE_SCALE,
            drawerAnim = DrawerAnimType.FADE, iconStagger = false, depthOnPaging = 0f,
        ),
        icons = IconSettings(
            style = IconStyleType.MINIMAL, shape = IconShapeType.CIRCLE, scale = 0.9f, shadow = false,
        ),
        wallpaper = WallpaperFilter(brightness = 0.05f, contrast = 1.0f, saturation = 0.6f, dim = 0.02f),
        widgets = WidgetSettings(globalOpacityPercent = 55, globalBlur = 0, globalCornerDp = 20, shadow = false),
        control = ControlSettings(opacityPercent = 60, cornerDp = 22, blur = false),
        notifications = NotifSettings(opacityPercent = 62, cornerDp = 18, blur = false),
        status = StatusSettings(island = false, clockStyle = "minimal", iconMode = StatusIconMode.DARK),
        lock = LockSettings(clockStyle = "minimal", clockColor = 0xFF22242A, clockScale = 0.95f),
    )

    private fun darkGlass() = LumiTheme(
        name = "Dark Glass",
        builtin = true,
        accent = 0xFF6F7CFF,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 4, rows = 6, iconSizeDp = 58, spacingDp = 10, wallpaperDim = 0.3f, pages = 3,
        ),
        dock = DockSettings(
            iconSizeDp = 56, spacingDp = 12, cornerDp = 30, heightDp = 84, opacityPercent = 16,
            blur = true, gradient = true, shadow = true, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.BLURRED, cornerDp = 30, opacityPercent = 18, blur = true,
        ),
        drawer = DrawerSettings(
            iconSizeDp = 56, opacityPercent = 36, blur = true, anim = DrawerAnimType.BLUR_EXPAND,
        ),
        animations = AnimationSettings(
            profile = "custom", globalScale = 1f, pageTransition = PageTransitionType.DEPTH,
            pressEffect = PressEffectType.GLASS_RIPPLE, launchAnim = LaunchAnimType.EXPAND,
            drawerAnim = DrawerAnimType.BLUR_EXPAND, depthOnPaging = 0.26f,
        ),
        icons = IconSettings(
            style = IconStyleType.GLASS, shape = IconShapeType.SQUIRCLE, scale = 1f, cornerPercent = 24,
        ),
        wallpaper = WallpaperFilter(brightness = -0.06f, contrast = 1.1f, saturation = 0.9f, dim = 0.22f, vignette = 0.3f),
        widgets = WidgetSettings(globalOpacityPercent = 14, globalBlur = 30, globalCornerDp = 30),
        control = ControlSettings(opacityPercent = 30, cornerDp = 32, blur = true),
        notifications = NotifSettings(opacityPercent = 36, cornerDp = 26, blur = true),
        status = StatusSettings(island = true, iconMode = StatusIconMode.LIGHT),
        lock = LockSettings(clockStyle = "glass", clockScale = 1f),
    )

    private fun aurora() = LumiTheme(
        name = "Aurora",
        builtin = true,
        accent = 0xFF7FA9FF,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 4, rows = 6, iconSizeDp = 60, spacingDp = 12, wallpaperDim = 0.08f, pages = 3,
        ),
        dock = DockSettings(
            iconSizeDp = 58, spacingDp = 14, cornerDp = 34, heightDp = 90, opacityPercent = 24,
            blur = true, gradient = true, shadow = true, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.GLASS, cornerDp = 32, opacityPercent = 26, blur = true,
        ),
        drawer = DrawerSettings(
            iconSizeDp = 58, opacityPercent = 50, blur = true, anim = DrawerAnimType.BLUR_EXPAND,
        ),
        animations = AnimationSettings(
            profile = "ultra", globalScale = 1.05f, pageTransition = PageTransitionType.DEPTH,
            pressEffect = PressEffectType.MAGNETIC, launchAnim = LaunchAnimType.MORPH,
            drawerAnim = DrawerAnimType.BLUR_EXPAND, depthOnPaging = 0.24f, glowIntensity = 0.8f,
        ),
        icons = IconSettings(
            style = IconStyleType.GRADIENT, shape = IconShapeType.SQUIRCLE, scale = 1f, cornerPercent = 24,
        ),
        wallpaper = WallpaperFilter(brightness = 0.02f, contrast = 1.04f, saturation = 1.15f, dim = 0.06f),
        widgets = WidgetSettings(globalOpacityPercent = 16, globalBlur = 30, globalCornerDp = 30),
        control = ControlSettings(opacityPercent = 34, cornerDp = 32, blur = true),
        notifications = NotifSettings(opacityPercent = 42, cornerDp = 26, blur = true),
        status = StatusSettings(island = true, iconMode = StatusIconMode.AUTO),
        lock = LockSettings(clockStyle = "gradient", clockGradient = true, clockScale = 1.15f),
    )

    private fun liquid() = LumiTheme(
        name = "Liquid",
        builtin = true,
        accent = 0xFF5EE0D0,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 5, rows = 6, iconSizeDp = 52, spacingDp = 9, wallpaperDim = 0.1f, pages = 2,
        ),
        dock = DockSettings(
            iconSizeDp = 50, spacingDp = 12, cornerDp = 36, heightDp = 82, opacityPercent = 22,
            blur = true, gradient = true, shadow = true, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.GLASS, cornerDp = 34, opacityPercent = 22, blur = true,
        ),
        drawer = DrawerSettings(
            iconSizeDp = 52, columns = 5, opacityPercent = 44, blur = true, anim = DrawerAnimType.ZOOM,
        ),
        animations = AnimationSettings(
            profile = "ultra", globalScale = 1.15f, pageTransition = PageTransitionType.CUBE,
            pressEffect = PressEffectType.LIQUID, launchAnim = LaunchAnimType.MORPH,
            drawerAnim = DrawerAnimType.ZOOM, depthOnPaging = 0.34f, elasticTension = 0.75f,
            pageSpringDamping = 0.72f,
        ),
        icons = IconSettings(
            style = IconStyleType.GLASS, shape = IconShapeType.FLOWER, scale = 0.96f, cornerPercent = 30,
        ),
        wallpaper = WallpaperFilter(brightness = 0f, contrast = 1.06f, saturation = 1.2f, dim = 0.1f),
        widgets = WidgetSettings(globalOpacityPercent = 18, globalBlur = 32, globalCornerDp = 32),
        control = ControlSettings(opacityPercent = 36, cornerDp = 34, blur = true),
        notifications = NotifSettings(opacityPercent = 46, cornerDp = 30, blur = true),
        status = StatusSettings(island = true, iconMode = StatusIconMode.AUTO),
        lock = LockSettings(clockStyle = "big", clockScale = 1.2f),
    )

    private fun cleanWhite() = LumiTheme(
        name = "Clean White",
        builtin = true,
        accent = 0xFF8FB8FF,
        darkTheme = false,
        desktop = DesktopSettings(
            columns = 4, rows = 6, iconSizeDp = 58, spacingDp = 13, wallpaperDim = 0f, pages = 2,
        ),
        dock = DockSettings(
            iconSizeDp = 56, spacingDp = 14, cornerDp = 30, heightDp = 86, opacityPercent = 62,
            blur = true, gradient = true, shadow = true, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.GLASS, cornerDp = 30, opacityPercent = 55, blur = true,
        ),
        drawer = DrawerSettings(
            iconSizeDp = 56, opacityPercent = 78, blur = true, anim = DrawerAnimType.BLUR_EXPAND,
        ),
        animations = AnimationSettings(
            profile = "ios", globalScale = 1f, pageTransition = PageTransitionType.SLIDE,
            pressEffect = PressEffectType.SPRING, launchAnim = LaunchAnimType.SCALE_FROM_ICON,
            drawerAnim = DrawerAnimType.BLUR_EXPAND, depthOnPaging = 0.1f,
        ),
        icons = IconSettings(
            style = IconStyleType.IOS, shape = IconShapeType.ROUNDED, scale = 1f, cornerPercent = 24,
        ),
        wallpaper = WallpaperFilter(brightness = 0.08f, contrast = 0.98f, saturation = 0.9f, dim = 0f),
        widgets = WidgetSettings(globalOpacityPercent = 45, globalBlur = 18, globalCornerDp = 28),
        control = ControlSettings(opacityPercent = 66, cornerDp = 30, blur = true),
        notifications = NotifSettings(opacityPercent = 70, cornerDp = 26, blur = true),
        status = StatusSettings(island = false, iconMode = StatusIconMode.DARK),
        lock = LockSettings(clockStyle = "minimal", clockColor = 0xFF16181E, clockScale = 1f),
    )

    private fun blackTitanium() = LumiTheme(
        name = "Black Titanium",
        builtin = true,
        accent = 0xFFB8BCC6,
        darkTheme = true,
        desktop = DesktopSettings(
            columns = 4, rows = 6, iconSizeDp = 58, spacingDp = 10, showLabels = true,
            labelSizeSp = 10, wallpaperDim = 0.34f, pages = 2,
        ),
        dock = DockSettings(
            iconSizeDp = 56, spacingDp = 12, cornerDp = 24, heightDp = 82, opacityPercent = 14,
            blur = true, gradient = true, shadow = true, float = true,
        ),
        folder = FolderSettings(
            style = FolderStyleType.STANDARD, cornerDp = 24, opacityPercent = 18, blur = true,
        ),
        drawer = DrawerSettings(
            iconSizeDp = 56, opacityPercent = 30, blur = true, anim = DrawerAnimType.BLUR_EXPAND,
        ),
        animations = AnimationSettings(
            profile = "custom", globalScale = 0.95f, pageTransition = PageTransitionType.DEPTH,
            pressEffect = PressEffectType.ELASTIC, launchAnim = LaunchAnimType.EXPAND,
            drawerAnim = DrawerAnimType.BLUR_EXPAND, depthOnPaging = 0.2f, glowIntensity = 0.2f,
        ),
        icons = IconSettings(
            style = IconStyleType.MONOCHROME, shape = IconShapeType.SQUIRCLE, scale = 0.95f,
            monochrome = true, grayscale = true,
        ),
        wallpaper = WallpaperFilter(brightness = -0.1f, contrast = 1.15f, saturation = 0.2f, dim = 0.3f, vignette = 0.35f),
        widgets = WidgetSettings(globalOpacityPercent = 10, globalBlur = 26, globalCornerDp = 26),
        control = ControlSettings(opacityPercent = 26, cornerDp = 26, blur = true),
        notifications = NotifSettings(opacityPercent = 34, cornerDp = 22, blur = true),
        status = StatusSettings(island = false, iconMode = StatusIconMode.LIGHT),
        lock = LockSettings(clockStyle = "vertical", clockScale = 1f),
    )

    /** Applies a theme bundle on top of the live settings, keeping wallpaper images and layout. */
    fun merge(
        current: com.lumi.ui.core.model.LumiSettings,
        theme: LumiTheme,
    ): com.lumi.ui.core.model.LumiSettings = current.copy(
        accent = theme.accent,
        darkTheme = theme.darkTheme,
        activeThemeId = theme.id,
        activeThemeName = theme.name,
        desktop = theme.desktop,
        dock = theme.dock,
        folder = theme.folder,
        drawer = theme.drawer,
        animations = theme.animations,
        icons = theme.icons,
        wallpaper = current.wallpaper.copy(filter = theme.wallpaper),
        widgets = theme.widgets,
        control = theme.control,
        notifications = theme.notifications,
        status = theme.status,
        lock = theme.lock,
    )

    /** Captures the current look as a new theme document. */
    fun capture(current: com.lumi.ui.core.model.LumiSettings, name: String): LumiTheme = LumiTheme(
        name = name,
        builtin = false,
        accent = current.accent,
        darkTheme = current.darkTheme,
        desktop = current.desktop,
        dock = current.dock,
        folder = current.folder,
        drawer = current.drawer,
        animations = current.animations,
        icons = current.icons,
        wallpaper = current.wallpaper.filter,
        widgets = current.widgets,
        control = current.control,
        notifications = current.notifications,
        status = current.status,
        lock = current.lock,
    )
}
