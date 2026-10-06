package no.isys.wineforall.repository

import no.isys.wineforall.model.VGReview
import org.jetbrains.exposed.v1.core.JoinType
import org.jetbrains.exposed.v1.core.LikePattern
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.alias
import org.jetbrains.exposed.v1.core.count
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.like
import org.jetbrains.exposed.v1.core.lowerCase
import org.jetbrains.exposed.v1.core.max
import org.jetbrains.exposed.v1.core.or
import org.jetbrains.exposed.v1.core.statements.UpdateBuilder
import org.jetbrains.exposed.v1.core.wrapAsExpression
import org.jetbrains.exposed.v1.jdbc.batchInsert
import org.jetbrains.exposed.v1.jdbc.select
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional
import java.time.Instant

@Repository
@Transactional
class VGReviewRepository {

    fun count(): Int = VgReviews.selectAll().count().toInt()

    fun findAll(): List<VGReview> =
        VgReviews.selectAll().orderBy(VgReviews.id).map { it.toVGReview() }

    fun findAllByProductId(productId: String): List<VGReview> =
        VgReviews.selectAll()
            .where { VgReviews.productId eq productId }
            .orderBy(VgReviews.reviewedAt, SortOrder.DESC)
            .map { it.toVGReview() }

    // Products with a review whose headline or text matches a lower-case LIKE pattern, with '!' as escape
    fun findProductIdsWithReviewText(pattern: String): List<String> {
        val like = LikePattern(pattern, escapeChar = '!')
        return VgReviews.select(VgReviews.productId)
            .where { (VgReviews.authorDescription.lowerCase() like like) or (VgReviews.lead.lowerCase() like like) }
            .withDistinct()
            .map { it[VgReviews.productId] }
    }

    // One row per product with its most recent review and review count, for the product list. Selects
    // only the columns the list shows, so the review texts aren't loaded.
    fun findProductSummaries(): List<VGProductSummary> {
        val p = VgProducts
        val r = VgReviews
        val other = VgReviews.alias("other")
        val reviewCount = wrapAsExpression<Long>(
            other.select(other[VgReviews.id].count()).where { other[VgReviews.productId] eq p.productId }
        )
        val latestReviewId = wrapAsExpression<Long>(
            other.select(other[VgReviews.id].max()).where { other[VgReviews.productId] eq p.productId }
        )
        return r.join(p, JoinType.INNER, r.productId, p.productId)
            .select(
                p.productId, p.productShortName, p.productTypeName, p.subProductTypeName, p.country,
                p.regionDetailed, p.volume, p.price, p.vmpPrice, p.vmpVintage, p.discontinued,
                r.score, r.grade, r.vintage, r.reviewedAt, reviewCount
            )
            .where { r.id eq latestReviewId }
            .map { row ->
                VGProductSummary(
                    productId = row[p.productId],
                    productShortName = row[p.productShortName],
                    productTypeName = row[p.productTypeName],
                    subProductTypeName = row[p.subProductTypeName],
                    country = row[p.country],
                    regionDetailed = row[p.regionDetailed],
                    volume = row[p.volume],
                    price = row[p.price],
                    vmpPrice = row[p.vmpPrice],
                    vmpVintage = row[p.vmpVintage],
                    discontinued = row[p.discontinued],
                    score = row[r.score],
                    grade = row[r.grade],
                    vintage = row[r.vintage],
                    reviewedAt = row[r.reviewedAt],
                    reviewCount = row[reviewCount]!!.toInt()
                )
            }
    }

    fun insertAll(reviews: List<VGReview>) {
        VgReviews.batchInsert(reviews, shouldReturnGeneratedValues = false) { review ->
            this[VgReviews.id] = review.id
            setFields(review)
        }
    }

    // Writes every field of each review
    fun updateAll(reviews: List<VGReview>) {
        reviews.forEach { review ->
            VgReviews.update({ VgReviews.id eq review.id }) { it.setFields(review) }
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

// Every field but the id
private fun UpdateBuilder<*>.setFields(r: VGReview) {
    this[VgReviews.productId] = r.productId
    this[VgReviews.vintage] = r.vintage
    this[VgReviews.score] = r.score
    this[VgReviews.grade] = r.grade
    this[VgReviews.lead] = r.lead
    this[VgReviews.authorDescription] = r.authorDescription
    this[VgReviews.article] = r.article
    this[VgReviews.price] = r.price
    this[VgReviews.salesPricePerLiter] = r.salesPricePerLiter
    this[VgReviews.pricePerScore] = r.pricePerScore
    this[VgReviews.alcoholLevel] = r.alcoholLevel
    this[VgReviews.sugarContent] = r.sugarContent
    this[VgReviews.colour] = r.colour
    this[VgReviews.odour] = r.odour
    this[VgReviews.taste] = r.taste
    this[VgReviews.freshness] = r.freshness
    this[VgReviews.fullness] = r.fullness
    this[VgReviews.bitterness] = r.bitterness
    this[VgReviews.sweetness] = r.sweetness
    this[VgReviews.tannins] = r.tannins
    this[VgReviews.barrel] = r.barrel
    this[VgReviews.spice] = r.spice
    this[VgReviews.fruit] = r.fruit
    this[VgReviews.imageUrl] = r.imageUrl
    this[VgReviews.reviewedAt] = r.reviewedAt
    this[VgReviews.sourceUpdatedAt] = r.sourceUpdatedAt
    this[VgReviews.createdAt] = r.createdAt
}

private fun ResultRow.toVGReview() = VGReview(
    id = this[VgReviews.id],
    productId = this[VgReviews.productId],
    vintage = this[VgReviews.vintage],
    score = this[VgReviews.score],
    grade = this[VgReviews.grade],
    lead = this[VgReviews.lead],
    authorDescription = this[VgReviews.authorDescription],
    article = this[VgReviews.article],
    price = this[VgReviews.price],
    salesPricePerLiter = this[VgReviews.salesPricePerLiter],
    pricePerScore = this[VgReviews.pricePerScore],
    alcoholLevel = this[VgReviews.alcoholLevel],
    sugarContent = this[VgReviews.sugarContent],
    colour = this[VgReviews.colour],
    odour = this[VgReviews.odour],
    taste = this[VgReviews.taste],
    freshness = this[VgReviews.freshness],
    fullness = this[VgReviews.fullness],
    bitterness = this[VgReviews.bitterness],
    sweetness = this[VgReviews.sweetness],
    tannins = this[VgReviews.tannins],
    barrel = this[VgReviews.barrel],
    spice = this[VgReviews.spice],
    fruit = this[VgReviews.fruit],
    imageUrl = this[VgReviews.imageUrl],
    reviewedAt = this[VgReviews.reviewedAt],
    sourceUpdatedAt = this[VgReviews.sourceUpdatedAt],
    createdAt = this[VgReviews.createdAt]
)
