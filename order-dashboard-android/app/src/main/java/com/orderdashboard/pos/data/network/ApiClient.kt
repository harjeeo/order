package com.orderdashboard.pos.data.network

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import com.orderdashboard.pos.BuildConfig
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit

/**
 * Talks to the same order-dashboard-api backend the web app (lib/api.ts)
 * uses. BuildConfig.API_BASE_URL is set per build type in app/build.gradle.kts
 * — defaults to the Android emulator's host-loopback address for local dev.
 */
object ApiClient {
    private val json = Json { ignoreUnknownKeys = true }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BODY else HttpLoggingInterceptor.Level.NONE
            }
        )
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
        .build()

    val authApi: AuthApi = retrofit.create(AuthApi::class.java)
}
