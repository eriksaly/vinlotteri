package no.isys.wineforall.repository

import no.isys.wineforall.jooq.tables.records.LotteriesRecord
import no.isys.wineforall.jooq.tables.references.LOTTERIES
import no.isys.wineforall.model.Lottery
import no.isys.wineforall.model.LotteryStatus
import org.jooq.DSLContext
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Propagation
import org.springframework.transaction.annotation.Transactional

@Repository
class LotteryRepository(private val dsl: DSLContext) {

    fun findFirstByStatusOrderByCreatedAtDesc(status: LotteryStatus): Lottery? =
        findTopByStatusInOrderByCreatedAtDesc(listOf(status))

    fun findAllByStatusOrderByCreatedAtDesc(status: LotteryStatus): List<Lottery> =
        dsl.selectFrom(LOTTERIES)
            .where(LOTTERIES.STATUS.eq(status))
            .orderBy(LOTTERIES.CREATED_AT.desc())
            .fetch { it.toLottery() }

    fun findTopByStatusInOrderByCreatedAtDesc(statuses: List<LotteryStatus>): Lottery? =
        dsl.selectFrom(LOTTERIES)
            .where(LOTTERIES.STATUS.`in`(statuses))
            .orderBy(LOTTERIES.CREATED_AT.desc())
            .limit(1)
            .fetchOne { it.toLottery() }

    fun insert(lottery: Lottery): Lottery {
        val id = dsl.insertInto(LOTTERIES).set(lottery.toRecord()).returningResult(LOTTERIES.ID).fetchSingle().value1()!!
        return lottery.copy(id = id)
    }

    // Locks the lottery's row until the transaction ends and returns its current state. Every request that
    // changes a lottery, its tickets, prizes or winners takes this lock first, so they run one at a time:
    // two draws can't both claim the same position, and two purchases can't get the same ticket numbers.
    @Transactional(propagation = Propagation.MANDATORY)
    fun lock(lottery: Lottery): Lottery =
        dsl.selectFrom(LOTTERIES).where(LOTTERIES.ID.eq(lottery.id)).forUpdate().fetchSingle { it.toLottery() }

    fun updateStatus(lottery: Lottery, status: LotteryStatus) {
        dsl.update(LOTTERIES).set(LOTTERIES.STATUS, status).where(LOTTERIES.ID.eq(lottery.id)).execute()
    }

    fun updateWineCount(lottery: Lottery, wineCount: Int) {
        dsl.update(LOTTERIES).set(LOTTERIES.WINE_COUNT, wineCount).where(LOTTERIES.ID.eq(lottery.id)).execute()
    }
}

private fun LotteriesRecord.toLottery() = Lottery(
    id = id!!,
    name = name,
    status = status,
    wineCount = wineCount,
    createdAt = createdAt
)

private fun Lottery.toRecord() = LotteriesRecord(
    createdAt = createdAt,
    name = name,
    status = status,
    wineCount = wineCount
)
