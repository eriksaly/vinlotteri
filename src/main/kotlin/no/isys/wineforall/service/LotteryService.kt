package no.isys.wineforall.service

import no.isys.wineforall.dto.*
import no.isys.wineforall.model.*
import no.isys.wineforall.repository.*
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class LotteryService(
    private val lotteryRepo: LotteryRepository,
    private val participantRepo: ParticipantRepository,
    private val ticketRepo: TicketRepository,
    private val winnerRepo: WinnerRepository,
    private val prizeRepo: LotteryPrizeRepository,
    @Value("\${app.vipps-number}") private val vippsNumber: String,
    @Value("\${app.price-per-ticket:5}") private val pricePerTicket: Int
) {

    // --- Lottery lifecycle ---

    fun getCurrentLottery(): Lottery? =
        lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.OPEN)
            ?: lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.DRAWING)

    fun getCurrentLotteryInfo(): LotteryInfoDto? {
        val lottery = getCurrentLottery() ?: return null
        return lottery.toInfoDto()
    }

    @Transactional
    fun createLottery(): LotteryInfoDto {
        val existing = getCurrentLottery()
        require(existing == null) { "Det finnes allerede et aktivt lotteri" }
        val name = java.time.LocalDate.now().toString() // yyyy-mm-dd
        val lottery = lotteryRepo.save(Lottery(name = name))
        return lottery.toInfoDto()
    }

    @Transactional
    fun startDrawing(wineCount: Int): LotteryInfoDto {
        val lottery = getCurrentLottery() ?: error("Ingen aktiv lotteri")
        require(lottery.status == LotteryStatus.OPEN) { "Lotteriet er ikke åpent" }
        // If prize slots are already configured, use their count; otherwise use the request param
        val prizeSlotCount = prizeRepo.countByLottery(lottery)
        val effectiveCount = if (prizeSlotCount > 0) prizeSlotCount else wineCount
        require(effectiveCount in 1..100) { "Antall viner må være mellom 1 og 100" }
        lottery.status = LotteryStatus.DRAWING
        lottery.wineCount = effectiveCount
        return lotteryRepo.save(lottery).toInfoDto()
    }

    @Transactional
    fun finishLottery(): LotteryInfoDto {
        val lottery = getCurrentLottery() ?: error("Ingen aktiv lotteri")
        require(lottery.status == LotteryStatus.DRAWING) { "Trekning er ikke startet" }
        lottery.status = LotteryStatus.CLOSED
        return lotteryRepo.save(lottery).toInfoDto()
    }

    // --- Buyers ---

    fun getBuyers(): List<BuyerDto> {
        val lottery = getCurrentLottery() ?: return emptyList()
        val tickets = if (lottery.status == LotteryStatus.DRAWING)
            ticketRepo.findAllByLotteryAndWonWithParticipant(lottery, false)
        else
            ticketRepo.findAllByLotteryWithParticipant(lottery)
        val totalTickets = tickets.size.toLong()

        return tickets.groupBy { it.participant.id }
            .map { (_, participantTickets) ->
                val participant = participantTickets.first().participant
                val count = participantTickets.size.toLong()
                BuyerDto(
                    participant = participant.toDto(),
                    ticketCount = count,
                    ticketPercentage = if (totalTickets > 0) count.toDouble() / totalTickets * 100 else 0.0,
                    ticketNumbers = participantTickets.map { it.ticketNumber }.sorted()
                )
            }
            .sortedBy { it.participant.tag }
    }

    @Transactional
    fun addBuyer(participantId: Long, quantity: Int): List<BuyerDto> {
        require(quantity in 1..100) { "Antall lodd må være mellom 1 og 100" }
        val lottery = getCurrentLottery() ?: error("Ingen aktiv lotteri")
        require(lottery.status == LotteryStatus.OPEN) { "Lotteriet er ikke lenger åpent for nye lodd" }
        val participant = participantRepo.findById(participantId).orElseThrow { IllegalArgumentException("Deltaker ikke funnet") }
        val nextNumber = ticketRepo.findMaxTicketNumberByLottery(lottery) + 1
        val tickets = (nextNumber until nextNumber + quantity).map { num ->
            Ticket(ticketNumber = num, participant = participant, lottery = lottery)
        }
        ticketRepo.saveAll(tickets)
        return getBuyers()
    }

    @Transactional
    fun updateBuyer(participantId: Long, newQuantity: Int): List<BuyerDto> {
        require(newQuantity in 1..100) { "Antall lodd må være mellom 1 og 100" }
        val lottery = getCurrentLottery() ?: error("Ingen aktiv lotteri")
        require(lottery.status == LotteryStatus.OPEN) { "Lotteriet er ikke åpent" }
        val participant = participantRepo.findById(participantId).orElseThrow { IllegalArgumentException("Deltaker ikke funnet") }
        val existingTickets = ticketRepo.findAllByLotteryAndParticipant(lottery, participant)
        val current = existingTickets.size

        when {
            newQuantity > current -> {
                val nextNumber = ticketRepo.findMaxTicketNumberByLottery(lottery) + 1
                val tickets = (nextNumber until nextNumber + (newQuantity - current)).map { num ->
                    Ticket(ticketNumber = num, participant = participant, lottery = lottery)
                }
                ticketRepo.saveAll(tickets)
            }
            newQuantity < current -> {
                val toRemove = existingTickets
                    .sortedByDescending { it.ticketNumber }
                    .take(current - newQuantity)
                ticketRepo.deleteAllByIdInBatch(toRemove.map { it.id })
            }
        }
        return getBuyers()
    }

    @Transactional
    fun removeBuyer(participantId: Long): List<BuyerDto> {
        val lottery = getCurrentLottery() ?: error("Ingen aktiv lotteri")
        require(lottery.status == LotteryStatus.OPEN) { "Kan ikke fjerne lodd etter trekning er startet" }
        val participant = participantRepo.findById(participantId).orElseThrow { IllegalArgumentException("Deltaker ikke funnet") }
        ticketRepo.deleteAllByLotteryAndParticipant(lottery, participant)
        return getBuyers()
    }

    // --- Participants ---

    fun getAllParticipants(): List<ParticipantDto> =
        participantRepo.findAllOrderByName().map { it.toDto() }

    @Transactional
    fun createParticipant(name: String, tag: String): ParticipantDto {
        require(name.isNotBlank()) { "Navn kan ikke være tomt" }
        require(tag.isNotBlank() && tag.length == 3) { "Tag må være nøyaktig 3 bokstaver" }
        if (participantRepo.existsByTagIgnoreCase(tag)) {
            error("Tag '$tag' er allerede i bruk")
        }
        val participant = participantRepo.save(Participant(name = name.trim(), tag = tag.trim().uppercase()))
        return participant.toDto()
    }

    @Transactional
    fun updateParticipant(id: Long, name: String, tag: String): ParticipantDto {
        val participant = participantRepo.findById(id).orElseThrow { IllegalArgumentException("Deltaker ikke funnet") }
        val upperTag = tag.trim().uppercase()
        if (!participant.tag.equals(upperTag, ignoreCase = true) && participantRepo.existsByTagIgnoreCase(upperTag)) {
            error("Tag '$upperTag' er allerede i bruk")
        }
        participant.name = name.trim()
        participant.tag = upperTag
        return participantRepo.save(participant).toDto()
    }

    @Transactional
    fun updateParticipantPhoto(id: Long, photoData: ByteArray, contentType: String): ParticipantDto {
        val participant = participantRepo.findById(id).orElseThrow { IllegalArgumentException("Deltaker ikke funnet") }
        participant.photoData = photoData
        participant.photoContentType = contentType
        return participantRepo.save(participant).toDto()
    }

    fun getParticipantPhoto(id: Long): Pair<ByteArray, String>? {
        val participant = participantRepo.findById(id).orElse(null) ?: return null
        val data = participant.photoData ?: return null
        return Pair(data, participant.photoContentType ?: "image/jpeg")
    }

    // --- Statistics ---

    fun getLatestClosedStatistics(): StatisticsDto? {
        val lottery = lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.CLOSED) ?: return null
        return buildStatistics(lottery)
    }

    fun getAllTimeStatistics(): AllTimeStatisticsDto {
        val closedLotteries = lotteryRepo.findAllByStatusOrderByCreatedAtDesc(LotteryStatus.CLOSED)
        if (closedLotteries.isEmpty()) return AllTimeStatisticsDto(0, 0, emptyList(), emptyList(), emptyList(), emptyList(), emptyList())

        val lotteriesChronological = closedLotteries.reversed()
        val allParticipants = participantRepo.findAll()

        // Bulk load — 2 queries instead of P×L×4
        val allTickets = ticketRepo.findAllByLotteriesWithParticipant(closedLotteries)
        val allWinners = winnerRepo.findAllByLotteriesWithParticipant(closedLotteries)

        // ticketCount[lotteryId][participantId] = count
        val ticketCount = allTickets.groupBy { it.lottery.id }
            .mapValues { (_, tickets) -> tickets.groupBy { it.participant.id }.mapValues { (_, t) -> t.size.toLong() } }

        // winCount[lotteryId][participantId] = count
        val winCount = allWinners.groupBy { it.lottery.id }
            .mapValues { (_, winners) -> winners.groupBy { it.participant.id }.mapValues { (_, w) -> w.size.toLong() } }

        val participantStats = allParticipants.mapNotNull { participant ->
            val participated = lotteriesChronological.filter { (ticketCount[it.id]?.get(participant.id) ?: 0L) > 0 }
            if (participated.isEmpty()) return@mapNotNull null

            val totalTickets = participated.sumOf { ticketCount[it.id]?.get(participant.id) ?: 0L }
            val lotteriesWon = participated.filter { (winCount[it.id]?.get(participant.id) ?: 0L) > 0 }
            val totalWins = lotteriesWon.sumOf { winCount[it.id]?.get(participant.id) ?: 0L }

            AllTimeParticipantStatsDto(
                participantId = participant.id,
                name = participant.name,
                tag = participant.tag,
                hasPhoto = participant.photoData != null,
                totalTicketsBought = totalTickets,
                totalWins = totalWins,
                lotteriesParticipated = participated.size,
                lotteriesWon = lotteriesWon.size,
                winLotteryRate = lotteriesWon.size.toDouble() / participated.size
            )
        }

        // Streaks — all in-memory now
        val lastLottery = lotteriesChronological.lastOrNull()
        val winStreaks = mutableListOf<StreakDto>()
        val loseStreaks = mutableListOf<StreakDto>()

        allParticipants.forEach { participant ->
            val participated = lotteriesChronological.filter { (ticketCount[it.id]?.get(participant.id) ?: 0L) > 0 }
            if (participated.size < 2) return@forEach

            var curWin = 0; var curLose = 0
            participated.forEach { lottery ->
                if ((winCount[lottery.id]?.get(participant.id) ?: 0L) > 0) {
                    curWin++; curLose = 0
                } else {
                    curLose++; curWin = 0
                }
            }
            // Streak only counts if the participant played in the most recent closed lottery.
            // This prevents someone from permanently holding a streak after stopping.
            if (participated.lastOrNull()?.id != lastLottery?.id) { curWin = 0; curLose = 0 }
            val streak = StreakDto(participant.id, participant.name, participant.tag, participant.photoData != null, 0, participated.size)
            if (curWin > 1) winStreaks.add(streak.copy(streak = curWin))
            if (curLose > 1) loseStreaks.add(streak.copy(streak = curLose))
        }

        val topWinStreak = winStreaks.maxOfOrNull { it.streak } ?: 0
        val topLoseStreak = loseStreaks.maxOfOrNull { it.streak } ?: 0
        val longestWinStreaks = winStreaks.filter { it.streak == topWinStreak }.takeIf { it.isNotEmpty() } ?: emptyList()
        val longestLoseStreaks = loseStreaks.filter { it.streak == topLoseStreak }.takeIf { it.isNotEmpty() } ?: emptyList()

        return AllTimeStatisticsDto(
            totalLotteries = closedLotteries.size,
            totalParticipants = participantStats.size,
            topLucky = participantStats.filter { it.lotteriesParticipated >= 1 }
                .sortedByDescending { if (it.totalTicketsBought > 0) it.totalWins.toDouble() / it.totalTicketsBought else 0.0 }.take(5),
            topUnlucky = participantStats.filter { it.lotteriesParticipated >= 1 }
                .sortedWith(compareBy({ if (it.totalTicketsBought > 0) it.totalWins.toDouble() / it.totalTicketsBought else 0.0 }, { -it.totalTicketsBought })).take(5),
            topTicketBuyers = participantStats.sortedByDescending { it.totalTicketsBought }.take(10),
            longestWinStreak = longestWinStreaks,
            longestLoseStreak = longestLoseStreaks
        )
    }

    fun getAllStatistics(): List<StatisticsDto> =
        lotteryRepo.findAllByStatusOrderByCreatedAtDesc(LotteryStatus.CLOSED).map { buildStatistics(it) }

    private fun buildStatistics(lottery: Lottery): StatisticsDto {
        val tickets = ticketRepo.findAllByLotteryWithParticipant(lottery)
        val winners = winnerRepo.findAllByLotteryOrderByPosition(lottery)
        val totalTickets = tickets.size.toLong()

        val participantStats = tickets.groupBy { it.participant.id }.map { (_, pTickets) ->
            val p = pTickets.first().participant
            val wins = winners.count { it.participant.id == p.id }.toLong()
            ParticipantStatsDto(
                participantId = p.id,
                name = p.name,
                tag = p.tag,
                hasPhoto = p.photoData != null,
                ticketsBought = pTickets.size.toLong(),
                wins = wins,
                winRatio = if (pTickets.isNotEmpty()) wins.toDouble() / pTickets.size else 0.0
            )
        }.sortedByDescending { it.ticketsBought }

        val luckiest = participantStats.filter { it.wins > 0 }.maxByOrNull { it.winRatio }
        val unluckiest = participantStats.filter { it.wins == 0L }.maxByOrNull { it.ticketsBought }

        return StatisticsDto(
            lotteryId = lottery.id,
            lotteryName = lottery.name,
            createdAt = lottery.createdAt,
            totalTickets = totalTickets,
            totalAmountNok = totalTickets * pricePerTicket,
            winners = winners.map { it.toDto() },
            participants = participantStats,
            luckiest = luckiest,
            unluckiest = unluckiest
        )
    }

    // --- Mapping helpers ---

    private fun Lottery.toInfoDto() = LotteryInfoDto(
        id = id, name = name, status = status,
        vippsNumber = vippsNumber, pricePerTicket = pricePerTicket,
        totalTickets = ticketRepo.countByLottery(this),
        wineCount = wineCount,
        createdAt = createdAt
    )

    fun Participant.toDto() = ParticipantDto(
        id = id, name = name, tag = tag,
        hasPhoto = photoData != null,
        createdAt = createdAt
    )

    private fun Winner.toDto() = WinnerDto(
        position = position,
        ticketNumber = ticket.ticketNumber,
        participantId = participant.id,
        participantName = participant.name,
        participantTag = participant.tag,
        drawnAt = drawnAt
    )
}
