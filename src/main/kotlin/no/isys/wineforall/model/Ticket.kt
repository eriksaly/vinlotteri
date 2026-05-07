package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "tickets")
class Ticket(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    val ticketNumber: Int,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    val participant: Participant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_id", nullable = false)
    val lottery: Lottery,

    @Column(nullable = false)
    var won: Boolean = false,

    @Column(nullable = false)
    val createdAt: Instant = Instant.now()
)
