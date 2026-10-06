package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.LotteryPrizesRecord
import no.isys.wineforall.jooq.tables.records.PrizeItemSlotsRecord
import no.isys.wineforall.jooq.tables.references.INVENTORY_ITEMS
import no.isys.wineforall.jooq.tables.references.LOTTERY_PRIZES
import no.isys.wineforall.jooq.tables.references.PRIZE_ITEM_SLOTS
import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryPrize
import no.isys.wineforall.model.PrizeItemSlot
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.Field
import org.jooq.impl.DSL.multiset
import org.jooq.impl.DSL.select
import org.springframework.stereotype.Repository

// The slots of the prize being selected from LOTTERY_PRIZES, with their inventory items
private val SLOTS: Field<List<PrizeItemSlot>> = multiset(
    select(PRIZE_ITEM_SLOTS, INVENTORY_ITEMS)
        .from(PRIZE_ITEM_SLOTS)
        .join(INVENTORY_ITEMS).on(INVENTORY_ITEMS.ID.eq(PRIZE_ITEM_SLOTS.INVENTORY_ITEM_ID))
        .where(PRIZE_ITEM_SLOTS.PRIZE_ID.eq(LOTTERY_PRIZES.ID))
        .orderBy(PRIZE_ITEM_SLOTS.ID)
).convertFrom { slots ->
    slots.map { (slot, item) -> PrizeItemSlot(id = slot.id!!, inventoryItem = item.toInventoryItem(), quantity = slot.quantity) }
}

// A prize owns its slots: they're written and deleted along with it
@Repository
class LotteryPrizeRepository(private val dsl: DSLContext) {

    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<LotteryPrize> =
        fetch(LOTTERY_PRIZES.LOTTERY_ID.eq(lottery.id))

    fun findByLotteryAndPosition(lottery: Lottery, position: Int): LotteryPrize? =
        fetch(LOTTERY_PRIZES.LOTTERY_ID.eq(lottery.id).and(LOTTERY_PRIZES.POSITION.eq(position))).singleOrNull()

    fun findAllById(ids: Collection<Long>): List<LotteryPrize> =
        fetch(LOTTERY_PRIZES.ID.`in`(ids))

    fun countByLottery(lottery: Lottery): Int =
        dsl.fetchCount(LOTTERY_PRIZES, LOTTERY_PRIZES.LOTTERY_ID.eq(lottery.id))

    // Inserts the prizes without their slots; replaceSlots assigns those
    fun insertAll(prizes: List<LotteryPrize>) {
        dsl.batchInsert(prizes.map { it.toRecord() }).execute()
    }

    fun replaceSlots(prize: LotteryPrize, slots: List<PrizeItemSlot>) {
        dsl.deleteFrom(PRIZE_ITEM_SLOTS).where(PRIZE_ITEM_SLOTS.PRIZE_ID.eq(prize.id)).execute()
        dsl.batchInsert(slots.map {
            PrizeItemSlotsRecord(quantity = it.quantity, inventoryItemId = it.inventoryItem.id, prizeId = prize.id)
        }).execute()
    }

    fun deleteAll(prizes: List<LotteryPrize>) {
        val ids = prizes.map { it.id }
        dsl.deleteFrom(PRIZE_ITEM_SLOTS).where(PRIZE_ITEM_SLOTS.PRIZE_ID.`in`(ids)).execute()
        dsl.deleteFrom(LOTTERY_PRIZES).where(LOTTERY_PRIZES.ID.`in`(ids)).execute()
    }

    // Clears the legacy inventory_item_id column left over from before the ManyToMany migration. Databases
    // created since then don't have the column, so it's not in the generated jOOQ classes either.
    fun clearLegacyItemColumn(itemId: Long) {
        dsl.execute("UPDATE lottery_prizes SET inventory_item_id = NULL WHERE inventory_item_id = ?", itemId)
    }

    private fun fetch(condition: Condition): List<LotteryPrize> =
        dsl.select(LOTTERY_PRIZES, SLOTS)
            .from(LOTTERY_PRIZES)
            .where(condition)
            .orderBy(LOTTERY_PRIZES.LOTTERY_ID, LOTTERY_PRIZES.POSITION)
            .fetch { (prize, slots) ->
                LotteryPrize(
                    id = prize.id!!,
                    lotteryId = prize.lotteryId,
                    position = prize.position,
                    slots = slots,
                    createdAt = prize.createdAt
                )
            }
}

private fun LotteryPrize.toRecord() = LotteryPrizesRecord(
    createdAt = createdAt,
    position = position,
    lotteryId = lotteryId
)
