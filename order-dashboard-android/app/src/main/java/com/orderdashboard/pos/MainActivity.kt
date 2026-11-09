package com.orderdashboard.pos

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.orderdashboard.pos.data.session.SessionManager
import com.orderdashboard.pos.navigation.Routes
import com.orderdashboard.pos.ui.screens.LoginScreen
import com.orderdashboard.pos.ui.screens.SplashScreen
import com.orderdashboard.pos.ui.screens.pos.MenuScreen
import com.orderdashboard.pos.ui.screens.pos.NewOrderScreen
import com.orderdashboard.pos.ui.screens.pos.PosViewModel
import com.orderdashboard.pos.ui.screens.pos.SettleScreen
import com.orderdashboard.pos.ui.theme.CafePosTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CafePosTheme {
                Surface(modifier = Modifier.fillMaxSize()) {
                    CafePosNavHost()
                }
            }
        }
    }
}

@Composable
private fun CafePosNavHost() {
    val navController = rememberNavController()
    val context = LocalContext.current
    val sessionManager = remember { SessionManager(context) }
    val scope = rememberCoroutineScope()
    // Created once here (scoped to the Activity, not to any one screen) so
    // the cart and menu data survive navigating Menu <-> New Order <-> Settle.
    val posViewModel: PosViewModel = viewModel()

    NavHost(navController = navController, startDestination = Routes.SPLASH) {
        composable(Routes.SPLASH) {
            SplashScreen(
                onFinished = {
                    scope.launch {
                        val destination = if (sessionManager.token() != null) Routes.MENU else Routes.LOGIN
                        navController.navigate(destination) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    }
                }
            )
        }
        composable(Routes.LOGIN) {
            LoginScreen(
                sessionManager = sessionManager,
                onLoginSuccess = {
                    navController.navigate(Routes.MENU) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                },
            )
        }
        composable(Routes.MENU) {
            MenuScreen(
                viewModel = posViewModel,
                onGoToCart = { navController.navigate(Routes.NEW_ORDER) },
                onLogout = {
                    scope.launch {
                        sessionManager.clear()
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.MENU) { inclusive = true }
                        }
                    }
                },
            )
        }
        composable(Routes.NEW_ORDER) {
            NewOrderScreen(
                viewModel = posViewModel,
                onBack = { navController.popBackStack() },
                onPurchase = { navController.navigate(Routes.SETTLE) },
            )
        }
        composable(Routes.SETTLE) {
            SettleScreen(
                viewModel = posViewModel,
                onBack = { navController.popBackStack() },
                onCompleted = {
                    navController.navigate(Routes.MENU) {
                        popUpTo(Routes.MENU) { inclusive = true }
                    }
                },
            )
        }
    }
}
