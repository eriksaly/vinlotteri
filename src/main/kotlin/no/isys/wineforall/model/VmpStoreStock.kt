package no.isys.wineforall.model

import jakarta.persistence.*
import java.io.Serializable
import java.time.Instant

// Bottles of a product in a Vinmonopolet store, from the store listings fetched by
// VinmonopoletStockCheckJob. Only stores that have the product get a row, and each check replaces a
// store's rows, so a product that sells out at a store disappears from it.
@Entity
@IdClass(VmpStoreStockId::class)
@Table(name = "vmp_store_stock")
class VmpStoreStock(
    // Vinmonopolet's store id, e.g. "237" for Horten
    @Id
    val storeId: String,

    // Vinmonopolet varenummer, see vmp_products
    @Id
    val productId: String,

    // Bottles in the store, always at least 1
    @Column(nullable = false)
    var stock: Int,

    @Column(nullable = false)
    var checkedAt: Instant
)

data class VmpStoreStockId(val storeId: String = "", val productId: String = "") : Serializable
