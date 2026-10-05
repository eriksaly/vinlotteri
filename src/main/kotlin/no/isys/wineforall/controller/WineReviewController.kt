package no.isys.wineforall.controller

import no.isys.wineforall.dto.WineProductDto
import no.isys.wineforall.dto.WineReviewDto
import no.isys.wineforall.service.WineReviewService
import org.springframework.web.bind.annotation.*

// VG's wine reviews, for every logged-in user. Syncing from VG stays admin-only, in AdminController.
@RestController
@RequestMapping("/api/wine-reviews")
class WineReviewController(private val wineReviewService: WineReviewService) {

    @GetMapping("/products")
    fun getProducts(): List<WineProductDto> = wineReviewService.getProducts()

    @GetMapping("/products/{productId}/reviews")
    fun getReviews(@PathVariable productId: String): List<WineReviewDto> = wineReviewService.getReviews(productId)

    // Ids of the products whose reviews contain every word in `text`
    @GetMapping("/search")
    fun search(@RequestParam text: String): List<String> = wineReviewService.searchReviewText(text)
}
