package com.lumi.ui.core.data

import android.content.Context
import android.content.Intent
import android.content.pm.LauncherApps
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.os.Build
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.core.graphics.drawable.toBitmap
import com.lumi.ui.core.model.SortMode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap

data class AppInfo(
    val packageName: String,
    val label: String,
    val className: String? = null,
    val firstInstallTime: Long = 0,
    val user: android.os.UserHandle? = null,
)

/**
 * Reads the real installed applications through PackageManager / LauncherApps, honouring Android's
 * package visibility rules, and caches icons so scrolling never blocks on the file system.
 */
class AppRepository(private val context: Context) {

    private val pm: PackageManager get() = context.packageManager

    private val _apps = MutableStateFlow<List<AppInfo>>(emptyList())
    val apps: StateFlow<List<AppInfo>> = _apps.asStateFlow()

    private val _labels = MutableStateFlow<Map<String, String>>(emptyMap())
    val labels: StateFlow<Map<String, String>> = _labels.asStateFlow()

    private val lock = Mutex()

    val selfPackage: String get() = context.packageName

    suspend fun refresh() = withContext(Dispatchers.IO) {
        lock.withLock {
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val resolved = pm.queryIntentActivities(intent, PackageManager.MATCH_ALL)
            val list = resolved.mapNotNull { ri ->
                val pkg = ri.activityInfo?.packageName ?: return@mapNotNull null
                if (pkg == selfPackage && false) return@mapNotNull null
                val label = runCatching { ri.loadLabel(pm).toString() }.getOrDefault(pkg)
                val installTime = runCatching {
                    pm.getPackageInfo(pkg, 0).firstInstallTime
                }.getOrDefault(0L)
                AppInfo(
                    packageName = pkg,
                    label = label,
                    className = ri.activityInfo?.name,
                    firstInstallTime = installTime,
                )
            }
                .distinctBy { it.packageName }
                .sortedBy { it.label.lowercase() }
            _apps.value = list
            _labels.value = list.associate { it.packageName to it.label }
        }
    }

    fun labelOf(pkg: String?): String {
        if (pkg == null) return ""
        return _labels.value[pkg]
            ?: runCatching {
                pm.getApplicationLabel(pm.getApplicationInfo(pkg, 0)).toString()
            }.getOrDefault(pkg.substringAfterLast('.'))
    }

    fun sorted(mode: SortMode, favorites: Set<String>, stats: Map<String, AppStatEntity>): List<AppInfo> {
        val all = _apps.value
        return when (mode) {
            SortMode.NAME -> all.sortedBy { it.label.lowercase() }
            SortMode.RECENT -> all.sortedByDescending { it.firstInstallTime }
            SortMode.FREQUENT -> all.sortedWith(
                compareByDescending<AppInfo> { stats[it.packageName]?.launchCount ?: 0 }
                    .thenBy { it.label.lowercase() }
            )
        }
    }

    fun launch(app: AppInfo) {
        val direct = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
            setClassName(app.packageName, app.className)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        }
        runCatching { context.startActivity(direct) }.onFailure {
            val fallback = pm.getLaunchIntentForPackage(app.packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            runCatching { fallback?.let(context::startActivity) }
        }
    }

    fun launchPackage(pkg: String?) {
        if (pkg == null) return
        val known = _apps.value.firstOrNull { it.packageName == pkg }
        if (known != null) launch(known) else {
            pm.getLaunchIntentForPackage(pkg)?.let {
                it.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                runCatching { context.startActivity(it) }
            }
        }
    }

    /** Drawable used by other launchers when LUMI widgets are placed on them. */
    fun iconOf(packageName: String): Drawable? = runCatching {
        pm.getApplicationIcon(packageName)
    }.getOrNull()

    /** All icon-pack packages installed on the device (they advertise the standard intent actions). */
    fun iconPacks(): List<Pair<String, String>> = runCatching {
        val packs = mutableSetOf<String>()
        pm.queryIntentActivities(Intent("com.novalauncher.THEME"), 0).forEach {
            packs += it.activityInfo.packageName
        }
        pm.queryIntentActivities(Intent("org.adw.launcher.THEMES"), 0).forEach {
            packs += it.activityInfo.packageName
        }
        packs.addAll(
            pm.getInstalledPackages(0).filter { it.packageName.startsWith("com.lumi.pack") }.map { it.packageName }
        )
        packs.map { it to pm.getApplicationLabel(pm.getApplicationInfo(it, 0)).toString() }
    }.getOrDefault(emptyList())

    fun launcherApps(): LauncherApps? = runCatching {
        context.getSystemService(Context.LAUNCHER_APPS_SERVICE) as? LauncherApps
    }.getOrNull()

    fun deviceModel(): String =
        "${Build.MANUFACTURER.replaceFirstChar { it.uppercase() }} ${Build.MODEL}"

    fun isHyperUi(): Boolean {
        val m = Build.MANUFACTURER.lowercase()
        return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco")
    }
}

/**
 * Process-wide icon cache. Icons are decoded once at the requested pixel size and re-used by both
 * the launcher and the studio previews.
 */
class IconCache(private val context: Context) {

    private val cache = ConcurrentHashMap<String, ImageBitmap>()
    private val inflight = ConcurrentHashMap<String, Boolean>()

    fun cached(pkg: String, sizePx: Int): ImageBitmap? = cache["$pkg@$sizePx"]

    fun put(pkg: String, sizePx: Int, bitmap: ImageBitmap) {
        if (cache.size > 600) cache.clear()
        cache["$pkg@$sizePx"] = bitmap
    }

    suspend fun load(pkg: String, sizePx: Int): ImageBitmap? = withContext(Dispatchers.IO) {
        cached(pkg, sizePx)?.let { return@withContext it }
        if (inflight.containsKey("$pkg@$sizePx")) return@withContext null
        inflight["$pkg@$sizePx"] = true
        try {
            val drawable = runCatching {
                context.packageManager.getApplicationIcon(pkg)
            }.getOrNull() ?: return@withContext null
            val bmp = drawable.toBitmap(sizePx.coerceAtLeast(48), sizePx.coerceAtLeast(48))
            val image = bmp.asImageBitmap()
            put(pkg, sizePx, image)
            image
        } catch (t: Throwable) {
            null
        } finally {
            inflight.remove("$pkg@$sizePx")
        }
    }

    /** Loads an arbitrary bitmap from a file path (used for custom icons and images). */
    suspend fun loadFile(path: String, sizePx: Int): ImageBitmap? = withContext(Dispatchers.IO) {
        cached("file:$path", sizePx)?.let { return@withContext it }
        runCatching {
            val opts = android.graphics.BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            android.graphics.BitmapFactory.decodeFile(path, opts)
            var sample = 1
            while (opts.outWidth / sample > sizePx * 2 && opts.outHeight / sample > sizePx * 2) sample *= 2
            val bmp = android.graphics.BitmapFactory.decodeFile(
                path,
                android.graphics.BitmapFactory.Options().apply { inSampleSize = sample },
            ) ?: return@withContext null
            val image = bmp.asImageBitmap()
            put("file:$path", sizePx, image)
            image
        }.getOrNull()
    }

    fun clear() = cache.clear()
}
