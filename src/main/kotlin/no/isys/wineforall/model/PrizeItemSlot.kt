package no.isys.wineforall.model

data class PrizeItemSlot(
    val id: Long = 0,
    val inventoryItem: InventoryItem,
    val quantity: Int = 1
)
