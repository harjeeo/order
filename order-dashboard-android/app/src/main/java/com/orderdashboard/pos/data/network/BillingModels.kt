package com.orderdashboard.pos.data.network

import kotlinx.serialization.Serializable

@Serializable
data class PayRequest(
    val subtotal: Int,
    val discountAmount: Int = 0,
    val serviceChargeAmount: Int = 0,
    val taxAmount: Int = 0,
    val roundOff: Int = 0,
    val total: Int,
    val method: String, // cash | card | upi | split | due | other
    val tipAmount: Int = 0,
)

@Serializable
data class InvoiceResponse(val id: String, val invoiceNumber: String)
