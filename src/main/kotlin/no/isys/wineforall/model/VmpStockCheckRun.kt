package no.isys.wineforall.model

import jakarta.persistence.*
import java.time.Instant

// A run of VinmonopoletStockCheckJob. One without finishedAt was cut off by a restart or deploy, and the
// next startup resumes it.
@Entity
@Table(name = "vmp_stock_check_runs")
class VmpStockCheckRun(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long = 0,

    @Column(nullable = false)
    val startedAt: Instant,

    // When it ended, whether done or given up
    var finishedAt: Instant? = null
)
