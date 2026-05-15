package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryPrize
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface LotteryPrizeRepository : JpaRepository<LotteryPrize, Long> {

    @Query("SELECT DISTINCT p FROM LotteryPrize p LEFT JOIN FETCH p.slots s LEFT JOIN FETCH s.inventoryItem WHERE p.lottery = :lottery ORDER BY p.position")
    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<LotteryPrize>

    fun findByLotteryAndPosition(lottery: Lottery, position: Int): LotteryPrize?

    fun countByLottery(lottery: Lottery): Int

    fun deleteAllByLottery(lottery: Lottery)

    // Clears the legacy inventory_item_id column left over from before the ManyToMany migration
    @Modifying
    @Query("UPDATE lottery_prizes SET inventory_item_id = NULL WHERE inventory_item_id = :itemId", nativeQuery = true)
    fun clearLegacyItemColumn(itemId: Long)
}
