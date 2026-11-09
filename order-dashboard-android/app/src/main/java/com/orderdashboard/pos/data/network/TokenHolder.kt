package com.orderdashboard.pos.data.network

/**
 * In-memory mirror of the JWT held in [com.orderdashboard.pos.data.session.SessionManager]'s
 * DataStore. OkHttp interceptors run synchronously, so they can't suspend to
 * read DataStore directly — SessionManager updates this alongside the
 * persisted copy on save()/clear(), and the app restores it once from
 * DataStore at startup (see MainActivity's splash check).
 */
object TokenHolder {
    @Volatile
    var token: String? = null
}
