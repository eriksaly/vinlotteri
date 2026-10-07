package no.isys.wineforall.service

import jakarta.persistence.EntityManager
import no.isys.wineforall.dto.WineProductDetailDto
import no.isys.wineforall.dto.WineProductDto
import no.isys.wineforall.dto.WineReviewDto
import no.isys.wineforall.dto.WineReviewSyncResultDto
import no.isys.wineforall.model.VGProduct
import no.isys.wineforall.model.VGReview
import no.isys.wineforall.model.VmpProduct
import no.isys.wineforall.model.VmpStoreStock
import no.isys.wineforall.repository.VGProductRepository
import no.isys.wineforall.repository.VGProductSummary
import no.isys.wineforall.repository.VGReviewRepository
import no.isys.wineforall.service.VGWineReviewClient.VGWineReview
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import kotlin.math.abs

@Service
class WineReviewService(
    private val productRepo: VGProductRepository,
    private val reviewRepo: VGReviewRepository,
    private val vmpStockService: VmpStockService,
    private val entityManager: EntityManager
) {

    fun hasReviews(): Boolean = reviewRepo.count() > 0

    fun getProductIdsDueForStatusCheck(checkedBefore: Instant): List<String> =
        productRepo.findIdsDueForStatusCheck(checkedBefore)

    @Transactional
    fun recordStatusCheck(productId: String, discontinued: Boolean, vmpPrice: Double?, vmpVintage: Int?) {
        val product = productRepo.findById(productId).orElse(null) ?: return
        product.discontinued = discontinued
        product.vmpPrice = vmpPrice
        product.vmpVintage = vmpVintage
        product.statusCheckedAt = Instant.now()
    }

    // A failed check still counts as an attempt, so a product that keeps failing goes to the back of
    // the queue instead of being retried first every night
    @Transactional
    fun recordFailedStatusCheck(productId: String) {
        val product = productRepo.findById(productId).orElse(null) ?: return
        product.statusCheckedAt = Instant.now()
    }

    // VG's reviewed products combined with the store listings (vmp_products) and each store's stock
    // (vmp_store_stock). Products Vinmonopolet lists as discontinued ("Utgått") are left out, unless one
    // of the listed stores still has some.
    @Transactional(readOnly = true)
    fun getProducts(): List<WineProductDto> {
        val vmpProducts = vmpStockService.getVGProducts().associateBy { it.productId }
        val stock = vmpStockService.getVGProductStock().groupBy { it.productId }
        val lastHortenCheck = vmpStockService.getLastStockCheck(VmpStores.HORTEN.id)
        return reviewRepo.findProductSummaries().mapNotNull { p ->
            val vmpProduct = vmpProducts[p.productId]
            if (p.discontinued && vmpProduct == null) return@mapNotNull null
            // The list shows 40 px thumbnails, so the 300x300 image (~4 KB) rather than 1200x1200 (~30 KB)
            p.toDto(vmpProduct, stock[p.productId].orEmpty(), lastHortenCheck, imageSize = 300)
        }
    }

    // One product with all its reviews. Unlike the list, this includes discontinued products.
    @Transactional(readOnly = true)
    fun getProduct(productId: String): WineProductDetailDto? {
        val summary = reviewRepo.findProductSummary(productId) ?: return null
        val product = productRepo.findById(productId).orElseThrow()
        return WineProductDetailDto(
            product = summary.toDto(
                vmpStockService.getProduct(productId),
                vmpStockService.getProductStock(productId),
                vmpStockService.getLastStockCheck(VmpStores.HORTEN.id),
                imageSize = 1200
            ),
            grape = product.grape,
            subRegion = product.subRegion,
            discontinued = product.discontinued,
            reviews = getReviews(productId)
        )
    }

    // vmpProduct is null when none of the listed stores have the product, and `stock` has a row for each
    // store that does. Products Horten doesn't have were out of stock at its last check (lastHortenCheck).
    private fun VGProductSummary.toDto(
        vmpProduct: VmpProduct?,
        stock: List<VmpStoreStock>,
        lastHortenCheck: Instant?,
        imageSize: Int
    ): WineProductDto {
        val hortenStock = stock.find { it.storeId == VmpStores.HORTEN.id }
        // Most recent price first: the store listings from last night, then the weekly discontinued
        // check, then VG's price from the time of the review
        val currentPrice = vmpProduct?.price ?: vmpPrice ?: price
        return WineProductDto(
            productId = productId,
            productShortName = productShortName,
            productTypeName = productTypeName,
            subProductTypeName = subProductTypeName,
            country = country,
            regionDetailed = regionDetailed,
            volume = volume,
            price = currentPrice,
            // VG's price_per_score formula, but from the current price rather than the one at review time
            pricePerScore = if (currentPrice != null && volume != null && volume > 0) currentPrice / volume / score else null,
            inStock = if (lastHortenCheck == null) null else hortenStock != null,
            hortenStock = hortenStock?.stock,
            stockCheckedAt = hortenStock?.checkedAt ?: lastHortenCheck,
            storeStock = stock.associate { it.storeId to it.stock },
            score = score,
            grade = grade,
            vintage = vintage,
            // The store listings when a listed store has the product (null there means non-vintage),
            // otherwise the weekly discontinued check
            vmpVintage = if (vmpProduct != null) vmpProduct.vintage else vmpVintage,
            reviewCount = reviewCount.toInt(),
            lastReviewedAt = reviewedAt,
            imageUrl = "https://bilder.vinmonopolet.no/cache/${imageSize}x$imageSize-0/$productId-1.jpg",
            vinmonopoletUrl = "https://www.vinmonopolet.no/p/$productId"
        )
    }

    // Products where some review's headline or text contains every word in `text`, ignoring case.
    // The words can be spread over several reviews of the same product.
    @Transactional(readOnly = true)
    fun searchReviewText(text: String): List<String> {
        val words = text.lowercase().split(Regex("\\s+")).filter { it.isNotBlank() }.take(10)
        if (words.isEmpty()) return emptyList()
        return words
            .map { word ->
                val escaped = word.replace("!", "!!").replace("%", "!%").replace("_", "!_")
                reviewRepo.findProductIdsWithReviewText("%$escaped%").toSet()
            }
            .reduce { matches, ids -> matches intersect ids }
            .toList()
    }

    @Transactional(readOnly = true)
    fun getReviews(productId: String): List<WineReviewDto> =
        reviewRepo.findAllByProductId(productId).map { r ->
            WineReviewDto(
                id = r.id,
                vintage = r.vintage,
                score = r.score,
                grade = r.grade,
                lead = r.lead,
                authorDescription = r.authorDescription,
                price = r.price,
                articleUrl = r.article?.takeIf { it.isNotBlank() }?.let {
                    if (it.startsWith("http")) it else "https://www.vg.no/i/$it"
                },
                reviewedAt = r.reviewedAt,
                colour = r.colour,
                odour = r.odour,
                taste = r.taste,
                alcoholLevel = r.alcoholLevel,
                sugarContent = r.sugarContent,
                fullness = r.fullness,
                freshness = r.freshness,
                tannins = r.tannins,
                sweetness = r.sweetness
            )
        }

    // Inserts new reviews and products, and re-applies reviews VG has edited since the last sync.
    // Expects the complete feed: product fields are taken from each product's most recent review.
    @Transactional
    fun upsert(records: List<VGWineReview>): WineReviewSyncResultDto {
        val products = productRepo.findAll().associateBy { it.productId }.toMutableMap()
        val reviews = reviewRepo.findAllWithProduct().associateBy { it.id }
        var newProducts = 0
        var newReviews = 0
        var updatedReviews = 0

        // persist() rather than save(): with assigned ids, save() would SELECT before every insert
        records.groupBy { it.productId }.forEach { (productId, productRecords) ->
            val latest = productRecords.maxBy { it.id }
            val existing = products[productId]
            if (existing == null) {
                newProducts++
                products[productId] = VGProduct(productId = productId)
                    .also { it.applyFrom(latest); entityManager.persist(it) }
            } else {
                existing.applyFrom(latest)
            }
        }

        records.forEach { record ->
            val product = products.getValue(record.productId)
            val existing = reviews[record.id]
            when {
                existing == null -> {
                    newReviews++
                    entityManager.persist(record.toReview(product))
                }
                existing.sourceUpdatedAt != record.updatedAt || existing.product.productId != record.productId -> {
                    updatedReviews++
                    existing.applyFrom(record, product)
                }
            }
        }

        return WineReviewSyncResultDto(
            fetchedReviews = records.size,
            newReviews = newReviews,
            updatedReviews = updatedReviews,
            newProducts = newProducts
        )
    }

    private fun VGProduct.applyFrom(r: VGWineReview) {
        productShortName = r.productShortName
        productTypeName = r.productTypeName
        subProductTypeName = r.subProductTypeName
        mainProductTypeName = r.mainProductTypeName
        productGroupName = r.productGroupName
        country = r.country
        regionDetailed = r.regionDetailed
        subRegion = r.subRegion
        origin = r.origin
        grape = r.grape
        price = r.priceNum
        salesPricePerLiter = r.salesPricePrLiter
        volume = r.volume
        volumeType = r.volumeType
        packagingMaterial = r.packagingMaterial
        corkType = r.corkType
        // A few of VG's order types carry a trailing non-breaking space
        orderType = r.orderType?.trim()
    }

    private fun VGWineReview.toReview(product: VGProduct) = VGReview(
        id = id,
        product = product,
        score = scoreNum,
        grade = gradeNum,
        reviewedAt = createdAt,
        sourceUpdatedAt = updatedAt
    ).also { it.applyFrom(this, product) }

    private fun VGReview.applyFrom(r: VGWineReview, product: VGProduct) {
        this.product = product
        // VG marks non-vintage wines with either null or 0
        vintage = r.vintage?.takeIf { it > 0 }
        score = r.scoreNum
        grade = r.gradeNum
        lead = r.lead
        authorDescription = r.authorDescription
        article = r.article
        price = r.priceNum
        salesPricePerLiter = r.salesPricePrLiter
        pricePerScore = r.pricePerScore
        alcoholLevel = r.alcoholLevel
        sugarContent = r.sugarContent
        colour = r.colour
        odour = r.odour
        taste = r.taste
        freshness = r.freshness
        fullness = r.fullness
        bitterness = r.bitterness
        sweetness = r.sweetness
        tannins = r.tannins
        barrel = r.barrel
        spice = r.spice
        fruit = r.fruit
        imageUrl = r.image?.urls?.minByOrNull { abs(it.width - 400) }?.url
        reviewedAt = r.createdAt
        sourceUpdatedAt = r.updatedAt
    }
}
