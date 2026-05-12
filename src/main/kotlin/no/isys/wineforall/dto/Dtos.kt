package no.isys.wineforall.dto

import no.isys.wineforall.model.LotteryStatus
import java.time.Instant

// --- Requests ---

data class CreateParticipantRequest(
    val name: String,
    val tag: String
)

data class UpdateParticipantRequest(
    val name: String,
    val tag: String
)

data class AddBuyerRequest(
    val participantId: Long,
    val quantity: Int
)

data class UpdateBuyerRequest(
    val quantity: Int
)

data class CreateLotteryRequest(
    val name: String
)

data class StartDrawingRequest(
    val wineCount: Int
)

// --- Responses ---

data class ParticipantDto(
    val id: Long,
    val name: String,
    val tag: String,
    val hasPhoto: Boolean,
    val createdAt: Instant
)

data class BuyerDto(
    val participant: ParticipantDto,
    val ticketCount: Long,
    val ticketPercentage: Double,
    val ticketNumbers: List<Int>
)

data class LotteryInfoDto(
    val id: Long,
    val name: String,
    val status: LotteryStatus,
    val vippsNumber: String,
    val pricePerTicket: Int,
    val totalTickets: Long,
    val wineCount: Int?,
    val createdAt: Instant
)

data class WinnerDto(
    val position: Int,
    val ticketNumber: Int,
    val participantId: Long,
    val participantName: String,
    val participantTag: String,
    val drawnAt: Instant
)

data class ParticipantStatsDto(
    val participantId: Long,
    val name: String,
    val tag: String,
    val hasPhoto: Boolean,
    val ticketsBought: Long,
    val wins: Long,
    val winRatio: Double
)

data class StatisticsDto(
    val lotteryId: Long,
    val lotteryName: String,
    val createdAt: Instant,
    val totalTickets: Long,
    val totalAmountNok: Long,
    val winners: List<WinnerDto>,
    val participants: List<ParticipantStatsDto>,
    val luckiest: ParticipantStatsDto?,
    val unluckiest: ParticipantStatsDto?
)

data class DrawResultDto(
    val winner: WinnerDto,
    val remainingTickets: Long
)

// --- All-time statistics ---

data class AllTimeParticipantStatsDto(
    val participantId: Long,
    val name: String,
    val tag: String,
    val hasPhoto: Boolean,
    val totalTicketsBought: Long,
    val totalWins: Long,
    val lotteriesParticipated: Int,
    val lotteriesWon: Int,
    val winLotteryRate: Double
)

data class StreakDto(
    val participantId: Long,
    val name: String,
    val tag: String,
    val hasPhoto: Boolean,
    val streak: Int,
    val lotteriesParticipated: Int
)

data class AllTimeStatisticsDto(
    val totalLotteries: Int,
    val totalParticipants: Int,
    val topLucky: List<AllTimeParticipantStatsDto>,
    val topUnlucky: List<AllTimeParticipantStatsDto>,
    val topTicketBuyers: List<AllTimeParticipantStatsDto>,
    val longestWinStreak: StreakDto?,
    val longestLoseStreak: StreakDto?
)

// --- Vinmonopolet shopping ---

data class VinmonopoletProductDto(
    val code: String,
    val name: String,
    val price: Double?,
    val url: String,
    val category: String
)

data class ShoppingSuggestionsDto(
    val products: List<VinmonopoletProductDto>,
    val prizeCount: Int
)
