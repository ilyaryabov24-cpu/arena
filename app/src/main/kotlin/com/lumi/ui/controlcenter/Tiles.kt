package com.lumi.ui.controlcenter

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.media.AudioManager
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import com.lumi.ui.core.model.TileType

/**
 * Real device control. Android does not let a normal app flip Wi-Fi, Bluetooth, mobile data or
 * airplane mode silently, so for those we open the exact system panel/screen instead of drawing a
 * fake toggle. Every other tile performs a genuine action.
 */
object Tiles {

    data class TileState(
        val on: Boolean? = null,
        val available: Boolean = true,
        val subtitle: String = "",
        val opensSystemUi: Boolean = false,
    )

    fun wifiManager(context: Context): WifiManager? =
        context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager

    fun isWifiEnabled(context: Context): Boolean =
        runCatching { wifiManager(context)?.isWifiEnabled == true }.getOrDefault(false)

    fun isBluetoothEnabled(context: Context): Boolean = runCatching {
        val bm = context.getSystemService(Context.BLUETOOTH_SERVICE) as? android.bluetooth.BluetoothManager
        bm?.adapter?.isEnabled == true
    }.getOrDefault(false)

    fun isAirplaneOn(context: Context): Boolean = runCatching {
        Settings.Global.getInt(context.contentResolver, Settings.Global.AIRPLANE_MODE_ON) == 1
    }.getOrDefault(false)

    fun isDndOn(context: Context): Boolean = runCatching {
        val am = context.getSystemService(Context.NOTIFICATION_SERVICE) as android.app.NotificationManager
        am.currentInterruptionFilter != android.app.NotificationManager.INTERRUPTION_FILTER_ALL
    }.getOrDefault(false)

    fun isPowerSaverOn(context: Context): Boolean = runCatching {
        (context.getSystemService(Context.POWER_SERVICE) as android.os.PowerManager).isPowerSaveMode
    }.getOrDefault(false)

    fun isRotationLocked(context: Context): Boolean = runCatching {
        Settings.System.getInt(context.contentResolver, Settings.System.ACCELEROMETER_ROTATION) == 0
    }.getOrDefault(false)

    fun brightness(context: Context): Int = runCatching {
        Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS)
    }.getOrDefault(128)

    fun volumePercent(context: Context): Int = runCatching {
        val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
        (am.getStreamVolume(AudioManager.STREAM_MUSIC) * 100) / am.getStreamMaxVolume(AudioManager.STREAM_MUSIC).coerceAtLeast(1)
    }.getOrDefault(50)

    fun setVolume(context: Context, percent: Int) {
        runCatching {
            val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            val max = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
            am.setStreamVolume(AudioManager.STREAM_MUSIC, (max * percent / 100f).toInt().coerceIn(0, max), 0)
        }
    }

    /** Camera torch is a genuinely controllable system feature. */
    fun setTorch(context: Context, on: Boolean): Boolean = runCatching {
        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        val id = manager.cameraIdList.firstOrNull { camId ->
            manager.getCameraCharacteristics(camId).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        } ?: return false
        manager.setTorchMode(id, on)
        true
    }.getOrDefault(false)

    fun torchAvailable(context: Context): Boolean = runCatching {
        val manager = context.getSystemService(Context.CAMERA_SERVICE) as CameraManager
        manager.cameraIdList.any { camId ->
            manager.getCameraCharacteristics(camId).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) == true
        }
    }.getOrDefault(false)

    /** Opens the exact Android surface for actions a third-party app may not perform silently. */
    fun openSystemPanel(context: Context, type: TileType) {
        val intent = when (type) {
            TileType.WIFI -> Intent(Settings.ACTION_WIFI_SETTINGS)
            TileType.BLUETOOTH -> Intent(Settings.ACTION_BLUETOOTH_SETTINGS)
            TileType.MOBILE_DATA -> Intent(Settings.ACTION_DATA_ROAMING_SETTINGS)
            TileType.AIRPLANE -> Intent(Settings.ACTION_AIRPLANE_MODE_SETTINGS)
            TileType.DND -> Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)
            TileType.ROTATE -> Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
            TileType.BATTERY_SAVER -> Intent(Settings.ACTION_BATTERY_SAVER_SETTINGS)
            TileType.SETTINGS -> Intent(Settings.ACTION_SETTINGS)
            TileType.BRIGHTNESS -> Intent(Settings.ACTION_DISPLAY_SETTINGS)
            TileType.VOLUME -> Intent(Settings.ACTION_SOUND_SETTINGS)
            else -> Intent(Settings.ACTION_SETTINGS)
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { context.startActivity(intent) }
    }

    fun formatTime(ms: Long): String {
        val s = (ms / 1000).toInt()
        return "%02d:%02d".format(s / 60, s % 60)
    }

    fun bluetoothEnabledLegacy(): Boolean = false
}
