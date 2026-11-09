package com.lumi.ui.core.ui

import android.graphics.Bitmap
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/* -------------------------------------------------------------------------------------------------
 * Design tokens — LUMI "Premium Glass" language
 * ---------------------------------------------------------------------------------------------- */

@Immutable
data class LumiPalette(
    val accent: Color,
    val accentSecondary: Color,
    val accentTertiary: Color,
    val background: Color,
    val surface: Color,
    val ink: Color,
    val onSurface: Color,
    val onSurfaceMuted: Color,
    val onSurfaceFaint: Color,
    val glassTint: Color,
    val glassBorder: Color,
    val glassHighlight: Color,
    val success: Color,
    val warning: Color,
    val danger: Color,
    val isDark: Boolean,
)

private val Aurora = Color(0xFF7FA9FF)
private val Mint = Color(0xFF79E8C6)
private val Lilac = Color(0xFFC0A6FF)
private val Peach = Color(0xFFFFB27A)
private val Rose = Color(0xFFFF8FA8)

val AccentChoices: List<Pair<String, Color>> = listOf(
    "Aurora" to Aurora,
    "Mint" to Mint,
    "Lilac" to Lilac,
    "Peach" to Peach,
    "Rose" to Rose,
    "Ice" to Color(0xFFD7E6FF),
    "Gold" to Color(0xFFE8C89A),
)

fun paletteFor(accent: Color, dark: Boolean, secondary: Color? = null): LumiPalette {
    val secondaryColor = secondary ?: accent.shiftHue(28f)
    val tertiaryColor = accent.shiftHue(-34f)
    return if (dark) {
        LumiPalette(
            accent = accent,
            accentSecondary = secondaryColor,
            accentTertiary = tertiaryColor,
            background = Color(0xFF07080C),
            surface = Color(0xFF0D0F16),
            ink = Color(0xFF05060A),
            onSurface = Color(0xFFF3F7FF),
            onSurfaceMuted = Color(0xA8F3F7FF),
            onSurfaceFaint = Color(0x66F3F7FF),
            glassTint = Color(0x14FFFFFF),
            glassBorder = Color(0x2BFFFFFF),
            glassHighlight = Color(0x40FFFFFF),
            success = Color(0xFF66D9A8),
            warning = Color(0xFFFFC46B),
            danger = Color(0xFFFF7D7D),
            isDark = true,
        )
    } else {
        LumiPalette(
            accent = accent,
            accentSecondary = secondaryColor,
            accentTertiary = tertiaryColor,
            background = Color(0xFFF2F4FA),
            surface = Color(0xFFFFFFFF),
            ink = Color(0xFFFFFFFF),
            onSurface = Color(0xFF0A0C12),
            onSurfaceMuted = Color(0x990A0C12),
            onSurfaceFaint = Color(0x550A0C12),
            glassTint = Color(0x59FFFFFF),
            glassBorder = Color(0x2E0A0C12),
            glassHighlight = Color(0x8AFFFFFF),
            success = Color(0xFF2FA274),
            warning = Color(0xFFD99333),
            danger = Color(0xFFD74C4C),
            isDark = false,
        )
    }
}

/** Rotates a color's hue — used to derive balanced secondary accents. */
fun Color.shiftHue(deg: Float): Color {
    val hsv = FloatArray(3)
    android.graphics.Color.colorToHSV(
        android.graphics.Color.argb((alpha * 255).toInt(), (red * 255).toInt(), (green * 255).toInt(), (blue * 255).toInt()),
        hsv,
    )
    hsv[0] = (hsv[0] + deg + 360f) % 360f
    val c = android.graphics.Color.HSVToColor(floatArrayOf(hsv[0], hsv[1], hsv[2]))
    return Color(c).copy(alpha = alpha)
}

fun Color.toRgbHex(): String = String.format("#%06X", 0xFFFFFF and android.graphics.Color.rgb(
    (red * 255).toInt().coerceIn(0, 255),
    (green * 255).toInt().coerceIn(0, 255),
    (blue * 255).toInt().coerceIn(0, 255),
))

fun Long.toColor(): Color = Color(this.toInt())

val LumiCorner = 28.dp
val LumiCornerSmall = 18.dp
val LumiCornerLarge = 36.dp

/* -------------------------------------------------------------------------------------------------
 * Typography
 * ---------------------------------------------------------------------------------------------- */

private val DisplayFamily = FontFamily.Default

val LumiTypography = Typography(
    displayLarge = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Light,
        fontSize = 56.sp, letterSpacing = (-1.6).sp, lineHeight = 60.sp,
    ),
    displayMedium = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Light,
        fontSize = 42.sp, letterSpacing = (-1.1).sp, lineHeight = 46.sp,
    ),
    headlineLarge = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Medium,
        fontSize = 26.sp, letterSpacing = (-0.6).sp, lineHeight = 32.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.SemiBold,
        fontSize = 19.sp, letterSpacing = (-0.25).sp, lineHeight = 24.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Medium,
        fontSize = 16.sp, letterSpacing = (-0.1).sp, lineHeight = 22.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Normal,
        fontSize = 15.sp, letterSpacing = 0.1.sp, lineHeight = 22.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Normal,
        fontSize = 13.5.sp, letterSpacing = 0.15.sp, lineHeight = 19.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Medium,
        fontSize = 13.sp, letterSpacing = 0.25.sp, lineHeight = 17.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Medium,
        fontSize = 11.5.sp, letterSpacing = 0.4.sp, lineHeight = 15.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = DisplayFamily, fontWeight = FontWeight.Medium,
        fontSize = 10.sp, letterSpacing = 0.9.sp, lineHeight = 13.sp,
    ),
)

val LocalLumi = compositionLocalOf { paletteFor(Aurora, true) }

object Lumi {
    val colors: LumiPalette
        @Composable get() = LocalLumi.current
}

/* -------------------------------------------------------------------------------------------------
 * Theme
 * ---------------------------------------------------------------------------------------------- */

@Composable
fun LumiTheme(
    accent: Color = Aurora,
    dark: Boolean = true,
    secondary: Color? = null,
    content: @Composable () -> Unit,
) {
    val palette = paletteFor(accent, dark, secondary)
    val colorScheme = if (dark) {
        darkColorScheme(
            primary = palette.accent,
            onPrimary = Color(0xFF07080C),
            secondary = palette.accentSecondary,
            background = palette.background,
            onBackground = palette.onSurface,
            surface = palette.surface,
            onSurface = palette.onSurface,
            surfaceVariant = palette.surface,
            outline = palette.glassBorder,
            error = palette.danger,
        )
    } else {
        lightColorScheme(
            primary = palette.accent,
            onPrimary = Color.White,
            secondary = palette.accentSecondary,
            background = palette.background,
            onBackground = palette.onSurface,
            surface = palette.surface,
            onSurface = palette.onSurface,
            surfaceVariant = palette.surface,
            outline = palette.glassBorder,
            error = palette.danger,
        )
    }
    CompositionLocalProvider(LocalLumi provides palette) {
        MaterialTheme(colorScheme = colorScheme, typography = LumiTypography) {
            CompositionLocalProvider(LocalContentColor provides palette.onSurface) {
                content()
            }
        }
    }
}

/** The signature LUMI backdrop: deep gradient night sky with two soft aurora blooms. */
@Composable
fun LumiBackdrop(
    modifier: Modifier = Modifier,
    accent: Color = Lumi.colors.accent,
    seed: Float = 0f,
    content: @Composable BoxScope.() -> Unit,
) {
    val p = Lumi.colors
    val base = Brush.verticalGradient(
        listOf(
            if (p.isDark) Color(0xFF090B12) else Color(0xFFF6F8FF),
            if (p.isDark) Color(0xFF0C1018) else Color(0xFFEEF1FA),
            if (p.isDark) Color(0xFF06070B) else Color(0xFFE7EBF6),
        )
    )
    Box(
        modifier
            .background(base)
            .drawWithContent {
                drawContent()
                drawAuroraBloom(accent, seed, size)
            },
    ) { content() }
}

fun DrawScope.drawAuroraBloom(accent: Color, seed: Float, size: Size) {
    val w = size.width
    val h = size.height
    // bloom 1 — upper right
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(accent.copy(alpha = 0.30f), accent.copy(alpha = 0.10f), Color.Transparent),
            center = Offset(w * (0.78f + 0.06f * seed), h * (0.10f - 0.02f * seed)),
            radius = w * 0.85f,
        ),
        radius = w * 0.85f,
        center = Offset(w * (0.78f + 0.06f * seed), h * (0.10f - 0.02f * seed)),
    )
    // bloom 2 — lower left, complementary hue
    val second = accent.shiftHue(52f)
    drawCircle(
        brush = Brush.radialGradient(
            colors = listOf(second.copy(alpha = 0.20f), second.copy(alpha = 0.05f), Color.Transparent),
            center = Offset(w * (0.08f - 0.04f * seed), h * (0.92f + 0.02f * seed)),
            radius = w * 0.95f,
        ),
        radius = w * 0.95f,
        center = Offset(w * (0.08f - 0.04f * seed), h * (0.92f + 0.02f * seed)),
    )
    // faint star grain
    rotate(12f) {
        drawRect(
            brush = Brush.linearGradient(
                listOf(Color.Transparent, Color.White.copy(alpha = 0.025f), Color.Transparent),
                start = Offset(0f, h * 0.2f), end = Offset(w, h * 0.7f),
            )
        )
    }
}

/* -------------------------------------------------------------------------------------------------
 * Glass surfaces
 * ---------------------------------------------------------------------------------------------- */

/**
 * Natural glass: a soft vertical tint, a hairline gradient border that catches "light" at the top,
 * an inner top highlight and an optional sheen. Everything is drawn, no bitmaps.
 */
fun Modifier.lumiGlass(
    shape: Shape = RoundedCornerShape(LumiCorner),
    tint: Color = Lumi.colors.glassTint,
    borderAlpha: Float = 1f,
    highlight: Boolean = true,
    sheen: Boolean = false,
): Modifier = this
    .clip(shape)
    .background(
        Brush.verticalGradient(
            listOf(tint.copy(alpha = tint.alpha * 1.35f), tint, tint.copy(alpha = tint.alpha * 0.55f)),
        )
    )
    .drawWithContent {
        drawContent()
        val border = Lumi.colors.glassBorder
        drawRoundRectGlassBorder(border.copy(alpha = border.alpha * borderAlpha))
        if (highlight) {
            val strokeW = 1.dp.toPx()
            drawLine(
                brush = Brush.horizontalGradient(
                    listOf(Color.Transparent, Lumi.colors.glassHighlight.copy(alpha = 0.55f), Color.Transparent)
                ),
                start = Offset(size.width * 0.16f, strokeW),
                end = Offset(size.width * 0.84f, strokeW),
                strokeWidth = strokeW,
            )
        }
        if (sheen) {
            drawRect(
                brush = Brush.linearGradient(
                    listOf(Color.White.copy(alpha = 0.10f), Color.Transparent, Color.White.copy(alpha = 0.03f)),
                    start = Offset(0f, 0f), end = Offset(size.width, size.height),
                )
            )
        }
    }

/** Draws a 1px rounded border using the inset rect; works with any corner radius via clip. */
private fun DrawScope.drawRoundRectGlassBorder(color: Color) {
    val w = size.width
    val h = size.height
    if (w <= 0f || h <= 0f) return
    drawRect(
        brush = Brush.verticalGradient(listOf(color, color.copy(alpha = color.alpha * 0.35f))),
        style = Stroke(width = 1.dp.toPx()),
        size = Size(w, h),
    )
}

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(LumiCorner),
    tint: Color = Lumi.colors.glassTint,
    borderAlpha: Float = 1f,
    contentPadding: PaddingValues = PaddingValues(18.dp),
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier
            .lumiGlass(shape = shape, tint = tint, borderAlpha = borderAlpha)
            .padding(contentPadding),
        content = content,
    )
}

@Composable
fun GlassRow(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(LumiCornerSmall),
    content: @Composable BoxScope.() -> Unit,
) = GlassCard(modifier = modifier, shape = shape, contentPadding = PaddingValues(14.dp), content = content)

/* -------------------------------------------------------------------------------------------------
 * Wallpaper backdrop rendering (used by previews and launcher)
 * ---------------------------------------------------------------------------------------------- */

@Composable
fun BitmapBackdrop(
    bitmap: Bitmap?,
    modifier: Modifier = Modifier,
    parallax: Offset = Offset.Zero,
    scale: Float = 1.12f,
    content: @Composable BoxScope.() -> Unit = {},
) {
    Box(modifier) {
        if (bitmap != null) {
            val image = remember(bitmap) { bitmap.asImageBitmap() }
            androidx.compose.foundation.Image(
                bitmap = image,
                contentDescription = null,
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsScale(scale)
                    .offsetPx(parallax.x * 26f, parallax.y * 26f),
                contentScale = androidx.compose.ui.layout.ContentScale.Crop,
            )
        }
        content()
    }
}

private fun Modifier.graphicsScale(scale: Float): Modifier =
    this.then(androidx.compose.ui.draw.scale(scale))

private fun Modifier.offsetPx(x: Float, y: Float): Modifier =
    this.then(Modifier.offset { androidx.compose.ui.unit.IntOffset(x.toInt(), y.toInt()) })

/* -------------------------------------------------------------------------------------------------
 * Micro interactions
 * ---------------------------------------------------------------------------------------------- */

@Composable
fun pressScale(interaction: androidx.compose.foundation.interaction.InteractionSource, pressed: Float = 0.955f): Float {
    val isPressed by interaction.collectIsPressedAsStateSafe()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) pressed else 1f,
        animationSpec = spring(dampingRatio = 0.55f, stiffness = 780f),
        label = "press",
    )
    return scale
}

@Composable
private fun androidx.compose.foundation.interaction.InteractionSource.collectIsPressedAsStateSafe(): androidx.compose.runtime.State<Boolean> =
    androidx.compose.foundation.interaction.collectIsPressedAsState()

/** Convenience alignment used by several screens. */
val CenterStart: Alignment = Alignment.CenterStart
