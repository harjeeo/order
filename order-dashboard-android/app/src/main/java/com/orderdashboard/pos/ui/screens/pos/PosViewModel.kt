package com.orderdashboard.pos.ui.screens.pos

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.orderdashboard.pos.data.network.ApiClient
import com.orderdashboard.pos.data.network.CreateOrderRequest
import com.orderdashboard.pos.data.network.MenuAddonDto
import com.orderdashboard.pos.data.network.MenuItemDto
import com.orderdashboard.pos.data.network.MenuVariantDto
import com.orderdashboard.pos.data.network.OrderItemPayload
import com.orderdashboard.pos.data.network.PayRequest
import com.orderdashboard.pos.data.network.TableDto
import kotlin.math.roundToInt
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

enum class OrderType(val backendValue: String, val label: String) {
    DINE_IN("dine_in", "Dine In"),
    TAKEAWAY("takeaway", "Take Away"),
    ONLINE("delivery", "Order Online"),
}

/**
 * Shared across the Menu, New Order and Settle & Save screens (created once
 * at the NavHost level so the cart survives navigating between them) —
 * mirrors order-dashboard/pages/CafePosPage.tsx's state and math, just for
 * the "place one order" slice of it (no discounts/offers/loyalty yet).
 */
class PosViewModel : ViewModel() {
    var categories by mutableStateOf(listOf("All"))
        private set
    var selectedCategory by mutableStateOf("All")
        private set
    var searchQuery by mutableStateOf("")
        private set
    var items by mutableStateOf(listOf<MenuItemDto>())
        private set
    var itemsLoading by mutableStateOf(true)
        private set
    var tables by mutableStateOf(listOf<TableDto>())
        private set
    var loadError by mutableStateOf<String?>(null)
        private set

    var orderType by mutableStateOf(OrderType.DINE_IN)
        private set
    var selectedTableId by mutableStateOf<String?>(null)
        private set
    var customerName by mutableStateOf("")
        private set

    var cart by mutableStateOf(listOf<CartLine>())
        private set

    var configuringItem by mutableStateOf<MenuItemDto?>(null)
        private set
    var configuringVariant by mutableStateOf<MenuVariantDto?>(null)
        private set
    var configuringAddons by mutableStateOf(setOf<MenuAddonDto>())
        private set

    var isSubmitting by mutableStateOf(false)
        private set
    var submitError by mutableStateOf<String?>(null)
        private set
    var lastInvoiceNumber by mutableStateOf<String?>(null)
        private set

    // Per-item tax (Menu Management) is authoritative; falls back to the
    // configured CGST+SGST (or IGST) rate for an item left at 0%/unset —
    // mirrors order-dashboard/pages/CafePosPage.tsx's defaultTaxPercent.
    private var defaultTaxPercent = 5.0
    private var applyGst = true

    private var itemsSearchJob: Job? = null

    init {
        loadInitial()
    }

    private fun loadInitial() {
        viewModelScope.launch {
            try {
                val categoriesResponse = ApiClient.menuApi.getCategories()
                categories = listOf("All") + (categoriesResponse.body() ?: emptyList())

                val tablesResponse = ApiClient.tablesApi.getTables()
                tables = tablesResponse.body() ?: emptyList()

                val settingsResponse = ApiClient.settingsApi.getSettings()
                val tax = settingsResponse.body()?.tax
                if (tax != null) {
                    applyGst = tax.applyGst
                    val cgst = tax.cgstPercent ?: 0.0
                    val sgst = tax.sgstPercent ?: 0.0
                    val igst = tax.igstPercent ?: 0.0
                    val configured = tax.cgstPercent != null || tax.sgstPercent != null || tax.igstPercent != null
                    val intraState = cgst + sgst
                    defaultTaxPercent = if (configured) (if (intraState > 0) intraState else igst) else 5.0
                }
            } catch (e: Exception) {
                loadError = "Couldn't load menu — pull down to retry."
            }
            loadItems()
        }
    }

    fun retryLoad() {
        loadError = null
        itemsLoading = true
        loadInitial()
    }

    fun selectCategory(name: String) {
        selectedCategory = name
        loadItems()
    }

    fun onSearchChange(query: String) {
        searchQuery = query
        itemsSearchJob?.cancel()
        itemsSearchJob = viewModelScope.launch {
            delay(300) // debounce — avoid firing a request on every keystroke
            loadItems()
        }
    }

    private fun loadItems() {
        val requestCategory = selectedCategory
        val requestSearch = searchQuery
        viewModelScope.launch {
            itemsLoading = true
            try {
                val response = ApiClient.menuApi.getItems(
                    category = requestCategory,
                    search = requestSearch.ifBlank { null },
                )
                // Ignore a response that's no longer for the current filters
                // (same race the web app's items-fetch effect guards against).
                if (requestCategory == selectedCategory && requestSearch == searchQuery) {
                    items = response.body() ?: emptyList()
                }
            } catch (e: Exception) {
                if (requestCategory == selectedCategory && requestSearch == searchQuery) {
                    items = emptyList()
                }
            } finally {
                if (requestCategory == selectedCategory && requestSearch == searchQuery) {
                    itemsLoading = false
                }
            }
        }
    }

    fun selectOrderType(type: OrderType) {
        orderType = type
        if (type != OrderType.DINE_IN) selectedTableId = null
    }

    fun setTable(tableId: String?) {
        selectedTableId = tableId
    }

    fun updateCustomerName(name: String) {
        customerName = name
    }

    /** Items with no variants and no add-ons go straight into the cart; everything else opens the picker. */
    fun onItemTapped(item: MenuItemDto) {
        if (item.variants.isEmpty() && item.addons.isEmpty()) {
            addLine(name = item.name, itemId = item.id, unitPrice = item.price, taxPercent = item.tax, addons = emptyList())
        } else {
            configuringItem = item
            configuringVariant = item.variants.firstOrNull()
            configuringAddons = emptySet()
        }
    }

    fun selectConfiguringVariant(variant: MenuVariantDto) {
        configuringVariant = variant
    }

    fun toggleConfiguringAddon(addon: MenuAddonDto) {
        configuringAddons = if (configuringAddons.contains(addon)) {
            configuringAddons - addon
        } else {
            configuringAddons + addon
        }
    }

    fun cancelConfiguring() {
        configuringItem = null
    }

    fun confirmConfiguring() {
        val item = configuringItem ?: return
        val variant = configuringVariant
        val name = if (variant != null) "${item.name} (${variant.name})" else item.name
        addLine(
            name = name,
            itemId = item.id,
            unitPrice = variant?.price ?: item.price,
            taxPercent = item.tax,
            addons = configuringAddons.toList(),
        )
        configuringItem = null
    }

    private fun addLine(name: String, itemId: String, unitPrice: Int, taxPercent: Double, addons: List<MenuAddonDto>) {
        val existingIndex = cart.indexOfFirst { it.name == name && it.addons.toSet() == addons.toSet() }
        cart = if (existingIndex != -1) {
            cart.mapIndexed { i, line -> if (i == existingIndex) line.copy(qty = line.qty + 1) else line }
        } else {
            cart + CartLine(
                id = "$itemId-${System.currentTimeMillis()}",
                itemId = itemId,
                name = name,
                unitPrice = unitPrice,
                qty = 1,
                taxPercent = taxPercent,
                addons = addons,
            )
        }
    }

    fun updateQty(lineId: String, delta: Int) {
        cart = cart.mapNotNull { line ->
            if (line.id != lineId) return@mapNotNull line
            val newQty = line.qty + delta
            if (newQty <= 0) null else line.copy(qty = newQty)
        }
    }

    fun removeLine(lineId: String) {
        cart = cart.filter { it.id != lineId }
    }

    fun cartItemCount(): Int = cart.sumOf { it.qty }

    val subtotal: Int get() = cart.sumOf { it.lineTotal }

    val taxAmount: Int
        get() {
            if (!applyGst) return 0
            return cart.sumOf { line ->
                val rate = if (line.taxPercent > 0) line.taxPercent else defaultTaxPercent
                (line.lineTotal * rate / 100).roundToInt()
            }
        }

    val total: Int get() = subtotal + taxAmount

    fun clearCart() {
        cart = emptyList()
        customerName = ""
        selectedTableId = null
        orderType = OrderType.DINE_IN
    }

    /** Creates the order, then settles it in one go — this app's whole job is placing+paying in one pass. */
    fun completeOrder(method: String, customerPaid: Int, tipAmount: Int, onDone: (Boolean) -> Unit) {
        if (cart.isEmpty()) {
            submitError = "Add at least one item first."
            onDone(false)
            return
        }
        if (orderType == OrderType.DINE_IN && selectedTableId == null) {
            submitError = "Select a table for a dine-in order."
            onDone(false)
            return
        }
        isSubmitting = true
        submitError = null
        viewModelScope.launch {
            try {
                val orderRequest = CreateOrderRequest(
                    orderType = orderType.backendValue,
                    tableId = selectedTableId,
                    customerName = customerName.ifBlank { "Walk-in Customer" },
                    items = cart.map {
                        OrderItemPayload(menuItemId = it.itemId, name = it.name, qty = it.qty, unitPrice = it.effectiveUnitPrice, notes = it.notes)
                    },
                    amount = total,
                    action = "save",
                )
                val orderResponse = ApiClient.ordersApi.createOrder(orderRequest)
                val order = orderResponse.body()
                if (!orderResponse.isSuccessful || order == null) {
                    submitError = "Couldn't save the order. Please try again."
                    isSubmitting = false
                    onDone(false)
                    return@launch
                }

                val payRequest = PayRequest(
                    subtotal = subtotal,
                    taxAmount = taxAmount,
                    total = total,
                    method = method,
                    tipAmount = tipAmount,
                )
                val payResponse = ApiClient.billingApi.pay(order.id, payRequest)
                val invoice = payResponse.body()
                if (!payResponse.isSuccessful || invoice == null) {
                    submitError = "Order was saved but payment didn't go through — settle it from the web dashboard."
                    isSubmitting = false
                    onDone(false)
                    return@launch
                }

                lastInvoiceNumber = invoice.invoiceNumber
                clearCart()
                isSubmitting = false
                onDone(true)
            } catch (e: Exception) {
                submitError = "Couldn't reach the server. Check your connection and try again."
                isSubmitting = false
                onDone(false)
            }
        }
    }
}
