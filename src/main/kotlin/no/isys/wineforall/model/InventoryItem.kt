package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "inventory_items")
class InventoryItem(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    val vinmonopoletCode: String,

    @Column(nullable = false)
    var name: String,

    @Column(nullable = false)
    var price: Double,

    @Column(nullable = false)
    var category: String,

    @Column(nullable = false)
    var quantity: Int = 1,

    @Column(nullable = false)
    var country: String = "",

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
