package com.orderdashboard.pos.data.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST
import retrofit2.http.Path

interface BillingApi {
    @POST("api/billing/orders/{orderId}/pay")
    suspend fun pay(@Path("orderId") orderId: String, @Body body: PayRequest): Response<InvoiceResponse>
}
