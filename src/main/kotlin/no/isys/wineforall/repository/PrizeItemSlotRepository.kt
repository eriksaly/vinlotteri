package no.isys.wineforall.repository

import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.sum
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.select
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

// Slots across prizes; LotteryPrizeRepository writes the slots of a single prize
@Repository
@Transactional
class PrizeItemSlotRepository {

    // Bottles assigned to prizes, by inventory item id
    fun sumQuantityByInventoryItemId(): Map<Long, Int> {
        val total = PrizeItemSlots.quantity.sum()
        return PrizeItemSlots.select(PrizeItemSlots.inventoryItemId, total)
            .groupBy(PrizeItemSlots.inventoryItemId)
            .associate { it[PrizeItemSlots.inventoryItemId] to it[total]!! }
    }

    fun deleteAllByInventoryItemId(id: Long) {
        PrizeItemSlots.deleteWhere { PrizeItemSlots.inventoryItemId eq id }
    }
}
