package com.lumi.ui.core.ui

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.roundToInt

/* -------------------------------------------------------------------------------------------------
 * Small, consistent control set used by every studio screen. Keeping them here is what makes the
 * whole app feel like one product instead of fifteen separate tools.
 * ---------------------------------------------------------------------------------------------- */

@Composable
fun SectionHeader(title: String, subtitle: String? = null, trailing: (@Composable () -> Unit)? = null) {
    Row(
        Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, color = Lumi.colors.onSurface, fontSize = 16.sp, fontWeight = FontWeight.SemiBold)
            if (subtitle != null) {
                Text(subtitle, color = Lumi.colors.onSurfaceMuted, fontSize = 11.5.sp)
            }
        }
        trailing?.invoke()
    }
}

@Composable
fun CardTitle(title: String, subtitle: String? = null) {
    Column {
        Text(title, color = Lumi.colors.onSurface, fontSize = 14.5.sp, fontWeight = FontWeight.Medium)
        if (subtitle != null) {
            Text(subtitle, color = Lumi.colors.onSurfaceMuted, fontSize = 11.sp)
        }
    }
}

@Composable
fun LumiSlider(
    label: String,
    value: Float,
    valueRange: ClosedFloatingPointRange<Float>,
    onChange: (Float) -> Unit,
    modifier: Modifier = Modifier,
    valueLabel: ((Float) -> String)? = null,
) {
    val fraction = ((value - valueRange.start) / (valueRange.endInclusive - valueRange.start)).coerceIn(0f, 1f)
    Column(modifier.fillMaxWidth()) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text(label, color = Lumi.colors.onSurfaceMuted, fontSize = 12.sp, modifier = Modifier.weight(1f))
            Text(
                valueLabel?.invoke(value) ?: ((value * 100).roundToInt() / 100f).toString(),
                color = Lumi.colors.onSurface,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
            )
        }
        Spacer(Modifier.height(6.dp))
        var trackWidth by remember { mutableFloatStateOf(0f) }
        Box(
            Modifier
                .fillMaxWidth()
                .height(26.dp)
                .pointerInput(valueRange) {
                    detectTapGestures { offset ->
                        val f = (offset.x / size.width).coerceIn(0f, 1f)
                        onChange(valueRange.start + f * (valueRange.endInclusive - valueRange.start))
                    }
                }
                .pointerInput(valueRange) {
                    detectHorizontalDragGestures { change, _ ->
                        val f = (change.position.x / size.width).coerceIn(0f, 1f)
                        onChange(valueRange.start + f * (valueRange.endInclusive - valueRange.start))
                    }
                },
            contentAlignment = Alignment.CenterStart,
        ) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Color.White.copy(alpha = 0.12f)),
            )
            Box(
                Modifier
                    .fillMaxWidth(fraction)
                    .height(6.dp)
                    .clip(RoundedCornerShape(50))
                    .background(Brush.horizontalGradient(listOf(Lumi.colors.accent.copy(alpha = 0.9f), Lumi.colors.accentSecondary.copy(alpha = 0.85f))))
            )
            Box(
                Modifier
                    .fillMaxWidth(fraction)
                    .height(26.dp),
                contentAlignment = Alignment.CenterEnd,
            ) {
                Box(
                    Modifier
                        .size(16.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .border(2.dp, Lumi.colors.accent.copy(alpha = 0.6f), CircleShape)
                )
            }
        }
    }
}

@Composable
fun LumiToggle(label: String, checked: Boolean, onChange: (Boolean) -> Unit, subtitle: String? = null) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable { onChange(!checked) }
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(label, color = Lumi.colors.onSurface, fontSize = 13.5.sp)
            if (subtitle != null) Text(subtitle, color = Lumi.colors.onSurfaceMuted, fontSize = 10.5.sp)
        }
        Switch(checked = checked, onChange = onChange)
    }
}

@Composable
fun Switch(checked: Boolean, onChange: (Boolean) -> Unit) {
    val offset by animateFloatAsState(if (checked) 1f else 0f, spring(dampingRatio = 0.7f, stiffness = 520f), label = "switch")
    val bg by animateColorAsState(
        if (checked) Lumi.colors.accent.copy(alpha = 0.9f) else Color.White.copy(alpha = 0.14f),
        label = "switchColor",
    )
    Box(
        Modifier
            .width(46.dp)
            .height(28.dp)
            .clip(CircleShape)
            .background(bg)
            .clickable { onChange(!checked) }
            .padding(3.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        Box(
            Modifier
                .size(22.dp)
                .scale(1f)
                .clip(CircleShape)
                .background(Color.White)
                .then(Modifier)
        ) {
            Box(Modifier.fillMaxWidth().height(22.dp))
        }
        Box(
            Modifier
                .size(22.dp)
                .padding(start = (offset * 18).dp)
                .clip(CircleShape)
                .background(Color.White)
        )
    }
}

@Composable
fun Chip(label: String, selected: Boolean, onClick: () -> Unit, leading: ImageVector? = null) {
    Row(
        Modifier
            .clip(RoundedCornerShape(50))
            .background(if (selected) Lumi.colors.accent.copy(alpha = 0.28f) else Color.White.copy(alpha = 0.08f))
            .border(1.dp, if (selected) Lumi.colors.accent.copy(alpha = 0.5f) else Color.Transparent, RoundedCornerShape(50))
            .clickable { onClick() }
            .padding(horizontal = 12.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leading != null) {
            Icon(leading, null, tint = Lumi.colors.onSurface.copy(alpha = 0.9f), modifier = Modifier.size(14.dp))
            Spacer(Modifier.width(6.dp))
        }
        Text(
            label,
            color = if (selected) Lumi.colors.onSurface else Lumi.colors.onSurfaceMuted,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

@Composable
fun ChipRow(items: List<String>, selected: String, onSelect: (String) -> Unit, modifier: Modifier = Modifier) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items.forEach { item ->
            androidx.compose.foundation.layout.Box(Modifier.weight(1f)) {
                Chip(item, item == selected, { onSelect(item) })
            }
        }
    }
}

@Composable
fun SegmentedControl(options: List<String>, selectedIndex: Int, onSelect: (Int) -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.07f))
            .padding(3.dp),
        horizontalArrangement = Arrangement.spacedBy(3.dp),
    ) {
        options.forEachIndexed { i, option ->
            val selected = i == selectedIndex
            Box(
                Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(11.dp))
                    .background(if (selected) Lumi.colors.accent.copy(alpha = 0.35f) else Color.Transparent)
                    .clickable { onSelect(i) }
                    .padding(vertical = 8.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    option,
                    color = if (selected) Lumi.colors.onSurface else Lumi.colors.onSurfaceMuted,
                    fontSize = 11.5.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                )
            }
        }
    }
}

@Composable
fun PrimaryButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(
                        Lumi.colors.accent.copy(alpha = if (enabled) 0.95f else 0.3f),
                        Lumi.colors.accentSecondary.copy(alpha = if (enabled) 0.8f else 0.25f),
                    )
                )
            )
            .clickable(enabled = enabled) { onClick() }
            .padding(vertical = 13.dp, horizontal = 20.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Color.White, fontSize = 13.5.sp, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun GhostButton(label: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    Box(
        modifier
            .clip(RoundedCornerShape(16.dp))
            .background(Color.White.copy(alpha = 0.10f))
            .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(16.dp))
            .clickable(enabled = enabled) { onClick() }
            .padding(vertical = 12.dp, horizontal = 18.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(label, color = Lumi.colors.onSurface.copy(alpha = if (enabled) 1f else 0.4f), fontSize = 12.5.sp)
    }
}

@Composable
fun GlassTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String = "",
    modifier: Modifier = Modifier,
) {
    Box(
        modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.08f))
            .padding(horizontal = 14.dp, vertical = 11.dp),
    ) {
        if (value.isEmpty()) {
            Text(placeholder, color = Lumi.colors.onSurfaceMuted, fontSize = 13.sp)
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            textStyle = TextStyle(color = Lumi.colors.onSurface, fontSize = 13.sp),
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Horizontal colour swatch picker used across the studios. */
@Composable
fun ColorRow(
    colors: List<Color>,
    selected: Color,
    onSelect: (Color) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        colors.forEach { color ->
            val isSel = (color.value == selected.value)
            Box(
                Modifier
                    .size(if (isSel) 32.dp else 26.dp)
                    .clip(CircleShape)
                    .background(color)
                    .border(
                        width = if (isSel) 2.dp else 1.dp,
                        color = if (isSel) Color.White else Color.White.copy(alpha = 0.3f),
                        shape = CircleShape,
                    )
                    .clickable { onSelect(color) }
            )
        }
    }
}

/** Hue/lightness picker that writes back an ARGB long. */
@Composable
fun HueSlider(color: Color, onChange: (Color) -> Unit, modifier: Modifier = Modifier) {
    val hsv = remember(color) {
        FloatArray(3).also {
            android.graphics.Color.colorToHSV(
                android.graphics.Color.argb(
                    (color.alpha * 255).toInt(),
                    (color.red * 255).toInt(),
                    (color.green * 255).toInt(),
                    (color.blue * 255).toInt(),
                ), it,
            )
        }
    }
    var hue by remember(color) { mutableFloatStateOf(hsv[0]) }
    Column(modifier.fillMaxWidth()) {
        Box(
            Modifier
                .fillMaxWidth()
                .height(24.dp)
                .clip(RoundedCornerShape(50))
                .background(
                    Brush.horizontalGradient(
                        (0..12).map {
                            Color(android.graphics.Color.HSVToColor(floatArrayOf(it * 30f, 0.75f, 1f)))
                        }
                    )
                )
                .pointerInput(Unit) {
                    detectHorizontalDragGestures { change, _ ->
                        hue = (change.position.x / size.width * 360f).coerceIn(0f, 360f)
                        onChange(Color(android.graphics.Color.HSVToColor(floatArrayOf(hue, hsv[1].coerceAtLeast(0.5f), hsv[2]))))
                    }
                }
                .pointerInput(Unit) {
                    detectTapGestures { offset ->
                        hue = (offset.x / size.width * 360f).coerceIn(0f, 360f)
                        onChange(Color(android.graphics.Color.HSVToColor(floatArrayOf(hue, hsv[1].coerceAtLeast(0.5f), hsv[2]))))
                    }
                },
        )
    }
}

@Composable
fun InfoNote(text: String) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White.copy(alpha = 0.06f))
            .padding(12.dp),
    ) {
        Text(text, color = Lumi.colors.onSurfaceMuted, fontSize = 10.8.sp, lineHeight = 15.sp)
    }
}

@Composable
fun EmptyState(title: String, subtitle: String? = null, action: (@Composable () -> Unit)? = null) {
    Column(
        Modifier.fillMaxWidth().padding(vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(title, color = Lumi.colors.onSurfaceMuted, fontSize = 13.sp)
        if (subtitle != null) {
            Spacer(Modifier.height(4.dp))
            Text(subtitle, color = Lumi.colors.onSurfaceFaint, fontSize = 11.sp)
        }
        if (action != null) {
            Spacer(Modifier.height(12.dp))
            action()
        }
    }
}
