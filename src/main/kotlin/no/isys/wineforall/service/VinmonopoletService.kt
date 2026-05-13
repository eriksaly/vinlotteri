package no.isys.wineforall.service

import com.fasterxml.jackson.annotation.JsonProperty
import no.isys.wineforall.dto.ShoppingSuggestionsDto
import no.isys.wineforall.dto.VinmonopoletProductDto
import tools.jackson.databind.DeserializationFeature
import tools.jackson.databind.json.JsonMapper
import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import java.net.URI
import java.net.URLEncoder
import java.nio.charset.StandardCharsets

@Service
class VinmonopoletService {

    private val log = LoggerFactory.getLogger(VinmonopoletService::class.java)
    private val baseUrl = "https://www.vinmonopolet.no/vmpws/v2/vmp"
    // Coordinates for Vinmonopolet Horten Sjøsiden
    private val storeLat = "59.417084"
    private val storeLon = "10.4832128"
    private val client = RestClient.create()
    private val objectMapper = JsonMapper.builder()
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .build()


    // Spirits weights: Likør 50% · Whisky 20% · Gin 20% · Akevitt 10%
    private val spiritsVariants = listOf(
        "brennevin_likør"         to "Likør",         // 50 %
        "brennevin_likør"         to "Likør",
        "brennevin_likør"         to "Likør",
        "brennevin_likør"         to "Likør",
        "brennevin_likør"         to "Likør",
        "brennevin_whisky"        to "Whisky",        // 20%
        "brennevin_whisky"        to "Whisky",
        "brennevin_gin"           to "Gin",           // 20%
        "brennevin_gin"           to "Gin",
        "brennevin_akevitt"       to "Akevitt",       // 10%
    )

    fun getSuggestions(prizeCount: Int, budgetPerLottery: Int?, lotteryCount: Int = 1): ShoppingSuggestionsDto {
        require(prizeCount >= 5) { "Minst 5 premier kreves" }
        require(lotteryCount >= 1) { "Minst 1 trekning kreves" }

        val nReds = prizeCount - 5

        // Fixed quality targets for all non-red categories.
        // Whatever is left after covering these goes entirely to reds.
        val fixedSparkling = 150.0
        val fixedWhite     = 130.0
        val fixedRose      = 120.0
        val fixedBeer      = 60.0   // per bottle, 3 bottles
        val fixedSpirits   = 350.0

        val ranges: CategoryRanges? = budgetPerLottery?.let {
            val reservedCost = fixedSparkling + fixedWhite + fixedRose + (3 * fixedBeer) + fixedSpirits
            val redBudget = (it.toDouble() - reservedCost).coerceAtLeast(50.0 * nReds)
            val redTarget = if (nReds > 0) redBudget / nReds else 0.0
            CategoryRanges(
                red      = redTarget,
                sparkling = fixedSparkling,
                white    = fixedWhite,
                rose     = fixedRose,
                beer     = fixedBeer,
                spirits  = fixedSpirits
            )
        }

        // Fetch wine/beer pools once — same price range for all lotteries.
        // redTrimPool is a lazy fallback for budget trimming: all in-store reds with no price cap,
        // used only when the in-range pool can't cover a small remaining overage.
        val redPool   = fetchPool("rødvin",        ranges?.red,      null)
        val redTrimPool by lazy { fetchProducts("rødvin") }
        val sparkPool = fetchPool("musserende_vin", ranges?.sparkling, null)
        val whitePool = fetchPool("hvitvin",        ranges?.white,    null)
        val rosePool  = fetchPool("rosévin",        ranges?.rose,     null)
        val beerPool  = fetchPool("øl",             ranges?.beer,     null)

        // Spirits: picked per lottery so each gets a different category and bottle.
        // Results cached by subcat to avoid duplicate API calls.
        val spiritsPoolCache = mutableMapOf<String, List<ProductRaw>>()

        // Track product codes already used in this order to avoid duplicates across lotteries.
        val usedCodes = mutableSetOf<String>()

        // Pre-assign spirits categories across all lotteries so repeats are minimised.
        // Likør gets 2 slots per cycle (appears twice before others get a second turn).
        // Other categories get 1 slot each. Weights within each category's slots are
        // preserved from spiritsVariants. When all slots are consumed the cycle resets.
        val spiritsSlots = mapOf("brennevin_likør" to 2)  // others default to 1
        val spiritsAssignments = buildList {
            val remaining = mutableMapOf<String, Int>()
            fun refill() = spiritsVariants.map { it.first }.distinct()
                .forEach { subcat -> remaining[subcat] = spiritsSlots[subcat] ?: 1 }
            refill()
            repeat(lotteryCount) {
                if (remaining.values.all { it == 0 }) refill()
                val available = spiritsVariants.filter { (remaining[it.first] ?: 0) > 0 }
                val pick = available.random()
                remaining[pick.first] = (remaining[pick.first] ?: 1) - 1
                add(pick)
            }
        }

        // Each lottery independently picks its own wine variant and spirits category.
        // Keep raw picks so we can do budget adjustment before converting to DTOs.
        val picked = (1..lotteryCount).mapIndexed { i, _ ->
            val (spiritsSubcat, spiritsLabel) = spiritsAssignments[i]
            log.info("Lottery: sparkling=1 white=1 rose=1 spirits={}", spiritsLabel)
            // Whisky: enforce minimum 350 kr floor to avoid cheap supermarket-tier bottles
            val whiskyMinFloor = if (spiritsSubcat == "brennevin_whisky") 350 else null
            val spiritsPool = spiritsPoolCache.getOrPut(spiritsSubcat) {
                fetchPool("brennevin", ranges?.spirits, spiritsSubcat, minFloor = whiskyMinFloor)
            }
            pickRaw(redPool,     nReds, "Rødvin",         usedCodes) +
            pickRaw(sparkPool,   1,     "Musserende vin", usedCodes) +
            pickRaw(whitePool,   1,     "Hvitvin",        usedCodes) +
            pickRaw(rosePool,    1,     "Rosévin",        usedCodes) +
            pickBeersByCountry(beerPool,                   usedCodes) +
            pickRaw(spiritsPool, 1,     spiritsLabel,     usedCodes)
        }.flatten().toMutableList()

        // Budget trim: if total cost exceeds budget, swap out reds for slightly cheaper
        // alternatives — always picking the closest available price that covers the overage.
        if (budgetPerLottery != null) {
            val totalBudget = budgetPerLottery.toDouble() * lotteryCount
            var totalCost = picked.sumOf { it.raw.price?.value ?: 0.0 }
            val pickedCodes = picked.map { it.raw.code }.toMutableSet()

            while (totalCost > totalBudget) {
                // Most expensive picked red is the best candidate to swap
                val candidate = picked
                    .filter { it.category == "Rødvin" }
                    .maxByOrNull { it.raw.price?.value ?: 0.0 } ?: break
                val candidatePrice = candidate.raw.price?.value ?: 0.0
                // Pick the most expensive available red cheaper than the candidate —
                // smallest possible drop each iteration, spreading savings across many bottles.
                // Fall back to the full in-store red catalogue if the price-range pool is exhausted.
                val replacement = (redPool + redTrimPool)
                    .distinctBy { it.code }
                    .filter { it.code !in pickedCodes && (it.price?.value ?: 0.0) < candidatePrice }
                    .maxByOrNull { it.price?.value ?: 0.0 } ?: break // truly exhausted
                val idx = picked.indexOf(candidate)
                picked[idx] = PickedProduct(replacement, "Rødvin")
                pickedCodes.remove(candidate.raw.code)
                pickedCodes.add(replacement.code)
                totalCost -= candidatePrice - (replacement.price?.value ?: 0.0)
                log.info("Budget trim: {} ({} kr) → {} ({} kr), overage now {} kr",
                    candidate.raw.name, candidatePrice,
                    replacement.name, replacement.price?.value,
                    (totalCost - totalBudget).coerceAtLeast(0.0))
            }
        }

        val products = picked.map { (raw, category) ->
            VinmonopoletProductDto(
                code = raw.code ?: "",
                name = raw.name ?: "",
                price = raw.price?.value,
                url = "https://www.vinmonopolet.no${raw.url ?: "/p/${raw.code}"}",
                category = category,
                country = raw.mainCountry?.name ?: ""
            )
        }

        return ShoppingSuggestionsDto(products, prizeCount * lotteryCount)
    }

    // Fetches a pool of in-stock products for a category, optionally filtered by price and subcategory.
    // minFloor enforces an absolute minimum price regardless of the budget-derived target.
    private fun fetchPool(queryCategory: String, target: Double?, subCategory: String?, minFloor: Int? = null): List<ProductRaw> {
        return if (target != null) {
            val min = maxOf((target * 0.9).toInt(), minFloor ?: 0)
            val max = (target * 1.1).toInt()
            val inRange = fetchProducts(queryCategory, min, max, subCategory)
            log.info("category={} priceRange=[{}..{}]: {} products", queryCategory, min, max, inRange.size)
            inRange.ifEmpty {
                log.warn("No products in price range for {}, falling back to floor-only filter", queryCategory)
                fetchProducts(queryCategory, minPrice = minFloor, subCategory = subCategory)
            }
        } else {
            fetchProducts(queryCategory, minPrice = minFloor, subCategory = subCategory)
        }
    }

    private data class PickedProduct(val raw: ProductRaw, val category: String)

    // Picks 3 beers from the same country. Prefers countries with ≥ 3 unused beers.
    // Falls back to any 3 beers if no country has enough.
    private fun pickBeersByCountry(pool: List<ProductRaw>, usedCodes: MutableSet<String>): List<PickedProduct> {
        val fresh = pool.filter { (it.code ?: "") !in usedCodes }
        val byCountry = fresh.groupBy { it.mainCountry?.name?.takeIf { c -> c.isNotBlank() } ?: "Ukjent" }
        val validCountries = byCountry.filter { it.value.size >= 3 }.keys.toList()
        val beers = if (validCountries.isNotEmpty()) {
            byCountry[validCountries.random()]!!.shuffled().take(3)
        } else {
            // No country has 3 fresh beers — fall back to any available
            fresh.shuffled().take(3).ifEmpty { pool.shuffled().take(3) }
        }
        beers.forEach { usedCodes.add(it.code ?: "") }
        return beers.map { PickedProduct(it, "Øl") }
    }

    // Picks count random products from pool, avoiding already-used codes where possible.
    // Falls back to used products if the pool doesn't have enough unique ones.
    private fun pickRaw(pool: List<ProductRaw>, count: Int, category: String, usedCodes: MutableSet<String>): List<PickedProduct> {
        if (count == 0) return emptyList()
        val fresh = pool.filter { (it.code ?: "") !in usedCodes }.shuffled()
        val picked = if (fresh.size >= count) {
            fresh.take(count)
        } else {
            fresh + pool.filter { (it.code ?: "") in usedCodes }.shuffled().take(count - fresh.size)
        }
        picked.forEach { usedCodes.add(it.code ?: "") }
        return picked.map { PickedProduct(it, category) }
    }

    private val storeId = "237" // Vinmonopolet Horten Sjøsiden

    private fun fetchProducts(category: String, minPrice: Int? = null, maxPrice: Int? = null, subCategory: String? = null): List<ProductRaw> {
        // availableInStores MUST come before mainCategory — wrong order returns 0 results
        var q = ":relevance:availableInStores:$storeId:mainCategory:$category"
        if (subCategory != null) q += ":mainSubCategory:$subCategory"
        if (minPrice != null || maxPrice != null) {
            val lo = minPrice ?: 0
            val hi = maxPrice ?: 99999
            q += ":priceValue:(${lo}TO${hi})"
        }
        val encodedQ = URLEncoder.encode(q, StandardCharsets.UTF_8).replace("+", "%20")
        val url = "$baseUrl/products/search?fields=FULL&pageSize=200&currentPage=0&q=$encodedQ&latitude=$storeLat&longitude=$storeLon"
        log.info("Fetching: {}", url)
        return try {
            val raw = client.get()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .retrieve()
                .body(String::class.java) ?: return emptyList()
            val parsed = objectMapper.readValue(raw, SearchResponse::class.java)
            val all = parsed.products ?: emptyList()
            val inStock = all.filter { it.stock?.stockLevelStatus != "outOfStock" && (it.stock?.stockLevel ?: 1) > 0 }
            log.info("Fetched {} products ({} in stock) for category={}", all.size, inStock.size, category)
            inStock
        } catch (e: Exception) {
            log.error("Search failed for category={}: {}", category, e.message)
            emptyList()
        }
    }

    fun fillCart(codes: List<String>): String {
        val cartRaw = client.post()
            .uri(URI.create("$baseUrl/users/anonymous/carts"))
            .header("Accept", "application/json")
            .retrieve()
            .body(String::class.java) ?: throw RuntimeException("Kunne ikke opprette handlevogn")
        val guid = objectMapper.readTree(cartRaw).get("guid")?.asText()
            ?: throw RuntimeException("Mangler guid i respons")
        log.info("Cart created: {}", guid)

        for (code in codes) {
            val body = "code=${URLEncoder.encode(code, StandardCharsets.UTF_8)}&qty=1"
            client.post()
                .uri(URI.create("$baseUrl/users/anonymous/carts/$guid/entries"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json")
                .body(body)
                .retrieve()
                .toBodilessEntity()
            log.info("Added {} to cart {}", code, guid)
        }
        return guid
    }

    data class CategoryRanges(
        val red: Double,
        val sparkling: Double,
        val white: Double,
        val rose: Double,
        val beer: Double,
        val spirits: Double
    )

    fun lookupProduct(code: String): VinmonopoletProductDto? {
        val trimmed = code.trim()
        val encodedQ = URLEncoder.encode(trimmed, StandardCharsets.UTF_8)
        val url = "$baseUrl/products/search?fields=FULL&pageSize=5&currentPage=0&q=$encodedQ&latitude=$storeLat&longitude=$storeLon"
        return try {
            val raw = client.get()
                .uri(URI.create(url))
                .header("Accept", "application/json")
                .retrieve()
                .body(String::class.java) ?: return null
            val parsed = objectMapper.readValue(raw, SearchResponse::class.java)
            val product = (parsed.products ?: emptyList()).firstOrNull { it.code == trimmed }
                ?: parsed.products?.firstOrNull()
                ?: return null
            VinmonopoletProductDto(
                code = product.code ?: return null,
                name = product.name ?: return null,
                price = product.price?.value,
                url = "https://www.vinmonopolet.no${product.url ?: "/p/${product.code}"}",
                category = product.mainSubCategory?.name ?: product.mainCategory?.name ?: "",
                country = product.mainCountry?.name ?: ""
            )
        } catch (e: Exception) {
            log.warn("Product lookup failed for code={}: {}", trimmed, e.message)
            null
        }
    }

    data class SearchResponse(val products: List<ProductRaw>? = null)
    data class ProductRaw(
        val code: String? = null,
        val name: String? = null,
        val url: String? = null,
        val price: PriceRaw? = null,
        val stock: StockRaw? = null,
        @JsonProperty("main_category") val mainCategory: CategoryRaw? = null,
        @JsonProperty("main_sub_category") val mainSubCategory: CategoryRaw? = null,
        @JsonProperty("main_country") val mainCountry: CategoryRaw? = null
    )
    data class CategoryRaw(val name: String? = null, val code: String? = null)
    data class PriceRaw(val value: Double? = null)
    // stock reflects the nearest store (determined by lat/lon); stockLevelStatus "outOfStock" = not in Horten
    data class StockRaw(val stockLevel: Int? = null, val stockLevelStatus: String? = null)
}
