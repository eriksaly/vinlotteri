package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.Winner
import org.jetbrains.exposed.v1.core.JoinType
import org.jetbrains.exposed.v1.core.Op
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional
class WinnerRepository(private val prizeRepo: LotteryPrizeRepository) {

    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<Winner> =
        fetch { Winners.lotteryId eq lottery.id }

    fun findAllByLotteries(lotteries: List<Lottery>): List<Winner> =
        fetch { Winners.lotteryId inList lotteries.map { it.id } }

    fun countByLottery(lottery: Lottery): Int =
        Winners.selectAll().where { Winners.lotteryId eq lottery.id }.count().toInt()

    fun insert(winner: Winner): Winner {
        val id = Winners.insert {
            it[drawnAt] = winner.drawnAt
            it[position] = winner.position
            it[lotteryId] = winner.lotteryId
            it[participantId] = winner.participant.id
            it[prizeId] = winner.prize?.id
            it[ticketId] = winner.ticket.id
        } get Winners.id
        return winner.copy(id = id)
    }

    // The prizes come from a second query, as a prize has a list of slots
    private fun fetch(where: () -> Op<Boolean>): List<Winner> {
        val rows = Winners
            .join(Tickets, JoinType.INNER, Winners.ticketId, Tickets.id)
            .join(Participants, JoinType.INNER, Winners.participantId, Participants.id)
            .select(Winners.columns + Tickets.columns + participantColumns)
            .where(where)
            .orderBy(Winners.lotteryId to SortOrder.ASC, Winners.position to SortOrder.ASC)
            .toList()
        val prizes = prizeRepo.findAllById(rows.mapNotNull { it[Winners.prizeId] }).associateBy { it.id }
        return rows.map { row ->
            val participant = row.toParticipant()
            Winner(
                id = row[Winners.id],
                // The winning ticket belongs to the winner
                ticket = row.toTicket(participant),
                participant = participant,
                lotteryId = row[Winners.lotteryId],
                position = row[Winners.position],
                drawnAt = row[Winners.drawnAt],
                prize = row[Winners.prizeId]?.let { prizes[it] }
            )
        }
    }
}
