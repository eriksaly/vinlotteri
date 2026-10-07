package no.isys.wineforall.service

import no.isys.wineforall.service.VinmonopoletService.StoreProduct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.boot.context.event.ApplicationReadyEvent
import org.springframework.context.event.EventListener
import org.springframework.core.annotation.Order
import org.springframework.http.HttpHeaders
import org.springframework.scheduling.TaskScheduler
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClientException
import java.time.Duration
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.atomic.AtomicBoolean

// Nightly check against Vinmonopolet, in two steps:
// 1. Fetch the listing of everything in stock at the stores in VmpStores, one listing per batch
//    (~7,000 products, 24 per page, ~290 requests), and replace those stores' stock in vmp_store_stock
//    and vmp_products with it.
// 2. Check whether VG-reviewed products that none of those stores have in stock have been discontinued
//    ("Utgått"), and note their current price. One request per product, each product once a week
//    (~700 products).
// Vinmonopolet starts answering 429 after roughly 1,000 requests in 20 minutes, so requests are spaced
// well below that. It runs at night to stay clear of daytime use of the shopping tab, which calls
// Vinmonopolet from the same IP.
@Component
class VinmonopoletStockCheckJob(
    private val vinmonopoletService: VinmonopoletService,
    private val vmpStockService: VmpStockService,
    private val wineReviewService: WineReviewService,
    private val taskScheduler: TaskScheduler,
    @Value("\${app.background-jobs.enabled}") private val enabled: Boolean
) {

    private val log = LoggerFactory.getLogger(VinmonopoletStockCheckJob::class.java)
    private val zone = ZoneId.of("Europe/Oslo")
    private val requestInterval = Duration.ofSeconds(3)
    // Each refusal doubles the interval for the rest of the run, up to this
    private val maxRequestInterval = Duration.ofSeconds(30)
    // Wait after a refusal when Vinmonopolet doesn't say how long (Retry-After)
    private val defaultBackoff = Duration.ofMinutes(10)
    // Give up for the day after this many refusals; the next run resumes with the least recently checked
    private val maxRefusals = 5
    // Give up on the run if this many products in a row fail (e.g. Vinmonopolet is down)
    private val maxConsecutiveFailures = 10
    // A listing this far short of the total Vinmonopolet reports means something went wrong
    private val minListingCoverage = 0.9
    private val running = AtomicBoolean(false)

    // Runs after WineReviewSyncJob's initial import, so there are products to check. The check is
    // slow, so it goes to the scheduler instead of holding up startup.
    @EventListener(ApplicationReadyEvent::class)
    @Order(2)
    fun checkIfNeverRun() {
        if (!enabled || vmpStockService.hasBeenChecked()) return
        log.info("Store stock has never been checked, starting initial check")
        taskScheduler.schedule({ checkLogged() }, Instant.now())
    }

    // Half an hour after the review sync, so newly reviewed products are included
    @Scheduled(cron = "0 30 3 * * *", zone = "Europe/Oslo")
    fun dailyCheck() {
        if (enabled) checkLogged()
    }

    private fun checkLogged() {
        if (!running.compareAndSet(false, true)) {
            log.info("Vinmonopolet stock check already in progress, skipping")
            return
        }
        try {
            checkAll()
        } catch (e: InterruptedException) {
            Thread.currentThread().interrupt()
            log.info("Vinmonopolet stock check interrupted")
        } catch (e: Exception) {
            log.error("Vinmonopolet stock check failed", e)
        } finally {
            running.set(false)
        }
    }

    private fun checkAll() {
        var interval = requestInterval
        var refusals = 0

        // Spaces requests `interval` apart. When Vinmonopolet refuses (429, or 403 from its firewall),
        // waits as long as it asks, slows down for the rest of the run and retries the same request.
        fun <T> throttled(call: () -> T): T {
            while (true) {
                Thread.sleep(interval)
                try {
                    return call()
                } catch (e: HttpClientErrorException) {
                    if (e.statusCode.value() != 429 && e.statusCode.value() != 403) throw e
                    check(++refusals <= maxRefusals) {
                        "Vinmonopolet refused $maxRefusals requests (${e.statusCode}), stopping for today"
                    }
                    val wait = e.responseHeaders?.getFirst(HttpHeaders.RETRY_AFTER)?.toLongOrNull()
                        ?.let { Duration.ofSeconds(it) } ?: defaultBackoff
                    interval = minOf(interval.multipliedBy(2), maxRequestInterval)
                    log.warn(
                        "Vinmonopolet refused request ({}), waiting {} and then slowing to one request per {}",
                        e.statusCode, wait, interval
                    )
                    Thread.sleep(wait)
                }
            }
        }

        VmpStores.batches.forEach { batch ->
            val storeIds = batch.map { it.id }
            updateStoreStock(storeIds) { page -> throttled { vinmonopoletService.getStoreStockPage(storeIds, page) } }
        }
        checkDiscontinued { productId -> throttled { vinmonopoletService.getProductStatus(productId) } }
        log.info("Vinmonopolet stock check done, refusals={}", refusals)
    }

    // Fetches every page before touching the tables, so a failed listing leaves the stores' previous stock
    // in place. Each batch is saved on its own: if a later one fails, the earlier ones keep their update.
    private fun updateStoreStock(storeIds: List<String>, fetchPage: (Int) -> VinmonopoletService.StoreStockPage) {
        val first = fetchPage(0)
        check(first.storeIds.toSet() == storeIds.toSet()) {
            "Asked Vinmonopolet for the stock of stores $storeIds but it applied ${first.storeIds}"
        }
        // Products moving in or out of stock mid-run can shift one onto two pages
        val products = linkedMapOf<String, StoreProduct>()
        first.products.forEach { products.putIfAbsent(it.code, it) }
        for (page in 1 until first.totalPages) {
            fetchPage(page).products.forEach { products.putIfAbsent(it.code, it) }
        }
        // The search can list a product that has since sold out at all of the stores ("Utsolgt")
        val inStock = products.values.filter { it.stock.isNotEmpty() }
        check(first.totalResults > 0 && inStock.size >= first.totalResults * minListingCoverage) {
            "Listing for stores $storeIds has ${inStock.size} products in stock but Vinmonopolet reported ${first.totalResults}, keeping the previous stock"
        }
        val productsPerStore = storeIds.associateWith { id -> inStock.count { id in it.stock } }
        // More likely a store whose availability entries weren't recognised than one that has nothing
        check(productsPerStore.values.all { it > 0 }) {
            "No stock found for some of the stores: $productsPerStore, keeping the previous stock"
        }
        vmpStockService.replaceStores(storeIds, inStock, Instant.now())
        log.info("Stock updated for stores {}: {} products in stock, per store {}", storeIds, inStock.size, productsPerStore)
    }

    private fun checkDiscontinued(fetchStatus: (String) -> VinmonopoletService.ProductStatus?) {
        // Due weekly when last checked a week ago or more. Compared by date, so a product checked
        // at 03:31 isn't a minute short at 03:30 the following week and pushed to the next day.
        val checkedBefore = LocalDate.now(zone).minusDays(6).atStartOfDay(zone).toInstant()
        val productIds = wineReviewService.getProductIdsDueForStatusCheck(checkedBefore)
        log.info("Checking {} products for discontinued status", productIds.size)
        var discontinued = 0
        var failed = 0
        var consecutiveFailures = 0

        productIds.forEach { productId ->
            try {
                val status = fetchStatus(productId)
                // A product Vinmonopolet doesn't know (404) can't be bought there either
                val isDiscontinued = status == null || status.status == "utgatt"
                wineReviewService.recordStatusCheck(productId, isDiscontinued, status?.price, status?.vintage)
                if (isDiscontinued) discontinued++
                consecutiveFailures = 0
            } catch (e: RestClientException) {
                // Includes error responses, timeouts and bodies that aren't the expected JSON
                failed++
                wineReviewService.recordFailedStatusCheck(productId)
                log.warn("Discontinued check failed for product {}: {}", productId, e.message)
                check(++consecutiveFailures < maxConsecutiveFailures) {
                    "$maxConsecutiveFailures products in a row failed, stopping"
                }
            }
        }

        log.info("Discontinued check done: checked={} discontinued={} failed={}", productIds.size, discontinued, failed)
    }
}
