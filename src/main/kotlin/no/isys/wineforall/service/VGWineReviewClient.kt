package no.isys.wineforall.service

import org.slf4j.LoggerFactory
import org.springframework.stereotype.Service
import org.springframework.web.client.RestClient
import tools.jackson.databind.DeserializationFeature
import tools.jackson.databind.PropertyNamingStrategies
import tools.jackson.module.kotlin.jacksonMapperBuilder
import tools.jackson.module.kotlin.readValue
import java.time.Instant

// Client for VG's wine review feed (the data behind vg.no/vin)
@Service
class VGWineReviewClient(restClientBuilder: RestClient.Builder) {

    private val log = LoggerFactory.getLogger(VGWineReviewClient::class.java)
    private val baseUrl = "https://api.vg.no/insanity-cms/wines"
    private val pageSize = 200
    // Timeouts come from spring.http.clients.* in application.yaml
    private val client = restClientBuilder.build()
    private val objectMapper = jacksonMapperBuilder()
        .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
        .build()

    // The feed is ordered newest first. A review published mid-sync shifts the offsets by one,
    // which can return the same review on two pages, so reviews are de-duplicated by id.
    fun fetchAll(): List<VGWineReview> {
        val byId = linkedMapOf<Long, VGWineReview>()
        var skip = 0
        while (true) {
            val page = fetchPage(skip)
            val before = byId.size
            page.forEach { byId.putIfAbsent(it.id, it) }
            // A page with nothing new means the feed is not advancing; stop rather than loop forever
            if (page.size < pageSize || byId.size == before) break
            skip += pageSize
        }
        return byId.values.toList()
    }

    private fun fetchPage(skip: Int): List<VGWineReview> {
        val url = "$baseUrl?skip=$skip&take=$pageSize"
        log.info("Fetching: {}", url)
        val raw = client.get()
            .uri(url)
            .header("Accept", "application/json")
            .retrieve()
            .body(String::class.java) ?: return emptyList()
        return parse(raw)
    }

    fun parse(json: String): List<VGWineReview> = objectMapper.readValue(json)

    data class VGWineReview(
        val id: Long,
        val productId: String,
        val createdAt: Instant,
        val updatedAt: Instant,
        val scoreNum: Int,
        val gradeNum: Int,
        val vintage: Int? = null,
        val lead: String? = null,
        val authorDescription: String? = null,
        val article: String? = null,
        val productShortName: String? = null,
        val productTypeName: String? = null,
        val subProductTypeName: String? = null,
        val mainProductTypeName: String? = null,
        val productGroupName: String? = null,
        val country: String? = null,
        val regionDetailed: String? = null,
        val subRegion: String? = null,
        val origin: String? = null,
        val grape: String? = null,
        val priceNum: Double? = null,
        val salesPricePrLiter: Double? = null,
        val pricePerScore: Double? = null,
        val volume: Double? = null,
        val volumeType: String? = null,
        val packagingMaterial: String? = null,
        val corkType: String? = null,
        val orderType: String? = null,
        val alcoholLevel: Double? = null,
        val sugarContent: String? = null,
        val colour: String? = null,
        val odour: String? = null,
        val taste: String? = null,
        val freshness: Int? = null,
        val fullness: Int? = null,
        val bitterness: Int? = null,
        val sweetness: Int? = null,
        val tannins: Int? = null,
        val barrel: Int? = null,
        val spice: Int? = null,
        val fruit: Int? = null,
        val image: VGImage? = null
    )

    // VG serves the same image pre-scaled to widths 100–2000
    data class VGImage(val urls: List<VGImageUrl> = emptyList())
    data class VGImageUrl(val url: String, val width: Int)
}
