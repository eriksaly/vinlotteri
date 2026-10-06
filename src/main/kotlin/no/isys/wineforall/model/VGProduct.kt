package no.isys.wineforall.model

import java.time.Instant

// One row per Vinmonopolet product VG has reviewed. VG reviews each vintage separately, but Vinmonopolet
// sells all vintages under the same varenummer, so the catalogue fields here mirror the most recent review.
data class VGProduct(
    // Vinmonopolet varenummer
    val productId: String,

    val productShortName: String? = null,
    val productTypeName: String? = null,
    val subProductTypeName: String? = null,
    val mainProductTypeName: String? = null,
    val productGroupName: String? = null,
    val country: String? = null,
    val regionDetailed: String? = null,
    val subRegion: String? = null,
    val origin: String? = null,
    val grape: String? = null,
    val price: Double? = null,
    val salesPricePerLiter: Double? = null,
    val volume: Double? = null,
    val volumeType: String? = null,
    val packagingMaterial: String? = null,
    val corkType: String? = null,
    val orderType: String? = null,

    // Set by VinmonopoletStockCheckJob: Vinmonopolet lists the product as "Utgått", or doesn't know it
    val discontinued: Boolean = false,

    // Vinmonopolet's price and vintage at the last discontinued check. `price` above is VG's, from the time
    // of the review; the reviewed vintage is on each review.
    val vmpPrice: Double? = null,
    val vmpVintage: Int? = null,

    // When the discontinued check last ran for the product, successfully or not
    val statusCheckedAt: Instant? = null,

    val createdAt: Instant = Instant.now()
)
