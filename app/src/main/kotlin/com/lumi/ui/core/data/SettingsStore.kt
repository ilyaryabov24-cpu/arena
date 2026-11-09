package com.lumi.ui.core.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.lumi.ui.core.model.LumiSettings
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.json.Json

private val Context.settingsStore: DataStore<Preferences> by preferencesDataStore(name = "lumi_settings")

/**
 * Single source of truth for the configuration tree.
 *
 * - writes are serialised through a debounced applier so a slider drag does not hit the disk 60x/s
 * - reads are exposed as a hot [StateFlow] so every screen (and the launcher) reacts instantly
 */
class SettingsStore(private val context: Context) {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        isLenient = true
    }

    private val key = stringPreferencesKey("lumi_settings_json")

    private val _state = MutableStateFlow(LumiSettings())
    val state: StateFlow<LumiSettings> = _state.asStateFlow()

    private var pendingWrite: LumiSettings? = null
    private var writeJob: kotlinx.coroutines.Job? = null

    val loaded = MutableStateFlow(false)

    init {
        scope.launch {
            context.settingsStore.data
                .catch { emit(androidx.datastore.preferences.core.emptyPreferences()) }
                .collect { prefs ->
                    val raw = prefs[key]
                    if (raw != null) {
                        runCatching { json.decodeFromString(LumiSettings.serializer(), raw) }
                            .onSuccess { _state.value = it }
                    }
                    loaded.value = true
                }
        }
    }

    fun update(transform: (LumiSettings) -> LumiSettings) {
        val next = transform(_state.value)
        _state.value = next
        scheduleWrite(next)
    }

    private fun scheduleWrite(next: LumiSettings) {
        pendingWrite = next
        if (writeJob?.isActive == true) return
        writeJob = scope.launch {
            kotlinx.coroutines.delay(180)
            val toWrite = pendingWrite ?: return@launch
            pendingWrite = null
            val raw = json.encodeToString(LumiSettings.serializer(), toWrite)
            context.settingsStore.edit { it[key] = raw }
        }
    }

    suspend fun flush() {
        val toWrite = pendingWrite ?: _state.value
        pendingWrite = null
        val raw = json.encodeToString(LumiSettings.serializer(), toWrite)
        context.settingsStore.edit { it[key] = raw }
    }

    fun replaceAll(next: LumiSettings) {
        _state.value = next
        scheduleWrite(next)
    }

    fun reset() {
        replaceAll(LumiSettings(onboardingDone = true))
    }
}
