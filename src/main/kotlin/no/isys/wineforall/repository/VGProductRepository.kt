package no.isys.wineforall.repository

import no.isys.wineforall.model.VGProduct
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface VGProductRepository : JpaRepository<VGProduct, String> {

    // Products whose discontinued status was never checked or last checked before checkedBefore, skipping
    // those in stock at Horten: Vinmonopolet doesn't stock discontinued products. Least recently checked
    // first, so a run that gets cut short resumes where it left off.
    @Query(
        """
        SELECT p.productId FROM VGProduct p
        WHERE (p.statusCheckedAt IS NULL OR p.statusCheckedAt < :checkedBefore)
          AND NOT EXISTS (SELECT 1 FROM VmpHortenProduct h WHERE h.productId = p.productId)
        ORDER BY p.statusCheckedAt ASC NULLS FIRST
        """
    )
    fun findIdsDueForStatusCheck(checkedBefore: Instant): List<String>
}
