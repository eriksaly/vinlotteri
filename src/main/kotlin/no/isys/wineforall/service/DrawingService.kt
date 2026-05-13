package no.isys.wineforall.service

import no.isys.wineforall.dto.DrawResultDto
import no.isys.wineforall.dto.LotteryPrizeDto
import no.isys.wineforall.dto.WinnerDto
import no.isys.wineforall.model.LotteryStatus
import no.isys.wineforall.repository.LotteryRepository
import no.isys.wineforall.repository.LotteryPrizeRepository
import no.isys.wineforall.repository.TicketRepository
import no.isys.wineforall.repository.WinnerRepository
import no.isys.wineforall.model.Winner
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DrawingService(
    private val lotteryRepo: LotteryRepository,
    private val ticketRepo: TicketRepository,
    private val winnerRepo: WinnerRepository,
    private val prizeRepo: LotteryPrizeRepository,
    private val inventoryService: InventoryService
) {

    @Transactional
    fun drawNextWinner(): DrawResultDto {
        val lottery = lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.DRAWING)
            ?: error("Ingen trekning pågår")

        val remaining = ticketRepo.findAllByLotteryAndWon(lottery, false)
        require(remaining.isNotEmpty()) { "Ingen gjenværende lodd" }

        val winningTicket = remaining.random()
        winningTicket.won = true
        ticketRepo.save(winningTicket)

        val position = winnerRepo.findAllByLotteryOrderByPosition(lottery).size + 1
        val prize = prizeRepo.findByLotteryAndPosition(lottery, position)

        val winner = winnerRepo.save(
            Winner(
                ticket = winningTicket,
                participant = winningTicket.participant,
                lottery = lottery,
                position = position,
                prize = prize
            )
        )

        val remainingCount = ticketRepo.findAllByLotteryAndWon(lottery, false).size.toLong()

        val prizeDto = prize?.toDto(winner.id)

        return DrawResultDto(
            winner = WinnerDto(
                position = winner.position,
                ticketNumber = winningTicket.ticketNumber,
                participantId = winner.participant.id,
                participantName = winner.participant.name,
                participantTag = winner.participant.tag,
                drawnAt = winner.drawnAt,
                prize = prizeDto
            ),
            remainingTickets = remainingCount,
            prize = prizeDto
        )
    }

    @Transactional(readOnly = true)
    fun getCurrentWinners(): List<WinnerDto> {
        val lottery = lotteryRepo.findTopByStatusInOrderByCreatedAtDesc(
            listOf(LotteryStatus.DRAWING, LotteryStatus.CLOSED)
        ) ?: return emptyList()
        return winnerRepo.findAllByLotteryWithPrizeOrderByPosition(lottery).map { w ->
            WinnerDto(
                position = w.position,
                ticketNumber = w.ticket.ticketNumber,
                participantId = w.participant.id,
                participantName = w.participant.name,
                participantTag = w.participant.tag,
                drawnAt = w.drawnAt,
                prize = w.prize?.toDto(w.id)
            )
        }
    }

    private fun no.isys.wineforall.model.LotteryPrize.toDto(winnerId: Long) = LotteryPrizeDto(
        id = id,
        position = position,
        items = items.map { with(inventoryService) { it.toDto() } },
        winnerId = winnerId
    )
}
