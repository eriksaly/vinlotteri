package no.isys.wineforall.repository

import no.isys.wineforall.model.VmpStockCheckRun
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository

@Repository
interface VmpStockCheckRunRepository : JpaRepository<VmpStockCheckRun, Long> {
    fun findFirstByOrderByStartedAtDesc(): VmpStockCheckRun?
}
