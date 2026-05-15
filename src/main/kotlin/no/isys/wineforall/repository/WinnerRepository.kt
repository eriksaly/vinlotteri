package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.Participant
import no.isys.wineforall.model.Winner
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface WinnerRepository : JpaRepository<Winner, Long> {
    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<Winner>

    @Query("SELECT DISTINCT w FROM Winner w LEFT JOIN FETCH w.prize p LEFT JOIN FETCH p.slots s LEFT JOIN FETCH s.inventoryItem WHERE w.lottery = :lottery ORDER BY w.position")
    fun findAllByLotteryWithPrizeOrderByPosition(lottery: Lottery): List<Winner>
    fun countByLotteryAndParticipant(lottery: Lottery, participant: Participant): Long

    @Query("SELECT w.participant, COUNT(w) as wins FROM Winner w WHERE w.lottery IN :lotteries GROUP BY w.participant")
    fun countWinsByParticipantInLotteries(lotteries: List<Lottery>): List<Array<Any>>

    @Query("SELECT w FROM Winner w JOIN FETCH w.participant WHERE w.lottery IN :lotteries")
    fun findAllByLotteriesWithParticipant(lotteries: List<Lottery>): List<Winner>

    @Query("SELECT w FROM Winner w WHERE w.lottery = :lottery ORDER BY w.position")
    fun findByLotteryOrdered(lottery: Lottery): List<Winner>
}
