package com.orderdashboard.pos.data.session

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.orderdashboard.pos.data.network.LoginUser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "session")

/**
 * Persists the logged-in staff member's JWT across app restarts — mirrors
 * the web app's `order-dashboard-session` localStorage entry (lib/useAuth.ts),
 * just backed by DataStore instead of localStorage.
 */
class SessionManager(private val context: Context) {
    private object Keys {
        val TOKEN = stringPreferencesKey("token")
        val USER_NAME = stringPreferencesKey("user_name")
        val USER_EMAIL = stringPreferencesKey("user_email")
        val USER_ROLE = stringPreferencesKey("user_role")
        val HAS_SESSION = booleanPreferencesKey("has_session")
    }

    val isLoggedIn: Flow<Boolean> = context.dataStore.data.map { it[Keys.HAS_SESSION] == true }

    suspend fun token(): String? = context.dataStore.data.first()[Keys.TOKEN]

    suspend fun save(token: String, user: LoginUser) {
        context.dataStore.edit { prefs ->
            prefs[Keys.TOKEN] = token
            prefs[Keys.USER_NAME] = user.name
            prefs[Keys.USER_EMAIL] = user.email
            prefs[Keys.USER_ROLE] = user.role
            prefs[Keys.HAS_SESSION] = true
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
