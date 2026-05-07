package no.isys.wineforall.controller

import no.isys.wineforall.dto.*
import no.isys.wineforall.service.DrawingService
import no.isys.wineforall.service.LotteryService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import java.security.Principal

@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val lotteryService: LotteryService,
    private val drawingService: DrawingService
) {

    @GetMapping("/me")
    fun me(principal: Principal) = mapOf("username" to principal.name)

    // --- Participants ---

    @GetMapping("/participants")
    fun getParticipants() = lotteryService.getAllParticipants()

    @PostMapping("/participants")
    fun createParticipant(@RequestBody req: CreateParticipantRequest): ParticipantDto =
        lotteryService.createParticipant(req.name, req.tag)

    @PutMapping("/participants/{id}")
    fun updateParticipant(
        @PathVariable id: Long,
        @RequestBody req: UpdateParticipantRequest
    ): ParticipantDto = lotteryService.updateParticipant(id, req.name, req.tag)

    @PostMapping("/participants/{id}/photo", consumes = ["multipart/form-data"])
    fun uploadPhoto(
        @PathVariable id: Long,
        @RequestParam("file") file: MultipartFile
    ): ParticipantDto {
        require(!file.isEmpty) { "Filen er tom" }
        require(file.contentType?.startsWith("image/") == true) { "Kun bilder er tillatt" }
        return lotteryService.updateParticipantPhoto(id, file.bytes, file.contentType!!)
    }

    // --- Lottery management ---

    @PostMapping("/lottery")
    fun createLottery(): LotteryInfoDto = lotteryService.createLottery()

    @GetMapping("/lottery/current")
    fun getCurrentLottery(): ResponseEntity<LotteryInfoDto> {
        val info = lotteryService.getCurrentLotteryInfo()
            ?: return ResponseEntity.noContent().build()
        return ResponseEntity.ok(info)
    }

    @PostMapping("/lottery/start-drawing")
    fun startDrawing(@RequestBody req: StartDrawingRequest): LotteryInfoDto =
        lotteryService.startDrawing(req.wineCount)

    @PostMapping("/lottery/finish")
    fun finishLottery(): LotteryInfoDto = lotteryService.finishLottery()

    // --- Buyers ---

    @GetMapping("/buyers")
    fun getBuyers() = lotteryService.getBuyers()

    @PostMapping("/buyers")
    fun addBuyer(@RequestBody req: AddBuyerRequest) =
        lotteryService.addBuyer(req.participantId, req.quantity)

    @DeleteMapping("/buyers/{participantId}")
    fun removeBuyer(@PathVariable participantId: Long) =
        lotteryService.removeBuyer(participantId)

    // --- Drawing ---

    @PostMapping("/lottery/draw")
    fun drawWinner(): DrawResultDto = drawingService.drawNextWinner()

    @GetMapping("/winners")
    fun getWinners(): List<WinnerDto> = drawingService.getCurrentWinners()
}
