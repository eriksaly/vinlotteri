package no.isys.wineforall.model

import jakarta.persistence.*
import org.hibernate.annotations.DynamicUpdate
import java.time.Instant

// Vinmonopolet products in stock at Horten Sjøsiden, from the store listing fetched by
// VinmonopoletStockCheckJob. Each check replaces the table, so a product that sells out disappears.
// @DynamicUpdate: the nightly refresh only writes the columns that changed.
@Entity
@DynamicUpdate
@Table(name = "vmp_horten_products")
class VmpHortenProduct(
    // Vinmonopolet varenummer
    @Id
    val productId: String,

    @Column(nullable = false)
    var name: String,

    var price: Double? = null,
    var mainCategory: String? = null,
    // Vinmonopolet's search codes, e.g. "rødvin" and "brennevin_whisky"
    var mainCategoryCode: String? = null,
    var mainSubCategory: String? = null,
    var mainSubCategoryCode: String? = null,
    var country: String? = null,
    // Litres
    var volume: Double? = null,
    // Percent
    var alcohol: Double? = null,
    var productSelection: String? = null,
    var url: String? = null,
    // From the end of the product name; null for non-vintage products
    var vintage: Int? = null,

    // Bottles in the store; null if Vinmonopolet's availability text couldn't be read
    var hortenStock: Int? = null,

    @Column(nullable = false)
    var stockCheckedAt: Instant
)
