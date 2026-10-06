package no.isys.wineforall.model

import java.time.Instant

data class Ticket(
    val id: Long = 0,
    val ticketNumber: Int,
    val participant: Participant,
    val lotteryId: Long,
    val won: Boolean = false,
    val createdAt: Instant = Instant.now()
)
