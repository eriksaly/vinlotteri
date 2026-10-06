package no.isys.wineforall.repository

import no.isys.wineforall.model.InventoryItem
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.core.plus
import org.jetbrains.exposed.v1.jdbc.deleteWhere
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.jetbrains.exposed.v1.jdbc.upsertReturning
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional
class InventoryItemRepository {

    fun findAll(): List<InventoryItem> =
        InventoryItems.selectAll().orderBy(InventoryItems.id).map { it.toInventoryItem() }

    fun findAllById(ids: Collection<Long>): List<InventoryItem> =
        InventoryItems.selectAll()
            .where { InventoryItems.id inList ids }
            .orderBy(InventoryItems.id)
            .map { it.toInventoryItem() }

    // Locks the item's row until the transaction ends and returns its current state, or null if it's gone.
    // Editing an item and removing bottles take this lock first, so they don't overwrite each other or bottles
    // added meanwhile (insertOrAddQuantity waits for the lock).
    @Transactional(propagation = Propagation.MANDATORY)
    fun lock(id: Long): InventoryItem? =
        InventoryItems.selectAll().where { InventoryItems.id eq id }.forUpdate().singleOrNull()?.toInventoryItem()

    // Inserts the item, or if the inventory already has its Vinmonopolet code, adds its quantity to that item
    // and leaves the item's other fields as they are. Returns the item as stored. A single statement, so
    // adds of the same code at the same time all count.
    fun insertOrAddQuantity(item: InventoryItem): InventoryItem =
        InventoryItems.upsertReturning(
            InventoryItems.vinmonopoletCode,
            onUpdate = { it[InventoryItems.quantity] = InventoryItems.quantity + insertValue(InventoryItems.quantity) }
        ) {
            it[category] = item.category
            it[country] = item.country
            it[createdAt] = item.createdAt
            it[name] = item.name
            it[price] = item.price
            it[quantity] = item.quantity
            it[vinmonopoletCode] = item.vinmonopoletCode
        }.single().toInventoryItem()

    // Call lock first
    fun update(item: InventoryItem) {
        InventoryItems.update({ InventoryItems.id eq item.id }) {
            it[name] = item.name
            it[price] = item.price
            it[category] = item.category
            it[quantity] = item.quantity
            it[country] = item.country
        }
    }

    fun deleteById(id: Long) {
        InventoryItems.deleteWhere { InventoryItems.id eq id }
    }
}

internal fun ResultRow.toInventoryItem() = InventoryItem(
    id = this[InventoryItems.id],
    vinmonopoletCode = this[InventoryItems.vinmonopoletCode],
    name = this[InventoryItems.name],
    price = this[InventoryItems.price],
    category = this[InventoryItems.category],
    quantity = this[InventoryItems.quantity],
    country = this[InventoryItems.country],
    createdAt = this[InventoryItems.createdAt]
)
