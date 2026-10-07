package no.isys.wineforall.service

import jakarta.persistence.EntityManager
import no.isys.wineforall.model.VmpHortenProduct
import no.isys.wineforall.repository.VmpHortenProductRepository
import no.isys.wineforall.service.VinmonopoletService.StoreProduct
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

// The products in stock at Vinmonopolet Horten Sjøsiden (vmp_horten_products)
@Service
class HortenStockService(
    private val repo: VmpHortenProductRepository,
    private val entityManager: EntityManager
) {

    fun hasBeenChecked(): Boolean = repo.count() > 0

    fun getAll(): List<VmpHortenProduct> = repo.findAll()

    // null when Horten doesn't have the product in stock
    fun get(productId: String): VmpHortenProduct? = repo.findById(productId).orElse(null)

    // When Horten's stock was last checked; null if it never has been
    fun getLastStockCheck(): Instant? = repo.findLastStockCheck()

    // Replaces the table with a complete store listing: listed products are inserted or updated,
    // everything else has sold out and is deleted.
    @Transactional
    fun replaceAll(products: List<StoreProduct>, checkedAt: Instant) {
        val existing = repo.findAll().associateBy { it.productId }
        val listedIds = products.map { it.code }.toSet()
        repo.deleteAll(existing.values.filter { it.productId !in listedIds })
        products.forEach { p ->
            val product = existing[p.code]
                ?: VmpHortenProduct(productId = p.code, name = p.name, stockCheckedAt = checkedAt)
            product.applyFrom(p)
            // persist() rather than save(): with assigned ids, save() would SELECT before every insert
            if (p.code !in existing) entityManager.persist(product)
        }
        // One statement for the timestamp shared by every row, instead of an UPDATE per row
        repo.setStockCheckedAt(checkedAt)
    }

    private fun VmpHortenProduct.applyFrom(p: StoreProduct) {
        name = p.name
        price = p.price
        mainCategory = p.mainCategory
        mainCategoryCode = p.mainCategoryCode
        mainSubCategory = p.mainSubCategory
        mainSubCategoryCode = p.mainSubCategoryCode
        country = p.country
        volume = p.volume
        alcohol = p.alcohol
        productSelection = p.productSelection
        url = p.url
        vintage = p.vintage
        hortenStock = p.stockLevel
    }
}
