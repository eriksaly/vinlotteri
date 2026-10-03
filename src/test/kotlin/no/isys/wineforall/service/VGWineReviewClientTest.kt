package no.isys.wineforall.service

import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient
import java.time.Instant
import kotlin.test.assertEquals
import kotlin.test.assertNull

class VGWineReviewClientTest {

    private val client = VGWineReviewClient(RestClient.builder())
    private val json = javaClass.getResource("/vg/wines-sample.json")!!.readText()

    @Test
    fun `parses a full review`() {
        val review = client.parse(json).first { it.id == 1752L }

        assertEquals("18729301", review.productId)
        assertEquals("P. A. Larsen Rioja", review.productShortName)
        assertEquals("Rødvin", review.productTypeName)
        assertEquals("Spania", review.country)
        assertEquals("Rioja", review.regionDetailed)
        assertEquals(174.9, review.priceNum)
        assertEquals(87, review.scoreNum)
        assertEquals(6, review.gradeNum)
        assertEquals(2022, review.vintage)
        assertEquals(14.0, review.alcoholLevel)
        assertEquals(233.2, review.salesPricePrLiter)
        assertEquals("0pP2Gg", review.article)
        assertEquals(Instant.parse("2026-09-29T17:50:39.033Z"), review.createdAt)
        assertEquals(listOf(300, 400, 500), review.image?.urls?.map { it.width })
    }

    @Test
    fun `parses a review with missing product data`() {
        val review = client.parse(json).first { it.id == 1026L }

        assertEquals("16376301", review.productId)
        assertEquals(87, review.scoreNum)
        assertNull(review.productShortName)
        assertNull(review.productTypeName)
        assertNull(review.priceNum)
        assertNull(review.vintage)
    }

    @Test
    fun `parses integer prices as doubles`() {
        val review = client.parse(json).first { it.id == 1077L }

        assertEquals(650.0, review.priceNum)
    }
}
