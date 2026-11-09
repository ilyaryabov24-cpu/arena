package com.lumi.ui.home

import android.app.Activity
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Widgets
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lumi.ui.builder.BuilderScreen
import com.lumi.ui.core.LumiApp
import com.lumi.ui.core.i18n.tr
import com.lumi.ui.core.ui.GlassPanel
import com.lumi.ui.core.ui.Lumi
import com.lumi.ui.core.ui.LumiBackdrop
import com.lumi.ui.library.LibraryScreen
import com.lumi.ui.settings.SettingsScreen
import androidx.compose.runtime.CompositionLocalProvider as CLP
import androidx.lifecycle.compose.collectAsStateWithLifecycle

enum class ShellTab { HOME, BUILDER, LIBRARY, SETTINGS }

val LocalShellRoutes = androidx.compose.runtime.staticCompositionLocalOf<ShellNavigator> {
    error("Shell navigator missing")
}

/** Navigation model for the studio: a tab plus an optional full-screen route on top of it. */
class ShellNavigator(
    val tab: ShellTab,
    val route: String?,
    private val onTab: (ShellTab) -> Unit,
    private val onRoute: (String?) -> Unit,
) {
    fun openTab(t: ShellTab) = onTab(t)
    fun open(route: String) = onRoute(route)
    fun close() = onRoute(null)
}

@Composable
fun LumiShell(
    activity: Activity,
    startRoute: String?,
    onOpenLauncher: () -> Unit,
    onRequestDefaultHome: () -> Unit,
) {
    val app = remember { LumiApp.of(activity) }
    var tab by remember { mutableStateOf(ShellTab.HOME) }
    var route by remember { mutableStateOf<String?>(null) }
    val settings by collectAsStateWithLifecycle(app.settings.state)

    LaunchedEffect(startRoute) {
        if (!startRoute.isNullOrBlank()) route = startRoute
    }

    // Onboarding gate
    var onboardingDone by remember { mutableStateOf(settings.onboardingDone) }
    if (!onboardingDone) {
        OnboardingScreen(
            activity = activity,
            onFinish = {
                app.settings.update { it.copy(onboardingDone = true) }
                onboardingDone = true
            },
            onOpenLauncher = onOpenLauncher,
        )
        return
    }

    val navigator = remember(tab, route) {
        ShellNavigator(tab, route, onTab = { tab = it; route = null }, onRoute = { route = it })
    }

    LumiBackdrop(modifier = Modifier.fillMaxSize(), accent = Lumi.colors.accent) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Box(Modifier.weight(1f)) {
                AnimatedContent(
                    targetState = route,
                    transitionSpec = {
                        if (targetState != null) {
                            (slideInHorizontally(tween(320)) { it / 3 } + fadeIn(tween(220))) togetherWith
                                (slideOutHorizontally(tween(260)) { -it / 6 } + fadeOut(tween(200)))
                        } else {
                            (slideInHorizontally(tween(300)) { -it / 6 } + fadeIn(tween(220))) togetherWith
                                (slideOutHorizontally(tween(260)) { it / 3 } + fadeOut(tween(180)))
                        }
                    },
                    label = "shellRoute",
                ) { currentRoute ->
                    CLP(LocalShellRoutes provides navigator) {
                        if (currentRoute == null) {
                            when (tab) {
                                ShellTab.HOME -> HomeDashboard(
                                    activity = activity,
                                    onOpenLauncher = onOpenLauncher,
                                    onRequestDefaultHome = onRequestDefaultHome,
                                )
                                ShellTab.BUILDER -> BuilderScreen(activity = activity)
                                ShellTab.LIBRARY -> LibraryScreen(activity = activity)
                                ShellTab.SETTINGS -> SettingsScreen(activity = activity, onOpenLauncher = onOpenLauncher)
                            }
                        } else {
                            StudioRouter(route = currentRoute, activity = activity, onOpenLauncher = onOpenLauncher)
                        }
                    }
                }
            }
            if (route == null) {
                BottomNav(current = tab, onSelect = { tab = it })
            }
        }
    }
}

@Composable
private fun BottomNav(current: ShellTab, onSelect: (ShellTab) -> Unit) {
    Box(
        Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 18.dp, vertical = 10.dp),
    ) {
        GlassPanel(
            shape = RoundedCornerShape(26.dp),
            opacityPercent = 26,
            blurRadius = 22.dp,
            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 8.dp, vertical = 8.dp),
        ) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                NavItem(Icons.Rounded.Home, tr("nav.home"), current == ShellTab.HOME) { onSelect(ShellTab.HOME) }
                NavItem(Icons.Rounded.AutoAwesome, tr("nav.builder"), current == ShellTab.BUILDER) { onSelect(ShellTab.BUILDER) }
                NavItem(Icons.Rounded.Widgets, tr("nav.library"), current == ShellTab.LIBRARY) { onSelect(ShellTab.LIBRARY) }
                NavItem(Icons.Rounded.Settings, tr("nav.settings"), current == ShellTab.SETTINGS) { onSelect(ShellTab.SETTINGS) }
            }
        }
    }
}

@Composable
private fun NavItem(icon: ImageVector, label: String, active: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .clickable { onClick() }
            .padding(horizontal = 14.dp, vertical = 6.dp),
    ) {
        Box(
            Modifier
                .size(34.dp)
                .clip(CircleShape)
                .background(if (active) Brush.linearGradient(listOf(Lumi.colors.accent.copy(alpha = 0.4f), Lumi.colors.accentSecondary.copy(alpha = 0.2f))) else Brush.linearGradient(listOf(Color.Transparent, Color.Transparent))),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                icon, null,
                tint = if (active) Lumi.colors.onSurface else Lumi.colors.onSurfaceMuted,
                modifier = Modifier.size(19.dp),
            )
        }
        Spacer(Modifier.height(3.dp))
        Text(
            label,
            color = if (active) Lumi.colors.onSurface else Lumi.colors.onSurfaceFaint,
            fontSize = 9.5.sp,
            fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
        )
    }
}

