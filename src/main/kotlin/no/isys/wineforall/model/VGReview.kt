package no.isys.wineforall.model

import java.time.Instant

data class VGReview(
    // VG's review id
    val id: Long,

    val productId: String,

    val vintage: Int? = null,

    // Points, 80–100
    val score: Int,

    // Terningkast, 1–6
    val grade: Int,

    val lead: String? = null,
    val authorDescription: String? = null,

    // VG article id or full article URL
    val article: String? = null,

    // Price at the time of the review
    val price: Double? = null,
    val salesPricePerLiter: Double? = null,
    val pricePerScore: Double? = null,

    val alcoholLevel: Double? = null,
    val sugarContent: String? = null,
    val colour: String? = null,
    val odour: String? = null,
    val taste: String? = null,
    val freshness: Int? = null,
    val fullness: Int? = null,
    val bitterness: Int? = null,
    val sweetness: Int? = null,
    val tannins: Int? = null,
    val barrel: Int? = null,
    val spice: Int? = null,
    val fruit: Int? = null,

    val imageUrl: String? = null,

    // created_at / updated_at as reported by VG
    val reviewedAt: Instant,
    val sourceUpdatedAt: Instant,

    val createdAt: Instant = Instant.now()
)
