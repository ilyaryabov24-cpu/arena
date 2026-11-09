package com.lumi.ui.wallpapers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.LinearGradient
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.PorterDuff
import android.graphics.PorterDuffXfermode
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import com.lumi.ui.core.model.WallpaperFilter
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import kotlin.math.max
import kotlin.math.min

/**
 * Applies the wallpaper studio's pipeline to a bitmap: colour matrix (brightness, contrast,
 * saturation, temperature), blur, tint, vignette and grain — then produces a bitmap that can be
 * handed to WallpaperManager or drawn behind the launcher.
 */
object WallpaperRenderer {

    fun loadSource(context: Context, path: String, maxDim: Int = 2400): Bitmap? {
        val file = File(path)
        if (!file.exists()) return null
        val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, opts)
        var sample = 1
        while (opts.outWidth / sample > maxDim || opts.outHeight / sample > maxDim) sample *= 2
        val bmp = BitmapFactory.decodeFile(
            path,
            BitmapFactory.Options().apply { inSampleSize = sample; inPreferredConfig = Bitmap.Config.ARGB_8888 },
        ) ?: return null
        return bmp
    }

    suspend fun render(context: Context, path: String, filter: WallpaperFilter, targetW: Int, targetH: Int): Bitmap? =
        withContext(Dispatchers.Default) {
            val src = loadSource(context, path) ?: return@withContext null
            render(src, filter, targetW, targetH)
        }

    fun render(src: Bitmap, f: WallpaperFilter, targetW: Int, targetH: Int): Bitmap {
        val outW = max(targetW, 1)
        val outH = max(targetH, 1)
        // 1. geometry: centre crop + user scale/offset/rotation
        val base = Bitmap.createBitmap(outW, outH, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(base)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

        val scale = max(outW.toFloat() / src.width, outH.toFloat() / src.height) * f.scale.coerceIn(1f, 3f)
        val dx = (outW - src.width * scale) / 2f + f.offsetX * outW * 0.5f
        val dy = (outH - src.height * scale) / 2f + f.offsetY * outH * 0.5f
        val matrix = Matrix().apply {
            postScale(scale, scale)
            postRotate(f.rotation, src.width * scale / 2f, src.height * scale / 2f)
            postTranslate(dx, dy)
        }
        canvas.drawBitmap(src, matrix, paint)

        // 2. colour pipeline
        val cm = ColorMatrix()
        // brightness -1..1 -> offset
        val b = f.brightness * 255f
        cm.postConcat(ColorMatrix(floatArrayOf(
            1f, 0f, 0f, 0f, b,
            0f, 1f, 0f, 0f, b,
            0f, 0f, 1f, 0f, b,
            0f, 0f, 0f, 1f, 0f,
        )))
        // contrast around 0.5
        val c = f.contrast.coerceIn(0.2f, 3f)
        val t = (1f - c) * 127.5f
        cm.postConcat(ColorMatrix(floatArrayOf(
            c, 0f, 0f, 0f, t,
            0f, c, 0f, 0f, t,
            0f, 0f, c, 0f, t,
            0f, 0f, 0f, 1f, 0f,
        )))
        val sat = ColorMatrix().apply { setSaturation(f.saturation.coerceIn(0f, 2.5f)) }
        cm.postConcat(sat)
        // temperature: warm boosts red, cools blue
        if (f.warmth != 0f) {
            val w = f.warmth.coerceIn(-1f, 1f)
            cm.postConcat(ColorMatrix(floatArrayOf(
                1f + w * 0.22f, 0f, 0f, 0f, w * 10f,
                0f, 1f + w * 0.06f, 0f, 0f, 0f,
                0f, 0f, 1f - w * 0.22f, 0f, -w * 10f,
                0f, 0f, 0f, 1f, 0f,
            )))
        }
        paint.colorFilter = ColorMatrixColorFilter(cm)
        canvas.drawBitmap(base, 0f, 0f, paint)

        // 3. tint layer
        if (f.tintStrength > 0.01f && (f.tintColor and 0x00FFFFFF) != 0) {
            paint.colorFilter = null
            paint.color = f.tintColor.toInt()
            paint.alpha = (f.tintStrength.coerceIn(0f, 1f) * 255).toInt()
            canvas.drawRect(0f, 0f, outW.toFloat(), outH.toFloat(), paint)
        }

        // 4. blur (render-script free approximation with downscale/upscale)
        if (f.blur > 0.01f) {
            val smallFactor = (1f + f.blur * 18f).coerceAtMost(34f)
            val sw = max(1, (outW / smallFactor).toInt())
            val sh = max(1, (outH / smallFactor).toInt())
            val small = Bitmap.createScaledBitmap(base, sw, sh, true)
            paint.alpha = 255
            paint.colorFilter = null
            canvas.drawBitmap(small, null, RectF(0f, 0f, outW.toFloat(), outH.toFloat()), paint)
            small.recycle()
        }

        // 5. vignette
        if (f.vignette > 0.01f) {
            val radius = max(outW, outH) * 0.78f
            val shader = RadialGradient(
                outW / 2f, outH / 2f, radius,
                intArrayOf(android.graphics.Color.TRANSPARENT, ((f.vignette.coerceIn(0f, 1f) * 190).toInt() shl 24)),
                floatArrayOf(0.55f, 1f),
                Shader.TileMode.CLAMP,
            )
            paint.shader = shader
            canvas.drawRect(0f, 0f, outW.toFloat(), outH.toFloat(), paint)
            paint.shader = null
        }

        // 6. dim
        if (f.dim > 0.01f) {
            paint.color = android.graphics.Color.BLACK
            paint.alpha = (f.dim.coerceIn(0f, 1f) * 255).toInt()
            canvas.drawRect(0f, 0f, outW.toFloat(), outH.toFloat(), paint)
        }

        // 7. grain
        if (f.grain > 0.01f) {
            paint.color = android.graphics.Color.WHITE
            paint.alpha = (f.grain * 10).toInt().coerceIn(0, 26)
            val rnd = java.util.Random(7)
            for (i in 0 until (outW * outH / 900)) {
                canvas.drawPoint(rnd.nextInt(outW).toFloat(), rnd.nextInt(outH).toFloat(), paint)
            }
        }

        if (base !== src) src.recycle()
        return base
    }

    /**
     * Procedural gradients used when no photo is chosen, and as theme-aware fallbacks so the
     * desktop always looks finished.
     */
    fun gradientWallpaper(colors: List<Int>, w: Int, h: Int, angle: Float = 135f, glowColor: Int? = null): Bitmap {
        val bmp = Bitmap.createBitmap(max(w, 1), max(h, 1), Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rad = Math.toRadians(angle.toDouble())
        val x0 = (w / 2f) - (Math.cos(rad) * w * 0.75f).toFloat()
        val y0 = (h / 2f) - (Math.sin(rad) * h * 0.75f).toFloat()
        val x1 = (w / 2f) + (Math.cos(rad) * w * 0.75f).toFloat()
        val y1 = (h / 2f) + (Math.sin(rad) * h * 0.75f).toFloat()
        paint.shader = LinearGradient(x0, y0, x1, y1, colors.toIntArray(), null, Shader.TileMode.CLAMP)
        canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), paint)
        if (glowColor != null) {
            paint.shader = RadialGradient(
                w * 0.76f, h * 0.14f, w * 0.85f,
                intArrayOf((glowColor and 0x00FFFFFF) or (0x4A shl 24), android.graphics.Color.TRANSPARENT),
                null, Shader.TileMode.CLAMP,
            )
            canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), paint)
            paint.shader = RadialGradient(
                w * 0.12f, h * 0.92f, w * 0.9f,
                intArrayOf((glowColor and 0x00FFFFFF) or (0x2E shl 24), android.graphics.Color.TRANSPARENT),
                null, Shader.TileMode.CLAMP,
            )
            canvas.drawRect(0f, 0f, w.toFloat(), h.toFloat(), paint)
        }
        return bmp
    }

    /** Round-trips a bitmap through a soft blur, used for the "depth" wallpaper layer. */
    fun softBlur(src: Bitmap, radius: Float): Bitmap {
        val w = max(1, (src.width / 8f).toInt())
        val h = max(1, (src.height / 8f).toInt())
        val small = Bitmap.createScaledBitmap(src, w, h, true)
        val out = Bitmap.createScaledBitmap(small, src.width, src.height, true)
        small.recycle()
        return out
    }
}
