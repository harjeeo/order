package com.orderdashboard.pos.ui.screens

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.orderdashboard.pos.data.network.ApiClient
import com.orderdashboard.pos.data.network.LoginRequest
import com.orderdashboard.pos.data.session.SessionManager
import kotlinx.coroutines.launch
import retrofit2.HttpException

// Mirrors order-dashboard/lib/useAuth.ts's login() + CafeLoginPage.tsx's
// role check (SUPER_ADMIN belongs in the Super Admin web console, not this
// staff-only POS app).
class LoginViewModel(private val session: SessionManager) : ViewModel() {
    var email by mutableStateOf("")
        private set
    var password by mutableStateOf("")
        private set
    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun onEmailChange(value: String) {
        email = value
        errorMessage = null
    }

    fun onPasswordChange(value: String) {
        password = value
        errorMessage = null
    }

    fun login(onSuccess: () -> Unit) {
        if (email.isBlank() || password.isBlank()) {
            errorMessage = "Enter your email and password."
            return
        }
        isLoading = true
        errorMessage = null
        viewModelScope.launch {
            try {
                val response = ApiClient.authApi.login(LoginRequest(email.trim(), password))
                val body = response.body()
                when {
                    !response.isSuccessful || body == null -> {
                        errorMessage = "Invalid email or password."
                    }
                    body.requires2FA == true -> {
                        // Two-factor accounts aren't supported in this first
                        // version of the app yet — surface a clear message
                        // rather than silently failing.
                        errorMessage = "This account has two-factor authentication enabled, which isn't supported in the app yet. Sign in on the web dashboard instead."
                    }
                    body.token != null && body.user != null -> {
                        if (body.user.role == "SUPER_ADMIN") {
                            errorMessage = "This is a Super Admin account — use the web dashboard, not this staff app."
                        } else {
                            session.save(body.token, body.user)
                            onSuccess()
                        }
                    }
                    else -> errorMessage = "Something went wrong. Please try again."
                }
            } catch (e: HttpException) {
                errorMessage = if (e.code() in 400..499) "Invalid email or password." else "Server error — please try again."
            } catch (e: Exception) {
                errorMessage = "Couldn't reach the server. Check your connection and try again."
            } finally {
                isLoading = false
            }
        }
    }

    class Factory(private val session: SessionManager) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST")
        override fun <T : ViewModel> create(modelClass: Class<T>): T = LoginViewModel(session) as T
    }
}
