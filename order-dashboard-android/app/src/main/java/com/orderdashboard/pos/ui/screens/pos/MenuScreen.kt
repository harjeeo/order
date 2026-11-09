package com.orderdashboard.pos.ui.screens.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Restaurant
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.orderdashboard.pos.data.network.MenuAddonDto
import com.orderdashboard.pos.data.network.MenuItemDto
import com.orderdashboard.pos.ui.theme.ForestGreen900
import com.orderdashboard.pos.ui.theme.LeafGreen600
import com.orderdashboard.pos.ui.theme.LeafGreenContainer
import com.orderdashboard.pos.ui.theme.TextMuted
import com.orderdashboard.pos.ui.theme.White

@Composable
fun MenuScreen(viewModel: PosViewModel, onGoToCart: () -> Unit, onLogout: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            MenuHeader(
                cartCount = viewModel.cartItemCount(),
                onCartClick = onGoToCart,
                onLogoutClick = onLogout,
                searchQuery = viewModel.searchQuery,
                onSearchChange = viewModel::onSearchChange,
            )

            CategoryRow(
                categories = viewModel.categories,
                selected = viewModel.selectedCategory,
                onSelect = viewModel::selectCategory,
            )

            Box(modifier = Modifier.fillMaxSize()) {
                when {
                    viewModel.loadError != null -> ErrorState(viewModel.loadError!!, onRetry = viewModel::retryLoad)
                    viewModel.itemsLoading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = LeafGreen600)
                    }
                    viewModel.items.isEmpty() -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text("No items found.", color = TextMuted)
                    }
                    else -> LazyColumn(contentPadding = PaddingValues(16.dp)) {
                        items(viewModel.items, key = { it.id }) { item ->
                            MenuItemRow(item = item, onAdd = { viewModel.onItemTapped(item) })
                            Spacer(Modifier.height(12.dp))
                        }
                    }
                }
            }
        }
    }

    viewModel.configuringItem?.let { item ->
        ConfigureItemSheet(
            item = item,
            selectedVariant = viewModel.configuringVariant,
            selectedAddons = viewModel.configuringAddons,
            onSelectVariant = viewModel::selectConfiguringVariant,
            onToggleAddon = viewModel::toggleConfiguringAddon,
            onConfirm = viewModel::confirmConfiguring,
            onDismiss = viewModel::cancelConfiguring,
        )
    }
}

@Composable
private fun MenuHeader(
    cartCount: Int,
    onCartClick: () -> Unit,
    onLogoutClick: () -> Unit,
    searchQuery: String,
    onSearchChange: (String) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(ForestGreen900)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
            IconButton(onClick = onLogoutClick) {
                Icon(Icons.Filled.Logout, contentDescription = "Log out", tint = White)
            }
            Text(
                "Menu",
                color = White,
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.weight(1f),
            )
            BadgedBox(
                badge = {
                    if (cartCount > 0) {
                        Badge(containerColor = MaterialTheme.colorScheme.error) { Text("$cartCount") }
                    }
                },
            ) {
                IconButton(onClick = onCartClick) {
                    Icon(Icons.Filled.ShoppingCart, contentDescription = "Cart", tint = White)
                }
            }
        }
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchChange,
            placeholder = { Text("Search", color = White.copy(alpha = 0.6f)) },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null, tint = White.copy(alpha = 0.8f)) },
            singleLine = true,
            shape = RoundedCornerShape(24.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = White.copy(alpha = 0.4f),
                unfocusedBorderColor = White.copy(alpha = 0.2f),
                focusedTextColor = White,
                unfocusedTextColor = White,
                cursorColor = White,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun CategoryRow(categories: List<String>, selected: String, onSelect: (String) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(categories) { category ->
            val isSelected = category == selected
            Surface(
                shape = RoundedCornerShape(50),
                color = if (isSelected) ForestGreen900 else LeafGreenContainer,
                modifier = Modifier.clickable { onSelect(category) },
            ) {
                Text(
                    category,
                    color = if (isSelected) White else ForestGreen900,
                    fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }
    }
}

@Composable
private fun MenuItemRow(item: MenuItemDto, onAdd: () -> Unit) {
    Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(item.name, fontWeight = FontWeight.SemiBold, style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.height(4.dp))
                Text(
                    if (item.variants.isNotEmpty()) "From ₹${item.displayPrice}" else "₹${item.displayPrice}",
                    color = LeafGreen600,
                    fontWeight = FontWeight.Bold,
                )
                if (!item.available) {
                    Spacer(Modifier.height(2.dp))
                    Text("Out of stock", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyLarge)
                }
            }
            Box(
                modifier = Modifier
                    .size(64.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(LeafGreenContainer),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Restaurant, contentDescription = null, tint = LeafGreen600, modifier = Modifier.size(28.dp))
            }
            Spacer(Modifier.width(10.dp))
            Surface(
                shape = CircleShape,
                color = if (item.available) LeafGreen600 else TextMuted,
                modifier = Modifier
                    .size(32.dp)
                    .clickable(enabled = item.available, onClick = onAdd),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(Icons.Filled.Add, contentDescription = "Add ${item.name}", tint = White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun ErrorState(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Text(message, color = TextMuted, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
        Spacer(Modifier.height(12.dp))
        OutlinedButton(onClick = onRetry) { Text("Retry") }
    }
}

@Composable
private fun ConfigureItemSheet(
    item: MenuItemDto,
    selectedVariant: com.orderdashboard.pos.data.network.MenuVariantDto?,
    selectedAddons: Set<MenuAddonDto>,
    onSelectVariant: (com.orderdashboard.pos.data.network.MenuVariantDto) -> Unit,
    onToggleAddon: (MenuAddonDto) -> Unit,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.4f))
            .clickable(onClick = onDismiss),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Surface(
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier
                .fillMaxWidth()
                .clickable(enabled = false) {}, // swallow taps so they don't dismiss through the sheet
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                Text(item.name, style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(16.dp))

                if (item.variants.isNotEmpty()) {
                    Text("Size", fontWeight = FontWeight.SemiBold, color = TextMuted)
                    Spacer(Modifier.height(8.dp))
                    item.variants.forEach { variant ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSelectVariant(variant) }
                                .padding(vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                androidx.compose.material3.RadioButton(
                                    selected = selectedVariant?.id == variant.id,
                                    onClick = { onSelectVariant(variant) },
                                    colors = androidx.compose.material3.RadioButtonDefaults.colors(selectedColor = LeafGreen600),
                                )
                                Text(variant.name)
                            }
                            Text("₹${variant.price}", fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }

                if (item.addons.isNotEmpty()) {
                    Text("Add-ons", fontWeight = FontWeight.SemiBold, color = TextMuted)
                    Spacer(Modifier.height(8.dp))
                    item.addons.forEach { addon ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onToggleAddon(addon) }
                                .padding(vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                androidx.compose.material3.Checkbox(
                                    checked = selectedAddons.contains(addon),
                                    onCheckedChange = { onToggleAddon(addon) },
                                    colors = androidx.compose.material3.CheckboxDefaults.colors(checkedColor = LeafGreen600),
                                )
                                Text(addon.name)
                            }
                            Text("+₹${addon.price}", fontWeight = FontWeight.SemiBold)
                        }
                    }
                    Spacer(Modifier.height(12.dp))
                }

                Button(
                    onClick = onConfirm,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LeafGreen600),
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    Text("Add to order", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
