package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.VgReviewsRecord
import no.isys.wineforall.jooq.tables.references.VG_PRODUCTS
import no.isys.wineforall.jooq.tables.references.VG_REVIEWS
import no.isys.wineforall.model.VGReview
import org.jooq.DSLContext
import org.jooq.impl.DSL.field
import org.jooq.impl.DSL.lower
import org.jooq.impl.DSL.max
import org.jooq.impl.DSL.select
import org.jooq.impl.DSL.selectCount
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
class VGReviewRepository(private val dsl: DSLContext) {

    fun count(): Int = dsl.fetchCount(VG_REVIEWS)

    fun findAll(): List<VGReview> =
        dsl.selectFrom(VG_REVIEWS).orderBy(VG_REVIEWS.ID).fetch { it.toVGReview() }

    fun findAllByProductId(productId: String): List<VGReview> =
        dsl.selectFrom(VG_REVIEWS)
            .where(VG_REVIEWS.PRODUCT_ID.eq(productId))
            .orderBy(VG_REVIEWS.REVIEWED_AT.desc())
            .fetch { it.toVGReview() }

    // Products with a review whose headline or text matches a lower-case LIKE pattern, with '!' as escape
    fun findProductIdsWithReviewText(pattern: String): List<String> =
        dsl.selectDistinct(VG_REVIEWS.PRODUCT_ID)
            .from(VG_REVIEWS)
            .where(lower(VG_REVIEWS.AUTHOR_DESCRIPTION).like(pattern, '!'))
            .or(lower(VG_REVIEWS.LEAD).like(pattern, '!'))
            .fetch(VG_REVIEWS.PRODUCT_ID)
            .requireNoNulls()

    // One row per product with its most recent review and review count, for the product list. Selects
    // only the columns the list shows, so the review texts aren't loaded.
    fun findProductSummaries(): List<VGProductSummary> {
        val p = VG_PRODUCTS
        val r = VG_REVIEWS
        val other = VG_REVIEWS.`as`("other")
        val reviewCount = field(selectCount().from(other).where(other.PRODUCT_ID.eq(p.PRODUCT_ID)))
        return dsl.select(
            p.PRODUCT_ID, p.PRODUCT_SHORT_NAME, p.PRODUCT_TYPE_NAME, p.SUB_PRODUCT_TYPE_NAME, p.COUNTRY,
            p.REGION_DETAILED, p.VOLUME, p.PRICE, p.VMP_PRICE, p.VMP_VINTAGE, p.DISCONTINUED,
            r.SCORE, r.GRADE, r.VINTAGE, r.REVIEWED_AT, reviewCount
        )
            .from(r)
            .join(p).on(p.PRODUCT_ID.eq(r.PRODUCT_ID))
            .where(r.ID.eq(field(select(max(other.ID)).from(other).where(other.PRODUCT_ID.eq(p.PRODUCT_ID)))))
            .fetch { row ->
                VGProductSummary(
                    productId = row[p.PRODUCT_ID]!!,
                    productShortName = row[p.PRODUCT_SHORT_NAME],
                    productTypeName = row[p.PRODUCT_TYPE_NAME],
                    subProductTypeName = row[p.SUB_PRODUCT_TYPE_NAME],
                    country = row[p.COUNTRY],
                    regionDetailed = row[p.REGION_DETAILED],
                    volume = row[p.VOLUME],
                    price = row[p.PRICE],
                    vmpPrice = row[p.VMP_PRICE],
                    vmpVintage = row[p.VMP_VINTAGE],
                    discontinued = row[p.DISCONTINUED]!!,
                    score = row[r.SCORE]!!,
                    grade = row[r.GRADE]!!,
                    vintage = row[r.VINTAGE],
                    reviewedAt = row[r.REVIEWED_AT]!!,
                    reviewCount = row[reviewCount]
                )
            }
    }

    fun insertAll(reviews: List<VGReview>) {
        dsl.batchInsert(reviews.map { it.toRecord() }).execute()
    }

    // Writes every field of each review
    fun updateAll(reviews: List<VGReview>) {
        reviews.forEach { review ->
            dsl.update(VG_REVIEWS).set(review.toRecord()).where(VG_REVIEWS.ID.eq(review.id)).execute()
        }
    }
}

data class VGProductSummary(
    val productId: String,
    val productShortName: String?,
    val productTypeName: String?,
    val subProductTypeName: String?,
    val country: String?,
    val regionDetailed: String?,
    val volume: Double?,
    // VG's price at the time of the most recent review
    val price: Double?,
    val vmpPrice: Double?,
    val vmpVintage: Int?,
    val discontinued: Boolean,
    val score: Int,
    val grade: Int,
    val vintage: Int?,
    val reviewedAt: Instant,
    val reviewCount: Int
)

private fun VgReviewsRecord.toVGReview() = VGReview(
    id = id,
    productId = productId,
    vintage = vintage,
    score = score,
    grade = grade,
    lead = lead,
    authorDescription = authorDescription,
    article = article,
    price = price,
    salesPricePerLiter = salesPricePerLiter,
    pricePerScore = pricePerScore,
    alcoholLevel = alcoholLevel,
    sugarContent = sugarContent,
    colour = colour,
    odour = odour,
    taste = taste,
    freshness = freshness,
    fullness = fullness,
    bitterness = bitterness,
    sweetness = sweetness,
    tannins = tannins,
    barrel = barrel,
    spice = spice,
    fruit = fruit,
    imageUrl = imageUrl,
    reviewedAt = reviewedAt,
    sourceUpdatedAt = sourceUpdatedAt,
    createdAt = createdAt
)

private fun VGReview.toRecord() = VgReviewsRecord(
    id = id,
    alcoholLevel = alcoholLevel,
    article = article,
    authorDescription = authorDescription,
    barrel = barrel,
    bitterness = bitterness,
    colour = colour,
    createdAt = createdAt,
    freshness = freshness,
    fruit = fruit,
    fullness = fullness,
    grade = grade,
    imageUrl = imageUrl,
    lead = lead,
    odour = odour,
    price = price,
    pricePerScore = pricePerScore,
    reviewedAt = reviewedAt,
    salesPricePerLiter = salesPricePerLiter,
    score = score,
    sourceUpdatedAt = sourceUpdatedAt,
    spice = spice,
    sugarContent = sugarContent,
    sweetness = sweetness,
    tannins = tannins,
    taste = taste,
    vintage = vintage,
    productId = productId
)
