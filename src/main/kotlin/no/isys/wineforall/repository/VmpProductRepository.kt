package no.isys.wineforall.repository

import no.isys.wineforall.model.VmpProduct
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Modifying
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface VmpProductRepository : JpaRepository<VmpProduct, String> {

    // The products VG has reviewed
    @Query("SELECT v FROM VmpProduct v WHERE EXISTS (SELECT 1 FROM VGProduct p WHERE p.productId = v.productId)")
    fun findAllOfVGProducts(): List<VmpProduct>

    // Products no store has in stock any longer. Flushes first, so stock removed in the same transaction
    // counts, and clears afterwards, so no deleted product is left in the persistence context.
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("DELETE FROM VmpProduct p WHERE NOT EXISTS (SELECT 1 FROM VmpStoreStock s WHERE s.productId = p.productId)")
    fun deleteOutOfStock(): Int
}
