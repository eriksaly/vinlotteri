package no.isys.wineforall.model

import java.time.Instant

data class LotteryPrize(
    val id: Long = 0,
    val lotteryId: Long,
    val position: Int,
    val slots: List<PrizeItemSlot> = emptyList(),
    val createdAt: Instant = Instant.now()
)
