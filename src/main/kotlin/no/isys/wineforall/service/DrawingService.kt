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
        // Locked, so a draw at the same time waits for this one instead of picking from the same remaining
        // tickets for the same position
        val lottery = lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.DRAWING)
            ?.let { lotteryRepo.lock(it) }
            ?.takeIf { it.status == LotteryStatus.DRAWING }
            ?: error("Ingen trekning pågår")

        val remaining = ticketRepo.findAllByLotteryAndWon(lottery, false)
        require(remaining.isNotEmpty()) { "Ingen gjenværende lodd" }

        val winningTicket = remaining.random().copy(won = true)
        ticketRepo.markWon(winningTicket)

        val position = winnerRepo.countByLottery(lottery) + 1
        val prize = prizeRepo.findByLotteryAndPosition(lottery, position)

        val winner = winnerRepo.insert(
            Winner(
                ticket = winningTicket,
                participant = winningTicket.participant,
                lotteryId = lottery.id,
                position = position,
                prize = prize
            )
        )

        val remainingCount = ticketRepo.countByLotteryAndWon(lottery, false)

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
        return winnerRepo.findAllByLotteryOrderByPosition(lottery).map { w ->
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
        items = slots.flatMap { slot ->
            List(slot.quantity) { with(inventoryService) { slot.inventoryItem.toDto() } }
        },
        winnerId = winnerId
    )
}
