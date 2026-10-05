package no.isys.wineforall.service

import org.junit.jupiter.api.Test
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull

class VinmonopoletServiceTest {

    private val service = VinmonopoletService(RestClient.builder())

    @Test
    fun `parses a page of the Horten stock listing`() {
        val page = service.parseHortenStockPage(javaClass.getResource("/vmp/horten-stock-page.json")!!.readText())

        assertEquals(70, page.totalPages)
        assertEquals(1674, page.totalResults)
        val red = page.products.first { it.code == "5705701" }
        assertEquals("Cune Crianza 2021", red.name)
        assertEquals(159.9, red.price)
        assertEquals("rødvin", red.mainCategoryCode)
        assertEquals("Rødvin", red.mainCategory)
        assertEquals("Spania", red.country)
        assertEquals(0.75, red.volume)
        assertEquals(13, red.stockLevel)
        assertEquals(2021, red.vintage)
        val spirit = page.products.first { it.code == "5949101" }
        assertEquals("brennevin_fruktbrennevin", spirit.mainSubCategoryCode)
        assertEquals(0.7, spirit.volume)
        assertEquals(10, spirit.stockLevel)
        assertNull(spirit.vintage)
    }

    @Test
    fun `leaves the stock level empty when the availability text can't be read`() {
        val json = """
            {"pagination": {"totalPages": 1, "totalResults": 1}, "products": [{
              "code": "1", "name": "Test",
              "productAvailability": {"storesAvailability": {"infos": [{"availability": "Få igjen"}]}}
            }]}
        """
        assertNull(service.parseHortenStockPage(json).products.single().stockLevel)
    }

    @Test
    fun `fails like a bad response when the body isn't JSON`() {
        assertFailsWith<RestClientException> { service.parseHortenStockPage("<html>Service unavailable</html>") }
    }

    @Test
    fun `reads the vintage from the end of the product name`() {
        val names = listOf("Maynard's Colheita 1934", "Taylor's 20 Year Old Tawny", "Kinn Oktoberfest", "Bag in Box 3000")
        val json = names.mapIndexed { i, name -> """{"code": "$i", "name": "$name"}""" }
            .joinToString(prefix = """{"products": [""", postfix = "]}")
        assertEquals(listOf(1934, null, null, null), service.parseHortenStockPage(json).products.map { it.vintage })
    }
}
