package no.isys.wineforall.service

import no.isys.wineforall.dto.BulkAddInventoryRequest
import no.isys.wineforall.dto.CreateInventoryItemRequest
import no.isys.wineforall.dto.InventoryItemDto
import no.isys.wineforall.dto.UpdateInventoryItemRequest
import no.isys.wineforall.model.InventoryItem
import no.isys.wineforall.repository.InventoryItemRepository
import no.isys.wineforall.repository.LotteryPrizeRepository
import no.isys.wineforall.repository.PrizeItemSlotRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

@Service
class InventoryService(
    private val inventoryRepo: InventoryItemRepository,
    private val prizeRepo: LotteryPrizeRepository,
    private val slotRepo: PrizeItemSlotRepository
) {

    fun getAll(): List<InventoryItemDto> {
        val assignedCounts = slotRepo.findAllWithItem()
            .groupBy { it.inventoryItem.id }
            .mapValues { (_, slots) -> slots.sumOf { it.quantity } }
        return inventoryRepo.findAll()
            .sortedBy { it.createdAt }
            .mapNotNull { item ->
                val remaining = item.quantity - (assignedCounts[item.id] ?: 0)
                if (remaining <= 0) null else item.toDto(quantityOverride = remaining)
            }
    }

    @Transactional
    fun create(req: CreateInventoryItemRequest): InventoryItemDto {
        require(req.vinmonopoletCode.isNotBlank()) { "Varenummer kan ikke være tomt" }
        require(req.name.isNotBlank()) { "Navn kan ikke være tomt" }
        require(req.quantity >= 1) { "Antall må være minst 1" }
        val existing = inventoryRepo.findByVinmonopoletCode(req.vinmonopoletCode.trim())
        if (existing != null) {
            existing.quantity += req.quantity
            return inventoryRepo.save(existing).toDto()
        }
        val item = inventoryRepo.save(
            InventoryItem(
                vinmonopoletCode = req.vinmonopoletCode.trim(),
                name = req.name.trim(),
                price = req.price,
                category = req.category.trim(),
                quantity = req.quantity,
                country = req.country.trim()
            )
        )
        return item.toDto()
    }

    @Transactional
    fun bulkCreate(req: BulkAddInventoryRequest): List<InventoryItemDto> =
        req.items.map { create(it) }

    @Transactional
    fun update(id: Long, req: UpdateInventoryItemRequest): InventoryItemDto {
        val item = inventoryRepo.findById(id).orElseThrow { IllegalArgumentException("Varebeholdning ikke funnet") }
        require(req.quantity >= 0) { "Antall kan ikke være negativt" }
        item.name = req.name.trim()
        item.price = req.price
        item.category = req.category.trim()
        item.quantity = req.quantity
        item.country = req.country.trim()
        return inventoryRepo.save(item).toDto()
    }

    @Transactional
    fun delete(id: Long) {
        val item = inventoryRepo.findById(id).orElseThrow { IllegalArgumentException("Varebeholdning ikke funnet") }
        if (item.quantity > 1) {
            item.quantity -= 1
            inventoryRepo.save(item)
        } else {
            slotRepo.deleteAllByInventoryItemId(id)
            prizeRepo.clearLegacyItemColumn(id)
            inventoryRepo.deleteById(id)
        }
    }

    fun InventoryItem.toDto(quantityOverride: Int? = null) = InventoryItemDto(
        id = id,
        vinmonopoletCode = vinmonopoletCode,
        name = name,
        price = price,
        category = category,
        quantity = quantityOverride ?: quantity,
        country = country,
        imageUrl = "https://bilder.vinmonopolet.no/cache/1200x1200-0/$vinmonopoletCode-1.jpg",
        createdAt = createdAt
    )
}
