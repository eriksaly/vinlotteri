package no.isys.wineforall.service

import no.isys.wineforall.dto.DrawResultDto
import no.isys.wineforall.dto.WinnerDto
import no.isys.wineforall.model.LotteryStatus
import no.isys.wineforall.model.Winner
import no.isys.wineforall.repository.LotteryRepository
import no.isys.wineforall.repository.TicketRepository
import no.isys.wineforall.repository.WinnerRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class DrawingService(
    private val lotteryRepo: LotteryRepository,
    private val ticketRepo: TicketRepository,
    private val winnerRepo: WinnerRepository
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

        val winner = winnerRepo.save(
            Winner(
                ticket = winningTicket,
                participant = winningTicket.participant,
                lottery = lottery,
                position = position
            )
        )

        val remainingCount = ticketRepo.findAllByLotteryAndWon(lottery, false).size.toLong()

        return DrawResultDto(
            winner = WinnerDto(
                position = winner.position,
                ticketNumber = winningTicket.ticketNumber,
                participantId = winner.participant.id,
                participantName = winner.participant.name,
                participantTag = winner.participant.tag,
                drawnAt = winner.drawnAt
            ),
            remainingTickets = remainingCount
        )
    }

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
                drawnAt = w.drawnAt
            )
        }
    }
}
