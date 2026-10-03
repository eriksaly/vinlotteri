package no.isys.wineforall.model

import jakarta.persistence.*
import org.hibernate.annotations.ColumnDefault
import org.hibernate.annotations.DynamicUpdate
import java.time.Instant

// One row per Vinmonopolet product VG has reviewed. VG reviews each vintage separately, but Vinmonopolet
// sells all vintages under the same varenummer, so the catalogue fields here mirror the most recent review.
// @DynamicUpdate: the review sync and the discontinued check update different columns, so neither
// should write back the other's fields from a stale copy.
@Entity
@DynamicUpdate
@Table(name = "vg_products")
class VGProduct(
    // Vinmonopolet varenummer
    @Id
    val productId: String,

    var productShortName: String? = null,
    var productTypeName: String? = null,
    var subProductTypeName: String? = null,
    var mainProductTypeName: String? = null,
    var productGroupName: String? = null,
    var country: String? = null,
    var regionDetailed: String? = null,
    var subRegion: String? = null,
    var origin: String? = null,
    var grape: String? = null,
    var price: Double? = null,
    var salesPricePerLiter: Double? = null,
    var volume: Double? = null,
    var volumeType: String? = null,
    var packagingMaterial: String? = null,
    var corkType: String? = null,
    var orderType: String? = null,

    // Set by VinmonopoletStockCheckJob: Vinmonopolet lists the product as "Utgått", or doesn't know it
    @ColumnDefault("false")
    @Column(nullable = false)
    var discontinued: Boolean = false,

    // Vinmonopolet's price and vintage at the last discontinued check. `price` above is VG's, from the time
    // of the review; the reviewed vintage is on each review.
    var vmpPrice: Double? = null,
    var vmpVintage: Int? = null,

    // When the discontinued check last ran for the product, successfully or not
    var statusCheckedAt: Instant? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
