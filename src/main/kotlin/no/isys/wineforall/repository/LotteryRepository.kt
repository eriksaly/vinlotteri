package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryStatus
import org.springframework.data.jpa.repository.JpaRepository

interface LotteryRepository : JpaRepository<Lottery, Long> {
    fun findFirstByStatusOrderByCreatedAtDesc(status: LotteryStatus): Lottery?
    fun findAllByStatusOrderByCreatedAtDesc(status: LotteryStatus): List<Lottery>
    fun findTopByStatusInOrderByCreatedAtDesc(statuses: List<LotteryStatus>): Lottery?
}
