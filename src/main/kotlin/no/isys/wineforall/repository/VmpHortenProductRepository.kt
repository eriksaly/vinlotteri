package no.isys.wineforall.repository

import no.isys.wineforall.model.VmpHortenProduct
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.deleteAll
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional
class VmpHortenProductRepository {

    fun count(): Int = VmpHortenProducts.selectAll().count().toInt()

    fun findAll(): List<VmpHortenProduct> =
        VmpHortenProducts.selectAll().orderBy(VmpHortenProducts.productId).map { it.toVmpHortenProduct() }

    fun insertAll(products: List<VmpHortenProduct>) {
        VmpHortenProducts.batchInsert(products, shouldReturnGeneratedValues = false) { p ->
            this[VmpHortenProducts.productId] = p.productId
            this[VmpHortenProducts.alcohol] = p.alcohol
            this[VmpHortenProducts.country] = p.country
            this[VmpHortenProducts.hortenStock] = p.hortenStock
            this[VmpHortenProducts.mainCategory] = p.mainCategory
            this[VmpHortenProducts.mainCategoryCode] = p.mainCategoryCode
            this[VmpHortenProducts.mainSubCategory] = p.mainSubCategory
            this[VmpHortenProducts.mainSubCategoryCode] = p.mainSubCategoryCode
            this[VmpHortenProducts.name] = p.name
            this[VmpHortenProducts.price] = p.price
            this[VmpHortenProducts.productSelection] = p.productSelection
            this[VmpHortenProducts.stockCheckedAt] = p.stockCheckedAt
            this[VmpHortenProducts.url] = p.url
            this[VmpHortenProducts.vintage] = p.vintage
            this[VmpHortenProducts.volume] = p.volume
        }
    }

    fun deleteAll() {
        VmpHortenProducts.deleteAll()
    }
}

private fun ResultRow.toVmpHortenProduct() = VmpHortenProduct(
    productId = this[VmpHortenProducts.productId],
    name = this[VmpHortenProducts.name],
    price = this[VmpHortenProducts.price],
    mainCategory = this[VmpHortenProducts.mainCategory],
    mainCategoryCode = this[VmpHortenProducts.mainCategoryCode],
    mainSubCategory = this[VmpHortenProducts.mainSubCategory],
    mainSubCategoryCode = this[VmpHortenProducts.mainSubCategoryCode],
    country = this[VmpHortenProducts.country],
    volume = this[VmpHortenProducts.volume],
    alcohol = this[VmpHortenProducts.alcohol],
    productSelection = this[VmpHortenProducts.productSelection],
    url = this[VmpHortenProducts.url],
    vintage = this[VmpHortenProducts.vintage],
    hortenStock = this[VmpHortenProducts.hortenStock],
    stockCheckedAt = this[VmpHortenProducts.stockCheckedAt]
)
