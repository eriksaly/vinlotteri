package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.TicketsRecord
import no.isys.wineforall.jooq.tables.references.PARTICIPANTS
import no.isys.wineforall.jooq.tables.references.TICKETS
import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.Participant
import no.isys.wineforall.model.Ticket
import org.jooq.Condition
import org.jooq.DSLContext
import org.jooq.impl.DSL.max
import org.springframework.stereotype.Repository

@Repository
class TicketRepository(private val dsl: DSLContext) {

    fun findAllByLottery(lottery: Lottery): List<Ticket> =
        fetch(TICKETS.LOTTERY_ID.eq(lottery.id))

    fun findAllByLotteryAndWon(lottery: Lottery, won: Boolean): List<Ticket> =
        fetch(TICKETS.LOTTERY_ID.eq(lottery.id).and(TICKETS.WON.eq(won)))

    fun findAllByLotteryAndParticipant(lottery: Lottery, participant: Participant): List<Ticket> =
        fetch(TICKETS.LOTTERY_ID.eq(lottery.id).and(TICKETS.PARTICIPANT_ID.eq(participant.id)))

    fun findAllByLotteries(lotteries: List<Lottery>): List<Ticket> =
        fetch(TICKETS.LOTTERY_ID.`in`(lotteries.map { it.id }))

    fun countByLottery(lottery: Lottery): Long =
        dsl.fetchCount(TICKETS, TICKETS.LOTTERY_ID.eq(lottery.id)).toLong()

    fun countByLotteryAndWon(lottery: Lottery, won: Boolean): Long =
        dsl.fetchCount(TICKETS, TICKETS.LOTTERY_ID.eq(lottery.id).and(TICKETS.WON.eq(won))).toLong()

    // 0 if the lottery has no tickets
    fun findMaxTicketNumberByLottery(lottery: Lottery): Int =
        dsl.select(max(TICKETS.TICKET_NUMBER))
            .from(TICKETS)
            .where(TICKETS.LOTTERY_ID.eq(lottery.id))
            .fetchSingle().value1() ?: 0

    fun insertAll(tickets: List<Ticket>) {
        dsl.batchInsert(tickets.map { it.toRecord() }).execute()
    }

    fun markWon(ticket: Ticket) {
        dsl.update(TICKETS).set(TICKETS.WON, true).where(TICKETS.ID.eq(ticket.id)).execute()
    }

    fun deleteAllById(ids: List<Long>) {
        dsl.deleteFrom(TICKETS).where(TICKETS.ID.`in`(ids)).execute()
    }

    fun deleteAllByLotteryAndParticipant(lottery: Lottery, participant: Participant) {
        dsl.deleteFrom(TICKETS)
            .where(TICKETS.LOTTERY_ID.eq(lottery.id))
            .and(TICKETS.PARTICIPANT_ID.eq(participant.id))
            .execute()
    }

    private fun fetch(condition: Condition): List<Ticket> =
        dsl.select(TICKETS, PARTICIPANT)
            .from(TICKETS)
            .join(PARTICIPANTS).on(PARTICIPANTS.ID.eq(TICKETS.PARTICIPANT_ID))
            .where(condition)
            .orderBy(TICKETS.ID)
            .fetch { (ticket, participant) -> ticket.toTicket(participant) }
}

internal fun TicketsRecord.toTicket(participant: Participant) = Ticket(
    id = id!!,
    ticketNumber = ticketNumber,
    participant = participant,
    lotteryId = lotteryId,
    won = won,
    createdAt = createdAt
)

private fun Ticket.toRecord() = TicketsRecord(
    createdAt = createdAt,
    ticketNumber = ticketNumber,
    won = won,
    lotteryId = lotteryId,
    participantId = participant.id
)
