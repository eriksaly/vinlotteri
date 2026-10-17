package no.isys.wineforall.repository

import no.isys.wineforall.model.VmpListingPage
import no.isys.wineforall.model.VmpListingPageId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface VmpListingPageRepository : JpaRepository<VmpListingPage, VmpListingPageId> {

    fun findAllByStoreIds(storeIds: String): List<VmpListingPage>

    @Modifying
    @Query("DELETE FROM VmpListingPage p WHERE p.storeIds = :storeIds")
    fun deleteAllByStoreIds(storeIds: String)
}
