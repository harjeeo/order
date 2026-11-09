package com.orderdashboard.pos.ui.screens.pos

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.orderdashboard.pos.ui.theme.ForestGreen900
import com.orderdashboard.pos.ui.theme.LeafGreen600
import com.orderdashboard.pos.ui.theme.LeafGreenContainer
import com.orderdashboard.pos.ui.theme.TextMuted
import com.orderdashboard.pos.ui.theme.White

private data class PaymentOption(val key: String, val label: String)

private val PAYMENT_OPTIONS = listOf(
    PaymentOption("cash", "Cash"),
    PaymentOption("card", "Card"),
    PaymentOption("upi", "UPI"),
    PaymentOption("split", "Split"),
    PaymentOption("due", "Due"),
    PaymentOption("other", "Other"),
)

@Composable
fun SettleScreen(viewModel: PosViewModel, onBack: () -> Unit, onCompleted: () -> Unit) {
    var selectedMethod by remember { mutableStateOf("cash") }
    var customerPaid by remember(viewModel.total) { mutableStateOf(viewModel.total.toString()) }
    var tip by remember { mutableStateOf("0") }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
            }
            Column(modifier = Modifier.weight(1f)) {
                Text("Settle & Save", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("₹${viewModel.total}", color = LeafGreen600, fontWeight = FontWeight.SemiBold)
            }
        }

        Column(modifier = Modifier.weight(1f).padding(horizontal = 16.dp)) {
            Text("Payment Type", fontWeight = FontWeight.SemiBold, color = TextMuted)
            Spacer(Modifier.height(10.dp))
            LazyVerticalGrid(columns = GridCells.Fixed(3), modifier = Modifier.height(100.dp), verticalArrangement = Arrangement.spacedBy(10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(PAYMENT_OPTIONS) { option ->
                    PaymentTypeButton(option = option, selected = selectedMethod == option.key, onClick = { selectedMethod = option.key })
                }
            }

            Spacer(Modifier.height(20.dp))
            Text("Customer Paid", fontWeight = FontWeight.SemiBold, color = TextMuted)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(
                value = customerPaid,
                onValueChange = { customerPaid = it.filter(Char::isDigit) },
                leadingIcon = { Text("₹", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(start = 12.dp)) },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = LeafGreen600),
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(16.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Text("Tip", fontWeight = FontWeight.SemiBold, color = TextMuted, modifier = Modifier.weight(1f))
                OutlinedTextField(
                    value = tip,
                    onValueChange = { tip = it.filter(Char::isDigit) },
                    leadingIcon = { Text("₹", modifier = Modifier.padding(start = 8.dp)) },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = LeafGreen600),
                    modifier = Modifier.weight(1f),
                )
            }

            val paidAmount = customerPaid.toIntOrNull() ?: 0
            val change = paidAmount - viewModel.total
            if (selectedMethod == "cash" && change != 0) {
                Spacer(Modifier.height(12.dp))
                Text(
                    if (change > 0) "Change due: ₹$change" else "Short by ₹${-change}",
                    color = if (change > 0) LeafGreen600 else MaterialTheme.colorScheme.error,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            if (viewModel.submitError != null) {
                Spacer(Modifier.height(12.dp))
                Text(viewModel.submitError!!, color = MaterialTheme.colorScheme.error)
            }
        }

        Surface(shadowElevation = 8.dp, color = MaterialTheme.colorScheme.surface) {
            Button(
                onClick = {
                    viewModel.completeOrder(
                        method = selectedMethod,
                        customerPaid = customerPaid.toIntOrNull() ?: viewModel.total,
                        tipAmount = tip.toIntOrNull() ?: 0,
                        onDone = { success -> if (success) onCompleted() },
                    )
                },
                enabled = !viewModel.isSubmitting,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = ForestGreen900),
                modifier = Modifier.fillMaxWidth().padding(16.dp).height(52.dp),
            ) {
                if (viewModel.isSubmitting) {
                    CircularProgressIndicator(color = White, modifier = Modifier.height(20.dp), strokeWidth = 2.dp)
                } else {
                    Text("Complete Payment · ₹${viewModel.total}", fontWeight = FontWeight.SemiBold, color = White)
                }
            }
        }
    }
}

@Composable
private fun PaymentTypeButton(option: PaymentOption, selected: Boolean, onClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(12.dp),
        color = if (selected) LeafGreenContainer else MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, if (selected) LeafGreen600 else MaterialTheme.colorScheme.outlineVariant),
        modifier = Modifier.clickable(onClick = onClick),
    ) {
        androidx.compose.foundation.layout.Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxWidth().height(44.dp)) {
            Text(
                option.label,
                color = if (selected) ForestGreen900 else MaterialTheme.colorScheme.onSurface,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal,
            )
        }
    }
}
