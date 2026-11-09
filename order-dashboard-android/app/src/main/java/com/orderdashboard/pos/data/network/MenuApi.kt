package com.orderdashboard.pos.data.network

import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Query

interface MenuApi {
    @GET("api/menu/categories")
    suspend fun getCategories(): Response<List<String>>

    @GET("api/menu/items")
    suspend fun getItems(
        @Query("category") category: String? = null,
        @Query("search") search: String? = null,
    ): Response<List<MenuItemDto>>
}
