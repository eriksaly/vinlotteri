package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "vg_reviews")
class VGReview(
    // VG's review id
    @Id
    val id: Long,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    var product: VGProduct,

    var vintage: Int? = null,

    // Points, 80–100
    @Column(nullable = false)
    var score: Int,

    // Terningkast, 1–6
    @Column(nullable = false)
    var grade: Int,

    var lead: String? = null,

    @Column(columnDefinition = "TEXT")
    var authorDescription: String? = null,

    // VG article id or full article URL
    var article: String? = null,

    // Price at the time of the review
    var price: Double? = null,
    var salesPricePerLiter: Double? = null,
    var pricePerScore: Double? = null,

    var alcoholLevel: Double? = null,
    var sugarContent: String? = null,
    var colour: String? = null,
    var odour: String? = null,
    var taste: String? = null,
    var freshness: Int? = null,
    var fullness: Int? = null,
    var bitterness: Int? = null,
    var sweetness: Int? = null,
    var tannins: Int? = null,
    var barrel: Int? = null,
    var spice: Int? = null,
    var fruit: Int? = null,

    @Column(length = 500)
    var imageUrl: String? = null,

    // created_at / updated_at as reported by VG
    @Column(nullable = false)
    var reviewedAt: Instant,

    @Column(nullable = false)
    var sourceUpdatedAt: Instant,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
