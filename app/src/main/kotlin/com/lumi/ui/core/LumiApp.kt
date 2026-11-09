package com.lumi.ui.core

import android.app.Application
import android.content.Context
import com.lumi.ui.core.data.AppRepository
import com.lumi.ui.core.data.IconCache
import com.lumi.ui.core.data.LumiDatabase
import com.lumi.ui.core.data.SettingsStore
import com.lumi.ui.core.data.WorkspaceRepository
import com.lumi.ui.core.performance.PerfManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

/**
 * Manual dependency container. Deliberately small: the app has one process, one database and one
 * settings store, so a service locator keeps the wiring obvious without a DI framework.
 */
class LumiApp : Application() {

    lateinit var settings: SettingsStore
        private set
    lateinit var db: LumiDatabase
        private set
    lateinit var apps: AppRepository
        private set
    lateinit var icons: IconCache
        private set
    lateinit var workspace: WorkspaceRepository
        private set
    lateinit var perf: PerfManager
        private set

    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()
        instance = this
        settings = SettingsStore(this)
        db = LumiDatabase.get(this)
        apps = AppRepository(this)
        icons = IconCache(this)
        workspace = WorkspaceRepository(this, db, apps)
        perf = PerfManager(this, settings)
        appScope.launch {
            apps.refresh()
            workspace.bootstrapIfNeeded()
        }
    }

    companion object {
        lateinit var instance: LumiApp
            private set

        fun of(context: Context): LumiApp = context.applicationContext as LumiApp
    }
}
