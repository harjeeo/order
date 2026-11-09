package com.orderdashboard.pos.data.network

import kotlinx.serialization.Serializable

@Serializable
data class TaxSettings(
    val applyGst: Boolean = true,
    val cgstPercent: Double? = null,
    val sgstPercent: Double? = null,
    val igstPercent: Double? = null,
)

@Serializable
data class SettingsResponse(val tax: TaxSettings = TaxSettings())
