package com.orderdashboard.pos.data.network

import kotlinx.serialization.Serializable

@Serializable
data class MenuCategoryRef(val id: String, val name: String)

@Serializable
data class MenuVariantDto(val id: String, val name: String, val price: Int)

@Serializable
data class MenuAddonDto(val id: String, val name: String, val price: Int)

@Serializable
data class MenuItemDto(
    val id: String,
    val name: String,
    val image: String = "",
    val price: Int,
    val tax: Double = 0.0,
    val available: Boolean = true,
    val category: MenuCategoryRef? = null,
    val variants: List<MenuVariantDto> = emptyList(),
    val addons: List<MenuAddonDto> = emptyList(),
) {
    /** What a staff member actually pays for one unit — variants override the base price. */
    val displayPrice: Int get() = variants.minOfOrNull { it.price } ?: price
}
