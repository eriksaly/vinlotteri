package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.VgProductsRecord
import no.isys.wineforall.jooq.tables.references.VG_PRODUCTS
import no.isys.wineforall.jooq.tables.references.VMP_HORTEN_PRODUCTS
import no.isys.wineforall.model.VGProduct
import org.jooq.DSLContext
import org.jooq.impl.DSL.selectOne
import org.springframework.stereotype.Repository
import java.time.Instant

// The review sync writes the catalogue fields and the discontinued check the status fields, each with its
// own update, so neither writes back the other's fields from a stale copy
@Repository
class VGProductRepository(private val dsl: DSLContext) {

    fun findAll(): List<VGProduct> =
        dsl.selectFrom(VG_PRODUCTS).orderBy(VG_PRODUCTS.PRODUCT_ID).fetch { it.toVGProduct() }

    // Products whose discontinued status was never checked or last checked before checkedBefore, skipping
    // those in stock at Horten: Vinmonopolet doesn't stock discontinued products. Least recently checked
    // first, so a run that gets cut short resumes where it left off.
    fun findIdsDueForStatusCheck(checkedBefore: Instant): List<String> =
        dsl.select(VG_PRODUCTS.PRODUCT_ID)
            .from(VG_PRODUCTS)
            .where(VG_PRODUCTS.STATUS_CHECKED_AT.isNull.or(VG_PRODUCTS.STATUS_CHECKED_AT.lt(checkedBefore)))
            .andNotExists(
                selectOne().from(VMP_HORTEN_PRODUCTS).where(VMP_HORTEN_PRODUCTS.PRODUCT_ID.eq(VG_PRODUCTS.PRODUCT_ID))
            )
            .orderBy(VG_PRODUCTS.STATUS_CHECKED_AT.asc().nullsFirst())
            .fetch(VG_PRODUCTS.PRODUCT_ID)
            .requireNoNulls()

    fun insertAll(products: List<VGProduct>) {
        dsl.batchInsert(products.map { it.toRecord() }).execute()
    }

    // The fields taken from VG's feed
    fun updateCatalogue(products: List<VGProduct>) {
        products.forEach { p ->
            dsl.update(VG_PRODUCTS)
                .set(VG_PRODUCTS.PRODUCT_SHORT_NAME, p.productShortName)
                .set(VG_PRODUCTS.PRODUCT_TYPE_NAME, p.productTypeName)
                .set(VG_PRODUCTS.SUB_PRODUCT_TYPE_NAME, p.subProductTypeName)
                .set(VG_PRODUCTS.MAIN_PRODUCT_TYPE_NAME, p.mainProductTypeName)
                .set(VG_PRODUCTS.PRODUCT_GROUP_NAME, p.productGroupName)
                .set(VG_PRODUCTS.COUNTRY, p.country)
                .set(VG_PRODUCTS.REGION_DETAILED, p.regionDetailed)
                .set(VG_PRODUCTS.SUB_REGION, p.subRegion)
                .set(VG_PRODUCTS.ORIGIN, p.origin)
                .set(VG_PRODUCTS.GRAPE, p.grape)
                .set(VG_PRODUCTS.PRICE, p.price)
                .set(VG_PRODUCTS.SALES_PRICE_PER_LITER, p.salesPricePerLiter)
                .set(VG_PRODUCTS.VOLUME, p.volume)
                .set(VG_PRODUCTS.VOLUME_TYPE, p.volumeType)
                .set(VG_PRODUCTS.PACKAGING_MATERIAL, p.packagingMaterial)
                .set(VG_PRODUCTS.CORK_TYPE, p.corkType)
                .set(VG_PRODUCTS.ORDER_TYPE, p.orderType)
                .where(VG_PRODUCTS.PRODUCT_ID.eq(p.productId))
                .execute()
        }
    }

    // A product that doesn't exist is skipped
    fun updateStatus(productId: String, discontinued: Boolean, vmpPrice: Double?, vmpVintage: Int?, checkedAt: Instant) {
        dsl.update(VG_PRODUCTS)
            .set(VG_PRODUCTS.DISCONTINUED, discontinued)
            .set(VG_PRODUCTS.VMP_PRICE, vmpPrice)
            .set(VG_PRODUCTS.VMP_VINTAGE, vmpVintage)
            .set(VG_PRODUCTS.STATUS_CHECKED_AT, checkedAt)
            .where(VG_PRODUCTS.PRODUCT_ID.eq(productId))
            .execute()
    }

    fun updateStatusCheckedAt(productId: String, checkedAt: Instant) {
        dsl.update(VG_PRODUCTS)
            .set(VG_PRODUCTS.STATUS_CHECKED_AT, checkedAt)
            .where(VG_PRODUCTS.PRODUCT_ID.eq(productId))
            .execute()
    }
}

private fun VgProductsRecord.toVGProduct() = VGProduct(
    productId = productId,
    productShortName = productShortName,
    productTypeName = productTypeName,
    subProductTypeName = subProductTypeName,
    mainProductTypeName = mainProductTypeName,
    productGroupName = productGroupName,
    country = country,
    regionDetailed = regionDetailed,
    subRegion = subRegion,
    origin = origin,
    grape = grape,
    price = price,
    salesPricePerLiter = salesPricePerLiter,
    volume = volume,
    volumeType = volumeType,
    packagingMaterial = packagingMaterial,
    corkType = corkType,
    orderType = orderType,
    discontinued = discontinued!!,
    vmpPrice = vmpPrice,
    vmpVintage = vmpVintage,
    statusCheckedAt = statusCheckedAt,
    createdAt = createdAt
)

private fun VGProduct.toRecord() = VgProductsRecord(
    productId = productId,
    corkType = corkType,
    country = country,
    createdAt = createdAt,
    discontinued = discontinued,
    grape = grape,
    mainProductTypeName = mainProductTypeName,
    orderType = orderType,
    origin = origin,
    packagingMaterial = packagingMaterial,
    price = price,
    productGroupName = productGroupName,
    productShortName = productShortName,
    productTypeName = productTypeName,
    regionDetailed = regionDetailed,
    salesPricePerLiter = salesPricePerLiter,
    statusCheckedAt = statusCheckedAt,
    subProductTypeName = subProductTypeName,
    subRegion = subRegion,
    vmpPrice = vmpPrice,
    vmpVintage = vmpVintage,
    volume = volume,
    volumeType = volumeType
)
