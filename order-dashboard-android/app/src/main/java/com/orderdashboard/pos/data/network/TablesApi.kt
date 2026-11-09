package com.orderdashboard.pos.data.network

import retrofit2.Response
import retrofit2.http.GET

interface TablesApi {
    @GET("api/tables")
    suspend fun getTables(): Response<List<TableDto>>
}
