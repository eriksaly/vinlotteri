package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.Participant
import no.isys.wineforall.model.Ticket
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface TicketRepository : JpaRepository<Ticket, Long> {
    @Query("SELECT t FROM Ticket t JOIN FETCH t.participant WHERE t.lottery = :lottery")
    fun findAllByLotteryWithParticipant(lottery: Lottery): List<Ticket>

    @Query("SELECT t FROM Ticket t JOIN FETCH t.participant WHERE t.lottery = :lottery AND t.won = :won")
    fun findAllByLotteryAndWonWithParticipant(lottery: Lottery, won: Boolean): List<Ticket>

    fun findAllByLottery(lottery: Lottery): List<Ticket>
    fun findAllByLotteryAndWon(lottery: Lottery, won: Boolean): List<Ticket>
    fun findAllByLotteryAndParticipant(lottery: Lottery, participant: Participant): List<Ticket>
    fun countByLotteryAndParticipant(lottery: Lottery, participant: Participant): Long
    fun countByLottery(lottery: Lottery): Long
    fun deleteAllByLotteryAndParticipant(lottery: Lottery, participant: Participant)

    @Query("SELECT t FROM Ticket t JOIN FETCH t.participant WHERE t.lottery IN :lotteries")
    fun findAllByLotteriesWithParticipant(lotteries: List<Lottery>): List<Ticket>

    @Query("SELECT COALESCE(MAX(t.ticketNumber), 0) FROM Ticket t WHERE t.lottery = :lottery")
    fun findMaxTicketNumberByLottery(lottery: Lottery): Int
}
