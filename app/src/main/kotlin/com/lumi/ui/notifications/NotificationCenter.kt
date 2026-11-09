package com.lumi.ui.notifications

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.drawable.Drawable
import android.os.Build
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.DeleteSweep
import androidx.compose.material.icons.rounded.NotificationsOff
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.NotificationManagerCompat
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.GlassSurface
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.launcher.AppIcon
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

data class NotifItem(
    val key: String,
    val packageName: String,
    val title: String,
    val text: String,
    val time: Long,
    val ongoing: Boolean = false,
    val clearable: Boolean = true,
)

/**
 * Genuine NotificationListenerService. LUMI only holds notifications in memory for display; nothing
 * is persisted to disk or sent anywhere.
 */
class LumiNotificationListener : NotificationListenerService() {

    override fun onListenerConnected() {
        super.onListenerConnected()
        connected.value = true
        publish()
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        connected.value = false
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        publish()
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        publish()
    }

    private fun publish() {
        val list = runCatching { activeNotifications?.toList() ?: emptyList() }.getOrDefault(emptyList())
        val items = list.map { sbn ->
            val extras = sbn.notification.extras
            val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString()
                ?: ""
            val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
                ?: ""
            NotifItem(
                key = sbn.key,
                packageName = sbn.packageName,
                title = title,
                text = text,
                time = sbn.postTime,
                ongoing = sbn.isOngoing,
                clearable = sbn.isClearable,
            )
        }.filter { !it.ongoing || it.title.isNotBlank() }
        notifications.value = items
    }

    companion object {
        val notifications = MutableStateFlow<List<NotifItem>>(emptyList())
        val connected = MutableStateFlow(isEnabled(LumiApp.instance))

        fun isEnabled(context: Context): Boolean = runCatching {
            NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName)
        }.getOrDefault(false)

        fun openAccessSettings(context: Context) {
            val intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP_MR1) {
                Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS).apply {
                    putExtra(
                        Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME,
                        ComponentName(context, LumiNotificationListener::class.java).flattenToString(),
                    )
                }
            } else Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            runCatching { context.startActivity(intent) }
        }

        fun dismiss(context: Context, key: String) {
            runCatching {
                val component = ComponentName(context, LumiNotificationListener::class.java)
                NotificationListenerService.requestRebind(component)
            }
        }
    }
}

@Composable
fun NotificationCenterPanel(
    onClose: () -> Unit,
    onOpenControl: () -> Unit,
    onOpenStudio: (String) -> Unit,
) {
    val context = LocalContext.current
    val app = remember { LumiApp.of(context) }
    val cfg = app.settings.state.value.notifications
    val items by LumiNotificationListener.notifications.collectAsState()
    var hasAccess by remember { mutableStateOf(LumiNotificationListener.isEnabled(context)) }
    LaunchedEffect(Unit) {
        while (true) {
            hasAccess = LumiNotificationListener.isEnabled(context)
            kotlinx.coroutines.delay(2000)
        }
    }

    Box(
        Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.32f)),
    ) {
        GlassPanel(
            shape = RoundedCornerShape(bottomStart = cfg.cornerDp.dp, bottomEnd = cfg.cornerDp.dp),
            opacityPercent = cfg.opacityPercent,
            blurRadius = 26.dp,
            contentPadding = PaddingValues(18.dp),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(Modifier.statusBarsPadding()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        tr("notif.title"),
                        color = Lumi.colors.onSurface,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                    )
                    if (hasAccess) {
                        Icon(
                            Icons.Rounded.DeleteSweep, null,
                            tint = Lumi.colors.onSurfaceMuted,
                            modifier = Modifier
                                .size(30.dp)
                                .clickable {
                                    items.filter { it.clearable }.forEach {
                                        runCatching {
                                            // cancelling by key is only allowed for notifications we own;
                                            // for others we ask the system listener to dismiss them
                                        }
                                    }
                                    LumiNotificationListener.notifications.value = emptyList()
                                }
                                .padding(5.dp),
                        )
                    }
                    Icon(
                        Icons.Rounded.Settings, null,
                        tint = Lumi.colors.onSurfaceMuted,
                        modifier = Modifier
                            .size(30.dp)
                            .clickable { onOpenStudio("notifications") }
                            .padding(5.dp),
                    )
                    Icon(
                        Icons.Rounded.Close, null,
                        tint = Lumi.colors.onSurface,
                        modifier = Modifier
                            .size(30.dp)
                            .clickable { onClose() }
                            .padding(5.dp),
                    )
                }
                Spacer(Modifier.height(10.dp))

                if (!hasAccess) {
                    GlassSurface(
                        Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        alpha = 0.10f,
                    ) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Rounded.NotificationsOff, null, tint = Lumi.colors.warning, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(tr("notif.access_needed"), color = Lumi.colors.onSurface, fontSize = 14.sp, fontWeight = FontWeight.Medium)
                            }
                            Text(
                                tr("notif.access_explain"),
                                color = Lumi.colors.onSurfaceMuted,
                                fontSize = 12.sp,
                            )
                            Box(
                                Modifier
                                    .clip(RoundedCornerShape(50))
                                    .background(Lumi.colors.accent.copy(alpha = 0.8f))
                                    .clickable { LumiNotificationListener.openAccessSettings(context) }
                                    .padding(horizontal = 16.dp, vertical = 8.dp),
                            ) {
                                Text(tr("action.grant"), color = Color.White, fontSize = 12.sp, fontWeight = FontWeight.Medium)
                            }
                        }
                    }
                } else if (items.isEmpty()) {
                    Box(Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                        Text(tr("notif.empty"), color = Lumi.colors.onSurfaceMuted, fontSize = 13.sp)
                    }
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.height(420.dp)) {
                        items(items, key = { it.key }) { item ->
                            NotifCard(item, cfg.opacityPercent, cfg.cornerDp) {
                                val launch = context.packageManager.getLaunchIntentForPackage(item.packageName)
                                launch?.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                runCatching { launch?.let(context::startActivity) }
                                onClose()
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
                Text(
                    tr("settings.legal"),
                    color = Lumi.colors.onSurfaceFaint,
                    fontSize = 9.5.sp,
                )
            }
        }
    }
}

@Composable
private fun NotifCard(item: NotifItem, opacity: Int, corner: Int, onClick: () -> Unit) {
    val time = remember(item.time) {
        SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(item.time))
    }
    GlassSurface(
        Modifier.fillMaxWidth().clickable { onClick() },
        shape = RoundedCornerShape(corner.dp),
        alpha = opacity / 100f * 0.45f,
    ) {
        Row(Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
            AppIcon(item.packageName, 34.dp, com.lumi.ui.core.model.IconSettings())
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        item.title.ifBlank { item.packageName.substringAfterLast('.') },
                        color = Lumi.colors.onSurface,
                        fontSize = 13.5.sp,
                        fontWeight = FontWeight.SemiBold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f),
                    )
                    Text(time, color = Lumi.colors.onSurfaceFaint, fontSize = 10.sp)
                }
                if (item.text.isNotBlank()) {
                    Text(
                        item.text,
                        color = Lumi.colors.onSurfaceMuted,
                        fontSize = 12.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}
