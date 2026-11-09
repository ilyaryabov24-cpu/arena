package com.lumi.ui.themes

import android.app.Activity
import android.content.Intent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Delete
import androidx.compose.material.icons.rounded.Download
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.Upload
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lumi.ui.BlankTopBar
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.data.DbConverters
import com.lumi.ui.core.data.ThemeEntity
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.model.LumiTheme
import com.lumi.ui.core.ui.Chip
import com.lumi.ui.core.ui.GhostButton
import com.lumi.ui.core.ui.GlassCard
import com.lumi.ui.core.ui.GlassTextField
import com.lumi.ui.core.ui.InfoNote
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.core.ui.PrimaryButton
import com.lumi.ui.core.ui.SectionHeader
import com.lumi.ui.home.LocalShellRoutes
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

@Composable
fun ThemeStudio(activity: Activity) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val settings by collectAsStateWithLifecycle(app.settings.state)
    val nav = LocalShellRoutes.current
    val scope = rememberCoroutineScope()
    var themes by remember { mutableStateOf<List<ThemeEntity>>(emptyList()) }
    var pendingName by remember { mutableStateOf("") }
    var renamingId by remember { mutableStateOf<Long?>(null) }
    var message by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        withContext(Dispatchers.IO) {
            if (app.db.themes().all().isEmpty()) {
                app.db.themes().insertAll(
                    ThemePresets.all.map { theme ->
                        ThemeEntity(
                            name = theme.name,
                            builtin = true,
                            json = DbConverters.themeToJson(theme),
                            accent = theme.accent,
                            dark = theme.darkTheme,
                        )
                    }
                )
            }
        }
        app.db.themes().observeAll().collect { list -> themes = list }
    }
    LaunchedEffect(message) {
        if (message != null) {
            kotlinx.coroutines.delay(2600)
            message = null
        }
    }

    val exportLauncher = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) {
            scope.launch {
                val theme = themes.firstOrNull { it.id == settings.activeThemeId }?.let { ThemePresets.capture(settings, it.name) }
                    ?: ThemePresets.capture(settings, settings.activeThemeName)
                runCatching {
                    context.contentResolver.openOutputStream(uri)?.use { out ->
                        out.write(DbConverters.themeToJson(theme).toByteArray())
                    }
                }
                message = tr("theme.exported")
            }
        }
    }

    val importLauncher = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            scope.launch {
                val raw = runCatching {
                    context.contentResolver.openInputStream(uri)?.bufferedReader()?.readText()
                }.getOrNull()
                if (raw == null) {
                    message = tr("theme.import_failed")
                    return@launch
                }
                runCatching { DbConverters.themeFromJson(raw) }
                    .onSuccess { theme ->
                        val copy = theme.copy(id = 0, builtin = false, name = theme.name + " (imported)")
                        app.db.themes().insert(
                            ThemeEntity(
                                name = copy.name, builtin = false, json = DbConverters.themeToJson(copy),
                                accent = copy.accent, dark = copy.darkTheme,
                            )
                        )
                        message = tr("theme.imported")
                    }
                    .onFailure { message = tr("theme.import_failed") }
            }
        }
    }

    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 18.dp)) {
        BlankTopBar(tr("theme.studio"), onBack = { nav.close() })
        Spacer(Modifier.height(8.dp))

        if (message != null) {
            InfoNote(message!!)
            Spacer(Modifier.height(8.dp))
        }

        SectionHeader(tr("theme.active"), settings.activeThemeName)
        // current look preview strip
        GlassCard(Modifier.fillMaxWidth(), shape = RoundedCornerShape(22.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    Modifier.size(52.dp).clip(RoundedCornerShape(16.dp)).background(
                        Brush.linearGradient(
                            listOf(Lumi.colors.accent.copy(alpha = 0.85f), Lumi.colors.accentSecondary.copy(alpha = 0.5f))
                        )
                    )
                )
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(settings.activeThemeName, color = Lumi.colors.onSurface, fontSize = 15.sp, fontWeight = FontWeight.SemiBold)
                    Text(
                        "${settings.icons.shape.name.lowercase().replace('_', ' ')} · ${settings.animations.profile} · ${settings.desktop.columns}×${settings.desktop.rows}",
                        color = Lumi.colors.onSurfaceMuted,
                        fontSize = 11.sp,
                    )
                }
            }
        }
        Spacer(Modifier.height(12.dp))

        SectionHeader(tr("theme.my"), "${themes.count { !it.builtin }}")
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
            Chip(tr("theme.capture"), false, {
                scope.launch {
                    val theme = ThemePresets.capture(settings, "My theme ${themes.size + 1}")
                    app.db.themes().insert(
                        ThemeEntity(
                            name = theme.name, builtin = false, json = DbConverters.themeToJson(theme),
                            accent = theme.accent, dark = theme.darkTheme,
                        )
                    )
                    message = tr("action.saved")
                }
            })
            Chip(tr("action.export"), false, {
                exportLauncher.launch("lumi-theme-${settings.activeThemeName.replace(' ', '-')}.json")
            })
            Chip(tr("action.import"), false, { importLauncher.launch(arrayOf("application/json", "*/*")) })
        }
        Spacer(Modifier.height(10.dp))

        themes.forEach { entity ->
            val theme = remember(entity.json) { runCatching { DbConverters.themeFromJson(entity.json) }.getOrNull() }
            val isActive = settings.activeThemeId == entity.id
            GlassCard(
                Modifier.fillMaxWidth().padding(vertical = 4.dp),
                shape = RoundedCornerShape(20.dp),
                contentPadding = PaddingValues(14.dp),
            ) {
                Column {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(
                                    Brush.linearGradient(
                                        listOf(
                                            Color(entity.accent.toInt()).copy(alpha = 0.9f),
                                            Lumi.colors.accentSecondary.copy(alpha = 0.35f),
                                        )
                                    )
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                entity.name.take(1),
                                color = Color.White,
                                fontSize = 17.sp,
                                fontWeight = FontWeight.Light,
                            )
                        }
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) {
                            Text(entity.name, color = Lumi.colors.onSurface, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                            Text(
                                if (entity.builtin) "Preset" else "Custom",
                                color = Lumi.colors.onSurfaceMuted,
                                fontSize = 10.5.sp,
                            )
                        }
                        if (isActive) {
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(Lumi.colors.accent.copy(alpha = 0.28f))
                                    .padding(horizontal = 10.dp, vertical = 4.dp),
                            ) {
                                Text(tr("theme.active"), color = Lumi.colors.onSurface, fontSize = 10.sp)
                            }
                        }
                    }
                    Spacer(Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Chip(tr("theme.apply"), !isActive, {
                            if (theme != null) {
                                app.settings.update { s -> ThemePresets.merge(s, theme.copy(id = entity.id)) }
                                message = tr("theme.applied")
                            }
                        })
                        if (!entity.builtin) {
                            Chip(tr("action.duplicate"), false, {
                                if (theme != null) {
                                    scope.launch {
                                        val copy = theme.copy(id = 0, name = entity.name + " copy")
                                        app.db.themes().insert(
                                            ThemeEntity(
                                                name = copy.name, builtin = false,
                                                json = DbConverters.themeToJson(copy),
                                                accent = copy.accent, dark = copy.darkTheme,
                                            )
                                        )
                                    }
                                }
                            })
                            Chip(tr("action.rename"), false, { renamingId = entity.id })
                            Chip(tr("action.delete"), false, {
                                scope.launch { app.db.themes().delete(entity.id) }
                            })
                        }
                    }
                    if (renamingId == entity.id) {
                        Spacer(Modifier.height(8.dp))
                        GlassTextField(
                            value = pendingName,
                            onValueChange = { pendingName = it },
                            placeholder = tr("theme.name"),
                        )
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            PrimaryButton(tr("action.save"), onClick = {
                                scope.launch {
                                    app.db.themes().rename(entity.id, pendingName.ifBlank { entity.name })
                                    renamingId = null
                                }
                            })
                            GhostButton(tr("action.cancel"), onClick = { renamingId = null })
                        }
                    }
                }
            }
        }
        Spacer(Modifier.height(12.dp))
        GhostButton(
            tr("theme.new"),
            onClick = {
                scope.launch {
                    val theme = ThemePresets.capture(settings, "Theme ${System.currentTimeMillis() % 1000}")
                    app.db.themes().insert(
                        ThemeEntity(
                            name = theme.name, builtin = false, json = DbConverters.themeToJson(theme),
                            accent = theme.accent, dark = theme.darkTheme,
                        )
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(40.dp))
    }
}
