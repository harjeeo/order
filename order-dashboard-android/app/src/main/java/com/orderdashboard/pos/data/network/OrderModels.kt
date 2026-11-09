package com.orderdashboard.pos.data.network

import kotlinx.serialization.Serializable

@Serializable
data class OrderItemPayload(
    val menuItemId: String? = null,
    val name: String,
    val qty: Int,
    val unitPrice: Int,
    val notes: String = "",
)

@Serializable
data class CreateOrderRequest(
    val orderType: String, // "dine_in" | "takeaway" | "delivery" — matches order-dashboard-api/src/routes/orders.ts
    val tableId: String? = null,
    val customerName: String = "Walk-in Customer",
    val waiter: String = "",
    val notes: String = "",
    val items: List<OrderItemPayload>,
    val amount: Int,
    val action: String = "save",
)

@Serializable
data class OrderResponse(val id: String, val orderNumber: String)
