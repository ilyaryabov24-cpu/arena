package com.lumi.ui.core.performance

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import android.os.PowerManager
import com.lumi.ui.core.data.SettingsStore
import com.lumi.ui.core.model.PerfProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Turns the user's performance profile into concrete knobs that every renderer reads.
 *
 * The three profiles are not cosmetic: they change blur radius, particle counts, how many layers of
 * the live wallpaper run, whether shadows/glows are drawn at all, and the animation time scale.
 */
class PerfManager(private val context: Context, private val settings: SettingsStore) {

    val capabilities: DeviceCapabilities by lazy { detect() }

    private val _profile = MutableStateFlow(PerfProfile.BALANCED)
    val profile: StateFlow<PerfProfile> = _profile.asStateFlow()

    private val _lowPower = MutableStateFlow(false)
    val lowPower: StateFlow<Boolean> = _lowPower.asStateFlow()

    init {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        _lowPower.value = pm.isPowerSaveMode
        _profile.value = effectiveProfile()
    }

    fun refresh() {
        _profile.value = effectiveProfile()
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        _lowPower.value = pm.isPowerSaveMode
    }

    private fun effectiveProfile(): PerfProfile {
        val s = settings.state.value
        if (!s.adaptivePerformance) return s.performance
        if (isPowerSaving()) return PerfProfile.EFFICIENCY
        if (s.performance == PerfProfile.ULTRA && !capabilities.canRenderUltra) return PerfProfile.BALANCED
        return s.performance
    }

    private fun isPowerSaving(): Boolean {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        return pm.isPowerSaveMode
    }

    /** Multiplier applied to every duration in the app. */
    val animTimeScale: Float
        get() = when (_profile.value) {
            PerfProfile.EFFICIENCY -> 0.75f
            PerfProfile.BALANCED -> 1f
            PerfProfile.ULTRA -> 1f
        } * settings.state.value.animations.globalScale.coerceIn(0.25f, 2f)

    /** Blur radius used by glass surfaces (Compose RenderEffect blurs are expensive). */
    val glassBlurRadius: Float
        get() = when (_profile.value) {
            PerfProfile.EFFICIENCY -> 0f
            PerfProfile.BALANCED -> 14f
            PerfProfile.ULTRA -> 26f
        }

    val particleBudget: Int
        get() = when (_profile.value) {
            PerfProfile.EFFICIENCY -> 120
            PerfProfile.BALANCED -> 420
            PerfProfile.ULTRA -> 900
        }

    val liveLayersBudget: Int
        get() = when (_profile.value) {
            PerfProfile.EFFICIENCY -> 4
            PerfProfile.BALANCED -> 9
            PerfProfile.ULTRA -> 18
        }

    val targetFps: Int
        get() {
            val s = settings.state.value
            if (s.fpsCap > 0) return s.fpsCap
            return when (_profile.value) {
                PerfProfile.EFFICIENCY -> 60
                PerfProfile.BALANCED -> capabilities.maxRefreshRate.coerceAtMost(90)
                PerfProfile.ULTRA -> capabilities.maxRefreshRate.coerceAtMost(120)
            }
        }

    val allowShadows: Boolean get() = _profile.value != PerfProfile.EFFICIENCY
    val allowGlow: Boolean get() = _profile.value != PerfProfile.EFFICIENCY
    val allowParallax: Boolean get() = _profile.value != PerfProfile.EFFICIENCY
    val allowRealtimeBlur: Boolean get() = _profile.value == PerfProfile.ULTRA

    data class DeviceCapabilities(
        val maxRefreshRate: Float,
        val totalRamMb: Int,
        val isLowRamDevice: Boolean,
        val sdk: Int,
        val canRenderUltra: Boolean,
    )

    private fun detect(): DeviceCapabilities {
        val am = context.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val mem = ActivityManager.MemoryInfo().also { am.getMemoryInfo(it) }
        val dm = context.resources.displayMetrics
        val hz = runCatching {
            context.getSystemService(android.hardware.display.DisplayManager::class.java)
                ?.getDisplay(android.view.Display.DEFAULT_DISPLAY)
                ?.refreshRate ?: 60f
        }.getOrDefault(60f)
        val totalMb = (mem.totalMem / (1024 * 1024)).toInt()
        val lowRam = am.isLowRamDevice
        return DeviceCapabilities(
            maxRefreshRate = hz,
            totalRamMb = totalMb,
            isLowRamDevice = lowRam,
            sdk = Build.VERSION.SDK_INT,
            canRenderUltra = !lowRam && totalMb > 3500 && Build.VERSION.SDK_INT >= 31,
        )
    }

    /** Simple frame budget helper for the live wallpaper renderer. */
    fun shouldRenderFrame(lastFrameNanos: Long, nowNanos: Long): Boolean {
        val minDelta = 1_000_000_000L / targetFps.coerceAtLeast(30)
        return nowNanos - lastFrameNanos >= minDelta
    }
}
