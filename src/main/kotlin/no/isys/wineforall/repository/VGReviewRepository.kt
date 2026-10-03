package no.isys.wineforall.repository

import no.isys.wineforall.model.VGReview
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.stereotype.Repository
import java.time.Instant

@Repository
interface VGReviewRepository : JpaRepository<VGReview, Long> {

    @Query("SELECT r FROM VGReview r JOIN FETCH r.product")
    fun findAllWithProduct(): List<VGReview>

    @Query("SELECT r FROM VGReview r WHERE r.product.productId = :productId ORDER BY r.reviewedAt DESC")
    fun findAllByProductId(productId: String): List<VGReview>

    // Products with a review whose headline or text matches a lower-case LIKE pattern, with '!' as escape
    @Query(
        """
        SELECT DISTINCT r.product.productId FROM VGReview r
        WHERE LOWER(r.authorDescription) LIKE :pattern ESCAPE '!'
           OR LOWER(r.lead) LIKE :pattern ESCAPE '!'
        """
    )
    fun findProductIdsWithReviewText(pattern: String): List<String>

    // One row per product with its most recent review and review count, for the product list. Selects
    // only the columns the list shows, so the review texts aren't loaded.
    @Query(
        """
        SELECT new no.isys.wineforall.repository.VGProductSummary(
            p.productId, p.productShortName, p.productTypeName, p.subProductTypeName, p.country,
            p.regionDetailed, p.volume, p.price, p.vmpPrice, p.vmpVintage, p.discontinued,
            r.score, r.grade, r.vintage, r.reviewedAt,
            (SELECT COUNT(r2) FROM VGReview r2 WHERE r2.product = p))
        FROM VGReview r JOIN r.product p
        WHERE r.id = (SELECT MAX(r3.id) FROM VGReview r3 WHERE r3.product = p)
        """
    )
    fun findProductSummaries(): List<VGProductSummary>
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
    val reviewCount: Long
)
