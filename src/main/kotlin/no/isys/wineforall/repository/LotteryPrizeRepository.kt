package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryPrize
import no.isys.wineforall.model.PrizeItemSlot
import org.jetbrains.exposed.v1.core.JoinType
import org.jetbrains.exposed.v1.core.LongColumnType
import org.jetbrains.exposed.v1.core.Op
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.transactions.TransactionManager
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

// A prize owns its slots: they're written and deleted along with it
@Repository
@Transactional
class LotteryPrizeRepository {

    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<LotteryPrize> =
        fetch { LotteryPrizes.lotteryId eq lottery.id }

    fun findByLotteryAndPosition(lottery: Lottery, position: Int): LotteryPrize? =
        fetch { (LotteryPrizes.lotteryId eq lottery.id) and (LotteryPrizes.position eq position) }.singleOrNull()

    fun findAllById(ids: Collection<Long>): List<LotteryPrize> =
        fetch { LotteryPrizes.id inList ids }

    fun countByLottery(lottery: Lottery): Int =
        LotteryPrizes.selectAll().where { LotteryPrizes.lotteryId eq lottery.id }.count().toInt()

    // Inserts the prizes without their slots; replaceSlots assigns those
    fun insertAll(prizes: List<LotteryPrize>) {
        LotteryPrizes.batchInsert(prizes, shouldReturnGeneratedValues = false) { prize ->
            this[LotteryPrizes.createdAt] = prize.createdAt
            this[LotteryPrizes.position] = prize.position
            this[LotteryPrizes.lotteryId] = prize.lotteryId
        }
    }

    fun replaceSlots(prize: LotteryPrize, slots: List<PrizeItemSlot>) {
        PrizeItemSlots.deleteWhere { PrizeItemSlots.prizeId eq prize.id }
        PrizeItemSlots.batchInsert(slots, shouldReturnGeneratedValues = false) { slot ->
            this[PrizeItemSlots.quantity] = slot.quantity
            this[PrizeItemSlots.inventoryItemId] = slot.inventoryItem.id
            this[PrizeItemSlots.prizeId] = prize.id
        }
    }

    fun deleteAll(prizes: List<LotteryPrize>) {
        val ids = prizes.map { it.id }
        PrizeItemSlots.deleteWhere { PrizeItemSlots.prizeId inList ids }
        LotteryPrizes.deleteWhere { LotteryPrizes.id inList ids }
    }

    // Clears the legacy inventory_item_id column left over from before the ManyToMany migration. Databases
    // created since then don't have the column, so it's not in the LotteryPrizes table mapping either.
    fun clearLegacyItemColumn(itemId: Long) {
        TransactionManager.current().exec(
            "UPDATE lottery_prizes SET inventory_item_id = NULL WHERE inventory_item_id = ?",
            listOf(LongColumnType() to itemId)
        )
    }

    // The slots and their inventory items come from a second query, rather than a join that repeats each
    // prize once per slot
    private fun fetch(where: () -> Op<Boolean>): List<LotteryPrize> {
        val prizes = LotteryPrizes.selectAll()
            .where(where)
            .orderBy(LotteryPrizes.lotteryId to SortOrder.ASC, LotteryPrizes.position to SortOrder.ASC)
            .toList()
        if (prizes.isEmpty()) return emptyList()
        val slotsByPrizeId = PrizeItemSlots
            .join(InventoryItems, JoinType.INNER, PrizeItemSlots.inventoryItemId, InventoryItems.id)
            .selectAll()
            .where { PrizeItemSlots.prizeId inList prizes.map { it[LotteryPrizes.id] } }
            .orderBy(PrizeItemSlots.id)
            .map { row ->
                row[PrizeItemSlots.prizeId] to PrizeItemSlot(
                    id = row[PrizeItemSlots.id],
                    inventoryItem = row.toInventoryItem(),
                    quantity = row[PrizeItemSlots.quantity]
                )
            }
            .groupBy({ it.first }, { it.second })
        return prizes.map { row ->
            LotteryPrize(
                id = row[LotteryPrizes.id],
                lotteryId = row[LotteryPrizes.lotteryId],
                position = row[LotteryPrizes.position],
                slots = slotsByPrizeId[row[LotteryPrizes.id]].orEmpty(),
                createdAt = row[LotteryPrizes.createdAt]
            )
        }
    }
}
