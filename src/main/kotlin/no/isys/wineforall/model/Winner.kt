package no.isys.wineforall.model

import java.time.Instant

data class Winner(
    val id: Long = 0,
    val ticket: Ticket,
    val participant: Participant,
    val lotteryId: Long,
    val position: Int,
    val drawnAt: Instant = Instant.now(),
    val prize: LotteryPrize? = null
)
