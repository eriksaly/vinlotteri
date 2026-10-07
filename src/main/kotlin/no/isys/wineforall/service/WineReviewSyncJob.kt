package no.isys.wineforall.service

import no.isys.wineforall.dto.WineReviewSyncResultDto
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.core.annotation.Order
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.concurrent.atomic.AtomicBoolean

// Mirrors VG's wine reviews into vg_products / vg_reviews. Each run pulls the full feed
// (~1,300 reviews, a handful of requests), so reviews VG edits after publishing are picked up too.
@Component
class WineReviewSyncJob(
    private val client: VGWineReviewClient,
    private val wineReviewService: WineReviewService,
    private val taskScheduler: TaskScheduler,
    @Value("\${app.background-jobs.enabled}") private val enabled: Boolean
) {

    private val log = LoggerFactory.getLogger(WineReviewSyncJob::class.java)
    private val running = AtomicBoolean(false)

    // Initial import: the first start against an empty database pulls in everything VG has published.
    // Runs on the scheduler so it doesn't hold up startup. Ordered before VinmonopoletStockCheckJob's
    // startup check; that check fetches the store listings for a quarter of an hour before it reads the
    // VG products, and this import takes seconds.
    @EventListener(ApplicationReadyEvent::class)
    @Order(1)
    fun syncIfEmpty() {
        if (!enabled || wineReviewService.hasReviews()) return
        log.info("No wine reviews stored yet, starting initial sync")
        taskScheduler.schedule({ syncLogged() }, Instant.now())
    }

    // VG publishes in the evening; syncing at night lets the stock check at 03:30 cover new products
    @Scheduled(cron = "0 0 3 * * *", zone = "Europe/Oslo")
    fun dailySync() {
        if (enabled) syncLogged()
    }

    // Returns null if a sync is already in progress
    fun sync(): WineReviewSyncResultDto? {
        if (!running.compareAndSet(false, true)) return null
        try {
            val records = client.fetchAll()
            val result = wineReviewService.upsert(records)
            log.info(
                "Wine review sync done: fetched={} newReviews={} updatedReviews={} newProducts={}",
                result.fetchedReviews, result.newReviews, result.updatedReviews, result.newProducts
            )
            return result
        } finally {
            running.set(false)
        }
    }

    private fun syncLogged() {
        try {
            if (sync() == null) log.info("Wine review sync already in progress, skipping")
        } catch (e: Exception) {
            log.error("Wine review sync failed", e)
        }
    }
}
