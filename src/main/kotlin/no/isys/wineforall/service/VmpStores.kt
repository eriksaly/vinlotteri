package no.isys.wineforall.service

// The Vinmonopolet stores whose stock VinmonopoletStockCheckJob checks, by Vinmonopolet's store id.
// They're listed in batches, one listing per batch, as Vinmonopolet applies at most three store filters
// per search. A listing costs one request per 24 products in stock at any of its stores, so stores that
// share much of their selection go together: these two batches are ~290 requests, against ~500 for the
// six stores one at a time.
object VmpStores {

    data class Store(val id: String, val name: String)

    // Vinmonopolet Horten Sjøsiden, the store the VG reviews show stock for
    val HORTEN = Store("237", "Horten")
    private val TONSBERG = Store("295", "Tønsberg")
    private val STOKKE = Store("398", "Stokke")
    private val SANDEFJORD = Store("283", "Sandefjord")
    private val HOLMESTRAND = Store("233", "Holmestrand")
    private val LEKNES = Store("214", "Leknes")

    val batches = listOf(
        listOf(HORTEN, HOLMESTRAND, STOKKE),
        listOf(TONSBERG, SANDEFJORD, LEKNES)
    )

    // In order of priority, the order the VG reviews list the stores in
    val all = listOf(HORTEN, TONSBERG, STOKKE, SANDEFJORD, HOLMESTRAND, LEKNES)
}
