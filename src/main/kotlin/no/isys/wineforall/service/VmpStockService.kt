package no.isys.wineforall.service

import jakarta.persistence.EntityManager
import no.isys.wineforall.dto.VmpStoreDto
import no.isys.wineforall.model.VmpListingPage
import no.isys.wineforall.model.VmpProduct
import no.isys.wineforall.model.VmpStockCheckRun
import no.isys.wineforall.model.VmpStoreStock
import no.isys.wineforall.model.VmpStoreStockId
import no.isys.wineforall.repository.VmpListingPageRepository
import no.isys.wineforall.repository.VmpProductRepository
import no.isys.wineforall.repository.VmpStockCheckRunRepository
import no.isys.wineforall.repository.VmpStoreStockRepository
import no.isys.wineforall.service.VinmonopoletService.StoreProduct
import no.isys.wineforall.service.VinmonopoletService.StoreStockPage
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import tools.jackson.module.kotlin.jacksonMapperBuilder
import tools.jackson.module.kotlin.readValue
import java.time.Instant

// The products in stock at the Vinmonopolet stores VinmonopoletStockCheckJob lists (vmp_products), and
// each store's stock of them (vmp_store_stock), plus the job's progress: its runs (vmp_stock_check_runs)
// and the listing pages it has fetched but not yet applied (vmp_listing_pages)
@Service
class VmpStockService(
    private val productRepo: VmpProductRepository,
    private val stockRepo: VmpStoreStockRepository,
    private val runRepo: VmpStockCheckRunRepository,
    private val pageRepo: VmpListingPageRepository,
    private val entityManager: EntityManager
) {

    private val json = jacksonMapperBuilder().build()

    fun hasBeenChecked(): Boolean = stockRepo.count() > 0

    // The latest run, if a restart or deploy cut it off before it ended
    fun findUnfinishedRun(): VmpStockCheckRun? =
        runRepo.findFirstByOrderByStartedAtDesc()?.takeIf { it.finishedAt == null }

    // A new run starts from scratch, so it drops any pages an earlier run left unapplied
    @Transactional
    fun startRun(): VmpStockCheckRun {
        pageRepo.deleteAllInBatch()
        return runRepo.save(VmpStockCheckRun(startedAt = Instant.now()))
    }

    @Transactional
    fun finishRun(runId: Long) {
        runRepo.findById(runId).ifPresent { it.finishedAt = Instant.now() }
    }

    // Whether every one of the stores' stock has been replaced since `since`
    fun wereCheckedSince(storeIds: Collection<String>, since: Instant): Boolean =
        storeIds.all { id -> stockRepo.findLastCheck(id)?.let { it >= since } ?: false }

    // The pages of the stores' listing fetched after `fetchedAfter` and not yet applied, by page number
    fun getListingPages(storeIds: List<String>, fetchedAfter: Instant): Map<Int, StoreStockPage> =
        pageRepo.findAllByStoreIds(storeIds.joinToString(","))
            .filter { it.fetchedAt > fetchedAfter }
            .associate { it.pageNumber to json.readValue<StoreStockPage>(it.content) }

    // Replaces a page saved earlier, e.g. one too old to use
    fun saveListingPage(storeIds: List<String>, pageNumber: Int, page: StoreStockPage) {
        pageRepo.save(VmpListingPage(storeIds.joinToString(","), pageNumber, Instant.now(), json.writeValueAsString(page)))
    }

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
    // left alone. Products then in stock at no store are deleted, and so are the listing's saved pages.
    @Transactional
    fun replaceStores(storeIds: List<String>, products: List<StoreProduct>, checkedAt: Instant) {
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
        pageRepo.deleteAllByStoreIds(storeIds.joinToString(","))
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
