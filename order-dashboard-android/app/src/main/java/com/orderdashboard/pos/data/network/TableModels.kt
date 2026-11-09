package com.orderdashboard.pos.data.network

import kotlinx.serialization.Serializable

@Serializable
data class TableDto(
    val id: String,
    val number: String,
    val capacity: Int = 0,
    val status: String = "available",
)
