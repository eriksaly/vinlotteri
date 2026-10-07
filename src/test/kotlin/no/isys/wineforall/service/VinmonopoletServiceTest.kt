package no.isys.wineforall.service

import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class VinmonopoletServiceTest {

    private val service = VinmonopoletService(RestClient.builder())

    private val storeStockPage = javaClass.getResource("/vmp/store-stock-page.json")!!.readText()

    @Test
    fun `parses a page of a store stock listing`() {
        val page = service.parseStoreStockPage(storeStockPage)

        assertEquals(listOf("237", "233", "398"), page.storeIds)
        assertEquals(91, page.totalPages)
        assertEquals(2168, page.totalResults)
        val red = page.products.first { it.code == "7857701" }
        assertEquals("1000 Stories Bourbon Barrel Aged Zinfandel 2023", red.name)
        assertEquals(184.9, red.price)
        assertEquals("rødvin", red.mainCategoryCode)
        assertEquals("Rødvin", red.mainCategory)
        assertEquals("USA", red.country)
        assertEquals(0.75, red.volume)
        assertEquals(2023, red.vintage)
        assertEquals(mapOf("237" to 18, "233" to 9, "398" to 13), red.stock)
        val spirit = page.products.first { it.code == "19576208" }
        assertEquals("brennevin_akevitt", spirit.mainSubCategoryCode)
        assertEquals(0.5, spirit.volume)
        assertNull(spirit.vintage)
    }

    @Test
    fun `counts only the stores that have bottles in the store`() {
        val products = service.parseStoreStockPage(storeStockPage).products.associateBy { it.code }

        // "Ikke på lager" at Horten and Stokke
        assertEquals(mapOf("233" to 1), products.getValue("13045101").stock)
        // "Utsolgt" at Horten and Stokke
        assertEquals(mapOf("233" to 4), products.getValue("19576208").stock)
    }

    @Test
    fun `leaves out stores it can't read the stock of or didn't filter on`() {
        val json = """
            {"breadcrumbs": [{"facetCode": "availableInStores", "facetValueCode": "237", "facetValueName": "Horten"}],
             "pagination": {"totalPages": 1, "totalResults": 1}, "products": [{
              "code": "1", "name": "Test",
              "productAvailability": {"storesAvailability": {"infos": [
                {"location": "Horten", "availability": "Få igjen"},
                {"location": "Tønsberg", "availability": "5 i butikken"}
              ]}}
            }]}
        """
        assertEquals(emptyMap(), service.parseStoreStockPage(json).products.single().stock)
    }

    @Test
    fun `fails like a bad response when the body isn't JSON`() {
        assertFailsWith<RestClientException> { service.parseStoreStockPage("<html>Service unavailable</html>") }
    }

    @Test
    fun `reads the vintage from the end of the product name`() {
        val names = listOf("Maynard's Colheita 1934", "Taylor's 20 Year Old Tawny", "Kinn Oktoberfest", "Bag in Box 3000")
        val json = names.mapIndexed { i, name -> """{"code": "$i", "name": "$name"}""" }
            .joinToString(prefix = """{"products": [""", postfix = "]}")
        assertEquals(listOf(1934, null, null, null), service.parseStoreStockPage(json).products.map { it.vintage })
    }
}
