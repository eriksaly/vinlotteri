package no.isys.wineforall.model

import java.time.Instant

// Vinmonopolet products in stock at Horten Sjøsiden, from the store listing fetched by
// VinmonopoletStockCheckJob. Each check replaces the table, so a product that sells out disappears.
data class VmpHortenProduct(
    // Vinmonopolet varenummer
    val productId: String,

    val name: String,

    val price: Double? = null,
    val mainCategory: String? = null,
    // Vinmonopolet's search codes, e.g. "rødvin" and "brennevin_whisky"
    val mainCategoryCode: String? = null,
    val mainSubCategory: String? = null,
    val mainSubCategoryCode: String? = null,
    val country: String? = null,
    // Litres
    val volume: Double? = null,
    // Percent
    val alcohol: Double? = null,
    val productSelection: String? = null,
    val url: String? = null,
    // From the end of the product name; null for non-vintage products
    val vintage: Int? = null,

    // Bottles in the store; null if Vinmonopolet's availability text couldn't be read
    val hortenStock: Int? = null,

    val stockCheckedAt: Instant
)
