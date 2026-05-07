package no.isys.wineforall.controller

import no.isys.wineforall.dto.LotteryInfoDto
import no.isys.wineforall.service.LotteryService
import org.springframework.http.HttpHeaders
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api")
class PublicController(private val lotteryService: LotteryService) {

    @GetMapping("/lottery/current")
    fun getCurrentLottery(): ResponseEntity<LotteryInfoDto> {
        val info = lotteryService.getCurrentLotteryInfo()
            ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok(info)
    }

    @GetMapping("/statistics")
    fun getAllTimeStatistics() = lotteryService.getAllTimeStatistics()

    @GetMapping("/participants/{id}/photo")
    fun getParticipantPhoto(@PathVariable id: Long): ResponseEntity<ByteArray> {
        val (data, contentType) = lotteryService.getParticipantPhoto(id)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
            .body(data)
    }
}
