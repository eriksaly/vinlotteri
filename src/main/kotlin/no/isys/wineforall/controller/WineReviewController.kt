package no.isys.wineforall.controller

import no.isys.wineforall.dto.VmpStoreDto
import no.isys.wineforall.dto.WineProductDetailDto
import no.isys.wineforall.dto.WineProductDto
import no.isys.wineforall.dto.WineReviewDto
import no.isys.wineforall.service.VmpStockService
import no.isys.wineforall.service.WineReviewService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

// VG's wine reviews, for every logged-in user. Syncing from VG stays admin-only, in AdminController.
@RestController
@RequestMapping("/api/wine-reviews")
class WineReviewController(
    private val wineReviewService: WineReviewService,
    private val vmpStockService: VmpStockService
) {

    @GetMapping("/products")
    fun getProducts(): List<WineProductDto> = wineReviewService.getProducts()

    @GetMapping("/products/{productId}")
    fun getProduct(@PathVariable productId: String): ResponseEntity<WineProductDetailDto> {
        val product = wineReviewService.getProduct(productId)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(product)
    }

    @GetMapping("/products/{productId}/reviews")
    fun getReviews(@PathVariable productId: String): List<WineReviewDto> = wineReviewService.getReviews(productId)

    // The stores in the products' storeStock
    @GetMapping("/stores")
    fun getStores(): List<VmpStoreDto> = vmpStockService.getStores()

    // Ids of the products whose reviews contain every word in `text`
    @GetMapping("/search")
    fun search(@RequestParam text: String): List<String> = wineReviewService.searchReviewText(text)
}
