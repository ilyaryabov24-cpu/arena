package com.lumi.ui.launcher

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.core.data.AppInfo
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi
import kotlinx.coroutines.delay

@Composable
fun LauncherSearchOverlay(
    viewModel: LauncherViewModel,
    apps: List<AppInfo>,
    onClose: () -> Unit,
) {
    var query by remember { mutableStateOf("") }
    val results = remember(query, apps) {
        if (query.isBlank()) apps
        else apps.filter { it.label.contains(query, true) || it.packageName.contains(query, true) }
    }
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.55f))
            .pointerInput(Unit) { detectTapGestures(onTap = { onClose() }) },
    ) {
        GlassPanel(
            shape = RoundedCornerShape(26.dp),
            opacityPercent = 66,
            contentPadding = PaddingValues(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp)
                .align(Alignment.TopCenter)
                .padding(top = 60.dp)
                .pointerInput(Unit) { detectTapGestures(onTap = {}) },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Search, null, tint = Lumi.colors.onSurfaceMuted, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(10.dp))
                    BasicTextField(
                        value = query,
                        onValueChange = { query = it },
                        textStyle = TextStyle(color = Lumi.colors.onSurface, fontSize = 16.sp),
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        decorationBox = { inner ->
                            if (query.isEmpty()) {
                                Text(tr("drawer.search_hint"), color = Lumi.colors.onSurfaceMuted, fontSize = 16.sp)
                            }
                            inner()
                        },
                    )
                }
                LazyColumn(Modifier.height(380.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    items(results, key = { it.packageName }) { app ->
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .clickable {
                                    viewModel.launch(app)
                                    onClose()
                                }
                                .padding(horizontal = 8.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AppIcon(app.packageName, 38.dp, com.lumi.ui.core.model.IconSettings())
                            Spacer(Modifier.width(12.dp))
                            Text(app.label, color = Lumi.colors.onSurface, fontSize = 15.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun WidgetPickerSheet(
    onDismiss: () -> Unit,
    onPickSystem: () -> Unit,
    onOpenStudio: () -> Unit,
) {
    Box(
        Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.5f))
            .pointerInput(Unit) { detectTapGestures(onTap = { onDismiss() }) },
        contentAlignment = Alignment.BottomCenter,
    ) {
        GlassPanel(
            shape = RoundedCornerShape(topStart = 30.dp, topEnd = 30.dp),
            opacityPercent = 70,
            contentPadding = PaddingValues(24.dp),
            modifier = Modifier
                .fillMaxWidth()
                .pointerInput(Unit) { detectTapGestures(onTap = {}) },
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(
                    tr("desktop.add_widget"),
                    color = Lumi.colors.onSurface,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                )
                SheetAction("LUMI widget studio", "Create a widget and place it here", onOpenStudio)
                SheetAction("Android widget", "Add a widget from an installed app", onPickSystem)
            }
        }
    }
}

@Composable
private fun SheetAction(title: String, subtitle: String, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(Color.White.copy(alpha = 0.08f))
            .clickable { onClick() }
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, color = Lumi.colors.onSurface, fontSize = 15.sp, fontWeight = FontWeight.Medium)
            Text(subtitle, color = Lumi.colors.onSurfaceMuted, fontSize = 12.sp)
        }
    }
}
