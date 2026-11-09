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
 * uses. BuildConfig.API_BASE_URL is set in app/build.gradle.kts.
 */
object ApiClient {
    private val json = Json { ignoreUnknownKeys = true }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
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
    val menuApi: MenuApi = retrofit.create(MenuApi::class.java)
    val tablesApi: TablesApi = retrofit.create(TablesApi::class.java)
    val ordersApi: OrdersApi = retrofit.create(OrdersApi::class.java)
    val billingApi: BillingApi = retrofit.create(BillingApi::class.java)
    val settingsApi: SettingsApi = retrofit.create(SettingsApi::class.java)
}
