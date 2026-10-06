package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.Participant
import no.isys.wineforall.model.Ticket
import org.jetbrains.exposed.v1.core.JoinType
import org.jetbrains.exposed.v1.core.Op
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.max
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional
class TicketRepository {

    fun findAllByLottery(lottery: Lottery): List<Ticket> =
        fetch { Tickets.lotteryId eq lottery.id }

    fun findAllByLotteryAndWon(lottery: Lottery, won: Boolean): List<Ticket> =
        fetch { (Tickets.lotteryId eq lottery.id) and (Tickets.won eq won) }

    fun findAllByLotteryAndParticipant(lottery: Lottery, participant: Participant): List<Ticket> =
        fetch { (Tickets.lotteryId eq lottery.id) and (Tickets.participantId eq participant.id) }

    fun findAllByLotteries(lotteries: List<Lottery>): List<Ticket> =
        fetch { Tickets.lotteryId inList lotteries.map { it.id } }

    fun countByLottery(lottery: Lottery): Long =
        Tickets.selectAll().where { Tickets.lotteryId eq lottery.id }.count()

    fun countByLotteryAndWon(lottery: Lottery, won: Boolean): Long =
        Tickets.selectAll().where { (Tickets.lotteryId eq lottery.id) and (Tickets.won eq won) }.count()

    // 0 if the lottery has no tickets
    fun findMaxTicketNumberByLottery(lottery: Lottery): Int {
        val max = Tickets.ticketNumber.max()
        return Tickets.select(max).where { Tickets.lotteryId eq lottery.id }.single()[max] ?: 0
    }

    fun insertAll(tickets: List<Ticket>) {
        Tickets.batchInsert(tickets, shouldReturnGeneratedValues = false) { ticket ->
            this[Tickets.createdAt] = ticket.createdAt
            this[Tickets.ticketNumber] = ticket.ticketNumber
            this[Tickets.won] = ticket.won
            this[Tickets.lotteryId] = ticket.lotteryId
            this[Tickets.participantId] = ticket.participant.id
        }
    }

    fun markWon(ticket: Ticket) {
        Tickets.update({ Tickets.id eq ticket.id }) { it[won] = true }
    }

    fun deleteAllById(ids: List<Long>) {
        Tickets.deleteWhere { Tickets.id inList ids }
    }

    fun deleteAllByLotteryAndParticipant(lottery: Lottery, participant: Participant) {
        Tickets.deleteWhere { (Tickets.lotteryId eq lottery.id) and (Tickets.participantId eq participant.id) }
    }

    private fun fetch(where: () -> Op<Boolean>): List<Ticket> =
        Tickets.join(Participants, JoinType.INNER, Tickets.participantId, Participants.id)
            .select(Tickets.columns + participantColumns)
            .where(where)
            .orderBy(Tickets.id)
            .map { it.toTicket(it.toParticipant()) }
}

// From a row with the columns of Tickets
internal fun ResultRow.toTicket(participant: Participant) = Ticket(
    id = this[Tickets.id],
    ticketNumber = this[Tickets.ticketNumber],
    participant = participant,
    lotteryId = this[Tickets.lotteryId],
    won = this[Tickets.won],
    createdAt = this[Tickets.createdAt]
)
