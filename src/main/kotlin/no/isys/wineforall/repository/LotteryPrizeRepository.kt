package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryPrize
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface LotteryPrizeRepository : JpaRepository<LotteryPrize, Long> {

    @Query("SELECT p FROM LotteryPrize p LEFT JOIN FETCH p.items WHERE p.lottery = :lottery ORDER BY p.position")
    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<LotteryPrize>

    fun findByLotteryAndPosition(lottery: Lottery, position: Int): LotteryPrize?

    fun countByLottery(lottery: Lottery): Int

    fun deleteAllByLottery(lottery: Lottery)

    @Query("SELECT p FROM LotteryPrize p JOIN FETCH p.items i WHERE i.id = :itemId")
    fun findAllContainingItem(itemId: Long): List<LotteryPrize>

    @Query("SELECT i.id FROM LotteryPrize p JOIN p.items i")
    fun findAllAssignedItemIds(): List<Long>

    // Clears the legacy inventory_item_id column left over from before the ManyToMany migration
    @Modifying
    @Query("UPDATE lottery_prizes SET inventory_item_id = NULL WHERE inventory_item_id = :itemId", nativeQuery = true)
    fun clearLegacyItemColumn(itemId: Long)
}
