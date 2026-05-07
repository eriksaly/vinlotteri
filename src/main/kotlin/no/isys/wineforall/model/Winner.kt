package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

@Entity
@Table(name = "winners")
class Winner(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ticket_id", nullable = false)
    val ticket: Ticket,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    val participant: Participant,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lottery_id", nullable = false)
    val lottery: Lottery,

    @Column(nullable = false)
    val position: Int,

    @Column(nullable = false)
    val drawnAt: Instant = Instant.now()
)
