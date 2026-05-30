package no.isys.wineforall.controller

import no.isys.wineforall.dto.*
import no.isys.wineforall.model.UserRole
import no.isys.wineforall.repository.AppUserRepository
import no.isys.wineforall.service.DrawingService
import no.isys.wineforall.service.InventoryService
import no.isys.wineforall.service.LotteryService
import no.isys.wineforall.service.PrizeService
import no.isys.wineforall.service.VinmonopoletService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile

@RestController
@RequestMapping("/api/admin")
class AdminController(
    private val lotteryService: LotteryService,
    private val drawingService: DrawingService,
    private val vinmonopoletService: VinmonopoletService,
    private val inventoryService: InventoryService,
    private val prizeService: PrizeService,
    private val userRepository: AppUserRepository
) {

    // --- User management ---

    @GetMapping("/users")
    fun getUsers() = userRepository.findAll().map { u ->
        UserDto(u.id, u.email, u.name, u.role, u.createdAt, u.lastLoginAt)
    }

    @PutMapping("/users/{id}/role")
    fun updateUserRole(@PathVariable id: Long, @RequestBody req: UpdateRoleRequest): UserDto {
        val user = userRepository.findById(id).orElseThrow { IllegalArgumentException("Bruker ikke funnet") }
        user.role = req.role
        val saved = userRepository.save(user)
        return UserDto(saved.id, saved.email, saved.name, saved.role, saved.createdAt, saved.lastLoginAt)
    }

    @DeleteMapping("/users/{id}")
    fun deleteUser(@PathVariable id: Long) {
        userRepository.deleteById(id)
    }

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

    @PutMapping("/buyers/{participantId}")
    fun updateBuyer(
        @PathVariable participantId: Long,
        @RequestBody req: UpdateBuyerRequest
    ) = lotteryService.updateBuyer(participantId, req.quantity)

    @DeleteMapping("/buyers/{participantId}")
    fun removeBuyer(@PathVariable participantId: Long) =
        lotteryService.removeBuyer(participantId)

    // --- Drawing ---

    @PostMapping("/lottery/draw")
    fun drawWinner(): DrawResultDto = drawingService.drawNextWinner()

    @GetMapping("/winners")
    fun getWinners(): List<WinnerDto> = drawingService.getCurrentWinners()

    // --- Shopping suggestions ---

    @GetMapping("/shopping/suggestions")
    fun getShoppingSuggestions(
        @RequestParam(defaultValue = "12") prizeCount: Int,
        @RequestParam(required = false) budgetPerLottery: Int?,
        @RequestParam(defaultValue = "1") lotteryCount: Int,
        @RequestParam(required = false) redCount: Int?,
        @RequestParam(required = false) sparklingCount: Int?,
        @RequestParam(required = false) whiteCount: Int?,
        @RequestParam(required = false) roseCount: Int?,
        @RequestParam(required = false) beerCount: Int?,
        @RequestParam(required = false) spiritsCount: Int?,
    ): ShoppingSuggestionsDto {
        val counts = if (listOf(redCount, sparklingCount, whiteCount, roseCount, beerCount, spiritsCount).any { it != null }) {
            val d = VinmonopoletService.CategoryCounts.fromPrizeCount(prizeCount)
            VinmonopoletService.CategoryCounts(
                red      = redCount      ?: d.red,
                sparkling = sparklingCount ?: d.sparkling,
                white    = whiteCount    ?: d.white,
                rose     = roseCount     ?: d.rose,
                beer     = beerCount     ?: d.beer,
                spirits  = spiritsCount  ?: d.spirits
            )
        } else null
        return vinmonopoletService.getSuggestions(prizeCount, budgetPerLottery, lotteryCount, counts)
    }

    // --- Vinmonopolet product lookup ---

    @GetMapping("/inventory/lookup")
    fun lookupProduct(@RequestParam code: String): ResponseEntity<VinmonopoletProductDto> {
        val product = vinmonopoletService.lookupProduct(code)
            ?: return ResponseEntity.notFound().build()
        return ResponseEntity.ok(product)
    }

    // --- Inventory ---

    @GetMapping("/inventory")
    fun getInventory(): List<InventoryItemDto> = inventoryService.getAll()

    @PostMapping("/inventory")
    fun addInventoryItem(@RequestBody req: CreateInventoryItemRequest): InventoryItemDto =
        inventoryService.create(req)

    @PostMapping("/inventory/bulk")
    fun bulkAddInventoryItems(@RequestBody req: BulkAddInventoryRequest): List<InventoryItemDto> =
        inventoryService.bulkCreate(req)

    @PutMapping("/inventory/{id}")
    fun updateInventoryItem(
        @PathVariable id: Long,
        @RequestBody req: UpdateInventoryItemRequest
    ): InventoryItemDto = inventoryService.update(id, req)

    @DeleteMapping("/inventory/{id}")
    fun deleteInventoryItem(@PathVariable id: Long): ResponseEntity<Void> {
        inventoryService.delete(id)
        return ResponseEntity.noContent().build()
    }

    // --- Prizes ---

    @GetMapping("/lottery/current/prizes")
    fun getCurrentPrizes(): List<LotteryPrizeDto> = prizeService.getPrizesForCurrentLottery()

    @PostMapping("/lottery/current/prizes")
    fun setPrizeSlots(@RequestBody req: SetPrizeSlotsRequest): List<LotteryPrizeDto> =
        prizeService.setPrizeSlots(req.count)

    @PutMapping("/lottery/current/prizes/{position}")
    fun assignPrizeItems(
        @PathVariable position: Int,
        @RequestBody req: AssignPrizeItemsRequest
    ): LotteryPrizeDto = prizeService.assignItems(position, req)
}
