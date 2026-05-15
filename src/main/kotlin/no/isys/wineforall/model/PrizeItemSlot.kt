package no.isys.wineforall.model

import jakarta.persistence.*

@Entity
@Table(name = "prize_item_slots")
class PrizeItemSlot(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prize_id", nullable = false)
    val prize: LotteryPrize,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inventory_item_id", nullable = false)
    val inventoryItem: InventoryItem,

    @Column(nullable = false)
    val quantity: Int = 1
)
