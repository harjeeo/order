package com.orderdashboard.pos.data.network

import okhttp3.Interceptor
import okhttp3.Response

/** Mirrors the web app's api.ts request() — attaches the staff JWT, when present, to every call. */
class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val original = chain.request()
        val token = TokenHolder.token
        val request = if (token != null) {
            original.newBuilder().addHeader("Authorization", "Bearer $token").build()
        } else {
            original
        }
        return chain.proceed(request)
    }
}
