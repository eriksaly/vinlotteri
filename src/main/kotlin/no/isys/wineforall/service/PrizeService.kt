package no.isys.wineforall.service

import no.isys.wineforall.dto.AssignPrizeItemsRequest
import no.isys.wineforall.dto.LotteryPrizeDto
import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryPrize
import no.isys.wineforall.model.LotteryStatus
import no.isys.wineforall.model.PrizeItemSlot
import no.isys.wineforall.model.Winner
import no.isys.wineforall.repository.InventoryItemRepository
import no.isys.wineforall.repository.LotteryPrizeRepository
import no.isys.wineforall.repository.LotteryRepository
import no.isys.wineforall.repository.VGRating
import no.isys.wineforall.repository.WinnerRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class PrizeService(
    private val prizeRepo: LotteryPrizeRepository,
    private val lotteryRepo: LotteryRepository,
    private val inventoryRepo: InventoryItemRepository,
    private val winnerRepo: WinnerRepository,
    private val inventoryService: InventoryService
) {

    fun getPrizesForCurrentLottery(): List<LotteryPrizeDto> {
        val lottery = getCurrentActiveOrDrawingLottery() ?: return emptyList()
        val winners = winnerRepo.findAllByLotteryWithPrizeOrderByPosition(lottery)
        return prizeRepo.findAllByLotteryOrderByPosition(lottery).toDtos(winners)
    }

    @Transactional
    fun setPrizeSlots(count: Int): List<LotteryPrizeDto> {
        require(count in 1..100) { "Antall premier må være mellom 1 og 100" }
        val lottery = getCurrentActiveOrDrawingLottery() ?: error("Ingen aktiv lotteri")
        val existing = prizeRepo.findAllByLotteryOrderByPosition(lottery)

        when {
            count > existing.size -> {
                val newSlots = ((existing.size + 1)..count).map { pos ->
                    LotteryPrize(lottery = lottery, position = pos)
                }
                prizeRepo.saveAll(newSlots)
            }
            count < existing.size -> {
                val winners = winnerRepo.findAllByLotteryWithPrizeOrderByPosition(lottery)
                val wonPositions = winners.mapNotNull { it.prize?.position }.toSet()
                val toRemove = existing
                    .filter { it.position > count && it.position !in wonPositions }
                    .sortedByDescending { it.position }
                prizeRepo.deleteAll(toRemove)
            }
        }

        lottery.wineCount = count
        lotteryRepo.save(lottery)

        val winners = winnerRepo.findAllByLotteryWithPrizeOrderByPosition(lottery)
        return prizeRepo.findAllByLotteryOrderByPosition(lottery).toDtos(winners)
    }

    @Transactional
    fun assignItems(position: Int, req: AssignPrizeItemsRequest): LotteryPrizeDto {
        val lottery = getCurrentActiveOrDrawingLottery() ?: error("Ingen aktiv lotteri")
        val prize = prizeRepo.findByLotteryAndPosition(lottery, position)
            ?: error("Premie #$position finnes ikke")

        // Count how many times each ID appears (allows same item multiple times)
        val countById = req.inventoryItemIds.groupingBy { it }.eachCount()
        val items = inventoryRepo.findAllById(countById.keys)

        prize.slots.clear()
        items.forEach { item ->
            prize.slots.add(PrizeItemSlot(prize = prize, inventoryItem = item, quantity = countById[item.id] ?: 1))
        }
        prizeRepo.save(prize)
        val winners = winnerRepo.findAllByLotteryWithPrizeOrderByPosition(lottery)
        return listOf(prize).toDtos(winners).single()
    }

    fun getPrizeAtPosition(lottery: Lottery, position: Int): LotteryPrize? =
        prizeRepo.findByLotteryAndPosition(lottery, position)

    private fun getCurrentActiveOrDrawingLottery(): Lottery? =
        lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.OPEN)
            ?: lotteryRepo.findFirstByStatusOrderByCreatedAtDesc(LotteryStatus.DRAWING)

    // Looks up VG's ratings for all the prizes' items in one query
    private fun List<LotteryPrize>.toDtos(winners: List<Winner>): List<LotteryPrizeDto> {
        val ratings = inventoryService.getVGRatings(flatMap { prize -> prize.slots.map { it.inventoryItem } })
        return map { it.toDto(winners, ratings) }
    }

    private fun LotteryPrize.toDto(winners: List<Winner>, ratings: Map<String, VGRating>): LotteryPrizeDto {
        val winnerId = winners.find { it.prize?.id == this.id }?.id
        return LotteryPrizeDto(
            id = id,
            position = position,
            items = slots.flatMap { slot ->
                val rating = ratings[slot.inventoryItem.vinmonopoletCode]
                List(slot.quantity) { with(inventoryService) { slot.inventoryItem.toDto(rating = rating) } }
            },
            winnerId = winnerId
        )
    }
}
