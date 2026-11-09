package com.lumi.ui.core.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * A real glass panel: blurs whatever is behind it (when the device supports RenderEffect) and
 * layers a natural tint, hairline border, top highlight and optional sheen on top. Used by the dock,
 * folders, control center and notification center so all panels share one material.
 */
@Composable
fun GlassPanel(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(LumiCorner),
    opacityPercent: Int = 30,
    blurRadius: Dp = 18.dp,
    blurEnabled: Boolean = true,
    tint: Color = Color.White,
    borderAlpha: Float = 1f,
    highlight: Float = 0.55f,
    gradient: Boolean = true,
    sheen: Boolean = true,
    contentPadding: PaddingValues = PaddingValues(14.dp),
    content: @Composable BoxScope.() -> Unit,
) {
    val alpha = (opacityPercent / 100f).coerceIn(0f, 1f)
    Box(
        modifier
            .clip(shape)
            .then(if (blurEnabled && blurRadius > 0.dp) Modifier.blur(blurRadius) else Modifier)
            .background(
                if (gradient) {
                    Brush.verticalGradient(
                        listOf(
                            tint.copy(alpha = (alpha * 1.25f).coerceAtMost(0.95f)),
                            tint.copy(alpha = alpha * 0.85f),
                            tint.copy(alpha = alpha * 0.6f),
                        )
                    )
                } else {
                    Brush.verticalGradient(listOf(tint.copy(alpha = alpha), tint.copy(alpha = alpha)))
                }
            )
            .drawWithContent {
                drawContent()
                val w = size.width
                val h = size.height
                drawRect(
                    brush = Brush.verticalGradient(
                        listOf(
                            Lumi.colors.glassBorder.copy(alpha = Lumi.colors.glassBorder.alpha * borderAlpha),
                            Lumi.colors.glassBorder.copy(alpha = Lumi.colors.glassBorder.alpha * borderAlpha * 0.3f),
                        )
                    ),
                    style = Stroke(width = 1.dp.toPx()),
                )
                if (highlight > 0f) {
                    val sw = 1.2f.dp.toPx()
                    drawLine(
                        brush = Brush.horizontalGradient(
                            listOf(
                                Color.Transparent,
                                Color.White.copy(alpha = 0.75f * highlight),
                                Color.Transparent,
                            ),
                            start = Offset(w * 0.12f, sw),
                            end = Offset(w * 0.88f, sw),
                        ),
                        start = Offset(w * 0.12f, sw),
                        end = Offset(w * 0.88f, sw),
                        strokeWidth = sw,
                    )
                }
                if (sheen) {
                    drawRect(
                        brush = Brush.linearGradient(
                            listOf(
                                Color.White.copy(alpha = 0.07f),
                                Color.Transparent,
                                Color.White.copy(alpha = 0.02f),
                            ),
                            start = Offset(0f, 0f),
                            end = Offset(w, h),
                        )
                    )
                }
            }
            .padding(contentPadding),
        content = content,
    )
}

/** A softer variation used for inline rows, chips and secondary surfaces. */
@Composable
fun GlassSurface(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(20.dp),
    alpha: Float = 0.10f,
    borderAlpha: Float = 0.8f,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier
            .clip(shape)
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color.White.copy(alpha = alpha * 1.35f),
                        Color.White.copy(alpha = alpha * 0.7f),
                    )
                )
            )
            .drawWithContent {
                drawContent()
                drawRect(
                    color = Color.White.copy(alpha = 0.13f * borderAlpha),
                    style = Stroke(width = 1.dp.toPx()),
                )
            },
        content = content,
    )
}
