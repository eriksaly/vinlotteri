package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.references.PRIZE_ITEM_SLOTS
import org.jooq.DSLContext
import org.jooq.impl.DSL.sum
import org.springframework.stereotype.Repository

// Slots across prizes; LotteryPrizeRepository writes the slots of a single prize
@Repository
class PrizeItemSlotRepository(private val dsl: DSLContext) {

    // Bottles assigned to prizes, by inventory item id
    fun sumQuantityByInventoryItemId(): Map<Long, Int> =
        dsl.select(PRIZE_ITEM_SLOTS.INVENTORY_ITEM_ID, sum(PRIZE_ITEM_SLOTS.QUANTITY))
            .from(PRIZE_ITEM_SLOTS)
            .groupBy(PRIZE_ITEM_SLOTS.INVENTORY_ITEM_ID)
            .fetch { (itemId, quantity) -> itemId!! to quantity!!.toInt() }
            .toMap()

    fun deleteAllByInventoryItemId(id: Long) {
        dsl.deleteFrom(PRIZE_ITEM_SLOTS).where(PRIZE_ITEM_SLOTS.INVENTORY_ITEM_ID.eq(id)).execute()
    }
}
