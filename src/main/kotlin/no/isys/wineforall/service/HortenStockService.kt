package no.isys.wineforall.service

import no.isys.wineforall.model.VmpHortenProduct
import no.isys.wineforall.repository.VmpHortenProductRepository
import no.isys.wineforall.service.VinmonopoletService.StoreProduct
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

// The products in stock at Vinmonopolet Horten Sjøsiden (vmp_horten_products)
@Service
class HortenStockService(private val repo: VmpHortenProductRepository) {

    fun hasBeenChecked(): Boolean = repo.count() > 0

    fun getAll(): List<VmpHortenProduct> = repo.findAll()

    // Replaces the table with a complete store listing, so products missing from it (sold out) disappear.
    // In one transaction, so readers see either the previous listing or this one.
    @Transactional
    fun replaceAll(products: List<StoreProduct>, checkedAt: Instant) {
        repo.deleteAll()
        repo.insertAll(products.map { it.toProduct(checkedAt) })
    }

    private fun StoreProduct.toProduct(checkedAt: Instant) = VmpHortenProduct(
        productId = code,
        name = name,
        price = price,
        mainCategory = mainCategory,
        mainCategoryCode = mainCategoryCode,
        mainSubCategory = mainSubCategory,
        mainSubCategoryCode = mainSubCategoryCode,
        country = country,
        volume = volume,
        alcohol = alcohol,
        productSelection = productSelection,
        url = url,
        vintage = vintage,
        hortenStock = stockLevel,
        stockCheckedAt = checkedAt
    )
}
