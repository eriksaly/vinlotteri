package no.isys.wineforall.repository

import no.isys.wineforall.model.VGProduct
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.and
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.isNull
import org.jetbrains.exposed.v1.core.less
import org.jetbrains.exposed.v1.core.notExists
import org.jetbrains.exposed.v1.core.or
import org.jetbrains.exposed.v1.core.statements.UpdateBuilder
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

// The review sync writes the catalogue fields and the discontinued check the status fields, each with its
// own update, so neither writes back the other's fields from a stale copy
@Repository
@Transactional
class VGProductRepository {

    fun findAll(): List<VGProduct> =
        VgProducts.selectAll().orderBy(VgProducts.productId).map { it.toVGProduct() }

    // Products whose discontinued status was never checked or last checked before checkedBefore, skipping
    // those in stock at Horten: Vinmonopolet doesn't stock discontinued products. Least recently checked
    // first, so a run that gets cut short resumes where it left off.
    fun findIdsDueForStatusCheck(checkedBefore: Instant): List<String> =
        VgProducts.select(VgProducts.productId)
            .where {
                (VgProducts.statusCheckedAt.isNull() or (VgProducts.statusCheckedAt less checkedBefore)) and
                    notExists(
                        VmpHortenProducts.select(VmpHortenProducts.productId)
                            .where { VmpHortenProducts.productId eq VgProducts.productId }
                    )
            }
            .orderBy(VgProducts.statusCheckedAt, SortOrder.ASC_NULLS_FIRST)
            .map { it[VgProducts.productId] }

    fun insertAll(products: List<VGProduct>) {
        VgProducts.batchInsert(products, shouldReturnGeneratedValues = false) { p ->
            this[VgProducts.productId] = p.productId
            setCatalogue(p)
            this[VgProducts.discontinued] = p.discontinued
            this[VgProducts.vmpPrice] = p.vmpPrice
            this[VgProducts.vmpVintage] = p.vmpVintage
            this[VgProducts.statusCheckedAt] = p.statusCheckedAt
            this[VgProducts.createdAt] = p.createdAt
        }
    }

    // The fields taken from VG's feed
    fun updateCatalogue(products: List<VGProduct>) {
        products.forEach { p ->
            VgProducts.update({ VgProducts.productId eq p.productId }) { it.setCatalogue(p) }
        }
    }

    // A product that doesn't exist is skipped
    fun updateStatus(productId: String, discontinued: Boolean, vmpPrice: Double?, vmpVintage: Int?, checkedAt: Instant) {
        VgProducts.update({ VgProducts.productId eq productId }) {
            it[VgProducts.discontinued] = discontinued
            it[VgProducts.vmpPrice] = vmpPrice
            it[VgProducts.vmpVintage] = vmpVintage
            it[statusCheckedAt] = checkedAt
        }
    }

    fun updateStatusCheckedAt(productId: String, checkedAt: Instant) {
        VgProducts.update({ VgProducts.productId eq productId }) { it[statusCheckedAt] = checkedAt }
    }
}

private fun UpdateBuilder<*>.setCatalogue(p: VGProduct) {
    this[VgProducts.productShortName] = p.productShortName
    this[VgProducts.productTypeName] = p.productTypeName
    this[VgProducts.subProductTypeName] = p.subProductTypeName
    this[VgProducts.mainProductTypeName] = p.mainProductTypeName
    this[VgProducts.productGroupName] = p.productGroupName
    this[VgProducts.country] = p.country
    this[VgProducts.regionDetailed] = p.regionDetailed
    this[VgProducts.subRegion] = p.subRegion
    this[VgProducts.origin] = p.origin
    this[VgProducts.grape] = p.grape
    this[VgProducts.price] = p.price
    this[VgProducts.salesPricePerLiter] = p.salesPricePerLiter
    this[VgProducts.volume] = p.volume
    this[VgProducts.volumeType] = p.volumeType
    this[VgProducts.packagingMaterial] = p.packagingMaterial
    this[VgProducts.corkType] = p.corkType
    this[VgProducts.orderType] = p.orderType
}

private fun ResultRow.toVGProduct() = VGProduct(
    productId = this[VgProducts.productId],
    productShortName = this[VgProducts.productShortName],
    productTypeName = this[VgProducts.productTypeName],
    subProductTypeName = this[VgProducts.subProductTypeName],
    mainProductTypeName = this[VgProducts.mainProductTypeName],
    productGroupName = this[VgProducts.productGroupName],
    country = this[VgProducts.country],
    regionDetailed = this[VgProducts.regionDetailed],
    subRegion = this[VgProducts.subRegion],
    origin = this[VgProducts.origin],
    grape = this[VgProducts.grape],
    price = this[VgProducts.price],
    salesPricePerLiter = this[VgProducts.salesPricePerLiter],
    volume = this[VgProducts.volume],
    volumeType = this[VgProducts.volumeType],
    packagingMaterial = this[VgProducts.packagingMaterial],
    corkType = this[VgProducts.corkType],
    orderType = this[VgProducts.orderType],
    discontinued = this[VgProducts.discontinued],
    vmpPrice = this[VgProducts.vmpPrice],
    vmpVintage = this[VgProducts.vmpVintage],
    statusCheckedAt = this[VgProducts.statusCheckedAt],
    createdAt = this[VgProducts.createdAt]
)
