package no.isys.wineforall.repository

import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryStatus
import org.jetbrains.exposed.v1.core.ResultRow
import org.jetbrains.exposed.v1.core.SortOrder
import org.jetbrains.exposed.v1.core.eq
import org.jetbrains.exposed.v1.core.inList
import org.jetbrains.exposed.v1.jdbc.insert
import org.jetbrains.exposed.v1.jdbc.selectAll
import org.jetbrains.exposed.v1.jdbc.update
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional
class LotteryRepository {

    fun findFirstByStatusOrderByCreatedAtDesc(status: LotteryStatus): Lottery? =
        findTopByStatusInOrderByCreatedAtDesc(listOf(status))

    fun findAllByStatusOrderByCreatedAtDesc(status: LotteryStatus): List<Lottery> =
        Lotteries.selectAll()
            .where { Lotteries.status eq status }
            .orderBy(Lotteries.createdAt, SortOrder.DESC)
            .map { it.toLottery() }

    fun findTopByStatusInOrderByCreatedAtDesc(statuses: List<LotteryStatus>): Lottery? =
        Lotteries.selectAll()
            .where { Lotteries.status inList statuses }
            .orderBy(Lotteries.createdAt, SortOrder.DESC)
            .limit(1)
            .singleOrNull()
            ?.toLottery()

    fun insert(lottery: Lottery): Lottery {
        val id = Lotteries.insert {
            it[createdAt] = lottery.createdAt
            it[name] = lottery.name
            it[status] = lottery.status
            it[wineCount] = lottery.wineCount
        } get Lotteries.id
        return lottery.copy(id = id)
    }

    // Locks the lottery's row until the transaction ends and returns its current state. Every request that
    // changes a lottery, its tickets, prizes or winners takes this lock first, so they run one at a time:
    // two draws can't both claim the same position, and two purchases can't get the same ticket numbers.
    @Transactional(propagation = Propagation.MANDATORY)
    fun lock(lottery: Lottery): Lottery =
        Lotteries.selectAll().where { Lotteries.id eq lottery.id }.forUpdate().single().toLottery()

    fun updateStatus(lottery: Lottery, status: LotteryStatus) {
        Lotteries.update({ Lotteries.id eq lottery.id }) { it[Lotteries.status] = status }
    }

    fun updateWineCount(lottery: Lottery, wineCount: Int) {
        Lotteries.update({ Lotteries.id eq lottery.id }) { it[Lotteries.wineCount] = wineCount }
    }
}

private fun ResultRow.toLottery() = Lottery(
    id = this[Lotteries.id],
    name = this[Lotteries.name],
    status = this[Lotteries.status],
    wineCount = this[Lotteries.wineCount],
    createdAt = this[Lotteries.createdAt]
)
