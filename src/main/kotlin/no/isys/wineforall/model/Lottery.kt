package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

enum class LotteryStatus { OPEN, DRAWING, CLOSED }

@Entity
@Table(name = "lotteries")
class Lottery(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    var name: String,

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    var status: LotteryStatus = LotteryStatus.OPEN,

    @Column
    var wineCount: Int? = null,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
