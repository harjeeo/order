package com.orderdashboard.pos.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary = LeafGreen600,
    onPrimary = White,
    primaryContainer = LeafGreenContainer,
    onPrimaryContainer = ForestGreen900,
    secondary = ForestGreen800,
    onSecondary = White,
    background = SandBackground,
    onBackground = TextPrimary,
    surface = White,
    onSurface = TextPrimary,
    surfaceVariant = LeafGreenContainer,
    onSurfaceVariant = TextMuted,
    error = DangerRed,
)

private val DarkColors = darkColorScheme(
    primary = LeafGreen500,
    onPrimary = ForestGreen900,
    primaryContainer = LeafGreen600,
    onPrimaryContainer = White,
    secondary = LeafGreenContainer,
    background = ForestGreen900,
    onBackground = White,
    surface = ForestGreen800,
    onSurface = White,
    error = DangerRed,
)

// POS staff use this on a single shared counter device, not a personal
// phone — always light, matching the reference design, rather than
// following the system's dark-mode setting.
@Composable
fun CafePosTheme(content: @Composable () -> Unit) {
    val colors = if (isSystemInDarkTheme()) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        val window = (view.context as? android.app.Activity)?.window
        if (window != null) {
            window.statusBarColor = colors.background.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = colors != DarkColors
        }
    }
    MaterialTheme(
        colorScheme = colors,
        typography = CafePosTypography,
        content = content,
    )
}
