package no.isys.wineforall.repository

import no.isys.wineforall.model.VmpHortenProduct
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface VmpHortenProductRepository : JpaRepository<VmpHortenProduct, String> {

    // Flushes pending inserts/updates first, so they aren't written after the timestamp
    @Modifying(flushAutomatically = true)
    @Query("UPDATE VmpHortenProduct p SET p.stockCheckedAt = :checkedAt")
    fun setStockCheckedAt(checkedAt: Instant)
}
