package no.isys.wineforall.model

import jakarta.persistence.*
import java.io.Serializable
import java.time.Instant

// A page of a store listing that VinmonopoletStockCheckJob has fetched but not yet applied. A listing only
// replaces its stores' stock once every page is in, so the pages are kept here as they come: a run cut off
// mid-listing continues from where it stopped instead of fetching the listing again. Applying the listing
// deletes its pages.
@Entity
@IdClass(VmpListingPageId::class)
@Table(name = "vmp_listing_pages")
class VmpListingPage(
    // The listing's store ids, comma separated, e.g. "237,233,398"
    @Id
    val storeIds: String,

    @Id
    val pageNumber: Int,

    @Column(nullable = false)
    val fetchedAt: Instant,

    // The page as VinmonopoletService.StoreStockPage, in JSON
    @Column(nullable = false, columnDefinition = "text")
    val content: String
)

data class VmpListingPageId(val storeIds: String = "", val pageNumber: Int = 0) : Serializable
