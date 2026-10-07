package no.isys.wineforall.service

import jakarta.persistence.EntityManager
import no.isys.wineforall.dto.VmpStoreDto
import no.isys.wineforall.model.VmpProduct
import no.isys.wineforall.model.VmpStoreStock
import no.isys.wineforall.model.VmpStoreStockId
import no.isys.wineforall.repository.VmpProductRepository
import no.isys.wineforall.repository.VmpStoreStockRepository
import no.isys.wineforall.service.VinmonopoletService.StoreProduct
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

// The products in stock at the Vinmonopolet stores VinmonopoletStockCheckJob lists (vmp_products), and
// each store's stock of them (vmp_store_stock)
@Service
class VmpStockService(
    private val productRepo: VmpProductRepository,
    private val stockRepo: VmpStoreStockRepository,
    private val entityManager: EntityManager
) {

    fun hasBeenChecked(): Boolean = stockRepo.count() > 0

    // The products VG has reviewed that one of the stores has in stock
    fun getVGProducts(): List<VmpProduct> = productRepo.findAllOfVGProducts()

    // null when none of the stores have the product in stock
    fun getProduct(productId: String): VmpProduct? = productRepo.findById(productId).orElse(null)

    // Every store's stock of the products VG has reviewed
    fun getVGProductStock(): List<VmpStoreStock> = stockRepo.findAllOfVGProducts()

    // The stores that have the product in stock
    fun getProductStock(productId: String): List<VmpStoreStock> = stockRepo.findAllByProductId(productId)

    // When the store's stock was last checked; null if it never has been
    fun getLastStockCheck(storeId: String): Instant? = stockRepo.findLastCheck(storeId)

    // The stores in VmpStores, with when each one's stock was last checked
    fun getStores(): List<VmpStoreDto> {
        val lastChecks = stockRepo.findLastChecks().associate { it.storeId to it.checkedAt }
        return VmpStores.all.map { VmpStoreDto(it.id, it.name, lastChecks[it.id]) }
    }

    // Replaces the stock of `storeIds` with a complete listing of those stores: listed stock is inserted
    // or updated, and anything else those stores had has sold out and is deleted. Other stores' stock is
    // left alone. Products then in stock at no store are deleted.
    @Transactional
    fun replaceStores(storeIds: Collection<String>, products: List<StoreProduct>, checkedAt: Instant) {
        val existingProducts = productRepo.findAll().associateBy { it.productId }
        products.forEach { p ->
            val product = existingProducts[p.code] ?: VmpProduct(productId = p.code, name = p.name)
            product.applyFrom(p)
            // persist() rather than save(): with assigned ids, save() would SELECT before every insert
            if (p.code !in existingProducts) entityManager.persist(product)
        }

        val existingStock = stockRepo.findAllByStoreIdIn(storeIds).associateBy { VmpStoreStockId(it.storeId, it.productId) }
        val listedStock = products
            .flatMap { p -> p.stock.map { (storeId, bottles) -> VmpStoreStockId(storeId, p.code) to bottles } }
            .toMap()
        require(listedStock.keys.all { it.storeId in storeIds }) { "Listing has stock for stores other than $storeIds" }
        stockRepo.deleteAll(existingStock.filterKeys { it !in listedStock }.values)
        listedStock.forEach { (id, bottles) ->
            val row = existingStock[id]
            if (row == null) entityManager.persist(VmpStoreStock(id.storeId, id.productId, bottles, checkedAt))
            else row.stock = bottles
        }
        // One statement for the timestamp shared by every row, instead of an UPDATE per row
        stockRepo.setCheckedAt(storeIds, checkedAt)
        productRepo.deleteOutOfStock()
    }

    private fun VmpProduct.applyFrom(p: StoreProduct) {
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
    }
}
