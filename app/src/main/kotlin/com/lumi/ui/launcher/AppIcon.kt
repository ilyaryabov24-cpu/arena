package com.lumi.ui.launcher

import android.content.Context
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
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
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.model.IconShapeType
import com.lumi.ui.core.model.IconSettings
import com.lumi.ui.core.model.IconStyleType
import com.lumi.ui.core.ui.Lumi
import kotlinx.coroutines.delay
import kotlin.math.cos
import kotlin.math.sin

/**
 * Renders an application icon with LUMI's icon engine applied: shape masking, scale, style tinting,
 * monochrome and custom image support. Icons load asynchronously and are cached process-wide.
 */
@Composable
fun AppIcon(
    packageName: String,
    size: Dp,
    settings: IconSettings,
    modifier: Modifier = Modifier,
    useStyle: Boolean = true,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val px = with(androidx.compose.ui.platform.LocalDensity.current) { size.toPx().toInt() }
    var bitmap by remember(packageName, px) { mutableStateOf(app.icons.cached(packageName, px)) }

    LaunchedEffect(packageName, px) {
        if (bitmap == null) {
            bitmap = app.icons.load(packageName, px)
        }
    }

    val shape = shapeFor(settings.shape, size)
    val style = if (useStyle) settings.style else IconStyleType.SYSTEM
    val monochrome = settings.monochrome || style == IconStyleType.MONOCHROME
    val grayscale = settings.grayscale

    Box(modifier.size(size), contentAlignment = Alignment.Center) {
        when (style) {
            IconStyleType.SYSTEM, IconStyleType.CUSTOM -> {
                RawIcon(bitmap, settings, monochrome, grayscale, size)
            }
            IconStyleType.IOS -> {
                IosPlate(settings, size) { RawIcon(bitmap, settings, monochrome, grayscale, size) }
            }
            IconStyleType.COLOROS -> {
                ColorOsPlate(settings, size) { RawIcon(bitmap, settings, monochrome, grayscale, size) }
            }
            IconStyleType.HYPEROS -> {
                HyperPlate(settings, size) { RawIcon(bitmap, settings, monochrome, grayscale, size) }
            }
            IconStyleType.MINIMAL -> {
                MinimalPlate(settings, size) { RawIcon(bitmap, settings, false, true, size) }
            }
            IconStyleType.GLASS -> {
                GlassPlate(settings, size) { RawIcon(bitmap, settings, false, grayscale, size) }
            }
            IconStyleType.MONOCHROME -> {
                MinimalPlate(settings, size, mono = true) { RawIcon(bitmap, settings, true, true, size) }
            }
            IconStyleType.GRADIENT -> {
                GradientPlate(settings, size) { RawIcon(bitmap, settings, false, grayscale, size) }
            }
        }
        if (bitmap == null) {
            // graceful placeholder while the real icon decodes
            val label = remember(packageName) { app.apps.labelOf(packageName) }
            val initial = label.firstOrNull()?.uppercase() ?: "•"
            Box(
                Modifier
                    .size(size * 0.84f, size * 0.84f)
                    .clip(shape)
                    .drawBehind {
                        val base = colorSeed(packageName)
                        drawRect(
                            Brush.linearGradient(
                                listOf(base, base.shift(28f)),
                                start = Offset.Zero, end = Offset(size.width, size.height),
                            )
                        )
                    },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    initial,
                    color = Color.White,
                    fontSize = (size.value * 0.36f).sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

private fun colorSeed(seed: String): Color {
    val h = seed.hashCode()
    val hue = ((h % 360) + 360) % 360
    return Color.hsv(hue.toFloat(), 0.38f, 0.62f)
}

private fun Color.shift(deg: Float): Color {
    val hsv = FloatArray(3)
    android.graphics.Color.colorToHSV(android.graphics.Color.rgb((red * 255).toInt(), (green * 255).toInt(), (blue * 255).toInt()), hsv)
    hsv[0] = (hsv[0] + deg) % 360f
    return Color(android.graphics.Color.HSVToColor(hsv))
}

fun shapeFor(type: IconShapeType, size: Dp): Shape = when (type) {
    IconShapeType.CIRCLE -> RoundedCornerShape(50)
    IconShapeType.ROUNDED -> RoundedCornerShape(size * 0.22f)
    IconShapeType.SQUIRCLE -> SquircleShape(0.24f)
    IconShapeType.HEXAGON -> PolygonShape(6)
    IconShapeType.FLOWER -> FlowerShape()
    IconShapeType.TEARDROP -> TeardropShape()
}

/** Continuous-curvature squircle (Apple-style) as a Compose shape. */
class SquircleShape(private val n: Float = 0.25f) : Shape {
    override fun createOutline(
        size: Size, layoutDirection: androidx.compose.ui.unit.LayoutDirection, density: androidx.compose.ui.unit.Density,
    ): androidx.compose.ui.graphics.Outline {
        val path = Path()
        val w = size.width
        val h = size.height
        val r = minOf(w, h) * n
        path.addRoundRect(
            androidx.compose.ui.geometry.RoundRect(0f, 0f, w, h, CornerRadius(r, r)),
        )
        return androidx.compose.ui.graphics.Outline.Generic(path)
    }
}

class PolygonShape(private val sides: Int, private val rotationDeg: Float = -90f) : Shape {
    override fun createOutline(
        size: Size, layoutDirection: androidx.compose.ui.unit.LayoutDirection, density: androidx.compose.ui.unit.Density,
    ): androidx.compose.ui.graphics.Outline {
        val path = Path()
        val cx = size.width / 2f
        val cy = size.height / 2f
        val radius = minOf(cx, cy) * 1.02f
        for (i in 0 until sides) {
            val angle = Math.toRadians((rotationDeg + 360f / sides * i).toDouble())
            val x = cx + (radius * cos(angle)).toFloat()
            val y = cy + (radius * sin(angle)).toFloat()
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        path.close()
        return androidx.compose.ui.graphics.Outline.Generic(path)
    }
}

class FlowerShape : Shape {
    override fun createOutline(
        size: Size, layoutDirection: androidx.compose.ui.unit.LayoutDirection, density: androidx.compose.ui.unit.Density,
    ): androidx.compose.ui.graphics.Outline {
        val path = Path()
        val cx = size.width / 2f
        val cy = size.height / 2f
        val petal = minOf(cx, cy) * 0.72f
        val lobes = 8
        val steps = 180
        for (i in 0..steps) {
            val t = (i / steps.toFloat()) * (Math.PI * 2).toFloat()
            val r = petal * (1f + 0.22f * cos(lobes * t))
            val x = cx + r * cos(t)
            val y = cy + r * sin(t)
            if (i == 0) path.moveTo(x, y) else path.lineTo(x, y)
        }
        path.close()
        return androidx.compose.ui.graphics.Outline.Generic(path)
    }
}

class TeardropShape : Shape {
    override fun createOutline(
        size: Size, layoutDirection: androidx.compose.ui.unit.LayoutDirection, density: androidx.compose.ui.unit.Density,
    ): androidx.compose.ui.graphics.Outline {
        val path = Path()
        val w = size.width
        val h = size.height
        path.moveTo(w / 2f, 0f)
        path.cubicTo(w * 0.92f, h * 0.30f, w, h * 0.62f, w / 2f, h)
        path.cubicTo(0f, h * 0.62f, w * 0.08f, h * 0.30f, w / 2f, 0f)
        path.close()
        return androidx.compose.ui.graphics.Outline.Generic(path)
    }
}

@Composable
private fun RawIcon(
    bitmap: ImageBitmap?,
    settings: IconSettings,
    monochrome: Boolean,
    grayscale: Boolean,
    size: Dp,
) {
    if (bitmap == null) {
        Spacer(Modifier.size(size))
        return
    }
    val shape = shapeFor(settings.shape, size)
    val inner = size * (0.86f * settings.scale).coerceIn(0.4f, 1f)
    val filter = when {
        monochrome -> ColorFilter.tint(Lumi.colors.onSurface)
        grayscale || settings.saturation < 1f -> {
            val sat = if (grayscale) 0f else settings.saturation.coerceIn(0f, 1.5f)
            ColorFilter.colorMatrix(ColorMatrix().apply { setToSaturation(sat) })
        }
        settings.darken > 0f -> ColorFilter.tint(Color.Black.copy(alpha = settings.darken * 0.35f), androidx.compose.ui.graphics.BlendMode.Modulate)
        else -> null
    }
    androidx.compose.foundation.Image(
        bitmap = bitmap,
        contentDescription = null,
        modifier = Modifier
            .size(inner)
            .clip(shape),
        colorFilter = filter,
    )
}

@Composable
private fun Plate(
    settings: IconSettings,
    size: Dp,
    brush: Brush,
    border: Color? = Color.White.copy(alpha = 0.16f),
    content: @Composable () -> Unit,
) {
    val shape = shapeFor(settings.shape, size)
    Box(
        Modifier
            .size(size)
            .clip(shape)
            .drawBehind {
                drawRect(brush)
                border?.let {
                    drawRect(it, style = androidx.compose.ui.graphics.drawscope.Stroke(1.dp.toPx()))
                }
            },
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
private fun IosPlate(settings: IconSettings, size: Dp, content: @Composable () -> Unit) {
    val accent = Lumi.colors.accent
    Plate(
        settings, size,
        Brush.linearGradient(
            listOf(Color.White.copy(alpha = 0.16f), Color.White.copy(alpha = 0.05f)),
            start = Offset.Zero, end = Offset(0f, 900f),
        ),
        border = Color.White.copy(alpha = 0.22f),
    ) { content() }
}

@Composable
private fun ColorOsPlate(settings: IconSettings, size: Dp, content: @Composable () -> Unit) {
    val accent = Lumi.colors.accent
    Plate(
        settings, size,
        Brush.linearGradient(listOf(accent.copy(alpha = 0.22f), accent.shift(40f).copy(alpha = 0.08f))),
        border = accent.copy(alpha = 0.28f),
    ) { content() }
}

@Composable
private fun HyperPlate(settings: IconSettings, size: Dp, content: @Composable () -> Unit) {
    Plate(
        settings, size,
        Brush.linearGradient(listOf(Color.White.copy(alpha = 0.13f), Color.White.copy(alpha = 0.03f))),
        border = Color.White.copy(alpha = 0.14f),
    ) { content() }
}

@Composable
private fun MinimalPlate(settings: IconSettings, size: Dp, mono: Boolean = false, content: @Composable () -> Unit) {
    Plate(
        settings, size,
        Brush.linearGradient(listOf(Color.Transparent, Color.Transparent)),
        border = null,
    ) { content() }
}

@Composable
private fun GlassPlate(settings: IconSettings, size: Dp, content: @Composable () -> Unit) {
    Plate(
        settings, size,
        Brush.linearGradient(listOf(Color.White.copy(alpha = 0.20f), Color.White.copy(alpha = 0.06f))),
        border = Color.White.copy(alpha = 0.30f),
    ) { content() }
}

@Composable
private fun GradientPlate(settings: IconSettings, size: Dp, content: @Composable () -> Unit) {
    val accent = Lumi.colors.accent
    Plate(
        settings, size,
        Brush.linearGradient(listOf(accent.copy(alpha = 0.30f), accent.shift(60f).copy(alpha = 0.16f))),
        border = Color.White.copy(alpha = 0.18f),
    ) { content() }
}

/** Icon + optional label with the configured press micro-interaction. */
@Composable
fun LauncherIcon(
    packageName: String,
    label: String?,
    iconDp: Dp,
    settings: IconSettings,
    showLabel: Boolean,
    labelSizeSp: Int = 11,
    pressEffect: PressEffect,
    onClick: () -> Unit,
    onLongClick: () -> Unit,
    modifier: Modifier = Modifier,
    interaction: MutableInteractionSource? = null,
) {
    val source = interaction ?: remember { MutableInteractionSource() }
    val pressed by source.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) pressEffect.scaleTarget else 1f,
        animationSpec = spring(
            dampingRatio = pressEffect.damping,
            stiffness = pressEffect.stiffness,
        ),
        label = "iconPress",
    )
    val glow by animateFloatAsState(if (pressed) 1f else 0f, label = "iconGlow")
    val density = androidx.compose.ui.platform.LocalDensity.current
    Box(contentAlignment = Alignment.Center) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = modifier.scale(scale),
        ) {
            if (pressEffect.glow && glow > 0.01f) {
                Box(Modifier.size(iconDp).alpha(0f))
            }
            AppIcon(packageName = packageName, size = iconDp, settings = settings)
            if (showLabel) {
                Spacer(Modifier.height(6.dp))
                Text(
                    text = label ?: "",
                    color = Lumi.colors.onSurface,
                    fontSize = labelSizeSp.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.width(iconDp + 18.dp).alpha(0.92f),
                )
            }
        }
        PressableOverlay(
            interaction = source,
            onClick = onClick,
            onLongClick = onLongClick,
            modifier = Modifier.size(iconDp + if (showLabel) 22.dp else 6.dp),
        )
    }
}

/** Small helper that only installs clickable semantics on top of the visuals. */
@OptIn(androidx.compose.foundation.ExperimentalFoundationApi::class)
@Composable
fun PressableOverlay(
    interaction: MutableInteractionSource,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier.combinedClickable(
            interactionSource = interaction,
            indication = null,
            onClick = onClick,
            onLongClick = onLongClick,
        )
    )
}

data class PressEffect(
    val scaleTarget: Float = 0.94f,
    val damping: Float = 0.55f,
    val stiffness: Float = 720f,
    val glow: Boolean = false,
)

/** Draws a subtle rounded backdrop behind a group of icons (folders, previews). */
fun DrawScope.drawGlassPlate(radiusDp: Float, tint: Color, density: Float) {
    drawRoundRect(
        color = tint,
        cornerRadius = CornerRadius(radiusDp * density, radiusDp * density),
    )
}
