package com.lumi.ui.core.data

import android.content.Context
import com.lumi.ui.core.model.WidgetDoc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.withContext
import java.util.UUID

enum class ItemKind { APP, FOLDER, WIDGET_LUMI, WIDGET_SYSTEM }

data class WorkspaceItem(
    val id: String,
    val page: Int,
    val cellX: Int,
    val cellY: Int,
    val spanX: Int,
    val spanY: Int,
    val kind: ItemKind,
    val refId: String,
    val label: String?,
    val appWidgetId: Int = -1,
)

data class DockSlot(val slot: Int, val kind: ItemKind, val refId: String, val label: String?)

data class Folder(val id: String, val name: String, val packages: List<String>, val tint: Long)

/**
 * Owns the layout of the home screens: pages, cells, dock, folders, user widgets and bound Android
 * widgets. All mutations go through here so the launcher, the builder and the studio always agree.
 */
class WorkspaceRepository(
    private val context: Context,
    private val db: LumiDatabase,
    private val apps: AppRepository,
) {

    private val _items = MutableStateFlow<List<WorkspaceItem>>(emptyList())
    val items: StateFlow<List<WorkspaceItem>> = _items.asStateFlow()

    private val _dock = MutableStateFlow<List<DockSlot>>(emptyList())
    val dock: StateFlow<List<DockSlot>> = _dock.asStateFlow()

    private val _folders = MutableStateFlow<List<Folder>>(emptyList())
    val folders: StateFlow<List<Folder>> = _folders.asStateFlow()

    private val _desktopWidgets = MutableStateFlow<List<Long>>(emptyList())

    val itemFlow: Flow<List<WorkspaceItem>> = db.items().observeAll().map { list -> list.map { it.toModel() } }
    val dockFlow: Flow<List<DockSlot>> = db.dock().observeAll().map { list -> list.map { DockSlot(it.slot, ItemKind.valueOf(it.kind), it.refId, it.label) } }
    val folderFlow: Flow<List<Folder>> = db.folders().observeAll().map { list ->
        list.map { Folder(it.id, it.name, DbConverters.packFromJson(it.appPackages), it.colorTint) }
    }

    suspend fun bootstrapIfNeeded() = withContext(Dispatchers.IO) {
        if (db.items().all().isEmpty() && db.dock().all().isEmpty()) {
            val installed = apps.apps.value
            if (installed.isEmpty()) return@withContext
            val dockPkgs = listOf(
                "com.android.dialer", "com.google.android.dialer", "com.samsung.android.dialer",
                "com.android.mms", "com.google.android.apps.messaging", "com.samsung.android.messaging",
                "com.android.chrome", "com.google.android.youtube", "com.android.camera", "com.google.android.GoogleCamera",
            )
            val self = context.packageName
            val chosen = dockPkgs.mapNotNull { p -> installed.firstOrNull { it.packageName == p } }
                .distinctBy { it.packageName }
                .take(4)
            val fill = installed.filter { it.packageName != self && chosen.none { c -> c.packageName == it.packageName } }
            val dockList = (chosen + fill).take(4)
            dockList.forEachIndexed { index, app ->
                db.dock().upsert(DockItemEntity(slot = index, kind = ItemKind.APP.name, refId = app.packageName))
            }
            val desktopApps = installed
                .filter { it.packageName != self && dockList.none { d -> d.packageName == it.packageName } }
                .take(20)
            desktopApps.forEachIndexed { index, app ->
                val page = index / 20
                val cell = index % 20
                db.items().upsert(
                    ItemEntity(
                        id = UUID.randomUUID().toString(),
                        page = page,
                        cellX = cell % 4,
                        cellY = cell / 4,
                        kind = ItemKind.APP.name,
                        refId = app.packageName,
                    )
                )
            }
            refreshCache()
        }
    }

    suspend fun refreshCache() = withContext(Dispatchers.IO) {
        _items.value = db.items().all().map { it.toModel() }
        _dock.value = db.dock().all().map { DockSlot(it.slot, ItemKind.valueOf(it.kind), it.refId, it.label) }
        _folders.value = db.folders().all().map {
            Folder(it.id, it.name, DbConverters.packFromJson(it.appPackages), it.colorTint)
        }
    }

    /* ---------------------------------- pages -------------------------------------------- */

    fun itemsForPage(page: Int): List<WorkspaceItem> = _items.value.filter { it.page == page }

    suspend fun addApp(pkg: String, page: Int, cellX: Int, cellY: Int) {
        db.items().upsert(
            ItemEntity(
                id = UUID.randomUUID().toString(), page = page, cellX = cellX, cellY = cellY,
                kind = ItemKind.APP.name, refId = pkg,
            )
        )
        refreshCache()
    }

    suspend fun addWidgetPage(docId: Long, page: Int, cellX: Int, cellY: Int, spanX: Int, spanY: Int, label: String? = null) {
        db.items().upsert(
            ItemEntity(
                id = UUID.randomUUID().toString(), page = page, cellX = cellX, cellY = cellY,
                spanX = spanX, spanY = spanY, kind = ItemKind.WIDGET_LUMI.name, refId = docId.toString(),
                label = label,
            )
        )
        refreshCache()
    }

    suspend fun addSystemWidget(widgetId: Int, page: Int, cellX: Int, cellY: Int, spanX: Int, spanY: Int) {
        db.items().upsert(
            ItemEntity(
                id = UUID.randomUUID().toString(), page = page, cellX = cellX, cellY = cellY,
                spanX = spanX, spanY = spanY, kind = ItemKind.WIDGET_SYSTEM.name,
                refId = widgetId.toString(), widgetId = widgetId,
            )
        )
        refreshCache()
    }

    suspend fun moveItem(id: String, page: Int, cellX: Int, cellY: Int) {
        val existing = db.items().all().firstOrNull { it.id == id } ?: return
        db.items().upsert(existing.copy(page = page, cellX = cellX, cellY = cellY, updatedAt = System.currentTimeMillis()))
        refreshCache()
    }

    suspend fun resizeItem(id: String, spanX: Int, spanY: Int) {
        val existing = db.items().all().firstOrNull { it.id == id } ?: return
        db.items().upsert(existing.copy(spanX = spanX, spanY = spanY, updatedAt = System.currentTimeMillis()))
        refreshCache()
    }

    suspend fun remove(id: String) {
        db.items().delete(id)
        refreshCache()
    }

    suspend fun removeApp(pkg: String) {
        db.items().all().filter { it.kind == ItemKind.APP.name && it.refId == pkg }.forEach {
            db.items().delete(it.id)
        }
        db.dock().all().filter { it.kind == ItemKind.APP.name && it.refId == pkg }.forEach {
            db.dock().delete(it.slot)
        }
        refreshCache()
    }

    /* ---------------------------------- dock --------------------------------------------- */

    suspend fun setDockSlot(slot: Int, kind: ItemKind, refId: String, label: String? = null) {
        db.dock().upsert(DockItemEntity(slot, kind.name, refId, label))
        refreshCache()
    }

    suspend fun removeDockSlot(slot: Int) {
        db.dock().delete(slot)
        refreshCache()
    }

    /* ---------------------------------- folders ------------------------------------------ */

    suspend fun createFolder(name: String, packages: List<String>, page: Int, cellX: Int, cellY: Int): String {
        val id = UUID.randomUUID().toString()
        db.folders().upsert(FolderEntity(id, name, DbConverters.packToJson(packages)))
        db.items().upsert(
            ItemEntity(
                id = UUID.randomUUID().toString(), page = page, cellX = cellX, cellY = cellY,
                kind = ItemKind.FOLDER.name, refId = id, label = name,
            )
        )
        // the apps that moved into the folder leave the desktop
        packages.forEach { pkg ->
            db.items().all().filter { it.refId == pkg && it.kind == ItemKind.APP.name }.forEach {
                db.items().delete(it.id)
            }
        }
        refreshCache()
        return id
    }

    suspend fun updateFolder(folder: Folder) {
        db.folders().upsert(FolderEntity(folder.id, folder.name, DbConverters.packToJson(folder.packages), colorTint = folder.tint))
        refreshCache()
    }

    suspend fun deleteFolder(id: String) {
        db.folders().delete(id)
        db.items().all().filter { it.kind == ItemKind.FOLDER.name && it.refId == id }.forEach { db.items().delete(it.id) }
        refreshCache()
    }

    fun folder(id: String?): Folder? = _folders.value.firstOrNull { it.id == id }

    /* ---------------------------------- misc --------------------------------------------- */

    suspend fun allWidgetDocs(): List<WidgetDocEntity> = db.widgetDocs().all()

    suspend fun itemById(id: String): WorkspaceItem? = _items.value.firstOrNull { it.id == id }

    suspend fun maxPage(): Int = db.items().maxPage()

    suspend fun clearWorkspace() {
        db.items().clear()
        db.dock().clear()
        db.folders().clear()
        refreshCache()
    }

    /** Finds the first free cell for a widget of the given span on a page/grid. */
    fun findFreeCell(page: Int, spanX: Int, spanY: Int, columns: Int, rows: Int): Pair<Int, Int>? {
        val taken = _items.value.filter { it.page == page }
            .flatMap { item ->
                (item.cellY until item.cellY + item.spanY).flatMap { y ->
                    (item.cellX until item.cellX + item.spanX).map { x -> x to y }
                }
            }.toSet()
        for (y in 0..(rows - spanY)) {
            for (x in 0..(columns - spanX)) {
                val cells = (y until y + spanY).flatMap { yy -> (x until x + spanX).map { xx -> xx to yy } }
                if (cells.none { it in taken }) return x to y
            }
        }
        return null
    }

    private fun ItemEntity.toModel() = WorkspaceItem(
        id = id, page = page, cellX = cellX, cellY = cellY, spanX = spanX, spanY = spanY,
        kind = runCatching { ItemKind.valueOf(kind) }.getOrDefault(ItemKind.APP),
        refId = refId, label = label, appWidgetId = widgetId,
    )
}
