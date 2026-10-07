package no.isys.wineforall.model

import jakarta.persistence.*
import org.hibernate.annotations.DynamicUpdate

// Vinmonopolet products in stock at one or more of the stores VinmonopoletStockCheckJob lists, from
// those stores' listings. Each store's stock of them is in vmp_store_stock; a product that sells out at
// all of the stores is deleted.
// @DynamicUpdate: the nightly refresh only writes the columns that changed.
@Entity
@DynamicUpdate
@Table(name = "vmp_products")
class VmpProduct(
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
    var vintage: Int? = null
)
