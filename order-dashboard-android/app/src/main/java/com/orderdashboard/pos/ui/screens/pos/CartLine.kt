package com.orderdashboard.pos.ui.screens.pos

import com.orderdashboard.pos.data.network.MenuAddonDto

data class CartLine(
    val id: String,
    val itemId: String,
    val name: String,
    val unitPrice: Int,
    val qty: Int,
    val taxPercent: Double,
    val addons: List<MenuAddonDto> = emptyList(),
    val notes: String = "",
) {
    /** Base price plus every selected add-on — what one unit of this line actually costs. */
    val effectiveUnitPrice: Int get() = unitPrice + addons.sumOf { it.price }
    val lineTotal: Int get() = effectiveUnitPrice * qty
}
