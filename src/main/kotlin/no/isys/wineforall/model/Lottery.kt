package no.isys.wineforall.model

import java.time.Instant

enum class LotteryStatus { OPEN, DRAWING, CLOSED }

data class Lottery(
    val id: Long = 0,
    val name: String,
    val status: LotteryStatus = LotteryStatus.OPEN,
    val wineCount: Int? = null,
    val createdAt: Instant = Instant.now()
)
