package no.isys.wineforall.repository

import no.isys.wineforall.model.VmpStoreStock
import no.isys.wineforall.model.VmpStoreStockId
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface VmpStoreStockRepository : JpaRepository<VmpStoreStock, VmpStoreStockId> {

    fun findAllByProductId(productId: String): List<VmpStoreStock>

    // Every store's stock of the products VG has reviewed
    @Query("SELECT s FROM VmpStoreStock s WHERE EXISTS (SELECT 1 FROM VGProduct p WHERE p.productId = s.productId)")
    fun findAllOfVGProducts(): List<VmpStoreStock>

    fun findAllByStoreIdIn(storeIds: Collection<String>): List<VmpStoreStock>

    // Flushes pending inserts/updates first, so they aren't written after the timestamp
    @Modifying(flushAutomatically = true)
    @Query("UPDATE VmpStoreStock s SET s.checkedAt = :checkedAt WHERE s.storeId IN :storeIds")
    fun setCheckedAt(storeIds: Collection<String>, checkedAt: Instant)

    @Query("SELECT MAX(s.checkedAt) FROM VmpStoreStock s WHERE s.storeId = :storeId")
    fun findLastCheck(storeId: String): Instant?

    @Query("SELECT new no.isys.wineforall.repository.StoreLastCheck(s.storeId, MAX(s.checkedAt)) FROM VmpStoreStock s GROUP BY s.storeId")
    fun findLastChecks(): List<StoreLastCheck>
}

data class StoreLastCheck(val storeId: String, val checkedAt: Instant)
