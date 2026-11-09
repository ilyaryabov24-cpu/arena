package com.lumi.ui.launcher

import android.app.Activity
import android.app.WallpaperManager
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.data.AppInfo
import com.lumi.ui.core.data.AppStatEntity
import com.lumi.ui.core.data.Folder
import com.lumi.ui.core.data.ItemKind
import com.lumi.ui.core.data.WorkspaceItem
import com.lumi.ui.core.model.GestureActionType
import com.lumi.ui.core.model.GestureBinding
import com.lumi.ui.core.model.GestureType
import com.lumi.ui.core.model.LumiSettings
import com.lumi.ui.core.model.PerfProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

enum class LauncherOverlay { NONE, DRAWER, CONTROL, NOTIFICATIONS, FOLDER, EDIT, WIDGET_PICKER, SEARCH, WALLPAPER_QUICK }

data class OpenFolder(val folder: Folder, val originScale: Float = 0.4f)

class LauncherViewModel(private val app: LumiApp) : ViewModel() {

    val settings: StateFlow<LumiSettings> = app.settings.state

    val apps = app.apps.apps
    val items = app.workspace.items
    val dock = app.workspace.dock
    val folders = app.workspace.folders

    private val _overlay = MutableStateFlow(LauncherOverlay.NONE)
    val overlay = _overlay.asStateFlow()

    private val _openFolder = MutableStateFlow<OpenFolder?>(null)
    val openFolder = _openFolder.asStateFlow()

    private val _editing = MutableStateFlow(false)
    val editing = _editing.asStateFlow()

    private val _selectedItem = MutableStateFlow<String?>(null)
    val selectedItem = _selectedItem.asStateFlow()

    private val _currentPage = MutableStateFlow(0)
    val currentPage = _currentPage.asStateFlow()

    private val _toast = MutableStateFlow<String?>(null)
    val toast = _toast.asStateFlow()

    fun selectItem(id: String) {
        _selectedItem.value = id
        _overlay.value = LauncherOverlay.EDIT
    }

    fun clearSelection() {
        _selectedItem.value = null
        if (_overlay.value == LauncherOverlay.EDIT) _overlay.value = LauncherOverlay.NONE
    }

    fun toggleEditingOffside() {
        _editing.value = true
    }

    fun renameFolder(folder: Folder, name: String) = viewModelScope.launch {
        app.workspace.updateFolder(folder.copy(name = name))
    }


    val stats = mutableMapOf<String, AppStatEntity>()

    val searchQuery = MutableStateFlow("")

    val notifCount = MutableStateFlow(0)

    init {
        viewModelScope.launch {
            app.db.appStats().observeAll().collect { list ->
                stats.clear()
                list.forEach { stats[it.packageName] = it }
            }
        }
        viewModelScope.launch { app.apps.refresh() }
    }

    /* ---------------------------------- lifecycle helpers --------------------------------- */

    fun refreshAll() {
        viewModelScope.launch { app.apps.refresh() }
    }

    fun setPage(page: Int) {
        _currentPage.value = page.coerceAtLeast(0)
    }

    fun openOverlay(o: LauncherOverlay) {
        _overlay.value = o
    }

    fun closeOverlay() {
        _overlay.value = LauncherOverlay.NONE
        _openFolder.value = null
        _editing.value = false
        _selectedItem.value = null
        searchQuery.value = ""
    }

    fun toggleEditing() {
        _editing.value = !_editing.value
        if (_editing.value) _overlay.value = LauncherOverlay.EDIT
    }

    fun showToast(msg: String) {
        _toast.value = msg
    }

    fun consumeToast() {
        _toast.value = null
    }

    /* ---------------------------------- launching ---------------------------------------- */

    fun launch(appInfo: AppInfo) {
        app.apps.launch(appInfo)
        viewModelScope.launch {
            val existing = stats[appInfo.packageName] ?: AppStatEntity(appInfo.packageName)
            val updated = existing.copy(launchCount = existing.launchCount + 1, lastLaunch = System.currentTimeMillis())
            app.db.appStats().upsert(updated)
            stats[appInfo.packageName] = updated
        }
    }

    fun launchPackage(pkg: String?) {
        if (pkg == null) return
        app.apps.launchPackage(pkg)
        viewModelScope.launch {
            val existing = stats[pkg] ?: AppStatEntity(pkg)
            app.db.appStats().upsert(existing.copy(launchCount = existing.launchCount + 1, lastLaunch = System.currentTimeMillis()))
        }
    }

    fun folderApps(folder: Folder): List<AppInfo> =
        folder.packages.mapNotNull { pkg -> apps.value.firstOrNull { it.packageName == pkg } }

    fun openFolder(folder: Folder) {
        _openFolder.value = OpenFolder(folder)
        _overlay.value = LauncherOverlay.FOLDER
    }

    fun closeFolder() {
        _openFolder.value = null
        if (_overlay.value == LauncherOverlay.FOLDER) _overlay.value = LauncherOverlay.NONE
    }

    /* ---------------------------------- layout mutations --------------------------------- */

    fun moveItem(id: String, page: Int, cellX: Int, cellY: Int) = viewModelScope.launch {
        app.workspace.moveItem(id, page, cellX, cellY)
    }

    fun removeItem(id: String) = viewModelScope.launch {
        app.workspace.remove(id)
        showToast(app.settings.state.value.let { "" })
    }

    fun addAppToDesktop(pkg: String) = viewModelScope.launch {
        val s = app.settings.state.value.desktop
        val page = _currentPage.value
        val cell = app.workspace.findFreeCell(page, 1, 1, s.columns, s.rows)
        if (cell != null) {
            app.workspace.addApp(pkg, page, cell.first, cell.second)
            showToast("Added to home screen")
        } else {
            showToast("No free space on this page")
        }
    }

    fun addWidgetDoc(docId: Long, spanX: Int, spanY: Int, label: String?) = viewModelScope.launch {
        val s = app.settings.state.value.desktop
        val page = _currentPage.value
        val cell = app.workspace.findFreeCell(page, spanX, spanY, s.columns, s.rows)
        if (cell != null) {
            app.workspace.addWidgetPage(docId, page, cell.first, cell.second, spanX, spanY, label)
            showToast("Widget added")
        } else {
            showToast("Not enough free space for this widget")
        }
        closeOverlay()
    }

    fun addSystemWidget(widgetId: Int, spanX: Int, spanY: Int) = viewModelScope.launch {
        val s = app.settings.state.value.desktop
        val page = _currentPage.value
        val cell = app.workspace.findFreeCell(page, spanX, spanY, s.columns, s.rows)
        if (cell != null) {
            app.workspace.addSystemWidget(widgetId, page, cell.first, cell.second, spanX, spanY)
        } else {
            showToast("Not enough free space for this widget")
        }
    }

    fun createFolder(fromItemIds: List<String>, targetId: String) = viewModelScope.launch {
        val items = app.workspace.items.value.filter { it.id in fromItemIds }
        val pkgs = items.filter { it.kind == ItemKind.APP }.map { it.refId }
        if (pkgs.size < 2) return@launch
        val target = app.workspace.items.value.firstOrNull { it.id == targetId } ?: items.first()
        app.workspace.createFolder("Folder", pkgs, target.page, target.cellX, target.cellY)
        items.forEach { app.workspace.remove(it.id) }
        showToast("Folder created")
    }

    fun setDrawerSort(mode: com.lumi.ui.core.model.SortMode) {
        app.settings.update { s -> s.copy(drawer = s.drawer.copy(sortMode = mode)) }
    }

    fun hiddenPackages(): Set<String> =
        stats.filterValues { it.hidden }.keys

    fun toggleHidden(pkg: String, current: Set<String>) = viewModelScope.launch {
        val existing = stats[pkg] ?: AppStatEntity(pkg)
        val updated = existing.copy(hidden = !existing.hidden)
        app.db.appStats().upsert(updated)
        stats[pkg] = updated
    }

    fun setDockSlot(slot: Int, pkg: String) = viewModelScope.launch {
        app.workspace.setDockSlot(slot, ItemKind.APP, pkg)
    }

    /* ---------------------------------- gestures ----------------------------------------- */

    fun performGesture(gesture: GestureType, activity: Activity?) {
        val binding = app.settings.state.value.gestures.binding(gesture)
        performAction(binding.action, binding.payload, activity)
    }

    fun performAction(action: GestureActionType, payload: String?, activity: Activity?) {
        when (action) {
            GestureActionType.NONE -> Unit
            GestureActionType.DRAWER -> openOverlay(LauncherOverlay.DRAWER)
            GestureActionType.SEARCH -> openOverlay(LauncherOverlay.SEARCH)
            GestureActionType.CONTROL_CENTER -> openOverlay(LauncherOverlay.CONTROL)
            GestureActionType.NOTIFICATION_CENTER -> openOverlay(LauncherOverlay.NOTIFICATIONS)
            GestureActionType.SETTINGS -> activity?.startActivity(
                Intent(activity, com.lumi.ui.MainActivity::class.java).putExtra("route", "settings")
            )
            GestureActionType.WIDGET_STUDIO -> activity?.startActivity(
                Intent(activity, com.lumi.ui.MainActivity::class.java).putExtra("route", "widgets")
            )
            GestureActionType.WALLPAPER_STUDIO -> activity?.startActivity(
                Intent(activity, com.lumi.ui.MainActivity::class.java).putExtra("route", "wallpapers")
            )
            GestureActionType.APP -> launchPackage(payload)
            GestureActionType.PAGE_NEXT -> setPage(_currentPage.value + 1)
            GestureActionType.PAGE_PREV -> setPage((_currentPage.value - 1).coerceAtLeast(0))
            GestureActionType.FOLDER -> {
                app.workspace.folders.value.firstOrNull { it.id == payload }?.let { openFolder(it) }
            }
            GestureActionType.LOCK_SCREEN -> {
                // No silent system lock is available to a normal app without accessibility access,
                // so LUMI routes the user to its documented alternative instead of faking it.
                showToast("Locking requires system access that LUMI does not request")
            }
        }
    }

    fun setGesture(gesture: GestureType, binding: GestureBinding) {
        app.settings.update { s -> s.copy(gestures = s.gestures.with(gesture, binding)) }
    }

    /* ---------------------------------- system integration ------------------------------- */

    fun requestDefaultHome(activity: Activity) {
        val intent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
    }

    fun isDefaultHome(context: Context, selfPackage: String): Boolean {
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val res = context.packageManager.resolveActivity(intent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY)
        return res?.activityInfo?.packageName == selfPackage
    }

    fun setWallpaper(bitmap: android.graphics.Bitmap, onLock: Boolean) {
        viewModelScope.launch {
            runCatching {
                val wm = WallpaperManager.getInstance(app)
                if (onLock && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    wm.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                } else if (onLock) {
                    wm.setBitmap(bitmap, null, true, WallpaperManager.FLAG_LOCK)
                } else {
                    wm.setBitmap(bitmap, null, true, WallpaperManager.FLAG_SYSTEM)
                }
            }.onSuccess { showToast("Wallpaper applied") }
                .onFailure { showToast("Could not apply wallpaper on this device") }
        }
    }

    companion object {
        fun factory(app: LumiApp) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T = LauncherViewModel(app) as T
        }
    }
}
