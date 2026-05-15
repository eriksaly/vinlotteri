package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "lottery_prizes", uniqueConstraints = [UniqueConstraint(columnNames = ["lottery_id", "position"])])
class LotteryPrize(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_id", nullable = false)
    val lottery: Lottery,

    @Column(nullable = false)
    val position: Int,

    @OneToMany(mappedBy = "prize", cascade = [CascadeType.ALL], orphanRemoval = true, fetch = FetchType.LAZY)
    var slots: MutableList<PrizeItemSlot> = mutableListOf(),

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
