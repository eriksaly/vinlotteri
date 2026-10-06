package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.VmpHortenProductsRecord
import no.isys.wineforall.jooq.tables.references.VMP_HORTEN_PRODUCTS
import no.isys.wineforall.model.VmpHortenProduct
import org.jooq.DSLContext
import org.springframework.stereotype.Repository

@Repository
class VmpHortenProductRepository(private val dsl: DSLContext) {

    fun count(): Int = dsl.fetchCount(VMP_HORTEN_PRODUCTS)

    fun findAll(): List<VmpHortenProduct> =
        dsl.selectFrom(VMP_HORTEN_PRODUCTS).orderBy(VMP_HORTEN_PRODUCTS.PRODUCT_ID).fetch { it.toVmpHortenProduct() }

    fun insertAll(products: List<VmpHortenProduct>) {
        dsl.batchInsert(products.map { it.toRecord() }).execute()
    }

    fun deleteAll() {
        dsl.deleteFrom(VMP_HORTEN_PRODUCTS).execute()
    }
}

private fun VmpHortenProductsRecord.toVmpHortenProduct() = VmpHortenProduct(
    productId = productId,
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
    hortenStock = hortenStock,
    stockCheckedAt = stockCheckedAt
)

private fun VmpHortenProduct.toRecord() = VmpHortenProductsRecord(
    productId = productId,
    alcohol = alcohol,
    country = country,
    hortenStock = hortenStock,
    mainCategory = mainCategory,
    mainCategoryCode = mainCategoryCode,
    mainSubCategory = mainSubCategory,
    mainSubCategoryCode = mainSubCategoryCode,
    name = name,
    price = price,
    productSelection = productSelection,
    stockCheckedAt = stockCheckedAt,
    url = url,
    vintage = vintage,
    volume = volume
)
