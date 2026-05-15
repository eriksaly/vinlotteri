package no.isys.wineforall.repository

import no.isys.wineforall.model.PrizeItemSlot
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository

@Repository
interface PrizeItemSlotRepository : JpaRepository<PrizeItemSlot, Long> {

    @Query("SELECT s FROM PrizeItemSlot s JOIN FETCH s.inventoryItem")
    fun findAllWithItem(): List<PrizeItemSlot>

    fun deleteAllByInventoryItemId(id: Long)
}
