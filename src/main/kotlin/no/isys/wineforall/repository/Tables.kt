package no.isys.wineforall.repository

import no.isys.wineforall.model.LotteryStatus
import no.isys.wineforall.model.UserRole
import org.jetbrains.exposed.v1.core.Column
import org.jetbrains.exposed.v1.core.Table
import org.jetbrains.exposed.v1.javatime.timestampWithTimeZone
import java.time.Instant
import java.time.ZoneOffset

// Exposed's mapping of the tables the Flyway migrations (src/main/resources/db/migration) create. Exposed
// only reads and writes through these; the migrations own the schema.

// A timestamptz column as an Instant. Exposed's timestamp() is for columns without a time zone and would
// convert through the JVM's default time zone.
private fun Table.instant(name: String): Column<Instant> =
    timestampWithTimeZone(name).transform(wrap = { it.toInstant() }, unwrap = { it.atOffset(ZoneOffset.UTC) })

object AppUsers : Table("app_users") {
    val id = long("id").autoIncrement()
    val createdAt = instant("created_at")
    val email = varchar("email", 255)
    val googleSub = varchar("google_sub", 255)
    val lastLoginAt = instant("last_login_at").nullable()
    val name = varchar("name", 255).nullable()
    val role = enumerationByName<UserRole>("role", 255)
    override val primaryKey = PrimaryKey(id)
}

object InventoryItems : Table("inventory_items") {
    val id = long("id").autoIncrement()
    val category = varchar("category", 255)
    val country = varchar("country", 255)
    val createdAt = instant("created_at")
    val name = varchar("name", 255)
    val price = double("price")
    val quantity = integer("quantity")
    val vinmonopoletCode = varchar("vinmonopolet_code", 255)
    override val primaryKey = PrimaryKey(id)
}

object Lotteries : Table("lotteries") {
    val id = long("id").autoIncrement()
    val createdAt = instant("created_at")
    val name = varchar("name", 255)
    val status = enumerationByName<LotteryStatus>("status", 255)
    val wineCount = integer("wine_count").nullable()
    override val primaryKey = PrimaryKey(id)
}

object LotteryPrizes : Table("lottery_prizes") {
    val id = long("id").autoIncrement()
    val createdAt = instant("created_at")
    val position = integer("position")
    val lotteryId = long("lottery_id")
    override val primaryKey = PrimaryKey(id)
}

object Participants : Table("participants") {
    val id = long("id").autoIncrement()
    val createdAt = instant("created_at")
    val name = varchar("name", 255)
    val photoContentType = varchar("photo_content_type", 255).nullable()
    val photoData = binary("photo_data").nullable()
    val tag = varchar("tag", 255)
    override val primaryKey = PrimaryKey(id)
}

object PrizeItemSlots : Table("prize_item_slots") {
    val id = long("id").autoIncrement()
    val quantity = integer("quantity")
    val inventoryItemId = long("inventory_item_id")
    val prizeId = long("prize_id")
    override val primaryKey = PrimaryKey(id)
}

object Tickets : Table("tickets") {
    val id = long("id").autoIncrement()
    val createdAt = instant("created_at")
    val ticketNumber = integer("ticket_number")
    val won = bool("won")
    val lotteryId = long("lottery_id")
    val participantId = long("participant_id")
    override val primaryKey = PrimaryKey(id)
}

object Winners : Table("winners") {
    val id = long("id").autoIncrement()
    val drawnAt = instant("drawn_at")
    val position = integer("position")
    val lotteryId = long("lottery_id")
    val participantId = long("participant_id")
    val prizeId = long("prize_id").nullable()
    val ticketId = long("ticket_id")
    override val primaryKey = PrimaryKey(id)
}

object VgProducts : Table("vg_products") {
    val productId = varchar("product_id", 255)
    val corkType = varchar("cork_type", 255).nullable()
    val country = varchar("country", 255).nullable()
    val createdAt = instant("created_at")
    val discontinued = bool("discontinued")
    val grape = varchar("grape", 255).nullable()
    val mainProductTypeName = varchar("main_product_type_name", 255).nullable()
    val orderType = varchar("order_type", 255).nullable()
    val origin = varchar("origin", 255).nullable()
    val packagingMaterial = varchar("packaging_material", 255).nullable()
    val price = double("price").nullable()
    val productGroupName = varchar("product_group_name", 255).nullable()
    val productShortName = varchar("product_short_name", 255).nullable()
    val productTypeName = varchar("product_type_name", 255).nullable()
    val regionDetailed = varchar("region_detailed", 255).nullable()
    val salesPricePerLiter = double("sales_price_per_liter").nullable()
    val statusCheckedAt = instant("status_checked_at").nullable()
    val subProductTypeName = varchar("sub_product_type_name", 255).nullable()
    val subRegion = varchar("sub_region", 255).nullable()
    val vmpPrice = double("vmp_price").nullable()
    val vmpVintage = integer("vmp_vintage").nullable()
    val volume = double("volume").nullable()
    val volumeType = varchar("volume_type", 255).nullable()
    override val primaryKey = PrimaryKey(productId)
}

object VgReviews : Table("vg_reviews") {
    val id = long("id")
    val alcoholLevel = double("alcohol_level").nullable()
    val article = varchar("article", 255).nullable()
    val authorDescription = text("author_description").nullable()
    val barrel = integer("barrel").nullable()
    val bitterness = integer("bitterness").nullable()
    val colour = varchar("colour", 255).nullable()
    val createdAt = instant("created_at")
    val freshness = integer("freshness").nullable()
    val fruit = integer("fruit").nullable()
    val fullness = integer("fullness").nullable()
    val grade = integer("grade")
    val imageUrl = varchar("image_url", 500).nullable()
    val lead = varchar("lead", 255).nullable()
    val odour = varchar("odour", 255).nullable()
    val price = double("price").nullable()
    val pricePerScore = double("price_per_score").nullable()
    val reviewedAt = instant("reviewed_at")
    val salesPricePerLiter = double("sales_price_per_liter").nullable()
    val score = integer("score")
    val sourceUpdatedAt = instant("source_updated_at")
    val spice = integer("spice").nullable()
    val sugarContent = varchar("sugar_content", 255).nullable()
    val sweetness = integer("sweetness").nullable()
    val tannins = integer("tannins").nullable()
    val taste = varchar("taste", 255).nullable()
    val vintage = integer("vintage").nullable()
    val productId = varchar("product_id", 255)
    override val primaryKey = PrimaryKey(id)
}

object VmpHortenProducts : Table("vmp_horten_products") {
    val productId = varchar("product_id", 255)
    val alcohol = double("alcohol").nullable()
    val country = varchar("country", 255).nullable()
    val hortenStock = integer("horten_stock").nullable()
    val mainCategory = varchar("main_category", 255).nullable()
    val mainCategoryCode = varchar("main_category_code", 255).nullable()
    val mainSubCategory = varchar("main_sub_category", 255).nullable()
    val mainSubCategoryCode = varchar("main_sub_category_code", 255).nullable()
    val name = varchar("name", 255)
    val price = double("price").nullable()
    val productSelection = varchar("product_selection", 255).nullable()
    val stockCheckedAt = instant("stock_checked_at")
    val url = varchar("url", 255).nullable()
    val vintage = integer("vintage").nullable()
    val volume = double("volume").nullable()
    override val primaryKey = PrimaryKey(productId)
}
