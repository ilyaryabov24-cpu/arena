package com.lumi.ui.core.data

import android.content.Context
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import com.lumi.ui.core.model.LumiTheme
import com.lumi.ui.core.model.LiveDoc
import com.lumi.ui.core.model.WidgetDoc
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json

private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true; isLenient = true }

/* ---------------------------------- entities --------------------------------------------- */

@Entity(tableName = "items")
data class ItemEntity(
    @PrimaryKey val id: String,
    val page: Int,
    val cellX: Int,
    val cellY: Int,
    val spanX: Int = 1,
    val spanY: Int = 1,
    /** APP | FOLDER | WIDGET_LUMI | WIDGET_SYSTEM */
    val kind: String,
    /** app package or folder id or widget document id */
    val refId: String,
    val label: String? = null,
    val widgetId: Int = -1,
    val zOrder: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "dock_items")
data class DockItemEntity(
    @PrimaryKey val slot: Int,
    /** APP | FOLDER */
    val kind: String,
    val refId: String,
    val label: String? = null,
)

@Entity(tableName = "folders")
data class FolderEntity(
    @PrimaryKey val id: String,
    val name: String,
    val appPackages: String, // JSON list
    val createdAt: Long = System.currentTimeMillis(),
    val colorTint: Long = 0x00000000,
)

@Entity(tableName = "themes")
data class ThemeEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val builtin: Boolean = false,
    val json: String,
    val accent: Long = 0xFF7FA9FF,
    val dark: Boolean = true,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "widget_docs")
data class WidgetDocEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val json: String,
    val template: String = "custom",
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "live_docs")
data class LiveDocEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    val json: String,
    val updatedAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "presets")
data class PresetEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
    /** WIDGET | THEME | LAYOUT | LIVE | WALLPAPER */
    val kind: String,
    val json: String,
    val createdAt: Long = System.currentTimeMillis(),
)

@Entity(tableName = "app_stats")
data class AppStatEntity(
    @PrimaryKey val packageName: String,
    val launchCount: Int = 0,
    val lastLaunch: Long = 0,
    val hidden: Boolean = false,
    val customIconPath: String? = null,
    val orderHint: Int = 0,
)

@Entity(tableName = "history")
data class HistoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val scope: String,
    val serialized: String,
    val at: Long = System.currentTimeMillis(),
)

/* ---------------------------------- daos ------------------------------------------------ */

@Dao
interface ItemDao {
    @Query("SELECT * FROM items ORDER BY page, cellY, cellX")
    fun observeAll(): Flow<List<ItemEntity>>

    @Query("SELECT * FROM items")
    suspend fun all(): List<ItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: ItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<ItemEntity>)

    @Update
    suspend fun update(item: ItemEntity)

    @Query("DELETE FROM items WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM items")
    suspend fun clear()

    @Query("SELECT COALESCE(MAX(page),0) FROM items")
    suspend fun maxPage(): Int
}

@Dao
interface DockDao {
    @Query("SELECT * FROM dock_items ORDER BY slot")
    fun observeAll(): Flow<List<DockItemEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: DockItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<DockItemEntity>)

    @Query("DELETE FROM dock_items WHERE slot = :slot")
    suspend fun delete(slot: Int)

    @Query("DELETE FROM dock_items")
    suspend fun clear()
}

@Dao
interface FolderDao {
    @Query("SELECT * FROM folders")
    fun observeAll(): Flow<List<FolderEntity>>

    @Query("SELECT * FROM folders")
    suspend fun all(): List<FolderEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(folder: FolderEntity)

    @Query("DELETE FROM folders WHERE id = :id")
    suspend fun delete(id: String)

    @Query("DELETE FROM folders")
    suspend fun clear()
}

@Dao
interface ThemeDao {
    @Query("SELECT * FROM themes ORDER BY builtin DESC, createdAt DESC")
    fun observeAll(): Flow<List<ThemeEntity>>

    @Query("SELECT * FROM themes")
    suspend fun all(): List<ThemeEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(theme: ThemeEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(themes: List<ThemeEntity>)

    @Query("DELETE FROM themes WHERE id = :id AND builtin = 0")
    suspend fun delete(id: Long)

    @Query("UPDATE themes SET name = :name WHERE id = :id AND builtin = 0")
    suspend fun rename(id: Long, name: String)

    @Query("UPDATE themes SET json = :json, name = :name WHERE id = :id")
    suspend fun update(id: Long, name: String, json: String)
}

@Dao
interface WidgetDocDao {
    @Query("SELECT * FROM widget_docs ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<WidgetDocEntity>>

    @Query("SELECT * FROM widget_docs")
    suspend fun all(): List<WidgetDocEntity>

    @Query("SELECT * FROM widget_docs WHERE id = :id")
    suspend fun byId(id: Long): WidgetDocEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(doc: WidgetDocEntity): Long

    @Query("DELETE FROM widget_docs WHERE id = :id")
    suspend fun delete(id: Long)
}

@Dao
interface LiveDocDao {
    @Query("SELECT * FROM live_docs ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<LiveDocEntity>>

    @Query("SELECT * FROM live_docs")
    suspend fun all(): List<LiveDocEntity>

    @Query("SELECT * FROM live_docs WHERE id = :id")
    suspend fun byId(id: Long): LiveDocEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(doc: LiveDocEntity): Long

    @Query("DELETE FROM live_docs WHERE id = :id")
    suspend fun delete(id: Long)
}

@Dao
interface PresetDao {
    @Query("SELECT * FROM presets ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<PresetEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(preset: PresetEntity): Long

    @Query("DELETE FROM presets WHERE id = :id")
    suspend fun delete(id: Long)
}

@Dao
interface AppStatDao {
    @Query("SELECT * FROM app_stats")
    fun observeAll(): Flow<List<AppStatEntity>>

    @Query("SELECT * FROM app_stats")
    suspend fun all(): List<AppStatEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(stat: AppStatEntity)

    @Query("DELETE FROM app_stats")
    suspend fun clear()
}

@Dao
interface HistoryDao {
    @Query("SELECT * FROM history WHERE scope = :scope ORDER BY id DESC LIMIT 40")
    suspend fun recent(scope: String): List<HistoryEntity>

    @Insert
    suspend fun insert(entry: HistoryEntity): Long

    @Query("DELETE FROM history WHERE scope = :scope")
    suspend fun clear(scope: String)

    @Query("DELETE FROM history WHERE scope = :scope AND id = :id")
    suspend fun deleteById(scope: String, id: Long)
}

/* ---------------------------------- database -------------------------------------------- */

@Database(
    entities = [
        ItemEntity::class, DockItemEntity::class, FolderEntity::class, ThemeEntity::class,
        WidgetDocEntity::class, LiveDocEntity::class, PresetEntity::class, AppStatEntity::class,
        HistoryEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class LumiDatabase : RoomDatabase() {
    abstract fun items(): ItemDao
    abstract fun dock(): DockDao
    abstract fun folders(): FolderDao
    abstract fun themes(): ThemeDao
    abstract fun widgetDocs(): WidgetDocDao
    abstract fun liveDocs(): LiveDocDao
    abstract fun presets(): PresetDao
    abstract fun appStats(): AppStatDao
    abstract fun history(): HistoryDao

    companion object {
        @Volatile private var INSTANCE: LumiDatabase? = null

        fun get(context: Context): LumiDatabase = INSTANCE ?: synchronized(this) {
            INSTANCE ?: Room.databaseBuilder(
                context.applicationContext,
                LumiDatabase::class.java,
                "lumi.db",
            ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
        }
    }
}

/* ---------------------------------- extension helpers ------------------------------------ */

object DbConverters {
    fun themeToJson(theme: LumiTheme): String = json.encodeToString(LumiTheme.serializer(), theme)
    fun themeFromJson(raw: String): LumiTheme = json.decodeFromString(LumiTheme.serializer(), raw)
    fun widgetToJson(doc: WidgetDoc): String = json.encodeToString(WidgetDoc.serializer(), doc)
    fun widgetFromJson(raw: String): WidgetDoc = json.decodeFromString(WidgetDoc.serializer(), raw)
    fun liveToJson(doc: LiveDoc): String = json.encodeToString(LiveDoc.serializer(), doc)
    fun liveFromJson(raw: String): LiveDoc = json.decodeFromString(LiveDoc.serializer(), raw)
    fun packToJson(list: List<String>): String = json.encodeToString(kotlinx.serialization.builtins.ListSerializer(kotlinx.serialization.builtins.serializer<String>()), list)
    fun packFromJson(raw: String): List<String> = runCatching {
        json.decodeFromString(kotlinx.serialization.builtins.ListSerializer(kotlinx.serialization.builtins.serializer<String>()), raw)
    }.getOrDefault(emptyList())
}

suspend fun LumiDatabase.seedThemesIfEmpty(presets: List<LumiTheme>) = withContext(Dispatchers.IO) {
    if (themes().all().isEmpty()) {
        themes().insertAll(presets.map {
            ThemeEntity(
                name = it.name, builtin = it.builtin, json = DbConverters.themeToJson(it),
                accent = it.accent, dark = it.darkTheme, createdAt = it.createdAt,
            )
        })
    }
}
