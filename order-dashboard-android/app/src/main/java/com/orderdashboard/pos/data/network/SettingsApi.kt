package com.orderdashboard.pos.data.network

import retrofit2.Response
import retrofit2.http.GET

interface SettingsApi {
    @GET("api/settings")
    suspend fun getSettings(): Response<SettingsResponse>
}
