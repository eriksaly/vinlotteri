package no.isys.wineforall.model

import java.time.Instant

data class InventoryItem(
    val id: Long = 0,
    val vinmonopoletCode: String,
    val name: String,
    val price: Double,
    val category: String,
    val quantity: Int = 1,
    val country: String = "",
    val createdAt: Instant = Instant.now()
)
