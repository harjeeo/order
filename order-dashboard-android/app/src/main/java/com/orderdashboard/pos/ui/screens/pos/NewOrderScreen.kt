package com.orderdashboard.pos.ui.screens.pos

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Remove
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.orderdashboard.pos.ui.theme.ForestGreen900
import com.orderdashboard.pos.ui.theme.LeafGreen600
import com.orderdashboard.pos.ui.theme.LeafGreenContainer
import com.orderdashboard.pos.ui.theme.TextMuted
import com.orderdashboard.pos.ui.theme.White

@Composable
fun NewOrderScreen(viewModel: PosViewModel, onBack: () -> Unit, onPurchase: () -> Unit) {
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back to menu")
            }
            Text("New Order", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        }

        OrderTypeTabs(selected = viewModel.orderType, onSelect = viewModel::setOrderType)

        Row(modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(
                value = viewModel.customerName,
                onValueChange = viewModel::setCustomerName,
                label = { Text("Customer name") },
                placeholder = { Text("Walk-in Customer") },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = LeafGreen600),
                modifier = Modifier.weight(1f),
            )
            if (viewModel.orderType == OrderType.DINE_IN) {
                TableDropdown(
                    tables = viewModel.tables,
                    selectedTableId = viewModel.selectedTableId,
                    onSelect = viewModel::setTable,
                    modifier = Modifier.weight(1f),
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Order List", fontWeight = FontWeight.SemiBold)
            Text("Total: ₹${viewModel.subtotal}", color = TextMuted)
        }
        Spacer(Modifier.height(8.dp))

        if (viewModel.cart.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(32.dp), contentAlignment = Alignment.Center) {
                Text("No items yet — go back and tap a menu item to add it.", color = TextMuted)
            }
        } else {
            LazyColumn(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
                items(viewModel.cart, key = { it.id }) { line ->
                    CartLineRow(
                        line = line,
                        onIncrease = { viewModel.updateQty(line.id, 1) },
                        onDecrease = { viewModel.updateQty(line.id, -1) },
                        onRemove = { viewModel.removeLine(line.id) },
                    )
                    Spacer(Modifier.height(10.dp))
                }
            }
        }

        Surface(shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
            Column(modifier = Modifier.padding(16.dp)) {
                TotalsRow("Subtotal", viewModel.subtotal)
                if (viewModel.taxAmount > 0) TotalsRow("Tax", viewModel.taxAmount)
                TotalsRow("Total", viewModel.total, emphasize = true)
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = onPurchase,
                    enabled = viewModel.cart.isNotEmpty(),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = ForestGreen900),
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                ) {
                    Text("Purchase · ₹${viewModel.total}", fontWeight = FontWeight.SemiBold, color = White)
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.Filled.ArrowForward, contentDescription = null, tint = White, modifier = Modifier.size(18.dp))
                }
            }
        }
    }
}

@Composable
private fun OrderTypeTabs(selected: OrderType, onSelect: (OrderType) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .background(LeafGreenContainer, RoundedCornerShape(14.dp))
            .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        OrderType.entries.forEach { type ->
            val isSelected = type == selected
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = if (isSelected) ForestGreen900 else androidx.compose.ui.graphics.Color.Transparent,
                modifier = Modifier.weight(1f).clickable { onSelect(type) },
            ) {
                Text(
                    type.label,
                    color = if (isSelected) White else ForestGreen900,
                    fontWeight = FontWeight.SemiBold,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp),
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TableDropdown(
    tables: List<com.orderdashboard.pos.data.network.TableDto>,
    selectedTableId: String?,
    onSelect: (String?) -> Unit,
    modifier: Modifier = Modifier,
) {
    var expanded by remember { mutableStateOf(false) }
    val selectedLabel = tables.find { it.id == selectedTableId }?.let { "Table ${it.number}" } ?: "Select table"

    ExposedDropdownMenuBox(expanded = expanded, onExpandedChange = { expanded = it }, modifier = modifier) {
        OutlinedTextField(
            value = selectedLabel,
            onValueChange = {},
            readOnly = true,
            label = { Text("Table") },
            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expanded) },
            colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = LeafGreen600),
            modifier = Modifier.menuAnchor(androidx.compose.material3.MenuAnchorType.PrimaryNotEditable).fillMaxWidth(),
        )
        DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            tables.forEach { table ->
                DropdownMenuItem(
                    text = { Text("Table ${table.number}${if (table.status == "occupied") " (occupied)" else ""}") },
                    onClick = {
                        onSelect(table.id)
                        expanded = false
                    },
                )
            }
            if (tables.isEmpty()) {
                DropdownMenuItem(text = { Text("No tables set up") }, onClick = {}, enabled = false)
            }
        }
    }
}

@Composable
private fun CartLineRow(line: CartLine, onIncrease: () -> Unit, onDecrease: () -> Unit, onRemove: () -> Unit) {
    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f), modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(line.name, fontWeight = FontWeight.SemiBold)
                if (line.addons.isNotEmpty()) {
                    Text("+${line.addons.joinToString(", ") { it.name }}", color = TextMuted, style = MaterialTheme.typography.bodyLarge)
                }
                Text("₹${line.effectiveUnitPrice} each", color = TextMuted, style = MaterialTheme.typography.bodyLarge)
            }
            QtyStepper(qty = line.qty, onIncrease = onIncrease, onDecrease = onDecrease)
            Spacer(Modifier.width(8.dp))
            Text("₹${line.lineTotal}", fontWeight = FontWeight.Bold, modifier = Modifier.width(56.dp), textAlign = androidx.compose.ui.text.style.TextAlign.End)
            IconButton(onClick = onRemove) {
                Icon(Icons.Filled.Delete, contentDescription = "Remove ${line.name}", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun QtyStepper(qty: Int, onIncrease: () -> Unit, onDecrease: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        StepperButton(icon = Icons.Filled.Remove, onClick = onDecrease)
        Text("$qty", modifier = Modifier.width(28.dp), textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontWeight = FontWeight.SemiBold)
        StepperButton(icon = Icons.Filled.Add, onClick = onIncrease)
    }
}

@Composable
private fun StepperButton(icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Surface(
        shape = CircleShape,
        color = LeafGreenContainer,
        modifier = Modifier.size(28.dp).clickable(onClick = onClick),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = null, tint = ForestGreen900, modifier = Modifier.size(14.dp))
        }
    }
}

@Composable
private fun TotalsRow(label: String, amount: Int, emphasize: Boolean = false) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, fontWeight = if (emphasize) FontWeight.Bold else FontWeight.Normal, color = if (emphasize) MaterialTheme.colorScheme.onSurface else TextMuted)
        Text(
            "₹$amount",
            fontWeight = if (emphasize) FontWeight.Bold else FontWeight.Normal,
            color = if (emphasize) MaterialTheme.colorScheme.onSurface else TextMuted,
        )
    }
}
