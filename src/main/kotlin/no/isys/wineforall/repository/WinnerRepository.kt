package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.WinnersRecord
import no.isys.wineforall.jooq.tables.references.PARTICIPANTS
import no.isys.wineforall.jooq.tables.references.TICKETS
import no.isys.wineforall.jooq.tables.references.WINNERS
import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.Winner
import org.jooq.Condition
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class WinnerRepository(
    private val dsl: DSLContext,
    private val prizeRepo: LotteryPrizeRepository
) {

    fun findAllByLotteryOrderByPosition(lottery: Lottery): List<Winner> =
        fetch(WINNERS.LOTTERY_ID.eq(lottery.id))

    fun findAllByLotteries(lotteries: List<Lottery>): List<Winner> =
        fetch(WINNERS.LOTTERY_ID.`in`(lotteries.map { it.id }))

    fun countByLottery(lottery: Lottery): Int =
        dsl.fetchCount(WINNERS, WINNERS.LOTTERY_ID.eq(lottery.id))

    fun insert(winner: Winner): Winner {
        val id = dsl.insertInto(WINNERS).set(winner.toRecord()).returningResult(WINNERS.ID).fetchSingle().value1()!!
        return winner.copy(id = id)
    }

    // The prizes come from a second query, as a prize has a list of slots
    private fun fetch(condition: Condition): List<Winner> {
        val rows = dsl.select(WINNERS, TICKETS, PARTICIPANT)
            .from(WINNERS)
            .join(TICKETS).on(TICKETS.ID.eq(WINNERS.TICKET_ID))
            .join(PARTICIPANTS).on(PARTICIPANTS.ID.eq(WINNERS.PARTICIPANT_ID))
            .where(condition)
            .orderBy(WINNERS.LOTTERY_ID, WINNERS.POSITION)
            .fetch()
        val prizes = prizeRepo.findAllById(rows.mapNotNull { (winner) -> winner.prizeId }).associateBy { it.id }
        return rows.map { (winner, ticket, participant) ->
            Winner(
                id = winner.id!!,
                // The winning ticket belongs to the winner
                ticket = ticket.toTicket(participant),
                participant = participant,
                lotteryId = winner.lotteryId,
                position = winner.position,
                drawnAt = winner.drawnAt,
                prize = winner.prizeId?.let { prizes[it] }
            )
        }
    }
}

private fun Winner.toRecord() = WinnersRecord(
    drawnAt = drawnAt,
    position = position,
    lotteryId = lotteryId,
    participantId = participant.id,
    prizeId = prize?.id,
    ticketId = ticket.id
)
