package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.InventoryItemsRecord
import no.isys.wineforall.jooq.tables.references.INVENTORY_ITEMS
import no.isys.wineforall.model.InventoryItem
import org.jooq.DSLContext
import org.jooq.impl.DSL.excluded
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Repository
class InventoryItemRepository(private val dsl: DSLContext) {

    fun findAll(): List<InventoryItem> =
        dsl.selectFrom(INVENTORY_ITEMS).orderBy(INVENTORY_ITEMS.ID).fetch { it.toInventoryItem() }

    fun findAllById(ids: Collection<Long>): List<InventoryItem> =
        dsl.selectFrom(INVENTORY_ITEMS)
            .where(INVENTORY_ITEMS.ID.`in`(ids))
            .orderBy(INVENTORY_ITEMS.ID)
            .fetch { it.toInventoryItem() }

    // Locks the item's row until the transaction ends and returns its current state, or null if it's gone.
    // Editing an item and removing bottles take this lock first, so they don't overwrite each other or bottles
    // added meanwhile (insertOrAddQuantity waits for the lock).
    @Transactional(propagation = Propagation.MANDATORY)
    fun lock(id: Long): InventoryItem? =
        dsl.selectFrom(INVENTORY_ITEMS).where(INVENTORY_ITEMS.ID.eq(id)).forUpdate().fetchOne { it.toInventoryItem() }

    // Inserts the item, or if the inventory already has its Vinmonopolet code, adds its quantity to that item
    // and leaves the item's other fields as they are. Returns the item as stored. A single statement, so
    // adds of the same code at the same time all count.
    fun insertOrAddQuantity(item: InventoryItem): InventoryItem =
        dsl.insertInto(INVENTORY_ITEMS)
            .set(item.toRecord())
            .onConflict(INVENTORY_ITEMS.VINMONOPOLET_CODE)
            .doUpdate()
            .set(INVENTORY_ITEMS.QUANTITY, INVENTORY_ITEMS.QUANTITY.plus(excluded(INVENTORY_ITEMS.QUANTITY)))
            .returning()
            .fetchSingle { it.toInventoryItem() }

    // Call lock first
    fun update(item: InventoryItem) {
        dsl.update(INVENTORY_ITEMS)
            .set(INVENTORY_ITEMS.NAME, item.name)
            .set(INVENTORY_ITEMS.PRICE, item.price)
            .set(INVENTORY_ITEMS.CATEGORY, item.category)
            .set(INVENTORY_ITEMS.QUANTITY, item.quantity)
            .set(INVENTORY_ITEMS.COUNTRY, item.country)
            .where(INVENTORY_ITEMS.ID.eq(item.id))
            .execute()
    }

    fun deleteById(id: Long) {
        dsl.deleteFrom(INVENTORY_ITEMS).where(INVENTORY_ITEMS.ID.eq(id)).execute()
    }
}

internal fun InventoryItemsRecord.toInventoryItem() = InventoryItem(
    id = id!!,
    vinmonopoletCode = vinmonopoletCode,
    name = name,
    price = price,
    category = category,
    quantity = quantity,
    country = country,
    createdAt = createdAt
)

private fun InventoryItem.toRecord() = InventoryItemsRecord(
    category = category,
    country = country,
    createdAt = createdAt,
    name = name,
    price = price,
    quantity = quantity,
    vinmonopoletCode = vinmonopoletCode
)
