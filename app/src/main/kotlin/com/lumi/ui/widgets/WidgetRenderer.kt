package com.lumi.ui.widgets

import android.text.format.DateFormat
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.model.ClipboardAlign
import com.lumi.ui.core.model.WidgetDoc
import com.lumi.ui.core.model.WidgetElement
import com.lumi.ui.core.model.WidgetElementType
import com.lumi.ui.core.model.WidgetStyle
import com.lumi.ui.core.ui.Lumi
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.roundToInt

/**
 * Renders a user-built LUMI widget. Elements are positioned in normalised coordinates so the same
 * document looks right at any size, and live data (clock, date, battery, weather) updates in place.
 */
@Composable
fun LumiWidgetRenderer(
    doc: WidgetDoc,
    modifier: Modifier = Modifier,
    interactive: Boolean = true,
    selectedElementId: String? = null,
    onElementSelected: ((String?) -> Unit)? = null,
    editable: Boolean = false,
    onElementDragged: ((String, Float, Float) -> Unit)? = null,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(doc.id, app.settings.state.value.widgets.updateSeconds) {
        while (true) {
            val hasSeconds = doc.elements.any { it.type == WidgetElementType.CLOCK && it.format.contains("ss") }
            delay(if (hasSeconds) 1000 else 15000)
            now = System.currentTimeMillis()
        }
    }

    val style = doc.style
    GlassBox(style = style, modifier = modifier) {
        BoxWithConstraints(Modifier.fillMaxSize().padding(style.paddingDp.dp)) {
            val w = constraints.maxWidth.toFloat()
            val h = constraints.maxHeight.toFloat()
            doc.elements.filter { it.visible }.forEach { el ->
                val cx = el.x * w
                val cy = el.y * h
                val ew = el.width * w
                val eh = el.height * h
                Box(
                    Modifier
                        .graphicsLayer {
                            translationX = cx - ew / 2f
                            translationY = cy - eh / 2f
                            scaleX = el.scale
                            scaleY = el.scale
                            rotationZ = el.rotation
                            alpha = el.opacity
                        }
                        .width(with(androidx.compose.ui.platform.LocalDensity.current) { ew.toDp() })
                        .height(with(androidx.compose.ui.platform.LocalDensity.current) { eh.toDp() })
                        .then(
                            if (editable && selectedElementId == el.id) {
                                Modifier.border(1.dp, Lumi.colors.accent, RoundedCornerShape(el.cornerDp.dp))
                            } else Modifier
                        ),
                    contentAlignment = when (el.align) {
                        ClipboardAlign.START -> Alignment.CenterStart
                        ClipboardAlign.CENTER -> Alignment.Center
                        ClipboardAlign.END -> Alignment.CenterEnd
                    },
                ) {
                    WidgetElementView(element = el, now = now)
                }
            }
        }
    }
}

@Composable
private fun GlassBox(style: WidgetStyle, modifier: Modifier, content: @Composable () -> Unit) {
    val tint = Color(style.tint.toInt())
    val secondary = if (style.gradientSecondary != 0L) Color(style.gradientSecondary.toInt()) else tint
    val warmShift = if (style.warm) Color(0x33FFB27A) else Color.Transparent
    val base = if (style.blur > 0f && style.opacityPercent > 0) {
        Modifier.blur(style.blur.dp)
    } else Modifier
    Box(
        modifier
            .clip(RoundedCornerShape(style.cornerDp.dp))
            .then(base)
            .background(
                Brush.linearGradient(
                    listOf(
                        (tint.copy(alpha = style.opacityPercent / 100f * 0.55f)),
                        (secondary.copy(alpha = style.opacityPercent / 100f * 0.35f)),
                    ).map { it.compositeOver(warmShift) }
                )
            )
            .border(
                width = (1f * style.borderAlpha).dp,
                brush = Brush.verticalGradient(
                    listOf(
                        Color.White.copy(alpha = 0.35f * style.highlight),
                        Color.White.copy(alpha = 0.06f * style.highlight),
                    )
                ),
                shape = RoundedCornerShape(style.cornerDp.dp),
            ),
    ) { content() }
}

private fun Color.compositeOver(other: Color): Color {
    val a = other.alpha
    return Color(
        red = red * (1 - a) + other.red * a,
        green = green * (1 - a) + other.green * a,
        blue = blue * (1 - a) + other.blue * a,
        alpha = (alpha + a * (1 - alpha)).coerceIn(0f, 1f),
    )
}

@Composable
private fun WidgetElementView(element: WidgetElement, now: Long) {
    val color = if (element.gradient) {
        Color(element.color.toInt())
    } else Color(element.color.toInt())
    val gradientBrush = if (element.gradient && element.colorSecondary != 0L) {
        Brush.linearGradient(listOf(Color(element.color.toInt()), Color(element.colorSecondary.toInt())))
    } else null

    when (element.type) {
        WidgetElementType.CLOCK -> {
            val fmt = element.format.ifBlank { "HH:mm" }
            val text = remember(now, fmt) {
                runCatching { SimpleDateFormat(fmt, Locale.getDefault()).format(Date(now)) }.getOrDefault("--:--")
            }
            StyledText(text, element, gradientBrush)
        }
        WidgetElementType.DATE -> {
            val fmt = element.format.ifBlank { "EEE, d MMM" }
            val text = remember(now, fmt) {
                runCatching { SimpleDateFormat(fmt, Locale.getDefault()).format(Date(now)) }.getOrDefault("")
            }
            StyledText(text, element, gradientBrush)
        }
        WidgetElementType.BATTERY -> {
            val context = LocalContext.current
            val level = remember(now) {
                val bm = context.getSystemService(android.content.Context.BATTERY_SERVICE) as android.os.BatteryManager
                bm.getIntProperty(android.os.BatteryManager.BATTERY_PROPERTY_CAPACITY)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier
                        .width(28.dp)
                        .height(14.dp)
                        .border(1.5.dp, color.copy(alpha = 0.7f), RoundedCornerShape(4.dp))
                        .padding(1.5.dp),
                    contentAlignment = Alignment.CenterStart,
                ) {
                    Box(
                        Modifier
                            .fillMaxWidth(level / 100f)
                            .height(9.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(if (level < 20) Lumi.colors.danger else Lumi.colors.success)
                    )
                }
                Spacer(Modifier.width(8.dp))
                StyledText("$level%", element.copy(fontSizeSp = element.fontSizeSp * 0.8f), gradientBrush)
            }
        }
        WidgetElementType.WEATHER -> {
            val app = LumiApp.of(LocalContext.current)
            val manual = app.settings.state.value.widgets.weatherManualTemp
            if (manual == null) {
                Text(
                    "Weather source not configured",
                    color = Lumi.colors.onSurfaceMuted,
                    fontSize = (element.fontSizeSp * 0.42f).sp,
                )
            } else {
                StyledText("$manual°", element, gradientBrush)
            }
        }
        WidgetElementType.TEXT, WidgetElementType.CUSTOM_TEXT -> StyledText(element.text, element, gradientBrush)
        WidgetElementType.SHAPE, WidgetElementType.GRADIENT -> {
            val shape = RoundedCornerShape(element.cornerDp.dp)
            Box(
                Modifier
                    .fillMaxSize()
                    .clip(shape)
                    .background(
                        gradientBrush ?: Brush.linearGradient(
                            listOf(color.copy(alpha = 0.9f), color.copy(alpha = 0.55f))
                        )
                    )
                    .border(element.borderWidth.dp, Color(element.borderColor.toInt()), shape)
            )
        }
        WidgetElementType.PROGRESS -> {
            val level = element.scale.coerceIn(0f, 1f)
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(element.height.coerceAtLeast(0.04f).times(240).dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.16f)),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(level)
                        .height(element.height.coerceAtLeast(0.04f).times(240).dp)
                        .clip(RoundedCornerShape(50))
                        .background(gradientBrush ?: Brush.horizontalGradient(listOf(color, color)))
                )
            }
        }
        WidgetElementType.IMAGE, WidgetElementType.ICON -> ImageElement(element)
        WidgetElementType.MUSIC -> {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(34.dp).clip(RoundedCornerShape(10.dp))
                        .background(Brush.linearGradient(listOf(color.copy(alpha = 0.8f), Lumi.colors.accentSecondary))),
                    contentAlignment = Alignment.Center,
                ) {
                    Text("♪", color = Color.White, fontSize = 16.sp)
                }
                Spacer(Modifier.width(10.dp))
                Column {
                    Text(
                        element.text.ifBlank { "Nothing playing" },
                        color = color,
                        fontSize = (element.fontSizeSp * 0.55f).sp,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        "LUMI music card",
                        color = Lumi.colors.onSurfaceMuted,
                        fontSize = (element.fontSizeSp * 0.42f).sp,
                    )
                }
            }
        }
        WidgetElementType.CALENDAR -> {
            Column {
                Text(
                    SimpleDateFormat("MMMM yyyy", Locale.getDefault()).format(Date(now)),
                    color = color,
                    fontSize = (element.fontSizeSp * 0.6f).sp,
                    fontWeight = FontWeight.SemiBold,
                )
                CalendarMiniGrid(color = color, now = now, cellSize = (element.fontSizeSp * 0.5f))
            }
        }
    }
}

@Composable
private fun StyledText(text: String, element: WidgetElement, gradientBrush: Brush?) {
    val animatedAlpha = if (element.animated) {
        val transition = rememberInfiniteTransition(label = "pulse")
        val pulse by transition.animateFloat(
            initialValue = 0.55f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(1600, easing = LinearEasing), RepeatMode.Reverse),
            label = "pulseAlpha",
        )
        pulse
    } else 1f
    Text(
        text = text,
        fontSize = element.fontSizeSp.sp,
        fontWeight = FontWeight(element.fontWeight.coerceIn(100, 900)),
        letterSpacing = element.letterSpacing.sp,
        textAlign = when (element.align) {
            ClipboardAlign.START -> TextAlign.Start
            ClipboardAlign.CENTER -> TextAlign.Center
            ClipboardAlign.END -> TextAlign.End
        },
        maxLines = 2,
        modifier = Modifier.alpha(animatedAlpha),
        style = androidx.compose.ui.text.TextStyle(
            brush = gradientBrush,
            color = if (gradientBrush == null) Color(element.color.toInt()) else Color.Unspecified,
            shadow = if (element.shadow) androidx.compose.ui.graphics.Shadow(
                color = Color.Black.copy(alpha = 0.35f), blurRadius = 12f,
            ) else null,
            drawStyle = null,
        ),
    )
}

@Composable
private fun ImageElement(element: WidgetElement) {
    val app = LumiApp.of(LocalContext.current)
    var image by remember(element.imagePath) { mutableStateOf<ImageBitmap?>(null) }
    LaunchedEffect(element.imagePath) {
        val p = element.imagePath
        if (p != null) image = app.icons.loadFile(p, 512)
    }
    val bmp = image
    if (bmp != null) {
        androidx.compose.foundation.Image(
            bitmap = bmp,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(element.cornerDp.dp)),
        )
    } else {
        Box(
            Modifier.fillMaxSize().clip(RoundedCornerShape(element.cornerDp.dp))
                .background(Color.White.copy(alpha = 0.08f))
        )
    }
}

@Composable
private fun CalendarMiniGrid(color: Color, now: Long, cellSize: Float) {
    val cal = remember(now) { java.util.Calendar.getInstance().apply { timeInMillis = now } }
    val today = cal.get(java.util.Calendar.DAY_OF_MONTH)
    val daysInMonth = cal.getActualMaximum(java.util.Calendar.DAY_OF_MONTH)
    val firstDay = (cal.clone() as java.util.Calendar).apply {
        set(java.util.Calendar.DAY_OF_MONTH, 1)
    }.get(java.util.Calendar.DAY_OF_WEEK)
    Column(Modifier.padding(top = 6.dp)) {
        var day = 1
        val rows = ((daysInMonth + firstDay - 2) / 7) + 1
        repeat(rows) { r ->
            Row {
                repeat(7) { c ->
                    val index = r * 7 + c
                    if (index >= firstDay - 1 && day <= daysInMonth) {
                        val isToday = day == today
                        Box(
                            Modifier
                                .size((cellSize * 1.6f).dp)
                                .padding(1.dp)
                                .clip(CircleShape)
                                .background(if (isToday) color.copy(alpha = 0.9f) else Color.Transparent),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "$day",
                                color = if (isToday) Color.Black.copy(alpha = 0.8f) else color.copy(alpha = 0.75f),
                                fontSize = (cellSize * 0.8f).sp,
                            )
                        }
                        day++
                    } else {
                        Spacer(Modifier.size((cellSize * 1.6f).dp))
                    }
                }
            }
        }
    }
}
