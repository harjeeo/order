package com.orderdashboard.pos.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface OrdersApi {
    @POST("api/orders")
    suspend fun createOrder(@Body body: CreateOrderRequest): Response<OrderResponse>
}
